/**
 * 통합 종합진단 REPORT 데이터 빌더 (additive).
 * 기존 개별 REPORT builder를 재사용하며, 세션 기준으로 수학/영어/설문을 묶는다.
 */
import {
  buildEntranceExamDiagnosticReport,
  type EntranceExamDiagnosticReport,
} from './buildEntranceExamReport'
import { LEARNING_SURVEY_AREAS } from './learningSurvey'
import type {
  EntranceExamAttempt,
  EntranceExamEvaluationSession,
  EntranceExamLearningSurvey,
  EntranceExamQuestion,
} from './types'

export type EntranceExamIntegratedReport = {
  sessionId: string
  studentInfo: {
    studentName: string
    school: string
    grade: string
    evaluationDate: string
    /** 예: "수학 · 영어" */
    subjects: string
  }
  math: EntranceExamDiagnosticReport | null
  english: EntranceExamDiagnosticReport | null
  learningSurvey: NonNullable<EntranceExamDiagnosticReport['learningSurvey']> | null
  completeness: {
    hasMath: boolean
    hasEnglish: boolean
    hasSurvey: boolean
  }
}

function shortenAxis(label: string): string {
  if (label.length <= 5) return label
  return label
    .replace('자기주도성', '자기주도')
    .replace('학습 지속력', '지속력')
    .replace('학습 자신감', '자신감')
    .replace('학습 동기', '동기')
    .trim()
}

function buildLearningSurveyBlock(
  survey: EntranceExamLearningSurvey,
): NonNullable<EntranceExamDiagnosticReport['learningSurvey']> {
  const areas = LEARNING_SURVEY_AREAS.map((area) => {
    const score =
      area.id === 'motivation'
        ? survey.motivationScore
        : area.id === 'selfDirected'
          ? survey.selfDirectedScore
          : area.id === 'concentration'
            ? survey.concentrationScore
            : area.id === 'planning'
              ? survey.planningScore
              : area.id === 'persistence'
                ? survey.persistenceScore
                : survey.confidenceScore
    return { id: area.id, label: area.label, score }
  })
  return {
    overallScore: survey.overallScore,
    areas,
    radarPoints: areas.map((item) => ({
      axis: item.label,
      shortAxis: shortenAxis(item.label),
      value: item.score,
      displayScore: `${item.score}`,
    })),
  }
}

/**
 * 평가 세션 + 연결된 attempt/survey → 통합 REPORT 정규화.
 * 설문은 세션에서 선택한 1건만 사용(과목별 attempt에 붙은 설문 중복 표시 방지).
 */
export function buildEntranceExamIntegratedReport(params: {
  session: EntranceExamEvaluationSession
  mathAttempt: EntranceExamAttempt | null
  englishAttempt: EntranceExamAttempt | null
  survey: EntranceExamLearningSurvey | null
  questions: EntranceExamQuestion[]
}): EntranceExamIntegratedReport {
  const { session, mathAttempt, englishAttempt, survey, questions } = params

  const math =
    mathAttempt != null
      ? buildEntranceExamDiagnosticReport({
          attempt: mathAttempt,
          survey: null,
          questions,
        })
      : null

  const english =
    englishAttempt != null
      ? buildEntranceExamDiagnosticReport({
          attempt: englishAttempt,
          survey: null,
          questions,
        })
      : null

  return {
    sessionId: session.id,
    studentInfo: {
      studentName: session.studentName,
      school: session.school,
      grade: session.grade,
      evaluationDate: session.evaluationDate,
      subjects: [math ? '수학' : null, english ? '영어' : null].filter(Boolean).join(' · ') || '-',
    },
    math,
    english,
    learningSurvey: survey ? buildLearningSurveyBlock(survey) : null,
    completeness: {
      hasMath: Boolean(math),
      hasEnglish: Boolean(english),
      hasSurvey: Boolean(survey),
    },
  }
}

/** 세션 메타와 attempt/survey 후보 매칭 점수 (자동 강제 연결 아님 — UI 정렬용) */
export function scoreEvaluationCandidateMatch(
  meta: { studentName: string; school: string; grade: string; evaluationDate: string },
  candidate: {
    studentName: string
    school: string
    grade: string
    examDate?: string
    createdAt?: string
  },
): number {
  const norm = (v: string) => v.trim().toLowerCase()
  let score = 0
  if (meta.studentName && norm(meta.studentName) === norm(candidate.studentName)) score += 4
  if (meta.school && norm(meta.school) === norm(candidate.school)) score += 2
  if (meta.grade && norm(meta.grade) === norm(candidate.grade)) score += 2
  const candidateDate = (candidate.examDate || candidate.createdAt || '').slice(0, 10)
  if (meta.evaluationDate && candidateDate && meta.evaluationDate === candidateDate) score += 2
  return score
}
