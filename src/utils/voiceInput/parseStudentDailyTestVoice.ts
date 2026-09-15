import { visualStatusFromScoreDraft } from '../teacherMobileDailyTest.ts'
import { markStudentTokens, SID_RE } from './nameMatch.ts'
import {
  compactText,
  extractScoreValue,
  parseKoreanScoreToken,
  parseWrongCausePhrases,
  replaceKoreanScores,
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

function splitFeedback(transcript: string): { structured: string; feedback?: string } {
  const match = transcript.match(FEEDBACK_RE)
  if (!match || match.index == null) return { structured: transcript.trim() }
  const structured = transcript.slice(0, match.index).trim()
  const feedback = transcript.slice(match.index + match[0].length).trim()
  return { structured, feedback: feedback || undefined }
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

function parseCategoryCount(text: string, kind: 'concept' | 'calc' | 'app'): number | undefined {
  const compact = compactText(replaceKoreanScores(text))
  const patterns: RegExp[] =
    kind === 'concept'
      ? [/개념(?:이|이해)?부족(\d+)개/, /(\d+)개개념/]
      : kind === 'calc'
        ? [/계산실수(\d+)개/, /(\d+)개계산/]
        : [/응용(?:능력)?부족(\d+)개/, /(\d+)개응용/]
  for (const re of patterns) {
    const hit = compact.match(re)
    if (hit?.[1]) {
      const n = Number(hit[1])
      if (Number.isInteger(n) && n >= 0) return n
    }
  }
  const mentioned =
    kind === 'concept'
      ? parseWrongCausePhrases(text).conceptLackDelta > 0
      : kind === 'calc'
        ? parseWrongCausePhrases(text).calculationErrorDelta > 0
        : parseWrongCausePhrases(text).applicationLackDelta > 0
  return mentioned ? 1 : undefined
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
  const pieces = structuredNorm.split(ATTEMPT_SPLIT_RE).map((part) => part.trim()).filter(Boolean)
  for (const piece of pieces) {
    const head = piece.match(ATTEMPT_HEAD_RE)
    if (!head?.[1]) continue
    const round = roundFromMarker(head[1])
    if (!round) {
      needsReview.push({ label: cardStudent.name, reason: '차시를 확인해야 합니다' })
      continue
    }
    const scoreParsed = extractAttemptScore(piece)
    if (!scoreParsed) continue
    if (scoreParsed.invalid) {
      needsReview.push({
        label: `${cardStudent.name} ${round}차`,
        reason: '점수 범위 확인 필요',
      })
      continue
    }
    const result = spokenResult(piece)
    const derived = visualStatusFromScoreDraft(scoreParsed.score)
    const conflict =
      (result === '합격' && derived !== '합격') ||
      (result === '불합격' && derived !== '불합격')
    if (conflict) {
      needsReview.push({
        label: `${cardStudent.name} ${round}차`,
        reason: `${scoreParsed.score}점은 기존 85점 기준과 말한 합격/불합격이 다름`,
      })
      continue
    }
    attempts.push({ round, score: scoreParsed.score, conflict: false })
  }

  const conceptLackCount = parseCategoryCount(structuredNorm, 'concept')
  const calculationErrorCount = parseCategoryCount(structuredNorm, 'calc')
  const applicationLackCount = parseCategoryCount(structuredNorm, 'app')

  const hasStructured =
    attempts.length > 0 ||
    conceptLackCount !== undefined ||
    calculationErrorCount !== undefined ||
    applicationLackCount !== undefined ||
    Boolean(feedback)

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
    teacherFeedback: feedback?.slice(0, 500),
    needsReview,
  }
}
