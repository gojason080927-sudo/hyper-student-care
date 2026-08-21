/**
 * 신입생 평가 세션 그룹핑 (순수 함수).
 * REPORT 선택 단위 = 학생 + (학교/학년) + 평가일 기준 1건.
 */
import type {
  EntranceExamAttempt,
  EntranceExamEvaluationSession,
  EntranceExamLearningSurvey,
} from './types'

export type EntranceExamSessionGroup = {
  /** 안정적인 그룹 키 (URL/선택용) */
  groupKey: string
  studentName: string
  school: string
  grade: string
  evaluationDate: string
  linkedStudentId: string | null
  mathAttempt: EntranceExamAttempt | null
  englishAttempt: EntranceExamAttempt | null
  survey: EntranceExamLearningSurvey | null
  /** DB evaluation_sessions.id (있으면) */
  sessionId: string | null
  status: {
    hasMath: boolean
    hasEnglish: boolean
    hasSurvey: boolean
  }
}

export function normalizeEntranceExamText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function normalizeEvaluationDate(value: string | null | undefined): string {
  if (!value) return ''
  return String(value).trim().slice(0, 10)
}

/** student_id 우선, 없으면 name+school+grade+date */
export function buildEvaluationGroupKey(input: {
  linkedStudentId?: string | null
  studentName: string
  school: string
  grade: string
  evaluationDate: string
}): string {
  const date = normalizeEvaluationDate(input.evaluationDate)
  const studentId = input.linkedStudentId?.trim()
  if (studentId) {
    return `sid:${studentId}|d:${date}`
  }
  return [
    `n:${normalizeEntranceExamText(input.studentName)}`,
    `s:${normalizeEntranceExamText(input.school)}`,
    `g:${normalizeEntranceExamText(input.grade)}`,
    `d:${date}`,
  ].join('|')
}

function pickLatestAttempt(items: EntranceExamAttempt[]): EntranceExamAttempt | null {
  if (items.length === 0) return null
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
}

function pickLatestSurvey(items: EntranceExamLearningSurvey[]): EntranceExamLearningSurvey | null {
  if (items.length === 0) return null
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
}

/**
 * 기존 attempt/survey를 평가 세션 단위로 묶어 REPORT 목록에 사용한다.
 * 데이터 삭제·변환 없이 조회 단계에서만 그룹핑한다.
 */
export function groupEntranceExamIntoSessions(params: {
  attempts: EntranceExamAttempt[]
  surveys: EntranceExamLearningSurvey[]
  persistedSessions?: EntranceExamEvaluationSession[]
}): EntranceExamSessionGroup[] {
  const { attempts, surveys, persistedSessions = [] } = params
  const surveyByAttemptId = new Map<string, EntranceExamLearningSurvey>()
  for (const survey of surveys) {
    const prev = surveyByAttemptId.get(survey.attemptId)
    if (!prev || survey.updatedAt.localeCompare(prev.updatedAt) > 0) {
      surveyByAttemptId.set(survey.attemptId, survey)
    }
  }

  const buckets = new Map<
    string,
    {
      key: string
      studentName: string
      school: string
      grade: string
      evaluationDate: string
      linkedStudentId: string | null
      math: EntranceExamAttempt[]
      english: EntranceExamAttempt[]
      attemptIds: Set<string>
    }
  >()

  for (const attempt of attempts) {
    const evaluationDate = normalizeEvaluationDate(attempt.examDate) || attempt.createdAt.slice(0, 10)
    const key = buildEvaluationGroupKey({
      linkedStudentId: attempt.linkedStudentId,
      studentName: attempt.studentName,
      school: attempt.school,
      grade: attempt.grade,
      evaluationDate,
    })
    const existing = buckets.get(key)
    if (!existing) {
      buckets.set(key, {
        key,
        studentName: attempt.studentName.trim(),
        school: attempt.school.trim(),
        grade: attempt.grade.trim(),
        evaluationDate,
        linkedStudentId: attempt.linkedStudentId,
        math: attempt.subject === '수학' ? [attempt] : [],
        english: attempt.subject === '영어' ? [attempt] : [],
        attemptIds: new Set([attempt.id]),
      })
      continue
    }
    existing.attemptIds.add(attempt.id)
    if (attempt.subject === '수학') existing.math.push(attempt)
    if (attempt.subject === '영어') existing.english.push(attempt)
    if (!existing.linkedStudentId && attempt.linkedStudentId) {
      existing.linkedStudentId = attempt.linkedStudentId
    }
    // 표시용 메타는 비어 있지 않은 값으로 보강
    if (!existing.studentName && attempt.studentName) existing.studentName = attempt.studentName.trim()
    if (!existing.school && attempt.school) existing.school = attempt.school.trim()
    if (!existing.grade && attempt.grade) existing.grade = attempt.grade.trim()
  }

  const groups: EntranceExamSessionGroup[] = []

  for (const bucket of buckets.values()) {
    const mathAttempt = pickLatestAttempt(bucket.math)
    const englishAttempt = pickLatestAttempt(bucket.english)
    const linkedSurveys: EntranceExamLearningSurvey[] = []
    for (const attemptId of bucket.attemptIds) {
      const survey = surveyByAttemptId.get(attemptId)
      if (survey) linkedSurveys.push(survey)
    }
    const survey = pickLatestSurvey(linkedSurveys)

    const persisted = persistedSessions.find((session) => {
      if (session.mathAttemptId && bucket.attemptIds.has(session.mathAttemptId)) return true
      if (session.englishAttemptId && bucket.attemptIds.has(session.englishAttemptId)) return true
      if (survey && session.learningSurveyId === survey.id) return true
      const sessionKey = buildEvaluationGroupKey({
        linkedStudentId: null,
        studentName: session.studentName,
        school: session.school,
        grade: session.grade,
        evaluationDate: session.evaluationDate,
      })
      return sessionKey === bucket.key
    })

    groups.push({
      groupKey: bucket.key,
      studentName: bucket.studentName,
      school: bucket.school,
      grade: bucket.grade,
      evaluationDate: bucket.evaluationDate,
      linkedStudentId: bucket.linkedStudentId,
      mathAttempt,
      englishAttempt,
      survey,
      sessionId: persisted?.id ?? null,
      status: {
        hasMath: Boolean(mathAttempt),
        hasEnglish: Boolean(englishAttempt),
        hasSurvey: Boolean(survey),
      },
    })
  }

  return groups.sort((a, b) => {
    const dateCmp = (b.evaluationDate || '').localeCompare(a.evaluationDate || '')
    if (dateCmp !== 0) return dateCmp
    return a.studentName.localeCompare(b.studentName, 'ko')
  })
}

export function findSessionGroupByAttemptId(
  groups: EntranceExamSessionGroup[],
  attemptId: string,
): EntranceExamSessionGroup | null {
  if (!attemptId) return null
  return (
    groups.find(
      (group) =>
        group.mathAttempt?.id === attemptId || group.englishAttempt?.id === attemptId,
    ) ?? null
  )
}

export function formatSessionSubjects(group: EntranceExamSessionGroup): string {
  const subjects: string[] = []
  if (group.status.hasMath) subjects.push('수학')
  if (group.status.hasEnglish) subjects.push('영어')
  return subjects.length > 0 ? subjects.join(' · ') : '-'
}
