/** 학교 시험 탭 "읽지 않음" 점 — 이 기기에서 마지막으로 본 발송 시각 기준 (저장소를 쓸 수 없으면 점을 숨긴다) */
const key = (studentId: string) => `school-exam-seen:${studentId}`

export function hasUnreadSchoolExam(studentId: string, sentAts: (string | null)[]): boolean {
  const latest = sentAts.filter((s): s is string => !!s).sort().pop()
  if (!latest) return false
  try {
    const seen = window.localStorage.getItem(key(studentId))
    return !seen || latest > seen
  } catch {
    return false
  }
}

export function markSchoolExamSeen(studentId: string, sentAts: (string | null)[]): void {
  const latest = sentAts.filter((s): s is string => !!s).sort().pop()
  if (!latest) return
  try {
    window.localStorage.setItem(key(studentId), latest)
  } catch {
    /* 저장소를 쓸 수 없으면 무시 */
  }
}
