import { visualStatusFromScoreDraft } from '../teacherMobileDailyTest.ts'
import { markStudentTokens, SID_RE } from './nameMatch.ts'
import {
  compactText,
  extractScoreValue,
  parseKoreanScoreToken,
} from './voiceLexicon.ts'
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
const ATTEMPT_SPLIT_RE =
  /(?=[1-4]\s*회?\s*차|[1-4]\s*차시|일차|이차|삼차|사차|일\s*차|이\s*차|삼\s*차|사\s*차|첫\s*번째|첫번째|두\s*번째|두번째|세\s*번째|세번째|네\s*번째|네번째)/
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

function stripCardStudentName(text: string, cardStudent: VoiceStudentRef): string {
  const name = cardStudent.name.replace(/\s+/g, '')
  if (name.length < 2) return text
  const pattern = name
    .split('')
    .map((ch) => escapeRegExp(ch))
    .join('\\s*')
  return text.replace(new RegExp(pattern, 'g'), ' ').replace(/\s+/g, ' ').trim()
}

function stripSidTokens(text: string): string {
  return text.replace(SID_RE, ' ').replace(/\s+/g, ' ').trim()
}

function trimResidual(text: string): string {
  return text.replace(/^[\s,，.．。、;；:：~…·]+/, '').replace(/[\s,，.．。、;；:：~…·]+$/, '').trim()
}

/** Attempt head without score/status is not a valid attempt payload. */
function splitAttemptHeadAndRest(piece: string): {
  head: string
  round: 1 | 2 | 3 | 4
  rest: string
} | null {
  const head = piece.match(ATTEMPT_HEAD_RE)
  if (!head?.[1]) return null
  const round = roundFromMarker(head[1])
  if (!round) return null
  return { head: head[1], round, rest: piece.slice(head[0].length) }
}

function consumeAttemptPayload(piece: string): {
  consumed: string
  residual: string
  score: { score: string; invalid: boolean } | null
} {
  const split = splitAttemptHeadAndRest(piece)
  if (!split) {
    return { consumed: '', residual: piece, score: null }
  }
  const headLen = piece.length - split.rest.length
  const score = extractAttemptScore(piece)
  const payload = score
    ? split.rest.match(
        /^\s*(?:\d{1,3}|[영공일이삼사오육륙칠팔구십백]{1,4})(?:\s*점)?\s*(?:불합격|합격)?/,
      )
    : null
  if (!score || !payload) {
    const ws = split.rest.match(/^\s*/)?.[0] ?? ''
    return {
      consumed: piece.slice(0, headLen + ws.length),
      residual: split.rest.slice(ws.length),
      score: null,
    }
  }
  const consumed = piece.slice(0, headLen + payload[0].length)
  return {
    consumed,
    residual: piece.slice(consumed.length),
    score,
  }
}

const ERROR_SPAN_RE =
  /(?:개념(?:이|이해)?\s*부족|계산\s*실수|응용(?:\s*능력)?\s*부족)\s*\d+\s*개/g

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
    rest: trimResidual(rest.replace(/\s+/g, ' ')),
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
  if (
    /(?:^|\s)(?:[1-4]\s*회?\s*차|[1-4]\s*차시|일차|이차|삼차|사차|일\s*차|이\s*차|삼\s*차|사\s*차)(?:\s|$)/.test(
      text,
    )
  ) {
    return true
  }
  if (/\d{1,3}\s*점/.test(text)) return true
  if (/불합격|합격/.test(text)) return true
  if (/점수/.test(text)) return true
  return false
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

/**
 * Student-card daily-test voice. Name may be omitted (card context)
 * or must exactly match this student. Other roster names are never applied.
 */
export function parseStudentDailyTestVoice(
  transcript: string,
  cardStudent: VoiceStudentRef,
  roster: VoiceStudentRef[],
  absent: boolean,
): StudentDailyTestParseResult {
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
  const residualParts: string[] = []
  const pieces = structuredNorm.split(ATTEMPT_SPLIT_RE).map((part) => part.trim()).filter(Boolean)
  for (const piece of pieces) {
    const split = splitAttemptHeadAndRest(piece)
    if (!split) {
      residualParts.push(
        stripCardStudentName(stripSidTokens(piece), cardStudent),
      )
      continue
    }
    const consumed = consumeAttemptPayload(piece)
    if (!consumed.score) {
      residualParts.push(consumed.residual)
      continue
    }
    if (consumed.score.invalid) {
      needsReview.push({
        label: `${cardStudent.name} ${split.round}차`,
        reason: '점수 범위 확인 필요',
      })
      continue
    }
    const result = spokenResult(consumed.consumed)
    const derived = visualStatusFromScoreDraft(consumed.score.score)
    const conflict =
      (result === '합격' && derived !== '합격') ||
      (result === '불합격' && derived !== '불합격')
    if (conflict) {
      needsReview.push({
        label: `${cardStudent.name} ${split.round}차`,
        reason: `${consumed.score.score}점은 기존 85점 기준과 말한 합격/불합격이 다름`,
      })
      continue
    }
    attempts.push({ round: split.round, score: consumed.score.score, conflict: false })
    residualParts.push(consumed.residual)
  }

  const residualAfterAttempts = trimResidual(residualParts.filter(Boolean).join(' '))
  const errorSpans = extractErrorAnalysisSpans(residualAfterAttempts)
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

  const residual = trimResidual(mentionOnly.rest)
  const hasStructuredItem =
    attempts.length > 0 ||
    conceptLackCount !== undefined ||
    calculationErrorCount !== undefined ||
    applicationLackCount !== undefined

  const hasStructured = hasStructuredItem || Boolean(feedback)

  if (!hasStructured) {
    needsReview.push({
      label: cardStudent.name,
      reason: '점수·오답분석·피드백을 확인해야 합니다',
    })
    return { apply: false, skippedAbsent: false, attempts: [], needsReview }
  }

  let teacherFeedback = feedback?.slice(0, 500)
  if (!teacherFeedback && hasStructuredItem && residual) {
    if (residualHasUnresolvedStructured(residual)) {
      needsReview.push({
        label: cardStudent.name,
        reason: '점수·오답분석·피드백을 확인해야 합니다',
      })
    } else if (!isFillerResidual(residual)) {
      teacherFeedback = residual.slice(0, 500)
    }
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
