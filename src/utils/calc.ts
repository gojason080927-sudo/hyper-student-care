export function calcPercentage(score: number, totalScore: number): number {
  if (totalScore <= 0) return 0
  return Math.round((score / totalScore) * 1000) / 10
}

export function calcCompletionRate(
  completedCount: number,
  totalCount: number,
): number {
  if (totalCount <= 0) return 0
  return Math.round((completedCount / totalCount) * 1000) / 10
}

export function calcProgressRate(currentPage: number, totalPage: number): number {
  return calcCompletionRate(currentPage, totalPage)
}

/** 기존 진도 데이터만으로 예상 완료일 추정 (일일 학습 속도 선형 가정) */
export function estimateProgressCompletionDate(
  currentPage: number,
  totalPage: number,
  createdAt: string,
): string | null {
  if (totalPage <= 0 || currentPage <= 0 || currentPage >= totalPage) return null

  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return null

  const daysElapsed = Math.max(1, (Date.now() - created.getTime()) / 86_400_000)
  const pagesPerDay = currentPage / daysElapsed
  if (pagesPerDay <= 0.01) return null

  const daysRemaining = Math.ceil((totalPage - currentPage) / pagesPerDay)
  const completion = new Date()
  completion.setDate(completion.getDate() + daysRemaining)
  return completion.toISOString().slice(0, 10)
}

export function getAssignmentStatusFromRate(
  completionRate: number,
): '완료' | '보충필요' {
  return completionRate >= 100 ? '완료' : '보충필요'
}
