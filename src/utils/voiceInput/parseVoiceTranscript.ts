import { CLASS_ATTITUDE_ISSUES } from '../../types/records'
import type {
  AttendanceExcuseKind,
  AttendanceStatus,
  ClassAttitudeIssue,
  HomeworkStatus,
  MaterialPrepStatus,
} from '../../types/records'
import { markStudentTokens } from './nameMatch'
import {
  clauseHasContinuation,
  extractScoreValue,
  isExcellentAttitudePhrase,
  parseAttendanceStatusPhrase,
  parseHomeworkStatusPhrase,
  parseMaterialStatusPhrase,
  parseAttitudeIssuePhrases,
  parseWrongCausePhrases,
  SID_EXCLUDE_RE,
  SID_ONLY_RE,
  SID_TOKEN_RE,
  splitVoiceClauses,
  statedOnlyCount,
  stripVoiceFillers,
} from './voiceLexicon'
import type {
  AttendanceVoiceAssignment,
  AttitudeVoiceAssignment,
  DailyTestVoiceAssignment,
  HomeworkVoiceAssignment,
  MaterialVoiceAssignment,
  VoiceParseResult,
  VoiceReviewItem,
  VoiceStudentRef,
} from './types'

const COLLECTIVE_RE = /(전원|모두|전부|나머지|다른\s*애들|다른\s*학생들?|전체)/

function studentById(
  students: VoiceStudentRef[],
  id: string,
): VoiceStudentRef | undefined {
  return students.find((student) => student.id === id)
}

function splitClauses(tokenized: string): string[] {
  return splitVoiceClauses(stripVoiceFillers(tokenized))
}

function extractMemo(clause: string): { clause: string; memo: string } {
  const memoMatch = clause.match(/(?:강사의\s*의견|강사\s*의견|의견|메모|노트|피드백)\s*[:：]?\s*(.+)$/)
  if (!memoMatch) return { clause, memo: '' }
  const idx = memoMatch.index ?? -1
  if (idx < 0) return { clause, memo: '' }
  return {
    clause: clause.slice(0, idx).trim(),
    memo: memoMatch[1]?.trim() ?? '',
  }
}

function parseAttendanceStatus(clause: string): AttendanceStatus | null {
  return parseAttendanceStatusPhrase(clause)
}

function parseExcuseKind(clause: string): {
  excuseKind: AttendanceExcuseKind | null
  excuseNeedsReview: boolean
} {
  const has인정 = clause.includes('인정')
  const has무단 = clause.includes('무단')
  if (has인정 && !has무단) return { excuseKind: '인정', excuseNeedsReview: false }
  if (has무단 && !has인정) return { excuseKind: '무단', excuseNeedsReview: false }
  if (clause.includes('병결') || clause.includes('병원') || clause.includes('아파')) {
    return { excuseKind: null, excuseNeedsReview: true }
  }
  return { excuseKind: null, excuseNeedsReview: false }
}

function parseHomeworkStatus(clause: string): HomeworkStatus | null {
  const parsed = parseHomeworkStatusPhrase(clause)
  if (parsed === '부분 완료' || parsed === '완료') return parsed
  return null
}

function parseMaterialStatus(clause: string): {
  status: MaterialPrepStatus | null
  mappedFromUncertain: boolean
  ambiguous: boolean
} {
  return parseMaterialStatusPhrase(clause)
}

function parseAttitudeIssues(clause: string): ClassAttitudeIssue[] {
  const issues = parseAttitudeIssuePhrases(clause)
  return CLASS_ATTITUDE_ISSUES.filter((issue) => issues.includes(issue))
}

function isExcellentAttitude(clause: string): boolean {
  return isExcellentAttitudePhrase(clause)
}

function idsFromClause(clause: string): string[] {
  const ids: string[] = []
  const re = new RegExp(SID_TOKEN_RE.source, 'g')
  let match: RegExpExecArray | null = re.exec(clause)
  while (match) {
    if (match[1]) ids.push(match[1])
    match = re.exec(clause)
  }
  return ids
}

function excludedIdsFromClause(clause: string): string[] {
  const ids: string[] = []
  const re = new RegExp(SID_EXCLUDE_RE.source, 'g')
  let match: RegExpExecArray | null = re.exec(clause)
  while (match) {
    if (match[1]) ids.push(match[1])
    match = re.exec(clause)
  }
  return ids
}

