/**
 * 학교 시험 개인 분석 리포트 — 타입 · 분석 패키지 가져오기 · 점수/통계 계산 · 쪽 나누기
 * 분석(AI)은 앱 밖에서 만든 패키지를 가져오는 것만 하며, 이 파일은 계산만 한다.
 * 모든 문항은 맞힘/틀림으로만 처리한다 (부분 점수 없음).
 */

export type SchoolDifficulty = '하' | '중' | '상' | '최상'
export const SCHOOL_DIFFICULTIES: SchoolDifficulty[] = ['하', '중', '상', '최상']
export const SCHOOL_DIFFICULTY_COLOR: Record<SchoolDifficulty, string> = {
  하: '#C9B3E8',
  중: '#A57FD8',
  상: '#7A4AAD',
  최상: '#4A2775',
}

export type SchoolCause = 'concept' | 'apply' | 'calc' | 'time'
export const SCHOOL_CAUSES: SchoolCause[] = ['concept', 'apply', 'calc', 'time']
export const SCHOOL_CAUSE_LABEL: Record<SchoolCause, string> = {
  concept: '개념 이해 부족',
  apply: '응용 능력 부족',
  calc: '계산 실수',
  time: '시간 부족',
}
export const SCHOOL_CAUSE_COLOR: Record<SchoolCause, string> = {
  concept: '#7A4AAD',
  apply: '#C98A12',
  calc: '#E35D6A',
  time: '#2B8FB5',
}
export const SCHOOL_CAUSE_ICON: Record<SchoolCause, string> = {
  concept: '🧩',
  apply: '🧠',
  calc: '✏️',
  time: '⏱',
}

export const SCHOOL_PLAN_MAX_LINES = 8

export type SchoolExamItem = {
  no: number
  kind: string
  answer: string
  points: number
  difficulty: SchoolDifficulty
  unit: string
  type: string
  keyIdea: string
  commonError: string
  recommendedCause: SchoolCause | ''
}

export type SchoolTopProblem = { no: number; why: string; idea: string; steps: string[] }

export type SchoolImageMeta = { no: number; width: number; height: number }

export type SchoolExam = {
  id: string
  grade: string
  schoolName: string
  title: string
  subject: string
  examDate: string
  author: string
  rangeText: string
  totalPoints: number
  items: SchoolExamItem[]
  units: string[]
  topProblems: SchoolTopProblem[]
  sourceStudentId: string | null
  imagesClean: boolean
  packageImportedAt: string | null
  /** 학부모 조회에서만 채워짐 (clean 이거나 본인 시험지에서 자른 이미지) */
  imagesVisible?: boolean
}

export type SchoolWrongItem = { no: number; cause: SchoolCause | ''; note: string }

export type SchoolResult = {
  score: number
  wrongItems: SchoolWrongItem[]
  teacherComment: string
  nextPlan: string[]
  sentAt: string | null
}

export type SchoolReportData = { exam: SchoolExam; result: SchoolResult }

/** 학부모 화면에 내려온 캡처 (data = base64 JPEG) */
export type SchoolImage = { no: number; data: string; width: number; height: number }

// ───────────────────────── 분석 패키지 가져오기 ─────────────────────────

export type ParsedPackage = {
  title: string
  subject: string
  grade: string
  school: string
  date: string
  author: string
  range: string
  totalPoints: number
  items: SchoolExamItem[]
  units: string[]
  topProblems: SchoolTopProblem[]
  sourceStudentId: string | null
  clean: boolean | null
}

const CAUSE_FROM_LABEL: Record<string, SchoolCause> = {
  '개념 이해 부족': 'concept',
  '응용 능력 부족': 'apply',
  '계산 실수': 'calc',
  '시간 부족': 'time',
}

export function causeFromText(text: unknown): SchoolCause | '' {
  const s = String(text ?? '').trim()
  if (SCHOOL_CAUSES.includes(s as SchoolCause)) return s as SchoolCause
  return CAUSE_FROM_LABEL[s] ?? ''
}

export function difficultyFromText(text: unknown): SchoolDifficulty {
  const s = String(text ?? '').trim()
  if (SCHOOL_DIFFICULTIES.includes(s as SchoolDifficulty)) return s as SchoolDifficulty
  if (s === '기본') return '하'
  return '중'
}

