import { visualStatusFromScoreDraft } from '../teacherMobileDailyTest.ts'
import { markStudentTokens, SID_RE } from './nameMatch.ts'
import {
  compactText,
  extractScoreValue,
  parseKoreanScoreToken,
} from './voiceLexicon.ts'
import { preferCompleteScore } from './utteranceHypothesisMerge.ts'
import type { VoiceReviewItem, VoiceStudentRef } from './types.ts'

export type StudentDailyTestAttemptPatch = {
  round: 1 | 2 | 3 | 4
  score: string
  conflict: boolean
}

export type StudentDailyTestParseResult = {
  apply: boolean
  skippedAbsent: boolean
  attempts: StudentDailyTestAttemptPatch[]
  conceptLackCount?: number
  calculationErrorCount?: number
  applicationLackCount?: number
  teacherFeedback?: string
  needsReview: VoiceReviewItem[]
}

const FEEDBACK_RE = /(?:강사의\s*피드백|강사\s*피드백|피\s*드\s*백)\s*[:：,]?\s*/
const ATTEMPT_HEAD_RE =
  /^([1-4]\s*회?\s*차|[1-4]\s*차시|일차|이차|삼차|사차|일\s*차|이\s*차|삼\s*차|사\s*차|첫\s*번째|첫번째|두\s*번째|두번째|세\s*번째|세번째|네\s*번째|네번째)/

function roundFromMarker(marker: string): 1 | 2 | 3 | 4 | null {
  const compact = compactText(marker)
    .replace(/회차시$/g, '차')
    .replace(/차시$/g, '차')
    .replace(/회차$/g, '차')
  if (compact === '1차' || compact === '일차' || compact === '첫번째') return 1
  if (compact === '2차' || compact === '이차' || compact === '두번째') return 2
  if (compact === '3차' || compact === '삼차' || compact === '세번째') return 3
  if (compact === '4차' || compact === '사차' || compact === '네번째') return 4
  return null
}

export const SAMSUNG_RYU_DAILY_TEST_TRANSCRIPT =
  '류정현 1차 80 불합격 2차 95 합격 2차 함수 부분을 부분에 이해가 늦는 거 같다'
export const SAMSUNG_RYU_FEEDBACK_ONLY_TRANSCRIPT =
  '2차 함수에 대한 이해가 늦는 거 같다'

