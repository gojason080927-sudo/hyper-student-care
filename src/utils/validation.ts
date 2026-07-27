export function requireNonEmpty(value: string, label: string): string | null {
  if (!value.trim()) return `${label}을(를) 입력해 주세요.`
  return null
}

export function requireDate(value: string, label = '날짜'): string | null {
  if (!value) return `${label}를 선택해 주세요.`
  return null
}

export function validateScore(
  score: number,
  totalScore: number,
): string | null {
  if (Number.isNaN(score) || Number.isNaN(totalScore)) {
    return '점수는 숫자로 입력해 주세요.'
  }
  if (totalScore <= 0) return '만점은 0보다 커야 합니다.'
  if (score < 0) return '점수는 0점 미만일 수 없습니다.'
  if (score > totalScore) return '점수는 만점을 초과할 수 없습니다.'
  return null
}

export function validateCounts(
  completedCount: number,
  totalCount: number,
): string | null {
  if (Number.isNaN(completedCount) || Number.isNaN(totalCount)) {
    return '수량은 숫자로 입력해 주세요.'
  }
  if (totalCount <= 0) return '전체 수는 0보다 커야 합니다.'
  if (completedCount < 0) return '완료 수는 0 미만일 수 없습니다.'
  if (completedCount > totalCount) {
    return '완료 수는 전체 수를 초과할 수 없습니다.'
  }
  return null
}

export function requireTime(value: string): string | null {
  if (!value.trim()) return '시간을 선택해 주세요.'
  return null
}

export function validateStudentId(
  studentId: string,
  validIds: Set<string>,
): string | null {
  if (!studentId) return '학생을 선택해 주세요.'
  if (!validIds.has(studentId)) return '존재하지 않는 학생입니다.'
  return null
}