const round4 = (v: number) => Math.round(v * 10000) / 10000

/** analysis-package.json → 가져오기 미리보기용 구조. 형식이 맞지 않으면 한국어 오류를 던진다. */
export function parseAnalysisPackage(raw: unknown): ParsedPackage {
  if (!raw || typeof raw !== 'object') throw new Error('분석 패키지(JSON) 형식이 아닙니다.')
  const pkg = raw as Record<string, unknown>
  const exam = (pkg.exam ?? {}) as Record<string, unknown>
  const rawItems = pkg.items
  if (!Array.isArray(rawItems) || rawItems.length === 0) throw new Error('패키지에 문항(items)이 없습니다.')

  const nos = new Set<number>()
  const items: SchoolExamItem[] = rawItems.map((row, idx) => {
    const it = (row ?? {}) as Record<string, unknown>
    const no = Number(it.no)
    if (!Number.isInteger(no) || no < 1) throw new Error(`${idx + 1}번째 문항의 번호(no)가 올바르지 않습니다.`)
    if (nos.has(no)) throw new Error(`문항 번호 ${no}가 중복됩니다.`)
    nos.add(no)
    return {
      no,
      kind: String(it.kind ?? ''),
      answer: String(it.answer ?? ''),
      points: Number(it.points) || 0,
      difficulty: difficultyFromText(it.difficulty),
      unit: String(it.unit ?? ''),
      type: String(it.type ?? ''),
      keyIdea: String(it.key_idea ?? ''),
      commonError: String(it.common_error ?? ''),
      recommendedCause: causeFromText(it.recommended_cause),
    }
  })
  items.sort((a, b) => a.no - b.no)

  const declaredTotal = Number(exam.total_points) || 100
  // 배점이 균등이면 총점/문항 수로 맞춘다 (3.33 × 30 = 99.9 같은 오차 방지)
  const first = items[0].points
  const uniform = items.every((i) => Math.abs(i.points - first) < 0.011)
  if (uniform) {
    const each = round4(declaredTotal / items.length)
    for (const i of items) i.points = each
  }

  const units = Array.isArray(exam.units) && exam.units.length
    ? (exam.units as unknown[]).map((u) => String(u))
    : Array.from(new Set(items.map((i) => i.unit).filter(Boolean)))

  const topProblems: SchoolTopProblem[] = Array.isArray(pkg.top_problems)
    ? (pkg.top_problems as Record<string, unknown>[]).map((t) => ({
        no: Number(t.no),
        why: String(t.why ?? ''),
        idea: String(t.idea ?? ''),
        steps: Array.isArray(t.steps) ? (t.steps as unknown[]).map((s) => String(s)) : [],
      })).filter((t) => nos.has(t.no))
    : []

  const sid = exam.source_student_id
  return {
    title: String(exam.title ?? ''),
    subject: String(exam.subject ?? '수학'),
    grade: String(exam.grade ?? ''),
    school: exam.school == null ? '' : String(exam.school),
    date: String(exam.date ?? ''),
    author: String(exam.author ?? ''),
    range: String(exam.range ?? ''),
    totalPoints: declaredTotal,
    items,
    units,
    topProblems,
    sourceStudentId: typeof sid === 'string' && sid ? sid : null,
    clean: typeof exam.clean === 'boolean' ? exam.clean : null,
  }
}

/** 파일명(q01.jpg, q1.jpeg, 01.png …) → 문항 번호. 맞지 않으면 null. */
export function imageNoFromFileName(name: string): number | null {
  const base = name.split(/[\\/]/).pop() ?? name
  const m = /^q?0*(\d{1,3})\.(jpe?g|png|webp)$/i.exec(base.trim())
  return m ? Number(m[1]) : null
}

export type ImageMatch = { matched: Map<number, File>; unmatchedFiles: string[]; missingNos: number[] }

export function matchImagesToItems(files: { name: string; file: File }[], itemNos: number[]): ImageMatch {
  const matched = new Map<number, File>()
  const unmatchedFiles: string[] = []
  const valid = new Set(itemNos)
  for (const { name, file } of files) {
    const no = imageNoFromFileName(name)
    if (no === null || !valid.has(no)) unmatchedFiles.push(name)
    else matched.set(no, file)
  }
  const missingNos = itemNos.filter((n) => !matched.has(n))
  return { matched, unmatchedFiles, missingNos }
}

