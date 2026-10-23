/** 학생앱 「이번 주 한 줄 달력」용 한국 시간(KST) 날짜 계산과 상단 카드 글자 만들기. 기존 utils/date.ts 는 건드리지 않는다. */

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const

export function isYmd(value: string | null | undefined): value is string {
  if (!value) return false
  const m = YMD.exec(value)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dt = new Date(Date.UTC(y, mo - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d
}

function toUtc(ymd: string): Date {
  const m = YMD.exec(ymd)!
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

function fromUtc(dt: Date): string {
  const y = dt.getUTCFullYear()
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

/** 한국 시간 기준 오늘(YYYY-MM-DD). 기기 시간대와 상관없다. */
export function kstTodayYmd(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function addDaysYmd(ymd: string, delta: number): string {
  const dt = toUtc(ymd)
  dt.setUTCDate(dt.getUTCDate() + delta)
  return fromUtc(dt)
}

/** 그 날짜가 속한 주의 월요일 */
export function weekStartMonday(ymd: string): string {
  const dow = toUtc(ymd).getUTCDay()
  return addDaysYmd(ymd, -((dow + 6) % 7))
}

/** 월~일 7일 */
export function weekDates(ymd: string): string[] {
  const start = weekStartMonday(ymd)
  return Array.from({ length: 7 }, (_, i) => addDaysYmd(start, i))
}

export function weekdayLabel(ymd: string): string {
  return WEEKDAYS[toUtc(ymd).getUTCDay()]
}

/** 예: 10월 23일 (금) */
export function formatSelectedDateLabel(ymd: string): string {
  const dt = toUtc(ymd)
  return `${dt.getUTCMonth() + 1}월 ${dt.getUTCDate()}일 (${weekdayLabel(ymd)})`
}

export function dayOfMonth(ymd: string): number {
  return toUtc(ymd).getUTCDate()
}

/** 동산고등학교 → 동산고, 양지중학교 → 양지중 */
export function shortenSchoolName(school: string): string {
  return school.trim().replace(/고등학교/g, '고').replace(/중학교/g, '중')
}

/** 반 이름에 학년이 이미 있으면 생략, 없으면 학년을 앞에 붙인다. 학교 · 반 형태로 돌려준다. */
export function heroMetaLabel(student: { school: string; grade: string; className: string }): string {
  const school = shortenSchoolName(student.school ?? '')
  const grade = (student.grade ?? '').trim()
  const className = (student.className ?? '').trim()
  let classPart = className
  if (grade && !className.includes(grade)) classPart = className ? `${grade} ${className}` : grade
  return [school, classPart].filter(Boolean).join(' · ')
}
