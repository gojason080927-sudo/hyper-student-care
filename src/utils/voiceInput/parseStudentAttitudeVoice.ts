import { parseAttitudeIssuePhrases } from './voiceLexicon.ts'
import type { ClassAttitudeIssue } from '../../types/records.ts'
import type { VoiceReviewItem, VoiceStudentRef } from './types.ts'

export type StudentAttitudeVoiceParse = {
  apply: boolean
  skippedAbsent: boolean
  issues?: ClassAttitudeIssue[]
  note?: string
  needsReview: VoiceReviewItem[]
}

const COMMENT_RE = /(?:강사의\s*의견|강사\s*의견|의견)\s*[:：,]?\s*/

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripLeadingName(text: string, name: string): string {
  const compact = name.replace(/\s+/g, '')
  if (compact.length < 2) return text
  const pattern = new RegExp(`^${compact.split('').map((ch) => escapeRegExp(ch)).join('\\s*')}\\s*`)
  return text.replace(pattern, '')
}

function startsWithStudentName(text: string, student: VoiceStudentRef): boolean {
  const compact = student.name.replace(/\s+/g, '')
  if (compact.length < 2) return false
  const pattern = new RegExp(`^${compact.split('').map((ch) => escapeRegExp(ch)).join('\\s*')}\\s*`)
  return pattern.test(text)
}

function splitComment(transcript: string): { structured: string; note?: string } {
  const match = transcript.match(COMMENT_RE)
  if (!match || match.index == null) return { structured: transcript.trim() }
  const structured = transcript.slice(0, match.index).trim()
  const note = transcript.slice(match.index + match[0].length).trim()
  return { structured, note: note || undefined }
}

function stripIssueWords(text: string): string {
  return text
    .replace(/집중\s*저하/g, ' ')
    .replace(/수업\s*방해/g, ' ')
    .replace(/태도\s*불량/g, ' ')
    .replace(/졸음/g, ' ')
    .replace(/잡담/g, ' ')
    .replace(/우수/g, ' ')
    .replace(/수업태도/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseStudentAttitudeVoice(
  transcript: string,
  cardStudent: VoiceStudentRef,
  roster: VoiceStudentRef[],
  absent: boolean,
): StudentAttitudeVoiceParse {
  const raw = transcript.replace(/\s+/g, ' ').trim()
  if (absent) {
    return { apply: false, skippedAbsent: true, needsReview: [] }
  }
  if (!raw) {
    return {
      apply: false,
      skippedAbsent: false,
      needsReview: [{ label: cardStudent.name, reason: '인식된 내용이 없습니다' }],
    }
  }

  const other = roster.find(
    (student) => student.id !== cardStudent.id && startsWithStudentName(raw, student),
  )
  if (other) {
    return {
      apply: false,
      skippedAbsent: false,
      needsReview: [{ label: other.name, reason: '다른 학생 카드에서 입력됨' }],
    }
  }

  const withoutName = stripLeadingName(raw, cardStudent.name)
  const { structured, note: markedNote } = splitComment(withoutName)
  const issues = parseAttitudeIssuePhrases(structured)
  const saidExcellent = /우수/.test(structured.replace(/\s+/g, ''))
  const leftover = stripIssueWords(structured)

  let note = markedNote
  if (!note && leftover && issues.length === 0 && !saidExcellent) {
    note = leftover
  } else if (!note && leftover && issues.length > 0) {
    note = leftover
  }

  const nextIssues = saidExcellent ? [] : issues.length > 0 ? issues : undefined
  if (nextIssues === undefined && !note) {
    return {
      apply: false,
      skippedAbsent: false,
      needsReview: [{ label: cardStudent.name, reason: '수업태도 항목을 찾지 못함' }],
    }
  }

  return {
    apply: true,
    skippedAbsent: false,
    issues: nextIssues,
    note,
    needsReview: [],
  }
}