function onlyIdsFromClause(clause: string): string[] {
  if (!SID_ONLY_RE.test(clause)) return []
  return idsFromClause(clause)
}

function unknownNameReviews(tokenized: string): VoiceReviewItem[] {
  const stripped = tokenized.replace(/«SID:[^»]+»/g, ' ')
  const leftover = stripped.match(/[가-힣]{2,4}(?=\s*(?:만|제외|빼고|점|결석|출석|지각|조퇴|완료|지참|우수|졸음|잡담))/g)
  if (!leftover) return []
  const skip = new Set([
    '전원',
    '모두',
    '전부',
    '전체',
    '나머지',
    '부분',
    '일부',
    '인정',
    '무단',
    '병결',
    '숙제',
    '교재',
    '출석',
    '결석',
    '지각',
    '조퇴',
    '완료',
    '지참',
    '우수',
    '메모',
    '피드백',
    '일일',
    '테스트',
    '학생',
    '애들',
    '다른',
  ])
  const items: VoiceReviewItem[] = []
  const seen = new Set<string>()
  for (const name of leftover) {
    if (skip.has(name) || seen.has(name)) continue
    seen.add(name)
    items.push({ label: name, reason: '현재 반 명단에서 정확히 찾지 못함' })
  }
  return items
}

type NamedValue<T> = {
  studentId: string
  value: T
}

function collectNamedAndCollective<T>(
  tokenized: string,
  parseValue: (clause: string) => T | null,
  extraReview: (clause: string, studentIds: string[], value: T | null) => VoiceReviewItem[],
): {
  collective: T | null
  excluded: Set<string>
  named: NamedValue<T>[]
  needsReview: VoiceReviewItem[]
} {
  const named: NamedValue<T>[] = []
  const excluded = new Set<string>()
  const needsReview: VoiceReviewItem[] = [...unknownNameReviews(tokenized)]
  let collective: T | null = null
  let lastNamedValue: T | null = null

  for (const rawClause of splitClauses(tokenized)) {
    const excludedHere = excludedIdsFromClause(rawClause)
    for (const id of excludedHere) excluded.add(id)

    const clauseWithoutExclude = rawClause
      .replace(
        /«SID:[^»]+»(?:은|는|이|가|이가|이는|을|를|랑|이랑|하고|도)?\s*(?:제외(?:하고)?|빼고|말고|외에는)/g,
        ' ',
      )
      .replace(/\s+/g, ' ')
      .trim()
    const value = parseValue(clauseWithoutExclude)
    needsReview.push(...extraReview(clauseWithoutExclude, idsFromClause(rawClause), value))

    if (COLLECTIVE_RE.test(clauseWithoutExclude) && value !== null) {
      collective = value
    }

    const stated = statedOnlyCount(clauseWithoutExclude)
    let onlyIds = onlyIdsFromClause(clauseWithoutExclude)
    if (onlyIds.length === 0 && stated != null) {
      onlyIds = idsFromClause(clauseWithoutExclude)
    }
    if (onlyIds.length > 0 && value !== null) {
      if (stated != null && stated !== onlyIds.length) {
        needsReview.push({
          label: '인원',
          reason: '말한 인원과 이름 수가 달라 확인 필요',
        })
      }
      for (const id of onlyIds) named.push({ studentId: id, value })
      lastNamedValue = value
      continue
    }

    if (
      value === null &&
      lastNamedValue !== null &&
      clauseHasContinuation(clauseWithoutExclude)
    ) {
      for (const id of idsFromClause(clauseWithoutExclude)) {
        named.push({ studentId: id, value: lastNamedValue })
      }
      continue
    }

    const remainingIds = idsFromClause(clauseWithoutExclude).filter(
      (id) => !onlyIds.includes(id) && !excludedHere.includes(id),
    )
    if (
      excludedHere.length > 0 &&
      value !== null &&
      remainingIds.length === 0 &&
      onlyIds.length === 0
    ) {
      collective = value
    }
    if (remainingIds.length > 0 && value !== null && !COLLECTIVE_RE.test(clauseWithoutExclude)) {
      for (const id of remainingIds) named.push({ studentId: id, value })
      lastNamedValue = value
    }
  }

  return { collective, excluded, named, needsReview }
}