function splitFeedback(transcript: string): { structured: string; feedback?: string } {
  const match = transcript.match(FEEDBACK_RE)
  if (!match || match.index == null) return { structured: transcript.trim() }
  const structured = transcript.slice(0, match.index).trim()
  const feedback = transcript.slice(match.index + match[0].length).trim()
  return { structured, feedback: feedback || undefined }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripSidTokens(text: string): string {
  return text.replace(SID_RE, ' ').replace(/\s+/g, ' ').trim()
}

function trimResidual(text: string): string {
  return text.replace(/^[\s,，.．。、;；:：~…·]+/, '').replace(/[\s,，.．。、;；:：~…·]+$/, '').trim()
}

const ATTEMPT_HEAD_GLOBAL = new RegExp(ATTEMPT_HEAD_RE.source.slice(1), 'g')
/** Digits may omit 점; Korean numerals require 점 so "이해가" is not a score. */
const ATTEMPT_PAYLOAD_RE =
  /^\s*(?:\d{1,3}(?:\s*점)?|[영공일이삼사오육륙칠팔구십백]{1,4}\s*점)(?:\s*(?:불합격|합격))?(?=\s|$|,|，)/
const SCOREISH_TAIL_RE =
  /^\s*(?:\d{1,3}\s*차\s*)?(?:[일이삼사]\s*차\s*)?(?:\d{1,3}(?:\s*점)?|[영공일이삼사오육륙칠팔구십백]{1,4}(?:\s*점)?)?(?:\s*(?:불합격|합격))?/

type AttemptSpan = {
  start: number
  end: number
  round: 1 | 2 | 3 | 4
  score: { score: string; invalid: boolean }
  spoken: string
}

/** 1차/2차 heads are attempt commands only when a score payload follows. */
function collectValidAttemptSpans(text: string): AttemptSpan[] {
  const spans: AttemptSpan[] = []
  const re = new RegExp(ATTEMPT_HEAD_GLOBAL.source, 'g')
  let match: RegExpExecArray | null = re.exec(text)
  while (match) {
    const head = match[0]
    const round = roundFromMarker(head)
    const start = match.index
    const after = text.slice(start + head.length)
    const payload = after.match(ATTEMPT_PAYLOAD_RE)
    if (!round || !payload) {
      match = re.exec(text)
      continue
    }
    const spoken = `${head}${payload[0]}`
    const score = extractAttemptScore(spoken)
    if (!score) {
      match = re.exec(text)
      continue
    }
    const end = start + head.length + payload[0].length
    spans.push({ start, end, round, score, spoken })
    re.lastIndex = end
    match = re.exec(text)
  }
  return spans
}

function stripLeadingCardName(text: string, cardStudent: VoiceStudentRef): string {
  const name = cardStudent.name.replace(/\s+/g, '')
  if (name.length < 2) return text
  const pattern = new RegExp(`^${name.split('').map((ch) => escapeRegExp(ch)).join('\\s*')}\\s*`)
  return text.replace(pattern, '')
}

function mergeRanges(ranges: Array<{ start: number; end: number }>): Array<{ start: number; end: number }> {
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const merged: Array<{ start: number; end: number }> = []
  for (const range of sorted) {
    const last = merged[merged.length - 1]
    if (!last || range.start > last.end) merged.push({ ...range })
    else last.end = Math.max(last.end, range.end)
  }
  return merged
}

function maskRanges(text: string, ranges: Array<{ start: number; end: number }>): string {
  let next = text
  for (const range of [...mergeRanges(ranges)].sort((a, b) => b.start - a.start)) {
    next = `${next.slice(0, range.start)} ${next.slice(range.end)}`
  }
  return next.replace(/\s+/g, ' ').trim()
}

const ERROR_SPAN_RE =
  /(?:개념(?:이|이해)?\s*부족|계산\s*실수|응용(?:\s*능력)?\s*부족)\s*\d{1,3}\s*개?/g

function extractErrorAnalysisSpans(text: string): {
  rest: string
  conceptLackCount?: number
  calculationErrorCount?: number
  applicationLackCount?: number
} {
  let conceptLackCount: number | undefined
  let calculationErrorCount: number | undefined
  let applicationLackCount: number | undefined
  const rest = text.replace(ERROR_SPAN_RE, (full) => {
    const n = Number(full.match(/(\d+)/)?.[1])
    if (!Number.isInteger(n) || n < 0) return ' '
    if (/개념/.test(full)) conceptLackCount = n
    else if (/계산/.test(full)) calculationErrorCount = n
    else applicationLackCount = n
    return ' '
  })
  return {
    rest: trimResidual(rest.replace(/오답\s*분석/g, ' ').replace(/\s+/g, ' ')),
    conceptLackCount,
    calculationErrorCount,
    applicationLackCount,
  }
}

function consumeMentionOnlyErrorPhrase(text: string): {
  rest: string
  conceptLackCount?: number
  calculationErrorCount?: number
  applicationLackCount?: number
} {
  const compact = compactText(text)
  if (/^(개념(?:이|이해)?부족|개념문제)$/.test(compact)) {
    return { rest: '', conceptLackCount: 1 }
  }
  if (/^(계산실수|계산틀림|연산실수)$/.test(compact)) {
    return { rest: '', calculationErrorCount: 1 }
  }
  if (/^(응용(?:능력)?부족|응용이약|응용못함|응용도부족)$/.test(compact)) {
    return { rest: '', applicationLackCount: 1 }
  }
  return { rest: text }
}

function isFillerResidual(text: string): boolean {
  const compact = compactText(text).replace(/[^\uac00-\ud7a3a-zA-Z0-9]/g, '')
  if (compact.length < 4) return true
  if (/^(음+|어+|그+|아+|네+|요|입니다|것|거|같다)+$/.test(compact)) return true
  return false
}

function residualHasUnresolvedStructured(text: string): boolean {
  if (/\d{1,3}\s*점/.test(text)) return true
  if (/불합격|합격/.test(text)) return true
  if (/점수/.test(text)) return true
  return false
}

function followingIsLexicalProse(after: string): boolean {
  const next = after.trim()
  if (!next) return false
  return /^(함수|방정식|문제|이해|부분|단원|개념|응용|계산)/.test(next)
}

export function collectIncompleteAttemptRegions(
  text: string,
  validSpans: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  const covered = (index: number) => validSpans.some((span) => index >= span.start && index < span.end)
  const regions: Array<{ start: number; end: number }> = []
  const re = new RegExp(ATTEMPT_HEAD_GLOBAL.source, 'g')
  let match: RegExpExecArray | null = re.exec(text)
  while (match) {
    const start = match.index
    if (covered(start)) {
      match = re.exec(text)
      continue
    }
    const after = text.slice(start + match[0].length)
    if (followingIsLexicalProse(after)) {
      match = re.exec(text)
      continue
    }
    const tail = after.match(SCOREISH_TAIL_RE)?.[0] ?? ''
    const end = start + match[0].length + tail.length
    regions.push({ start, end: Math.max(end, start + match[0].length) })
    re.lastIndex = Math.max(end, start + match[0].length)
    match = re.exec(text)
  }
  return regions
}

function residualHasUnresolvedAttemptDebris(text: string): boolean {
  if (residualHasUnresolvedStructured(text)) return true
  if (collectIncompleteAttemptRegions(text, []).length > 0) return true
  if (/(?:^|\s)(?:일|이|삼|사)\s+[1-4]\s*차/.test(text)) return true
  if (/(?:^|\s)[1-4]\s*차(?:\s+[1-4]\s*차)+/.test(text)) return true
  return false
}

function stripLeadingScoreDebris(text: string): string {
  return text.replace(/^(?:[일이삼사오차점]\s+)+/u, '').trim()
}

function uniqueProseFeedback(text: string): string {
  const normalized = stripLeadingScoreDebris(text.replace(/\s+/g, ' ').trim())
    .replace(/나날이\s*이발\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const tokens = normalized.split(' ').filter(Boolean)
  if (tokens.length >= 4 && tokens.length % 2 === 0) {
    const mid = tokens.length / 2
    if (tokens.slice(0, mid).join(' ') === tokens.slice(mid).join(' ')) {
      return tokens.slice(0, mid).join(' ')
    }
  }
  const compact = compactText(normalized)
  if (compact.length >= 8 && compact.length % 2 === 0) {
    const half = compact.length / 2
    if (compact.slice(0, half) === compact.slice(half)) {
      const mid = Math.floor(tokens.length / 2)
      return tokens.slice(0, Math.max(1, mid)).join(' ')
    }
  }
  const clause = normalized.match(/^(.+?(?:고\s*있음|하고\s*있음|있음|같다|이다|습니다))(?:\s+.+)?$/)
  if (clause?.[1] && compactText(clause[1]).length >= 6) {
    const rest = normalized.slice(clause[1].length).trim()
    const restKey = compactText(rest)
    const clauseKey = compactText(clause[1])
    if (!rest || restKey.length <= 8 || clauseKey.includes(restKey) || restKey.includes(clauseKey)) {
      return clause[1].replace(/\s+/g, ' ').trim()
    }
  }
  return normalized
}

function spokenResult(clause: string): '합격' | '불합격' | null {
  if (/불합격/.test(clause)) return '불합격'
  if (/합격/.test(clause)) return '합격'
  return null
}

/**
 * Samsung/Chrome ko-KR Web Speech does not always return the typed classroom
 * string. These forms all currently produce the production confirmation
 * "점수·오답분석·피드백을 확인해야 합니다" against the PR #23 parser:
 * numbered list ("1. 차" / "1.차" / "1. 80점"), Hangul spacing ("일 차"),
 * 회차, 차/자, fullwidth digits.
 *
 * Applied only to the structured (non-feedback) portion.
 */
export function normalizeStudentDailyTestAttemptSpeech(raw: string): string {
  let text = raw
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u3000/g, ' ')

  text = text.replace(
    /([1-4])\s*[,，.．。]\s*(회\s*차(?:시)?|차시|차|자)/g,
    '$1차',
  )
  // Require whitespace after the list marker so "3.14점" stays a decimal.
  text = text.replace(
    /([1-4])\s*[,，.．。]\s+(?=(?:\d{1,3}\s*점|[영공일이삼사오육륙칠팔구십백]{1,4}\s*점))/g,
    '$1차 ',
  )
  text = text.replace(/(일|이|삼|사)\s+(회\s*)?차(?:시)?/g, '$1차')
  text = text.replace(/([1-4])\s*회\s*차(?:시)?/g, '$1차')
  text = text.replace(/(일|이|삼|사)\s*회\s*차(?:시)?/g, '$1차')
  text = text.replace(
    /([1-4])\s*자(?=\s*(?:\d|[영공일이삼사오육륙칠팔구십백]))/g,
    '$1차',
  )
  return text.replace(/\s+/g, ' ').trim()
}

function extractAttemptScore(piece: string): { score: string; invalid: boolean } | null {
  const parsed = extractScoreValue(piece)
  if (parsed) return parsed
  const rest = piece.replace(ATTEMPT_HEAD_RE, ' ')
  const koHit = rest.match(
    /([영공일이삼사오육륙칠팔구십백]{1,4})(?=\s*(?:점|불합격|합격|,|，|$))/,
  )
  if (koHit?.[1]) {
    const n = parseKoreanScoreToken(koHit[1])
    if (n != null) {
      return n >= 0 && n <= 100
        ? { score: String(n), invalid: false }
        : { score: String(n), invalid: true }
    }
  }
  const numHit = rest.match(/(?:^|[\s,，:：])(\d{1,3})(?=\s*(?:점|불합격|합격|,|，|$))/)
  if (numHit?.[1]) {
    const numeric = Number(numHit[1])
    if (!Number.isInteger(numeric) || numeric < 0 || numeric > 100) {
      return { score: numHit[1], invalid: true }
    }
    return { score: String(numeric), invalid: false }
  }
  return null
}

function collectSids(tokenized: string): string[] {
  const ids: string[] = []
  const re = new RegExp(SID_RE.source, 'g')
  let match: RegExpExecArray | null = re.exec(tokenized)
  while (match) {
    if (match[1]) ids.push(match[1])
    match = re.exec(tokenized)
  }
  return [...new Set(ids)]
}

function cleanVoiceText(transcript: string): string {
  return transcript
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export type DailyTestParseOptions = {
  confidenceGate?: boolean
}

/**
 * Student-card daily-test voice. Name may be omitted (card context)
 * or must exactly match this student. Other roster names are never applied.
 */
export function parseStudentDailyTestVoice(
  transcript: string,
  cardStudent: VoiceStudentRef,
  roster: VoiceStudentRef[],
  absent: boolean,
  options: DailyTestParseOptions = {},
): StudentDailyTestParseResult {
  const confidenceGate = options.confidenceGate !== false
  const needsReview: VoiceReviewItem[] = []
  const raw = cleanVoiceText(transcript)
  if (!raw) {
    return {
      apply: false,
      skippedAbsent: false,
      attempts: [],
      needsReview: [{ label: cardStudent.name, reason: '인식된 내용이 없습니다' }],
    }
  }

  const { structured, feedback } = splitFeedback(raw)
  const structuredNorm = normalizeStudentDailyTestAttemptSpeech(structured)
  const { tokenized, duplicateReviews } = markStudentTokens(structuredNorm, roster)
  needsReview.push(...duplicateReviews)
  const namedIds = collectSids(tokenized)
  const otherNames = namedIds.filter((id) => id !== cardStudent.id)
  if (otherNames.length > 0) {
    const other = roster.find((row) => row.id === otherNames[0])
    needsReview.push({
      label: other?.name ?? otherNames[0],
      reason: '다른 학생 이름이어서 이 카드에 넣지 않음',
    })
    return { apply: false, skippedAbsent: false, attempts: [], needsReview }
  }

  if (absent) {
    return {
      apply: false,
      skippedAbsent: true,
      attempts: [],
      needsReview,
    }
  }

  const attempts: StudentDailyTestAttemptPatch[] = []
  const attemptSpans = collectValidAttemptSpans(structuredNorm)
  const seenRounds = new Map<1 | 2 | 3 | 4, string>()
  for (const span of attemptSpans) {
    if (span.score.invalid) {
      needsReview.push({
        label: `${cardStudent.name} ${span.round}차`,
        reason: '점수 범위 확인 필요',
      })
      continue
    }
    const result = spokenResult(span.spoken)
    const derived = visualStatusFromScoreDraft(span.score.score)
    const conflict =
      (result === '합격' && derived !== '합격') ||
      (result === '불합격' && derived !== '불합격')
    if (conflict) {
      needsReview.push({
        label: `${cardStudent.name} ${span.round}차`,
        reason: `${span.score.score}점은 기존 85점 기준과 말한 합격/불합격이 다름`,
      })
      continue
    }
    const prevScore = seenRounds.get(span.round)
    const chosen = preferCompleteScore(prevScore, span.score.score)
    if (prevScore && chosen === prevScore && prevScore !== span.score.score) {
      continue
    }
    seenRounds.set(span.round, chosen)
  }
  for (const [round, score] of seenRounds) {
    attempts.push({ round, score, conflict: false })
  }
  attempts.sort((a, b) => a.round - b.round)

  const incompleteRegions = confidenceGate
    ? collectIncompleteAttemptRegions(structuredNorm, attemptSpans)
    : []
  const afterAttempts = maskRanges(structuredNorm, [
    ...attemptSpans.map((span) => ({ start: span.start, end: span.end })),
    ...incompleteRegions,
  ])
  const withoutLeadingName = stripLeadingCardName(
    stripSidTokens(afterAttempts),
    cardStudent,
  )
  const errorSpans = extractErrorAnalysisSpans(withoutLeadingName)
  const mentionOnly = consumeMentionOnlyErrorPhrase(errorSpans.rest)
  let conceptLackCount = errorSpans.conceptLackCount
  let calculationErrorCount = errorSpans.calculationErrorCount
  let applicationLackCount = errorSpans.applicationLackCount
  if (mentionOnly.conceptLackCount !== undefined) conceptLackCount = mentionOnly.conceptLackCount
  if (mentionOnly.calculationErrorCount !== undefined) {
    calculationErrorCount = mentionOnly.calculationErrorCount
  }
  if (mentionOnly.applicationLackCount !== undefined) {
    applicationLackCount = mentionOnly.applicationLackCount
  }

  const residual = stripLeadingScoreDebris(
    trimResidual(stripLeadingCardName(mentionOnly.rest, cardStudent)),
  )
  const hasStructuredItem =
    attempts.length > 0 ||
    conceptLackCount !== undefined ||
    calculationErrorCount !== undefined ||
    applicationLackCount !== undefined

  let teacherFeedback = feedback?.slice(0, 500)
  const confidenceBlocked =
    confidenceGate && !teacherFeedback && residualHasUnresolvedAttemptDebris(residual)
  if (!teacherFeedback) {
    if (confidenceBlocked || (!confidenceGate && residualHasUnresolvedStructured(residual))) {
      if (hasStructuredItem) {
        needsReview.push({
          label: cardStudent.name,
          reason: '점수·오답분석·피드백을 확인해야 합니다',
        })
      }
    } else if (!isFillerResidual(residual)) {
      teacherFeedback = confidenceGate
        ? uniqueProseFeedback(residual.slice(0, 500))
        : residual.slice(0, 500)
    }
  }

  const hasStructured = hasStructuredItem || Boolean(teacherFeedback)

  if (!hasStructured) {
    needsReview.push({
      label: cardStudent.name,
      reason: '점수·오답분석·피드백을 확인해야 합니다',
    })
    return { apply: false, skippedAbsent: false, attempts: [], needsReview }
  }

  return {
    apply: true,
    skippedAbsent: false,
    attempts,
    conceptLackCount,
    calculationErrorCount,
    applicationLackCount,
    teacherFeedback,
    needsReview,
  }
}
