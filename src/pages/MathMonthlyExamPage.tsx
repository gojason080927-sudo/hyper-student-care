import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MathExamImageImport } from '../components/mathMonthly/MathExamImageImport'
import { MathStudentEditor } from '../components/mathMonthly/MathStudentEditor'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PageHeader } from '../components/ui/PageHeader'
import { useData } from '../hooks/useData'
import {
  listMathExams,
  listMathResults,
  publishMathExam,
  saveMathExam,
  saveMathResult,
  type MathResultRow,
} from '../lib/db/mathMonthlyRepo'
import { countUnrecordedDailyTests } from '../utils/mathMonthlyAttitude'
import { getSeoulYearMonth } from '../utils/monthlyLearningProgress'
import {
  MATH_DIFFICULTIES,
  MATH_DIFFICULTY_LABEL,
  buildDefaultItems,
  resizeItems,
  totalPoints,
  validateExamSetup,
  type MathDifficulty,
  type MathExamItem,
  type MathExamUnit,
  type MathMonthlyExam,
} from '../utils/mathMonthlyReport'
import { btnPrimary, btnSecondary, inputClass } from '../utils/labels'
import { getEnrolledClassNames, getStudentsInClassName } from '../utils/studentGradeClass'

const DEFAULT_COUNT = 20
const DEFAULT_POINTS = 5

