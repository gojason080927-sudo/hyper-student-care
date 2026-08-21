import { normalizeEntranceExamAreaLabel } from './constants'
import { choiceLabel, formatAreaScoreDisplay } from './grading'
import {
  LEARNING_SURVEY_AREAS,
  LEARNING_SURVEY_LIKERT,
  LEARNING_SURVEY_QUESTIONS,
} from './learningSurvey'
import type {
  EntranceExamAttempt,
  EntranceExamLearningSurvey,
  EntranceExamQuestion,
  EntranceExamSubject,
} from './types'

/** Phase 4 정규화 REPORT + Phase 5 규칙 기반 진단 엔진 입력 */
export type EntranceExamDiagnosticReport = {
  studentInfo: {
    attemptId: string
    studentName: string
    school: string
    grade: string
    subject: EntranceExamSubject
    examDate: string
    paperTitle: string
  }
  academicResult: {
    subject: EntranceExamSubject
    totalScore: number
    correctCount: number
    totalCount: number
  }
  academicAreas: Array<{
    area: string
    score: number | null
    correctCount: number
    totalCount: number
    status: 'accuracy' | 'unavailable' | 'needs_time'
    scoreText: string
    fractionText: string
  }>
  /** radar용: 유효 점수만 (문항 없는 영역 0점 강제 제외) */
  academicRadarPoints: Array<{
    axis: string
    shortAxis: string
    value: number
    displayScore: string
  }>
  learningSurvey: {
    overallScore: number
    areas: Array<{
      id: string
      label: string
      score: number
    }>
    radarPoints: Array<{
      axis: string
      shortAxis: string
      value: number
      displayScore: string
    }>
  } | null
  questionDetails: Array<{
    number: number
    questionId: string
    studentChoice: number | null
    correctChoice: number
    isCorrect: boolean
    studentLabel: string
    correctLabel: string
    evaluationAreas: string[]
  }>
  surveyDetails: Array<{
    number: number
    text: string
    areaLabel: string
    value: number | null
    valueLabel: string
  }> | null
  completeness: {
    hasAttempt: true
    hasSurvey: boolean
  }
}

function shortenAxis(label: string): string {
  if (label.length <= 5) return label
  return label
    .replace(' 능력', '')
    .replace(' 이해도', '이해')
    .replace(' 정확도', '정확')
    .replace('자기주도성', '자기주도')
    .replace('학습 지속력', '지속력')
    .replace('학습 자신감', '자신감')
    .replace('학습 동기', '동기')
    .trim()
}

function likertLabel(value: number | null): string {
  if (value == null) return '-'
  return LEARNING_SURVEY_LIKERT.find((item) => item.value === value)?.label ?? String(value)
}

/**
 * attempt_id 기준으로 응시 결과 + 설문 + 문제 메타를 하나의 REPORT 객체로 정규화.
 */
export function buildEntranceExamDiagnosticReport(params: {
  attempt: EntranceExamAttempt
  survey: EntranceExamLearningSurvey | null
  questions: EntranceExamQuestion[]
}): EntranceExamDiagnosticReport {
  const { attempt, survey, questions } = params
  const questionById = new Map(questions.map((item) => [item.id, item]))

  const academicAreas = attempt.areaScores.map((item) => {
    const view = formatAreaScoreDisplay(item)
    return {
      // 영어 legacy 영역명은 REPORT/Radar/진단에서 확정 명칭으로 표시
      area: normalizeEntranceExamAreaLabel(item.area, attempt.subject),
      score: item.score,
      correctCount: item.correctCount,
      totalCount: item.totalCount,
      status: item.status,
      scoreText: view.scoreText,
      fractionText: view.fractionText,
    }
  })

  const academicRadarPoints = academicAreas
    .filter((item) => item.status === 'accuracy' && item.score != null)
    .map((item) => ({
      axis: item.area,
      shortAxis: shortenAxis(item.area),
      value: item.score as number,
      displayScore: `${item.score}`,
    }))

  const learningSurvey = survey
    ? (() => {
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
      })()
    : null

  const questionDetails = [...attempt.answers]
    .sort((a, b) => a.number - b.number)
    .map((answer) => {
      const question = questionById.get(answer.questionId)
      return {
        number: answer.number,
        questionId: answer.questionId,
        studentChoice: answer.studentChoice,
        correctChoice: answer.correctChoice,
        isCorrect: answer.isCorrect,
        studentLabel: choiceLabel(answer.studentChoice),
        correctLabel: choiceLabel(answer.correctChoice),
        evaluationAreas: (question?.evaluationAreas ?? []).map((area) =>
          normalizeEntranceExamAreaLabel(area, attempt.subject),
        ),
      }
    })

  const surveyDetails = survey
    ? LEARNING_SURVEY_QUESTIONS.map((question) => {
        const area = LEARNING_SURVEY_AREAS.find((item) => item.id === question.areaId)
        const raw = survey.responses[String(question.number)]
        const value =
          typeof raw === 'number' && raw >= 1 && raw <= 5 ? raw : null
        return {
          number: question.number,
          text: question.text,
          areaLabel: area?.label ?? '',
          value,
          valueLabel: likertLabel(value),
        }
      })
    : null

  return {
    studentInfo: {
      attemptId: attempt.id,
      studentName: attempt.studentName,
      school: attempt.school,
      grade: attempt.grade,
      subject: attempt.subject,
      examDate: attempt.examDate,
      paperTitle: attempt.paperTitle,
    },
    academicResult: {
      subject: attempt.subject,
      totalScore: attempt.totalScore,
      correctCount: attempt.correctCount,
      totalCount: attempt.totalCount,
    },
    academicAreas,
    academicRadarPoints,
    learningSurvey,
    questionDetails,
    surveyDetails,
    completeness: {
      hasAttempt: true,
      hasSurvey: Boolean(survey),
    },
  }
}