function finishStudentAssignments<T>(
  students: VoiceStudentRef[],
  absentIds: Set<string>,
  skipAbsent: boolean,
  parsed: {
    collective: T | null
    excluded: Set<string>
    named: NamedValue<T>[]
    needsReview: VoiceReviewItem[]
  },
  mapValue: (studentId: string, value: T) => unknown,
): {
  assignments: unknown[]
  skippedAbsentIds: string[]
  needsReview: VoiceReviewItem[]
} {
  const byStudent = new Map<string, T>()
  const skippedAbsentIds: string[] = []

  if (parsed.collective !== null) {
    for (const student of students) {
      if (parsed.excluded.has(student.id)) continue
      if (skipAbsent && absentIds.has(student.id)) {
        skippedAbsentIds.push(student.id)
        continue
      }
      byStudent.set(student.id, parsed.collective)
    }
  }

  for (const item of parsed.named) {
    if (skipAbsent && absentIds.has(item.studentId)) {
      if (!skippedAbsentIds.includes(item.studentId)) skippedAbsentIds.push(item.studentId)
      continue
    }
    byStudent.set(item.studentId, item.value)
  }

  for (const id of parsed.excluded) {
    if (byStudent.has(id)) continue
    const student = studentById(students, id)
    if (skipAbsent && absentIds.has(id)) {
      if (!skippedAbsentIds.includes(id)) skippedAbsentIds.push(id)
      continue
    }
    parsed.needsReview.push({
      label: student?.name ?? id,
      reason: '제외만 말하고 대체 값이 없어 확인 필요',
    })
  }

  const assignments = [...byStudent.entries()].map(([studentId, value]) =>
    mapValue(studentId, value),
  )

  return {
    assignments,
    skippedAbsentIds,
    needsReview: parsed.needsReview,
  }
}

export function parseAttendanceVoice(
  transcript: string,
  students: VoiceStudentRef[],
): VoiceParseResult<AttendanceVoiceAssignment> {
  const { tokenized, duplicateReviews } = markStudentTokens(transcript, students)
  const excuseByStudent = new Map<
    string,
    { excuseKind: AttendanceExcuseKind | null; excuseNeedsReview: boolean }
  >()

  const parsed = collectNamedAndCollective(tokenized, parseAttendanceStatus, (clause, ids) => {
    const excuse = parseExcuseKind(clause)
    for (const id of ids) {
      const prev = excuseByStudent.get(id)
      excuseByStudent.set(id, {
        excuseKind: excuse.excuseKind ?? prev?.excuseKind ?? null,
        excuseNeedsReview: excuse.excuseNeedsReview || Boolean(prev?.excuseNeedsReview),
      })
    }
    if (COLLECTIVE_RE.test(clause) && excuse.excuseKind) {
      for (const student of students) {
        if (!excuseByStudent.has(student.id)) excuseByStudent.set(student.id, excuse)
      }
    }
    const reviews: VoiceReviewItem[] = []
    if (clause.includes('병결') || clause.includes('병원') || clause.includes('아파')) {
      for (const id of ids.length > 0 ? ids : ['*']) {
        const student = studentById(students, id)
        reviews.push({
          label: student?.name ?? '병결',
          reason: '인정/무단을 임의 변환하지 않음',
        })
      }
    }
    return reviews
  })

  const finished = finishStudentAssignments(
    students,
    new Set(),
    false,
    parsed,
    (studentId, status) => {
      const excuse = excuseByStudent.get(studentId)
      const assignment: AttendanceVoiceAssignment = {
        studentId,
        status,
        excuseKind:
          status === '결석' || status === '지각' ? (excuse?.excuseKind ?? null) : null,
      }
      return assignment
    },
  )

  const assignments = finished.assignments as AttendanceVoiceAssignment[]
  const needsReview = [...duplicateReviews, ...finished.needsReview]

  for (const row of assignments) {
    if ((row.status === '결석' || row.status === '지각') && !row.excuseKind) {
      const student = studentById(students, row.studentId)
      const already = needsReview.some(
        (item) => item.label === (student?.name ?? row.studentId) && item.reason.includes('인정/무단'),
      )
      if (!already) {
        needsReview.push({
          label: student?.name ?? row.studentId,
          reason: '인정/무단 확인 필요',
        })
      }
    }
  }

  return {
    assignments,
    skippedAbsentIds: [],
    needsReview,
  }
}