/** 수학 월말평가 결과 보고서 — 강사 입력 (시험 설정 → 학생별 입력 → 반 단위 발송) */
export function MathMonthlyExamPage() {
  const { students, dailyTests } = useData()
  const location = useLocation()
  const base = location.pathname.startsWith('/teacher/mobile') ? '/teacher/mobile' : '/teacher'
  const now = getSeoulYearMonth()

  const [className, setClassName] = useState('')
  const [year, setYear] = useState(now.year)
  const [month, setMonth] = useState(now.month)
  const [exams, setExams] = useState<MathMonthlyExam[]>([])
  const [imageTick, setImageTick] = useState(0)
  const [results, setResults] = useState<Map<string, MathResultRow>>(new Map())
  const [loadError, setLoadError] = useState('')

  // 시험 설정 폼
  const [examDate, setExamDate] = useState('')
  const [title, setTitle] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [count, setCount] = useState(DEFAULT_COUNT)
  const [countText, setCountText] = useState<string | null>(null)
  const [pointsText, setPointsText] = useState<string | null>(null)
  const [defaultPoints, setDefaultPoints] = useState(DEFAULT_POINTS)
  const [items, setItems] = useState<MathExamItem[]>(buildDefaultItems(DEFAULT_COUNT, DEFAULT_POINTS))
  const [units, setUnits] = useState<MathExamUnit[]>([{ name: '', from: 1, to: DEFAULT_COUNT }])
  const [copyFrom, setCopyFrom] = useState('')
  const [setupMsg, setSetupMsg] = useState('')
  const [setupSaving, setSetupSaving] = useState(false)

  const [editingId, setEditingId] = useState('')
  const [publishMsg, setPublishMsg] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [missingWarn, setMissingWarn] = useState('')

  const activeStudents = useMemo(() => students.filter((s) => s.status === '재원'), [students])
  const classNames = useMemo(() => getEnrolledClassNames(activeStudents), [activeStudents])
  const classStudents = useMemo(
    () => getStudentsInClassName(activeStudents, className),
    [activeStudents, className],
  )
  const grade = classStudents[0]?.grade ?? ''

  const reloadExams = useCallback(async () => {
    try {
      setExams(await listMathExams())
      setLoadError('')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '불러오지 못했습니다.')
    }
  }, [])
  useEffect(() => {
    void reloadExams()
  }, [reloadExams])

  const exam = useMemo(
    () => exams.find((e) => e.className === className && e.grade === grade && e.year === year && e.month === month) ?? null,
    [className, exams, grade, month, year],
  )

  // 반·연·월이 바뀌면 저장된 설정을 폼에 채운다 (없으면 기본값)
  useEffect(() => {
    setEditingId('')
    setPublishMsg('')
    setSetupMsg('')
    if (exam) {
      setExamDate(exam.examDate)
      setTitle(exam.title)
      setTeacherName(exam.teacherName)
      setCount(exam.questionCount)
      setItems(exam.items)
      setUnits(exam.units.length ? exam.units : [{ name: '', from: 1, to: exam.questionCount }])
      setDefaultPoints(exam.items[0]?.points ?? DEFAULT_POINTS)
    } else {
      setExamDate('')
      setTitle('')
      setTeacherName(classStudents[0]?.teacher ?? '')
      setCount(DEFAULT_COUNT)
      setDefaultPoints(DEFAULT_POINTS)
      setItems(buildDefaultItems(DEFAULT_COUNT, DEFAULT_POINTS))
      setUnits([{ name: '', from: 1, to: DEFAULT_COUNT }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam?.id, className, year, month])

  const reloadResults = useCallback(async () => {
    if (!exam) {
      setResults(new Map())
      return
    }
    try {
      const rows = await listMathResults(exam.id)
      setResults(new Map(rows.map((r) => [r.studentId, r])))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '불러오지 못했습니다.')
    }
  }, [exam])
  useEffect(() => {
    void reloadResults()
  }, [reloadResults])

  const changeCount = (next: number) => {
    const n = Math.max(1, Math.min(100, Math.floor(next) || 1))
    setCount(n)
    setItems((list) => resizeItems(list, n, defaultPoints))
    setUnits((list) => list.map((u) => ({ ...u, to: Math.min(u.to, n), from: Math.min(u.from, n) })))
  }
  const applyDefaultPoints = (p: number) => {
    setDefaultPoints(p)
    setItems((list) => list.map((item) => ({ ...item, points: p })))
  }
  const patchItem = (no: number, patch: Partial<MathExamItem>) =>
    setItems((list) => list.map((item) => (item.no === no ? { ...item, ...patch } : item)))

  const copySetup = () => {
    const source = exams.find((e) => e.id === copyFrom)
    if (!source) return
    setCount(source.questionCount)
    setItems(source.items.map((i) => ({ ...i })))
    setUnits(source.units.map((u) => ({ ...u })))
    setTitle((t) => t || source.title)
    setDefaultPoints(source.items[0]?.points ?? DEFAULT_POINTS)
    setSetupMsg('설정을 복사했습니다. 평가일을 입력하고 저장해 주세요.')
  }

  const saveSetup = async () => {
    const errors = validateExamSetup({ className, examDate, title, items, units })
    if (errors.length > 0) {
      setSetupMsg(errors[0])
      return
    }
    setSetupSaving(true)
    try {
      const saved = await saveMathExam({
        id: exam?.id,
        grade,
        className,
        examDate,
        year,
        month,
        title,
        teacherName,
        items,
        units,
      })
      setExams((list) => [saved, ...list.filter((e) => e.id !== saved.id)])
      setSetupMsg('시험 설정을 저장했습니다.')
    } catch (e) {
      setSetupMsg(e instanceof Error ? e.message : '저장하지 못했습니다.')
    } finally {
      setSetupSaving(false)
    }
  }

  const saveStudent = async (row: Omit<MathResultRow, 'status' | 'sentAt'>) => {
    if (!exam) return
    await saveMathResult(exam.id, row)
    // 이미 발송된 학생을 고쳐 저장하면 그 학생 1명만 다시 반영한다 (다른 임시 저장은 발송되지 않음)
    if (results.get(row.studentId)?.status === 'sent' && !row.absent) {
      await publishMathExam(exam.id, row.studentId)
    }
    await reloadResults()
  }

  const draftCount = [...results.values()].filter((r) => r.status === 'draft' && !r.absent).length
  const sentCount = [...results.values()].filter((r) => r.status === 'sent').length

  const publish = async () => {
    if (!exam) return
    if (draftCount === 0) {
      setPublishMsg('발송할 임시 저장 결과가 없습니다.')
      return
    }
    // 합격 기록이 없는 일일테스트가 있으면 발송 전에 알린다 (발송을 막지는 않는다)
    const missing = classStudents
      .map((s) => ({ name: s.name, count: countUnrecordedDailyTests(dailyTests, s.id, exam.year, exam.month) }))
      .filter((m) => m.count > 0)
    if (missing.length > 0) {
      setMissingWarn(
        `합격 기록이 없는 일일테스트가 있습니다: ${missing.map((m) => `${m.name} ${m.count}건`).join(', ')}. 기록을 확인한 뒤 발송하시겠습니까?`,
      )
      return
    }
    if (!window.confirm(`${className} 임시 저장 ${draftCount}명의 보고서를 학부모에게 발송할까요? 학부모에게 알림이 갑니다.`)) return
    await doPublish()
  }

  const doPublish = async () => {
    if (!exam) return
    setPublishing(true)
    try {
      const out = await publishMathExam(exam.id)
      setPublishMsg(
        `발송했습니다. 새로 발송 ${out.newlySent}명${out.pushStatus === 'push_failed' ? ' (푸시 알림 발송에 실패했습니다)' : ''}.`,
      )
      await reloadResults()
    } catch (e) {
      setPublishMsg(e instanceof Error ? e.message : '발송하지 못했습니다.')
    } finally {
      setPublishing(false)
    }
  }

  const statusOf = (studentId: string) => {
    const r = results.get(studentId)
    if (!r) return { label: '미입력', tone: 'bg-slate-100 text-slate-600' }
    if (r.absent) return { label: '결시', tone: 'bg-amber-100 text-amber-800' }
    if (r.status === 'sent') return { label: '발송됨', tone: 'bg-emerald-100 text-emerald-800' }
    return { label: '임시 저장', tone: 'bg-violet-100 text-violet-800' }
  }

  const total = totalPoints(items)
  const copyCandidates = exams.filter((e) => e.id !== exam?.id)

  return (
    <div className="space-y-6">
      <Link to={`${base}/monthly-evaluation`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        월말평가 관리로 돌아가기
      </Link>
      <PageHeader title="수학 월말평가 보고서 입력" description="시험 설정 → 학생별 입력 → 반 단위 발송 순서로 진행합니다. 발송 전에는 학부모에게 보이지 않습니다." />
      {loadError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">1. 시험 설정 (반별 월 1회)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <label className="mb-1 block text-sm font-medium text-slate-600">반</label>
            <select className={inputClass()} value={className} onChange={(e) => setClassName(e.target.value)}>
              <option value="">반 선택</option>
              {classNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">연도</label>
            <input type="number" className={inputClass()} value={year} onChange={(e) => setYear(Number(e.target.value) || now.year)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">월</label>
            <select className={inputClass()} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">평가일</label>
            <input type="date" className={inputClass()} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
        </div>

        {className && (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">시험명</label>
                <input className={inputClass()} placeholder="예: 공통수학1" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">담당 선생님</label>
                <input className={inputClass()} value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
              </div>
            </div>

            {copyCandidates.length > 0 && (
              <div className="flex flex-wrap items-end gap-2 rounded-xl bg-slate-50 p-3">
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-sm font-medium text-slate-600">다른 반·지난달 설정 복사</label>
                  <select className={inputClass()} value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
                    <option value="">복사할 설정 선택</option>
                    {copyCandidates.map((e) => (
                      <option key={e.id} value={e.id}>{e.className} · {e.year}년 {e.month}월 · {e.title || '(시험명 없음)'}</option>
                    ))}
                  </select>
                </div>
                <button type="button" className={btnSecondary} onClick={copySetup} disabled={!copyFrom}>복사</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">문항 수</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={inputClass()}
                  value={countText ?? count}
                  onChange={(e) => {
                    setCountText(e.target.value)
                    const v = Number(e.target.value)
                    if (e.target.value !== '' && v >= 1) changeCount(v)
                  }}
                  onBlur={() => setCountText(null)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">기본 배점 (전체 적용)</label>
                <input
                  type="number"
                  min={1}
                  step="any"
                  className={inputClass()}
                  value={pointsText ?? defaultPoints}
                  onChange={(e) => {
                    setPointsText(e.target.value)
                    const v = Number(e.target.value)
                    if (e.target.value !== '' && v > 0) applyDefaultPoints(v)
                  }}
                  onBlur={() => setPointsText(null)}
                />
              </div>
              <div className="flex items-end text-sm text-slate-600">만점 합계 <b className="ml-1 text-base text-slate-900">{total}점</b></div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">문항별 배점 · 난이도</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {items.map((item) => (
                  <div key={item.no} className="rounded-lg border border-slate-200 p-2">
                    <p className="mb-1 text-xs font-bold text-slate-500">{item.no}번</p>
                    <div className="flex gap-1">
                      <input type="number" min={1} aria-label={`${item.no}번 배점`} className={`${inputClass()} !px-2 !py-1.5 w-14`} value={item.points} onChange={(e) => patchItem(item.no, { points: Number(e.target.value) || 0 })} />
                      <select aria-label={`${item.no}번 난이도`} className={`${inputClass()} !px-1 !py-1.5`} value={item.difficulty} onChange={(e) => patchItem(item.no, { difficulty: e.target.value as MathDifficulty })}>
                        {MATH_DIFFICULTIES.map((d) => <option key={d} value={d}>{MATH_DIFFICULTY_LABEL[d]}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">단원 구간 (예: 1~5번 다항식의 연산)</p>
              {units.map((u, i) => (
                <div key={i} className="grid grid-cols-[1fr_64px_64px_auto] items-center gap-2">
                  <input className={inputClass()} placeholder="단원 이름" value={u.name} onChange={(e) => setUnits((l) => l.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} />
                  <input type="number" aria-label="시작 번호" className={inputClass()} value={u.from} onChange={(e) => setUnits((l) => l.map((x, k) => (k === i ? { ...x, from: Number(e.target.value) } : x)))} />
                  <input type="number" aria-label="끝 번호" className={inputClass()} value={u.to} onChange={(e) => setUnits((l) => l.map((x, k) => (k === i ? { ...x, to: Number(e.target.value) } : x)))} />
                  <button type="button" className={btnSecondary} onClick={() => setUnits((l) => l.filter((_, k) => k !== i))}>삭제</button>
                </div>
              ))}
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setUnits((l) => [...l, { name: '', from: (l[l.length - 1]?.to ?? 0) + 1, to: Math.min(count, (l[l.length - 1]?.to ?? 0) + 5) }])}
              >
                + 단원 추가
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={btnPrimary} onClick={saveSetup} disabled={setupSaving}>
                {setupSaving ? '저장 중…' : exam ? '시험 설정 수정 저장' : '시험 설정 저장'}
              </button>
              {setupMsg && <p className="text-sm text-slate-600">{setupMsg}</p>}
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        open={!!missingWarn}
        title="일일테스트 기록 확인"
        message={missingWarn}
        confirmLabel="확인 후 발송"
        cancelLabel="취소"
        confirmTone="primary"
        onCancel={() => setMissingWarn('')}
        onConfirm={() => {
          setMissingWarn('')
          void doPublish()
        }}
      />

      {exam && <MathExamImageImport exam={exam} students={classStudents.map((x) => ({ id: x.id, name: x.name }))} onSaved={() => setImageTick((t) => t + 1)} />}

      {exam && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">2. 학생별 입력 · {className}</h2>
            <p className="text-sm text-slate-500">발송됨 {sentCount}명 · 임시 저장 {draftCount}명</p>
          </div>
          <ul className="space-y-2">
            {classStudents.map((s) => {
              const st = statusOf(s.id)
              const row = results.get(s.id)
              return (
                <li key={s.id} className="rounded-xl border border-slate-200">
                  <button
                    type="button"
                    className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left"
                    onClick={() => setEditingId(editingId === s.id ? '' : s.id)}
                  >
                    <span className="font-semibold text-slate-900">{s.name}</span>
                    <span className="flex items-center gap-2 text-sm">
                      {row && !row.absent && <span className="text-slate-600">{row.score}/{total}점</span>}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.tone}`}>{st.label}</span>
                    </span>
                  </button>
                  {editingId === s.id && (
                    <div className="border-t border-slate-100 p-3">
                      <MathStudentEditor
                        key={`${s.id}-${row?.sentAt ?? ''}-${row?.score ?? ''}-${imageTick}`}
                        exam={exam}
                        studentId={s.id}
                        studentName={s.name}
                        row={row}
                        onSave={saveStudent}
                        onClose={() => setEditingId('')}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <h2 className="text-base font-bold text-slate-900">3. 반 단위 발송</h2>
            <p className="text-sm text-slate-500">임시 저장된 결과를 한꺼번에 발송합니다. 발송하면 학부모 앱에 보고서가 열리고 푸시 알림이 갑니다. 결시·미입력 학생은 발송되지 않습니다.</p>
            <button type="button" className={btnPrimary} onClick={publish} disabled={publishing || draftCount === 0}>
              {publishing ? '발송 중…' : `${className} 발송 (${draftCount}명)`}
            </button>
            {publishMsg && <p className="text-sm text-slate-700">{publishMsg}</p>}
          </div>
        </section>
      )}
    </div>
  )
}
