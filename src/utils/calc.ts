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

export function getAssignmentStatusFromRate(
  completionRate: number,
): '완료' | '보충필요' {
  return completionRate >= 100 ? '완료' : '보충필요'
}