export function parseHomeworkVoice(
  transcript: string,
  students: VoiceStudentRef[],
  absentIds: Set<string>,
): VoiceParseResult<HomeworkVoiceAssignment> {
  const { tokenized, duplicateReviews } = markStudentTokens(transcript, students)
  const parsed = collectNamedAndCollective(tokenized, parseHomeworkStatus, (clause, ids, value) => {
    const parsedStatus = parseHomeworkStatusPhrase(clause)
    if (parsedStatus === 'ambiguous') {
      return (ids.length > 0 ? ids : ['*']).map((id) => ({
        label: studentById(students, id)?.name ?? '숙제',
        reason: '상태가 분명하지 않아 확인 필요',
      }))
    }
    if (value !== null) return []
    if (parsedStatus === 'blocked') {
      return (ids.length > 0 ? ids : ['*']).map((id) => ({
        label: studentById(students, id)?.name ?? '숙제',
        reason: '신규 입력은 완료/부분 완료만 허용',
      }))
    }
    return []
  })
  const finished = finishStudentAssignments(
    students,
    absentIds,
    true,
    parsed,
    (studentId, status) => ({ studentId, status }) satisfies HomeworkVoiceAssignment,
  )
  return {
    assignments: finished.assignments as HomeworkVoiceAssignment[],
    skippedAbsentIds: finished.skippedAbsentIds,
    needsReview: [...duplicateReviews, ...finished.needsReview],
  }
}

export function parseMaterialVoice(
  transcript: string,
  students: VoiceStudentRef[],
  absentIds: Set<string>,
): VoiceParseResult<MaterialVoiceAssignment> {
  const { tokenized, duplicateReviews } = markStudentTokens(transcript, students)
  const uncertain = new Set<string>()
  const parsed = collectNamedAndCollective(
    tokenized,
    (clause) => parseMaterialStatus(clause).status,
    (clause, ids) => {
      const parsedStatus = parseMaterialStatus(clause)
      if (parsedStatus.ambiguous) {
        return (ids.length > 0 ? ids : ['*']).map((id) => ({
          label: studentById(students, id)?.name ?? '교재',
          reason: '상태가 분명하지 않아 확인 필요',
        }))
      }
      if (parsedStatus.mappedFromUncertain) {
        const targets = ids.length > 0 ? ids : students.map((s) => s.id)
        for (const id of targets) uncertain.add(id)
        return targets.map((id) => ({
          label: studentById(students, id)?.name ?? '교재',
          reason: '미지참은 DB 값이 아니라 부분 지참으로 표시 — 확인 필요',
        }))
      }
      return []
    },
  )
  const finished = finishStudentAssignments(
    students,
    absentIds,
    true,
    parsed,
    (studentId, status) =>
      ({
        studentId,
        status,
        mappedFromUncertain: uncertain.has(studentId),
      }) satisfies MaterialVoiceAssignment,
  )
  return {
    assignments: finished.assignments as MaterialVoiceAssignment[],
    skippedAbsentIds: finished.skippedAbsentIds,
    needsReview: [...duplicateReviews, ...finished.needsReview],
  }
}

type AttitudeParsed = {
  issues: ClassAttitudeIssue[]
  note: string
}

export function parseAttitudeVoice(
  transcript: string,
  students: VoiceStudentRef[],
  absentIds: Set<string>,
): VoiceParseResult<AttitudeVoiceAssignment> {
  const { tokenized, duplicateReviews } = markStudentTokens(transcript, students)
  const noteByStudent = new Map<string, string>()
  const parsed = collectNamedAndCollective<AttitudeParsed>(
    tokenized,
    (rawClause) => {
      const { clause, memo } = extractMemo(rawClause)
      const issues = parseAttitudeIssues(clause)
      const excellent = isExcellentAttitude(clause)
      if (!excellent && issues.length === 0 && !memo) return null
      return { issues: excellent ? [] : issues, note: memo }
    },
    (rawClause, ids, value) => {
      const { memo } = extractMemo(rawClause)
      if (memo) {
        const targets = ids.length > 0 ? ids : []
        for (const id of targets) noteByStudent.set(id, memo)
      }
      if (value && value.issues.length === 0 && !isExcellentAttitude(rawClause) && !extractMemo(rawClause).memo) {
        return [{ label: '수업태도', reason: '허용된 태도 항목을 찾지 못함' }]
      }
      return []
    },
  )

  const finished = finishStudentAssignments(
    students,
    absentIds,
    true,
    parsed,
    (studentId, value) =>
      ({
        studentId,
        issues: value.issues,
        note: (noteByStudent.get(studentId) || value.note).slice(0, 500),
      }) satisfies AttitudeVoiceAssignment,
  )

  const assignments = finished.assignments as AttitudeVoiceAssignment[]
  const leftoverMemo = extractMemo(tokenized).memo
  if (leftoverMemo && assignments.length > 0) {
    const namedHasMemo = assignments.some((row) => row.note)
    if (!namedHasMemo) {
      for (const row of assignments) {
        if (row.issues.length > 0) row.note = leftoverMemo.slice(0, 500)
      }
    }
  }

  return {
    assignments,
    skippedAbsentIds: finished.skippedAbsentIds,
    needsReview: [...duplicateReviews, ...finished.needsReview],
  }
}

