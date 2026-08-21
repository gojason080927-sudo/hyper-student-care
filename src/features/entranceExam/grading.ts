import {
  CHOICE_LABELS,
  getKnownAreaOrderForSubject,
  normalizeEntranceExamAreaLabel,
} from './constants'
import type {
  EntranceExamAnswerItem,
  EntranceExamAreaScore,
  EntranceExamQuestion,
  EntranceExamSubject,
} from './types'

/** 정답률로 산출하지 않는 평가영역 (시험 시간 등 별도 데이터 필요) */
export const ENTRANCE_EXAM_TIME_BASED_AREAS = new Set(['독해 속도'])

export function roundExamScore(value: number): number {
  return Math.round(value * 10) / 10
}

export function choiceLabel(choice: number | null | undefined): string {
  if (choice == null || choice < 1 || choice > 5) return '-'
  return CHOICE_LABELS[choice - 1] ?? String(choice)
}

/**
 * 시험지 문항 순서(questions)와 학생 답안(studentChoices[questionId])으로 채점.
 * 총점은 문항 1개=1점으로만 계산 (evaluation_areas 복수 태그는 영역 분석에만 사용).
 */
export function gradeEntranceExamAttempt(
  questions: EntranceExamQuestion[],
  studentChoices: Record<string, number | null | undefined>,
  subject: EntranceExamSubject,
): {
  answers: EntranceExamAnswerItem[]
  correctCount: number
  totalCount: number
  totalScore: number
  areaScores: EntranceExamAreaScore[]
} {
  const answers: EntranceExamAnswerItem[] = questions.map((question, index) => {
    const raw = studentChoices[question.id]
    const studentChoice =
      typeof raw === 'number' && raw >= 1 && raw <= 5 ? raw : null
    const isCorrect = studentChoice != null && studentChoice === question.correctChoice
    return {
      questionId: question.id,
      number: index + 1,
      studentChoice,
      correctChoice: question.correctChoice,
      isCorrect,
    }
  })

  const totalCount = answers.length
  const correctCount = answers.filter((item) => item.isCorrect).length
  const totalScore = totalCount === 0 ? 0 : roundExamScore((correctCount / totalCount) * 100)

  const areaCorrect = new Map<string, number>()
  const areaTotal = new Map<string, number>()

  for (const question of questions) {
    const answer = answers.find((item) => item.questionId === question.id)
    const isCorrect = Boolean(answer?.isCorrect)
    for (const rawArea of question.evaluationAreas) {
      const area = normalizeEntranceExamAreaLabel(rawArea, subject)
      if (!area || ENTRANCE_EXAM_TIME_BASED_AREAS.has(area)) continue
      areaTotal.set(area, (areaTotal.get(area) ?? 0) + 1)
      if (isCorrect) areaCorrect.set(area, (areaCorrect.get(area) ?? 0) + 1)
    }
  }

  const knownAreas = getKnownAreaOrderForSubject(subject)
  const seen = new Set<string>()
  const areaScores: EntranceExamAreaScore[] = []

  const pushArea = (area: string) => {
    if (seen.has(area)) return
    seen.add(area)
    if (ENTRANCE_EXAM_TIME_BASED_AREAS.has(area)) {
      areaScores.push({
        area,
        correctCount: 0,
        totalCount: 0,
        score: null,
        status: 'needs_time',
      })
      return
    }
    const total = areaTotal.get(area) ?? 0
    const correct = areaCorrect.get(area) ?? 0
    if (total === 0) {
      areaScores.push({
        area,
        correctCount: 0,
        totalCount: 0,
        score: null,
        status: 'unavailable',
      })
      return
    }
    areaScores.push({
      area,
      correctCount: correct,
      totalCount: total,
      score: roundExamScore((correct / total) * 100),
      status: 'accuracy',
    })
  }

  for (const area of knownAreas) pushArea(area)
  for (const area of areaTotal.keys()) pushArea(area)

  return { answers, correctCount, totalCount, totalScore, areaScores }
}

export function formatAreaScoreDisplay(item: EntranceExamAreaScore): {
  scoreText: string
  fractionText: string
} {
  if (item.status === 'needs_time') {
    return { scoreText: '-', fractionText: '시간 기록 후 산출' }
  }
  if (item.status === 'unavailable' || item.totalCount === 0 || item.score == null) {
    return { scoreText: '-', fractionText: '평가 문항 없음' }
  }
  return {
    scoreText: `${item.score}점`,
    fractionText: `${item.correctCount} / ${item.totalCount}`,
  }
}
