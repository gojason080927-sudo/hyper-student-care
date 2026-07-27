export function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatKoreanDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(date)
  return `${year}년 ${month}월 ${day}일 (${weekday})`
}

export function formatKoreanDateTime(dateString: string, timeString: string): string {
  const datePart = formatKoreanDate(dateString)
  const [hourRaw, minuteRaw] = timeString.split(':').map(Number)
  const hour = Number.isFinite(hourRaw) ? hourRaw : 0
  const minute = Number.isFinite(minuteRaw) ? minuteRaw : 0
  const period = hour < 12 ? '오전' : '오후'
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${datePart} ${period} ${hour12}:${String(minute).padStart(2, '0')}`
}

export function isToday(dateString: string): boolean {
  return dateString === getTodayString()
}