function parseWrongCauseDeltas(clause: string): {
  conceptLackDelta: number
  calculationErrorDelta: number
  applicationLackDelta: number
} {
  return parseWrongCausePhrases(clause)
}

export function parseDailyTestVoice(
  transcript: string,
  students: VoiceStudentRef[],
  absentIds: Set<string>,
  round: 1 | 2 | 3 | 4 | null,
): VoiceParseResult<DailyTestVoiceAssignment> {
  const { tokenized, duplicateReviews } = markStudentTokens(transcript, students)
  const needsReview: VoiceReviewItem[] = [...duplicateReviews, ...unknownNameReviews(tokenized)]

  if (round == null) {
    needsReview.push({
      label: '일일테스트',
      reason: '차시가 없어 점수를 넣지 않음',
    })
    return { assignments: [], skippedAbsentIds: [], needsReview }
  }

  const assignments: DailyTestVoiceAssignment[] = []
  const skippedAbsentIds: string[] = []
  const pieces = tokenized.split(/(?=«SID:)/).map((part) => part.trim()).filter(Boolean)

  for (const piece of pieces) {
    const idMatch = piece.match(/«SID:([^»]+)»/)
    if (!idMatch?.[1]) continue
    const studentId = idMatch[1]
    const student = studentById(students, studentId)
    if (absentIds.has(studentId)) {
      skippedAbsentIds.push(studentId)
      continue
    }
    const { clause, memo } = extractMemo(piece)
    const scoreParsed = extractScoreValue(clause)
    const causes = parseWrongCauseDeltas(clause)
    if (!scoreParsed && !causes.conceptLackDelta && !causes.calculationErrorDelta && !causes.applicationLackDelta && !memo) {
      continue
    }
    if (scoreParsed?.invalid) {
      needsReview.push({
        label: student?.name ?? studentId,
        reason: '점수 범위 확인 필요',
      })
      continue
    }
    const rawScore = scoreParsed && !scoreParsed.invalid ? scoreParsed.score : ''
    assignments.push({
      studentId,
      round,
      score: rawScore ?? '',
      conceptLackDelta: causes.conceptLackDelta,
      calculationErrorDelta: causes.calculationErrorDelta,
      applicationLackDelta: causes.applicationLackDelta,
      teacherFeedback: memo.slice(0, 500),
    })
  }

  return { assignments, skippedAbsentIds, needsReview }
}

export function parseSectionTextVoice(transcript: string): {
  text: string
  needsReview: VoiceReviewItem[]
} {
  const text = transcript.replace(/\s+/g, ' ').trim()
  if (!text) {
    return {
      text: '',
      needsReview: [{ label: '입력', reason: '인식된 내용이 없습니다' }],
    }
  }
  return { text, needsReview: [] }
}

/**
 * Teacher status line after one voice apply.
 * `appliedCount` is parser field-patch count (see applyStudentDailyTestDraft),
 * not Web Speech recognition events and not React onFinal/apply calls.
 */
export function formatVoiceSummary(summary: {
  appliedCount: number
  excludedAbsentCount: number
  needsReviewCount: number
}): string {
  const parts = ['음성 입력 완료']
  if (summary.appliedCount > 0) parts.push(`${summary.appliedCount}건 반영`)
  if (summary.excludedAbsentCount > 0) {
    parts.push(`결석 ${summary.excludedAbsentCount}명 제외`)
  }
  if (summary.needsReviewCount > 0) {
    parts.push(`확인 필요 ${summary.needsReviewCount}건`)
  }
  return parts.join(' · ')
}