// ───────────────────────── DB 행 ↔ 타입 ─────────────────────────

type Row = Record<string, unknown>

export function itemsFromJson(value: unknown): SchoolExamItem[] {
  if (!Array.isArray(value)) return []
  return (value as Row[]).map((it) => ({
    no: Number(it.no),
    kind: String(it.kind ?? ''),
    answer: String(it.answer ?? ''),
    points: Number(it.points) || 0,
    difficulty: difficultyFromText(it.difficulty),
    unit: String(it.unit ?? ''),
    type: String(it.type ?? ''),
    keyIdea: String(it.key_idea ?? ''),
    commonError: String(it.common_error ?? ''),
    recommendedCause: causeFromText(it.recommended_cause),
  }))
}

export function itemsToJson(items: SchoolExamItem[]) {
  return items.map((i) => ({
    no: i.no,
    kind: i.kind,
    answer: i.answer,
    points: i.points,
    difficulty: i.difficulty,
    unit: i.unit,
    type: i.type,
    key_idea: i.keyIdea,
    common_error: i.commonError,
    recommended_cause: i.recommendedCause,
  }))
}

export function examFromRow(row: Row): SchoolExam {
  return {
    id: String(row.id),
    grade: String(row.grade ?? ''),
    schoolName: String(row.school_name ?? ''),
    title: String(row.title ?? ''),
    subject: String(row.subject ?? ''),
    examDate: String(row.exam_date ?? ''),
    author: String(row.author ?? ''),
    rangeText: String(row.range_text ?? ''),
    totalPoints: Number(row.total_points) || 100,
    items: itemsFromJson(row.items),
    units: Array.isArray(row.units) ? (row.units as unknown[]).map((u) => String(u)) : [],
    topProblems: Array.isArray(row.top_problems)
      ? (row.top_problems as Row[]).map((t) => ({
          no: Number(t.no),
          why: String(t.why ?? ''),
          idea: String(t.idea ?? ''),
          steps: Array.isArray(t.steps) ? (t.steps as unknown[]).map((s) => String(s)) : [],
        }))
      : [],
    sourceStudentId: (row.source_student_id as string | null) ?? null,
    imagesClean: row.images_clean === true,
    packageImportedAt: (row.package_imported_at as string | null) ?? null,
    imagesVisible: typeof row.images_visible === 'boolean' ? row.images_visible : undefined,
  }
}

export function wrongItemsFromJson(value: unknown): SchoolWrongItem[] {
  if (!Array.isArray(value)) return []
  return (value as Row[]).map((w) => ({
    no: Number(w.no),
    cause: causeFromText(w.cause),
    note: String(w.note ?? ''),
  }))
}

/** get_parent_school_exam_reports 응답 → 리포트 목록 */
export function reportsFromRpc(data: unknown): SchoolReportData[] {
  if (!Array.isArray(data)) return []
  return (data as Row[]).map((row) => {
    const result = (row.result ?? {}) as Row
    return {
      exam: examFromRow((row.exam ?? {}) as Row),
      result: {
        score: Number(result.score) || 0,
        wrongItems: wrongItemsFromJson(result.wrong_items),
        teacherComment: String(result.teacher_comment ?? ''),
        nextPlan: Array.isArray(result.next_plan) ? (result.next_plan as unknown[]).map((p) => String(p)) : [],
        sentAt: (result.sent_at as string | null) ?? null,
      },
    }
  })
}

/** 패키지의 흔한 오답 지점·핵심 아이디어로 만든 "강사 분석" 초안 (강사가 수정) */
export function draftNote(item: SchoolExamItem): string {
  const parts = [
    item.commonError ? `자주 틀리는 지점: ${item.commonError}.` : '',
    item.keyIdea ? `핵심: ${item.keyIdea}` : '',
  ].filter(Boolean)
  return parts.join(' ')
}

// ───────────────────────── 계산 ─────────────────────────

