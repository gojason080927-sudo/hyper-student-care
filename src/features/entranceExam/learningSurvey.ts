/** 학습성향 설문 — 문항·영역·점수 계산 (채점/시험지와 분리) */

export type LearningSurveyAreaId =
  | 'motivation'
  | 'selfDirected'
  | 'concentration'
  | 'planning'
  | 'persistence'
  | 'confidence'

export type LearningSurveyAreaDef = {
  id: LearningSurveyAreaId
  label: string
  /** 1-based question numbers in this area */
  questionNumbers: number[]
}

export type LearningSurveyQuestion = {
  number: number
  areaId: LearningSurveyAreaId
  text: string
}

export const LEARNING_SURVEY_LIKERT = [
  { value: 1, label: '전혀 그렇지 않다' },
  { value: 2, label: '그렇지 않은 편이다' },
  { value: 3, label: '보통이다' },
  { value: 4, label: '그런 편이다' },
  { value: 5, label: '매우 그렇다' },
] as const

export const LEARNING_SURVEY_AREAS: LearningSurveyAreaDef[] = [
  { id: 'motivation', label: '학습 동기', questionNumbers: [1, 2, 3, 4] },
  { id: 'selfDirected', label: '자기주도성', questionNumbers: [5, 6, 7, 8] },
  { id: 'concentration', label: '집중력', questionNumbers: [9, 10, 11, 12] },
  { id: 'planning', label: '계획성', questionNumbers: [13, 14, 15, 16] },
  { id: 'persistence', label: '학습 지속력', questionNumbers: [17, 18, 19, 20] },
  { id: 'confidence', label: '학습 자신감', questionNumbers: [21, 22, 23, 24] },
]

export const LEARNING_SURVEY_QUESTIONS: LearningSurveyQuestion[] = [
  { number: 1, areaId: 'motivation', text: '나는 공부를 잘하고 싶다는 생각이 강하다.' },
  {
    number: 2,
    areaId: 'motivation',
    text: '나는 성적이 오르면 공부를 더 열심히 하고 싶어진다.',
  },
  {
    number: 3,
    areaId: 'motivation',
    text: '나는 새로운 내용을 배우는 것이 의미 있다고 생각한다.',
  },
  {
    number: 4,
    areaId: 'motivation',
    text: '나는 목표를 이루기 위해 공부가 필요하다고 생각한다.',
  },
  {
    number: 5,
    areaId: 'selfDirected',
    text: '나는 해야 할 공부를 스스로 시작하는 편이다.',
  },
  {
    number: 6,
    areaId: 'selfDirected',
    text: '나는 누가 시키지 않아도 필요한 공부를 찾아서 하는 편이다.',
  },
  {
    number: 7,
    areaId: 'selfDirected',
    text: '나는 모르는 내용이 생기면 스스로 해결하려고 노력한다.',
  },
  {
    number: 8,
    areaId: 'selfDirected',
    text: '나는 공부할 내용을 스스로 정하고 실행할 수 있다.',
  },
  {
    number: 9,
    areaId: 'concentration',
    text: '나는 공부를 시작하면 일정 시간 집중을 유지할 수 있다.',
  },
  {
    number: 10,
    areaId: 'concentration',
    text: '나는 공부할 때 휴대폰이나 다른 일에 쉽게 방해받지 않는 편이다.',
  },
  {
    number: 11,
    areaId: 'concentration',
    text: '나는 수업 중 선생님의 설명에 집중하는 편이다.',
  },
  {
    number: 12,
    areaId: 'concentration',
    text: '나는 문제를 풀 때 끝까지 문제에 집중하는 편이다.',
  },
  {
    number: 13,
    areaId: 'planning',
    text: '나는 시험이나 숙제 일정을 미리 확인하는 편이다.',
  },
  {
    number: 14,
    areaId: 'planning',
    text: '나는 해야 할 공부의 순서를 정해서 공부하는 편이다.',
  },
  {
    number: 15,
    areaId: 'planning',
    text: '나는 시험 전에 공부 계획을 세우는 편이다.',
  },
  {
    number: 16,
    areaId: 'planning',
    text: '나는 계획한 공부를 정해진 기간 안에 끝내려고 노력한다.',
  },
  {
    number: 17,
    areaId: 'persistence',
    text: '나는 어려운 문제가 나와도 쉽게 포기하지 않는다.',
  },
  {
    number: 18,
    areaId: 'persistence',
    text: '나는 공부가 잘되지 않아도 다시 시도하는 편이다.',
  },
  {
    number: 19,
    areaId: 'persistence',
    text: '나는 틀린 문제를 다시 풀어보려고 노력한다.',
  },
  {
    number: 20,
    areaId: 'persistence',
    text: '나는 시간이 오래 걸려도 해결할 때까지 노력하는 편이다.',
  },
  {
    number: 21,
    areaId: 'confidence',
    text: '나는 노력하면 성적을 올릴 수 있다고 생각한다.',
  },
  {
    number: 22,
    areaId: 'confidence',
    text: '나는 어려운 내용을 배워도 결국 이해할 수 있다고 생각한다.',
  },
  {
    number: 23,
    areaId: 'confidence',
    text: '나는 새로운 문제를 풀 때 해결할 수 있다는 자신감이 있다.',
  },
  {
    number: 24,
    areaId: 'confidence',
    text: '나는 공부에서 부족한 부분도 연습하면 좋아질 수 있다고 생각한다.',
  },
]

export type LearningSurveyResponses = Record<string, number>

export type LearningSurveyScores = {
  motivationScore: number
  selfDirectedScore: number
  concentrationScore: number
  planningScore: number
  persistenceScore: number
  confidenceScore: number
  overallScore: number
  areaScores: { areaId: LearningSurveyAreaId; label: string; score: number; rawSum: number }[]
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function normalizeChoice(raw: unknown): number | null {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1 || n > 5) return null
  return Math.round(n)
}

/** responses key = question number as string ("1".."24") */
export function scoreLearningSurvey(responses: LearningSurveyResponses): LearningSurveyScores {
  const areaScores = LEARNING_SURVEY_AREAS.map((area) => {
    let rawSum = 0
    for (const num of area.questionNumbers) {
      const v = normalizeChoice(responses[String(num)])
      rawSum += v ?? 0
    }
    return {
      areaId: area.id,
      label: area.label,
      rawSum,
      score: round1((rawSum / 20) * 100),
    }
  })

  let totalRaw = 0
  for (const q of LEARNING_SURVEY_QUESTIONS) {
    totalRaw += normalizeChoice(responses[String(q.number)]) ?? 0
  }

  const byId = Object.fromEntries(areaScores.map((item) => [item.areaId, item.score])) as Record<
    LearningSurveyAreaId,
    number
  >

  return {
    motivationScore: byId.motivation,
    selfDirectedScore: byId.selfDirected,
    concentrationScore: byId.concentration,
    planningScore: byId.planning,
    persistenceScore: byId.persistence,
    confidenceScore: byId.confidence,
    overallScore: round1((totalRaw / 120) * 100),
    areaScores,
  }
}

export function findUnansweredSurveyQuestions(
  responses: LearningSurveyResponses,
): number[] {
  return LEARNING_SURVEY_QUESTIONS.filter(
    (q) => normalizeChoice(responses[String(q.number)]) == null,
  ).map((q) => q.number)
}
