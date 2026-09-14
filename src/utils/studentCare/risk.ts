import type {
  AttendanceRecord,
  ClassAttitudeIssue,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  LearningRiskLevel,
  StudentDailyCareRecord,
} from '../../types/records.ts'
import {
  RISK_ATTITUDE_PER_ISSUE,
  RISK_ATTITUDE_PER_LESSON_CAP,
  RISK_PARTIAL_HOMEWORK,
  RISK_PARTIAL_MATERIAL,
  RISK_TEST_70_79,
  RISK_TEST_80_84,
  RISK_TEST_BELOW_70,
  RISK_UNEXCUSED_LATE,
  RISK_WINDOW_LESSONS,
} from './constants.ts'
import {
  dailyTestDayScore,
  homeworkDayCategory,
  isUnexcusedAbsent,
  isUnexcusedLate,
} from './scoring.ts'
import { collectEvaluableLessonDates, type StudentCareLessonInput } from './lessons.ts'

export type RiskReason = {
  date: string
  fact: string
  points: number
}

export type LearningRiskResult = {
  level: LearningRiskLevel
  score: number
  unexcusedAbsent: boolean
  windowDates: string[]
  reasons: RiskReason[]
}

/** 학부모 Today Report 표시용 4단계. 조기 위험신호 3단계(우수/주의/위험)와 별개. */
export type PriorDayLearningGrade = '우수' | '양호' | '주의' | '위험'

export type PriorDayLearningEvaluation = {
  grade: PriorDayLearningGrade
  score: number
  unexcusedAbsent: boolean
  reportDate: string
  reasons: RiskReason[]
}

function testRiskPoints(score: number): number {
  if (score >= 85) return 0
  if (score >= 80) return RISK_TEST_80_84
  if (score >= 70) return RISK_TEST_70_79
  return RISK_TEST_BELOW_70
}

function attitudeRiskPoints(issues: ClassAttitudeIssue[]): number {
  if (issues.length === 0) return 0
  return Math.min(RISK_ATTITUDE_PER_LESSON_CAP, issues.length * RISK_ATTITUDE_PER_ISSUE)
}

/** 기존 조기신호와 동일한 한 수업 포인트. 새 배점 없음. */
export function scoreLessonRisk(
  input: StudentCareLessonInput,
  date: string,
): { date: string; points: number; unexcusedAbsent: boolean; reasons: RiskReason[] } {
  const reasons: RiskReason[] = []
  let points = 0
  let unexcusedAbsent = false

  const attendance = input.attendance.find(
    (record) => record.studentId === input.studentId && record.date === date,
  )
  if (isUnexcusedAbsent(attendance)) {
    unexcusedAbsent = true
    reasons.push({ date, fact: '무단결석', points: 0 })
  } else if (isUnexcusedLate(attendance)) {
    points += RISK_UNEXCUSED_LATE
    reasons.push({ date, fact: '무단지각', points: RISK_UNEXCUSED_LATE })
  }

  const care = input.dailyCare.find(
    (record) => record.studentId === input.studentId && record.date === date,
  )
  if (care?.materialPrep === '부분 지참') {
    points += RISK_PARTIAL_MATERIAL
    reasons.push({ date, fact: '교재 부분지참', points: RISK_PARTIAL_MATERIAL })
  }

  const homeworkStatuses = homeworkStatusesForDate(input, date)
  const homeworkCategory = homeworkDayCategory(homeworkStatuses)
  if (homeworkCategory === 'partial' || homeworkCategory === 'incomplete') {
    points += RISK_PARTIAL_HOMEWORK
    reasons.push({
      date,
      fact: homeworkCategory === 'incomplete' ? '숙제 미완료' : '숙제 부분완료',
      points: RISK_PARTIAL_HOMEWORK,
    })
  }

  const tests = input.dailyTests.filter(
    (record) => record.studentId === input.studentId && record.date === date,
  )
  const testScore = dailyTestDayScore(tests)
  if (testScore != null) {
    const testPoints = testRiskPoints(testScore)
    if (testPoints > 0) {
      points += testPoints
      reasons.push({
        date,
        fact: `일일테스트 ${Math.round(testScore)}점`,
        points: testPoints,
      })
    }
  }

  const issues = care?.attitudeIssues ?? []
  const attitudePoints = attitudeRiskPoints(issues)
  if (attitudePoints > 0) {
    points += attitudePoints
    reasons.push({
      date,
      fact: `수업태도 ${issues.join(', ')}`,
      points: attitudePoints,
    })
  }

  return {
    date,
    points,
    unexcusedAbsent,
    reasons: reasons.filter((reason) => reason.points > 0 || reason.fact === '무단결석'),
  }
}

export function computeLearningRisk(
  input: StudentCareLessonInput,
  asOfDate?: string,
): LearningRiskResult {
  const windowDates = collectEvaluableLessonDates(input, asOfDate).slice(-RISK_WINDOW_LESSONS)
  const reasons: RiskReason[] = []
  let score = 0
  let unexcusedAbsent = false

  for (const date of windowDates) {
    const lesson = scoreLessonRisk(input, date)
    score += lesson.points
    unexcusedAbsent = unexcusedAbsent || lesson.unexcusedAbsent
    reasons.push(...lesson.reasons)
  }

  const level: LearningRiskLevel = unexcusedAbsent || score >= 4 ? '위험' : score >= 1 ? '주의' : '우수'

  return {
    level,
    score,
    unexcusedAbsent,
    windowDates,
    reasons,
  }
}

export function priorDayLearningGradeFromScore(
  score: number,
  unexcusedAbsent: boolean,
): PriorDayLearningGrade {
  if (unexcusedAbsent || score >= 4) return '위험'
  if (score >= 2) return '주의'
  if (score >= 1) return '양호'
  return '우수'
}

/** 보고 있는 Today Report 날짜 1일에 기존 수업 포인트를 적용한 학부모 표시. */
export function computePriorDayLearningEvaluation(
  input: StudentCareLessonInput,
  reportDate: string,
): PriorDayLearningEvaluation {
  const lesson = scoreLessonRisk(input, reportDate)
  return {
    grade: priorDayLearningGradeFromScore(lesson.points, lesson.unexcusedAbsent),
    score: lesson.points,
    unexcusedAbsent: lesson.unexcusedAbsent,
    reportDate,
    reasons: lesson.reasons,
  }
}

export function riskLevelLabel(level: LearningRiskLevel): string {
  if (level === '우수') return '🟢 우수'
  if (level === '주의') return '🟡 주의'
  return '🔴 위험'
}

export function priorDayLearningGradeLabel(grade: PriorDayLearningGrade): string {
  if (grade === '우수') return '🟢 우수'
  if (grade === '양호') return '🔵 양호'
  if (grade === '주의') return '🟡 주의'
  return '🔴 위험'
}

function homeworkStatusesForDate(input: StudentCareLessonInput, date: string) {
  const slots = input.homeworkTextbookEntries.filter(
    (entry) => entry.studentId === input.studentId && entry.date === date,
  )
  if (slots.length > 0) return slots.map((entry) => entry.status)
  return input.homework
    .filter((record) => record.studentId === input.studentId && record.date === date)
    .map((record) => record.status)
}

export type {
  AttendanceRecord,
  DailyTestRecord,
  HomeworkRecord,
  HomeworkTextbookEntry,
  StudentDailyCareRecord,
}