/** 맞힌 문항 배점 합계 (반올림 정수) — 서버 _school_exam_score 와 같은 규칙 */
export function calcSchoolScore(items: SchoolExamItem[], wrongNos: Iterable<number>): number {
  const wrong = new Set(wrongNos)
  return Math.round(items.filter((i) => !wrong.has(i.no)).reduce((sum, i) => sum + i.points, 0))
}

export function difficultyRank(d: SchoolDifficulty): number {
  return SCHOOL_DIFFICULTIES.indexOf(d)
}

export type DifficultyStat = { difficulty: SchoolDifficulty; total: number; correct: number; color: string }
export type UnitShare = { name: string; percent: number; color: string }

export const UNIT_COLORS = ['#4A2775', '#6B3FA0', '#8B5CC7', '#A57FD8', '#C4A9E8', '#E2D5F5', '#B79BDD', '#D9C8F0']

export type SchoolReportView = {
  score: number
  totalPoints: number
  correctCount: number
  wrongCount: number
  itemCount: number
  lostPoints: number
  accuracy: number
  levelLabel: string
  levelNote: string
  hardCount: number
  hardPercent: number
  topUnit: { name: string; percent: number } | null
  difficulties: DifficultyStat[]
  units: UnitShare[]
  barsTip: string
  pieTip: string
  wrongNos: Set<number>
}

/** 시험 난이도 문구: 상·최상 비율로 정한다 */
export function examLevel(hardPercent: number): { label: string; note: string } {
  if (hardPercent >= 35) return { label: '상', note: '어려움' }
  if (hardPercent >= 25) return { label: '중상', note: '보통 이상' }
  if (hardPercent >= 12) return { label: '중', note: '보통' }
  return { label: '하', note: '쉬움' }
}

export function buildSchoolReportView(data: SchoolReportData): SchoolReportView {
  const { exam, result } = data
  const items = exam.items
  const wrongNos = new Set(result.wrongItems.map((w) => w.no))
  const itemCount = items.length
  const wrongCount = items.filter((i) => wrongNos.has(i.no)).length
  const correctCount = itemCount - wrongCount

  const difficulties: DifficultyStat[] = SCHOOL_DIFFICULTIES.map((d) => {
    const list = items.filter((i) => i.difficulty === d)
    return {
      difficulty: d,
      total: list.length,
      correct: list.filter((i) => !wrongNos.has(i.no)).length,
      color: SCHOOL_DIFFICULTY_COLOR[d],
    }
  })

  const pointsByUnit = new Map<string, number>()
  for (const i of items) pointsByUnit.set(i.unit || '기타', (pointsByUnit.get(i.unit || '기타') ?? 0) + i.points)
  const totalUnitPoints = [...pointsByUnit.values()].reduce((a, b) => a + b, 0) || 1
  const sortedUnits = [...pointsByUnit.entries()].sort((a, b) => b[1] - a[1])
  const units: UnitShare[] = sortedUnits.map(([name, pts], idx) => ({
    name,
    percent: Math.round((pts / totalUnitPoints) * 100),
    color: UNIT_COLORS[idx % UNIT_COLORS.length],
  }))

  const hardCount = items.filter((i) => i.difficulty === '상' || i.difficulty === '최상').length
  const hardPercent = itemCount ? Math.round((hardCount / itemCount) * 100) : 0
  const level = examLevel(hardPercent)
  const score = result.score
  const totalPoints = exam.totalPoints

  const biggest = [...difficulties].sort((a, b) => b.total - a.total)[0]
  const barsTip = biggest && biggest.total > 0
    ? `가장 많은 <b>${biggest.difficulty} 난이도 ${biggest.total}문항 중 ${biggest.correct}문항</b>을 맞혔습니다.`
    : ''
  const pieTip = units.length >= 2
    ? `<b>${units[0].name}(${units[0].percent}%)</b>와 ${units[1].name}(${units[1].percent}%)이(가) 가장 큰 비중을 차지했습니다.`
    : units.length === 1
      ? `<b>${units[0].name}</b> 단원 중심의 시험이었습니다.`
      : ''

  return {
    score,
    totalPoints,
    correctCount,
    wrongCount,
    itemCount,
    lostPoints: Math.max(0, Math.round(totalPoints - score)),
    accuracy: itemCount ? Math.round((correctCount / itemCount) * 100) : 0,
    levelLabel: level.label,
    levelNote: level.note,
    hardCount,
    hardPercent,
    topUnit: units[0] ? { name: units[0].name, percent: units[0].percent } : null,
    difficulties,
    units,
    barsTip,
    pieTip,
    wrongNos,
  }
}

