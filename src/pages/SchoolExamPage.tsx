import { ArrowLeft } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SchoolPackageImport } from '../components/schoolExam/SchoolPackageImport'
import { SchoolStudentEditor } from '../components/schoolExam/SchoolStudentEditor'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { PageHeader } from '../components/ui/PageHeader'
import { useData } from '../hooks/useData'
import {
  listSchoolExams,
  listSchoolResults,
  publishSchoolExam,
  saveSchoolExamMeta,
  saveSchoolResult,
  type SchoolResultRow,
} from '../lib/db/schoolExamRepo'
import { btnPrimary, inputClass } from '../utils/labels'
import type { SchoolExam } from '../utils/schoolExamReport'

const NEW = '__new__'

/** 학교 시험 개인 분석 리포트 — 강사 입력 (시험 등록 → 패키지 가져오기 → 학생별 입력 → 발송) */
export function SchoolExamPage() {
  const { students } = useData()
  const location = useLocation()
  const base = location.pathname.startsWith('/teacher/mobile') ? '/teacher/mobile' : '/teacher'

  const [exams, setExams] = useState<SchoolExam[]>([])
  const [selectedId, setSelectedId] = useState(NEW)
  const [results, setResults] = useState<Map<string, SchoolResultRow>>(new Map())
  const [loadError, setLoadError] = useState('')

  const [grade, setGrade] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('수학')
  const [examDate, setExamDate] = useState('')
  const [author, setAuthor] = useState('')
  const [metaMsg, setMetaMsg] = useState('')
  const [metaSaving, setMetaSaving] = useState(false)

  const [editingId, setEditingId] = useState('')
  const [publishMsg, setPublishMsg] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [showAll, setShowAll] = useState(false)

  const activeStudents = useMemo(() => students.filter((s) => s.status === '재원'), [students])
  const grades = useMemo(() => Array.from(new Set(activeStudents.map((s) => s.grade))), [activeStudents])
  const exam = exams.find((e) => e.id === selectedId) ?? null

  const reloadExams = useCallback(async () => {
    try {
      setExams(await listSchoolExams())
      setLoadError('')
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '불러오지 못했습니다.')
    }
  }, [])
  useEffect(() => { void reloadExams() }, [reloadExams])

  useEffect(() => {
    setEditingId('')
    setPublishMsg('')
    setMetaMsg('')
    if (exam) {
      setGrade(exam.grade)
      setSchoolName(exam.schoolName)
      setTitle(exam.title)
      setSubject(exam.subject)
      setExamDate(exam.examDate)
      setAuthor(exam.author)
    } else {
      setGrade('')
      setSchoolName('')
      setTitle('')
      setSubject('수학')
      setExamDate('')
      setAuthor('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam?.id])

  const reloadResults = useCallback(async () => {
    if (!exam) {
      setResults(new Map())
      return
    }
    try {
      const rows = await listSchoolResults(exam.id)
      setResults(new Map(rows.map((r) => [r.studentId, r])))
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : '불러오지 못했습니다.')
    }
  }, [exam])
  useEffect(() => { void reloadResults() }, [reloadResults])

  const saveMeta = async () => {
    if (!grade.trim() || !title.trim() || !subject.trim() || !examDate) {
      setMetaMsg('학년·시험명·과목·시험일은 필수입니다. (학교명은 학원 자체 시험이면 비워 두세요)')
      return
    }
    setMetaSaving(true)
    try {
      const saved = await saveSchoolExamMeta({ id: exam?.id, grade, schoolName, title, subject, examDate, author })
      setExams((list) => [saved, ...list.filter((e) => e.id !== saved.id)])
      setSelectedId(saved.id)
      setMetaMsg('시험을 저장했습니다. 아래에서 분석 패키지를 가져오세요.')
    } catch (e) {
      setMetaMsg(e instanceof Error ? e.message : '저장하지 못했습니다.')
    } finally {
      setMetaSaving(false)
    }
  }

  const classStudents = useMemo(() => {
    if (!exam) return []
    const list = showAll ? activeStudents : activeStudents.filter((s) => s.grade === exam.grade)
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  }, [activeStudents, exam, showAll])

  const saveStudent = async (row: Omit<SchoolResultRow, 'status' | 'sentAt'>) => {
    if (!exam) return
    await saveSchoolResult(exam.id, row)
    // 이미 발송된 학생을 고쳐 저장하면 그 학생 1명만 다시 반영한다 (알림 없음)
    if (results.get(row.studentId)?.status === 'sent' && !row.absent) {
      await publishSchoolExam(exam.id, row.studentId)
    }
    await reloadResults()
  }

  const rows = [...results.values()]
  const drafts = rows.filter((r) => r.status === 'draft' && !r.absent)
  const ready = drafts.filter((r) => r.causeConfirmed)
  const sentCount = rows.filter((r) => r.status === 'sent').length

  const publish = () => {
    if (!exam) return
    if (exam.items.length === 0) {
      setPublishMsg('분석 패키지를 먼저 가져와 주세요.')
      return
    }
    if (ready.length === 0) {
      setPublishMsg(drafts.length ? '오답 원인 확인 체크가 끝난 임시 저장이 없습니다.' : '발송할 임시 저장 결과가 없습니다.')
      return
    }
    const nameOf = (id: string) => students.find((s) => s.id === id)?.name ?? ''
    const lines = [`${ready.length}명의 리포트를 학부모에게 발송합니다. 학부모에게 푸시 알림이 갑니다.`]
    const unconfirmed = drafts.filter((r) => !r.causeConfirmed)
    if (unconfirmed.length) lines.push(`⚠ 오답 원인 미확인 초안 ${unconfirmed.length}명은 발송되지 않습니다: ${unconfirmed.map((r) => nameOf(r.studentId)).join(', ')}`)
    const noComment = ready.filter((r) => !r.teacherComment.trim())
    if (noComment.length) lines.push(`⚠ 총평 미입력: ${noComment.map((r) => nameOf(r.studentId)).join(', ')}`)
    const noPlan = ready.filter((r) => r.nextPlan.length === 0)
    if (noPlan.length) lines.push(`⚠ 대비 계획 미입력: ${noPlan.map((r) => nameOf(r.studentId)).join(', ')}`)
    const noInput = classStudents.filter((s) => !results.has(s.id))
    if (noInput.length) lines.push(`ℹ 아직 입력하지 않은 학생 ${noInput.length}명은 발송되지 않습니다.`)
    if (!exam.imagesClean && !exam.sourceStudentId) lines.push('ℹ 이미지 공개 범위가 비공개라 모든 학부모에게 "문제 이미지 준비 중"으로 표시됩니다.')
    else if (!exam.imagesClean) lines.push('ℹ 문항 이미지는 자른 학생의 학부모에게만 보이고, 나머지는 "문제 이미지 준비 중"으로 표시됩니다.')
    setConfirmText(lines.join('\n'))
  }

  const doPublish = async () => {
    if (!exam) return
    setConfirmText('')
    setPublishing(true)
    try {
      const out = await publishSchoolExam(exam.id)
      setPublishMsg(
        `발송했습니다. 새로 발송 ${out.newlySent}명${out.skippedUnconfirmed ? ` · 미확인 ${out.skippedUnconfirmed}명 제외` : ''}${out.pushStatus === 'push_failed' ? ' (푸시 알림 발송에 실패했습니다)' : ''}.`,
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
    if (!r.causeConfirmed) return { label: '초안 · 확인 필요', tone: 'bg-rose-100 text-rose-700' }
    return { label: '임시 저장', tone: 'bg-violet-100 text-violet-800' }
  }

  return (
    <div className="space-y-6">
      <Link to={`${base}/monthly-evaluation`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        월말평가 관리로 돌아가기
      </Link>
      <PageHeader title="학교 시험 분석 리포트 입력" description="시험 등록 → 분석 패키지 가져오기 → 학생별 입력 → 발송 순서로 진행합니다. 발송 전에는 학부모에게 보이지 않습니다." />
      {loadError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</p>}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">1. 시험 등록</h2>
        <select className={inputClass()} value={selectedId} onChange={(e) => setSelectedId(e.target.value)} aria-label="시험 선택">
          <option value={NEW}>+ 새 시험 등록</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>{e.examDate} · {e.grade} · {[e.schoolName, e.title].filter(Boolean).join(' ')} {e.subject}</option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">학년</label>
            <input className={inputClass()} list="school-exam-grades" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="예: 고1" />
            <datalist id="school-exam-grades">{grades.map((g) => <option key={g} value={g} />)}</datalist>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">학교명 (선택)</label>
            <input className={inputClass()} value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="학원 자체 시험이면 비움" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">시험일</label>
            <input type="date" className={inputClass()} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">시험명</label>
            <input className={inputClass()} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 1학기 기말고사" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">과목</label>
            <input className={inputClass()} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">담당 선생님</label>
            <input className={inputClass()} value={author} onChange={(e) => setAuthor(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className={btnPrimary} onClick={saveMeta} disabled={metaSaving}>{metaSaving ? '저장 중…' : exam ? '시험 수정 저장' : '시험 등록'}</button>
          {metaMsg && <p className="text-sm text-slate-600">{metaMsg}</p>}
        </div>
      </section>

      {exam && (
        <SchoolPackageImport
          exam={exam}
          students={activeStudents.map((s) => ({ id: s.id, name: s.name, grade: s.grade }))}
          onSaved={(saved) => setExams((list) => list.map((e) => (e.id === saved.id ? saved : e)))}
        />
      )}

      <ConfirmDialog
        open={!!confirmText}
        title="학부모에게 발송"
        message={confirmText}
        confirmLabel="발송"
        cancelLabel="취소"
        confirmTone="primary"
        onCancel={() => setConfirmText('')}
        onConfirm={() => void doPublish()}
      />

      {exam && exam.items.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">3. 학생별 입력</h2>
            <p className="text-sm text-slate-500">발송됨 {sentCount}명 · 임시 저장 {drafts.length}명 (발송 가능 {ready.length}명)</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            다른 학년 학생도 보기
          </label>
          <ul className="space-y-2">
            {classStudents.map((s) => {
              const st = statusOf(s.id)
              const row = results.get(s.id)
              return (
                <li key={s.id} className="rounded-xl border border-slate-200">
                  <button type="button" className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left" onClick={() => setEditingId(editingId === s.id ? '' : s.id)}>
                    <span className="font-semibold text-slate-900">{s.name} <span className="text-xs font-normal text-slate-500">{s.grade}</span></span>
                    <span className="flex items-center gap-2 text-sm">
                      {row && !row.absent && <span className="text-slate-600">{row.score}/{Math.round(exam.totalPoints)}점</span>}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.tone}`}>{st.label}</span>
                    </span>
                  </button>
                  {editingId === s.id && (
                    <div className="border-t border-slate-100 p-3">
                      <SchoolStudentEditor
                        key={`${s.id}-${row?.sentAt ?? ''}-${row?.score ?? ''}`}
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
            <h2 className="text-base font-bold text-slate-900">4. 발송</h2>
            <p className="text-sm text-slate-500">오답 원인 확인 체크가 끝난 임시 저장만 발송됩니다. 발송하면 학부모 앱 월말평가 → 학교 시험 탭에 리포트가 열리고 푸시 알림이 갑니다.</p>
            <button type="button" className={btnPrimary} onClick={publish} disabled={publishing || ready.length === 0}>
              {publishing ? '발송 중…' : `발송 (${ready.length}명)`}
            </button>
            {publishMsg && <p className="whitespace-pre-line text-sm text-slate-700">{publishMsg}</p>}
          </div>
        </section>
      )}
    </div>
  )
}