/** 오답 원인별 개수 */
export function causeCounts(wrongItems: SchoolWrongItem[]): Record<SchoolCause, number> {
  const out: Record<SchoolCause, number> = { concept: 0, apply: 0, calc: 0, time: 0 }
  for (const w of wrongItems) if (w.cause) out[w.cause] += 1
  return out
}

// ───────────────────────── 전체/요약 보기 ─────────────────────────

/** 틀린 문항이 이 개수를 넘으면 "전체 보기 / 요약 보기" 선택을 보여준다 */
export const SUMMARY_THRESHOLD = 8
export const SUMMARY_CARD_COUNT = 6

/** 요약 보기: 난이도 높은 오답 N개(같으면 번호순)는 카드, 나머지는 한 줄 표 */
export function splitForSummary(
  wrongItems: SchoolWrongItem[],
  items: SchoolExamItem[],
  cardCount = SUMMARY_CARD_COUNT,
): { cards: SchoolWrongItem[]; rest: SchoolWrongItem[] } {
  const byNo = new Map(items.map((i) => [i.no, i]))
  const rank = (w: SchoolWrongItem) => difficultyRank(byNo.get(w.no)?.difficulty ?? '하')
  const ordered = [...wrongItems].sort((a, b) => rank(b) - rank(a) || a.no - b.no)
  const cardNos = new Set(ordered.slice(0, cardCount).map((w) => w.no))
  const sortByNo = (list: SchoolWrongItem[]) => [...list].sort((a, b) => a.no - b.no)
  return {
    cards: sortByNo(wrongItems.filter((w) => cardNos.has(w.no))),
    rest: sortByNo(wrongItems.filter((w) => !cardNos.has(w.no))),
  }
}

// ───────────────────────── 쪽 나누기 ─────────────────────────

export type PagePlan = { cardIdx: number[]; notes: boolean; first: boolean }

export type PaginateOptions = {
  /** 첫 상세 쪽(제목·칩 있음)과 이후 쪽의 카드 영역 높이(mm) */
  firstCap: number
  laterCap: number
  gap: number
  maxPerPage: number
}

/**
 * 카드 높이(mm)를 순서대로 쪽에 채운다. 쪽당 최대 maxPerPage개, 카드는 쪽 경계에서 쪼개지지 않는다.
 * 총평·대비 계획(notes)은 항상 마지막 쪽 — 남는 공간에 들어가면 마지막 카드 쪽에, 아니면 새 쪽에 둔다.
 * 카드가 하나도 없어도 notes 쪽 1개는 만든다.
 */
export function paginateCards(cardHeights: number[], notesHeight: number, opt: PaginateOptions): PagePlan[] {
  const pages: PagePlan[] = []
  let cur: PagePlan = { cardIdx: [], notes: false, first: true }
  let used = 0
  const cap = () => (cur.first ? opt.firstCap : opt.laterCap)
  cardHeights.forEach((h, idx) => {
    const add = cur.cardIdx.length === 0 ? h : h + opt.gap
    const full = cur.cardIdx.length >= opt.maxPerPage || (cur.cardIdx.length > 0 && used + add > cap())
    if (full) {
      pages.push(cur)
      cur = { cardIdx: [], notes: false, first: false }
      used = 0
    }
    used += cur.cardIdx.length === 0 ? h : h + opt.gap
    cur.cardIdx.push(idx)
  })
  const notesAdd = cur.cardIdx.length === 0 ? notesHeight : notesHeight + opt.gap
  if (used + notesAdd <= cap()) {
    cur.notes = true
    pages.push(cur)
  } else {
    pages.push(cur)
    pages.push({ cardIdx: [], notes: true, first: false })
  }
  return pages
}

/** 측정 전 임시 높이(mm) 추정 — 실제 쪽 나누기는 렌더 후 측정값으로 다시 한다 */
export function estimateCardHeight(img: { width: number; height: number } | undefined): number {
  const imgH = img ? Math.min(52, (86 * img.height) / img.width) : 40
  return Math.max(imgH + 12, 62)
}
