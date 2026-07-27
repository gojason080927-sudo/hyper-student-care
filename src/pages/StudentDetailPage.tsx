import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { DailyTestForm, validateDailyTestForm } from '../components/dailytest/DailyTestForm'
import { DailyTestSessionGrid } from '../components/dailytest/DailyTestSessionGrid'
import { MakeupMethodPicker } from '../components/makeup/MakeupMethodPicker'
import {
  emptyQuestionForm,
  QuestionFormFields,
  questionRecordToForm,
  type QuestionFormState,
} from '../components/question/QuestionFormFields'
import { QuestionRecordCard } from '../components/question/QuestionRecordCard'
import { StudentAccessLinkPanel } from '../components/students/StudentAccessLinkPanel'
import { StudentFormModal } from '../components/students/StudentFormModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { MonthlyEvaluationChart } from '../components/ui/MonthlyEvaluationChart'
import { TextbookProgress } from '../components/ui/TextbookProgress'
import { RecordActions } from '../components/ui/RecordActions'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useData } from '../hooks/useData'
import type { AttendanceStatus, HomeworkStatus, MakeupMethod, MakeupPlanStatus } from '../types/records'
import type { Student } from '../types/student'
import { formatSubjects, sortByDateDesc } from '../utils/filters'
import { formatKoreanDate, formatKoreanDateTime } from '../utils/date'
import { sortMakeupPlans } from '../utils/makeupPlan'
import {
  dailyTestFormToSavePayload,
  dailyTestRecordToForm,
  emptyDailyTestForm,
  type DailyTestFormData,
} from '../utils/dailyTest'
import { calcProgressRate } from '../utils/calc'
import {
  SUBJECTS,
  getAttendanceColor,
  getHomeworkColor,
  getMakeupMethodColor,
  getMakeupPlanStatusColor,
  getMakeupSubjectColor,
  HOMEWORK_STATUSES,
  MAKEUP_PLAN_STATUSES,
  getScoreColor,
  getStudentStatusColor,
  btnPrimary,
  btnSecondary,
} from '../utils/labels'
import { requireDate, requireNonEmpty } from '../utils/validation'

const TABS = [
  { id: 'info', label: '기본정보' },
  { id: 'attendance', label: '출결' },
  { id: 'progress', label: '진도 과정' },
  { id: 'homework', label: '숙제' },
  { id: 'dailytest', label: '일일테스트' },
  { id: 'monthly', label: '월말평가' },
  { id: 'makeup', label: '보강계획' },
  { id: 'questions', label: '질문' },
] as const

type TabId = (typeof TABS)[number]['id']

export function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as TabId) || 'info'
  const data = useData()
  const [editOpen, setEditOpen] = useState(false)

  const student = id ? data.getStudentById(id) : undefined

  if (!student) {
    return <EmptyState title="학생을 찾을 수 없습니다." description="목록으로 돌아가 다시 선택해 주세요." />
  }

  const setTab = (tab: TabId) => setSearchParams({ tab })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-navy-900">{student.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{student.school} · {student.grade} · {student.className || '-'} · {formatSubjects(student.subjects)}</p>
            <p className="mt-1 text-sm text-slate-500">담당: {student.teacher || '-'}</p>
            <div className="mt-3"><StatusBadge label={student.status} colorClass={getStudentStatusColor(student.status)} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setEditOpen(true)} className={`${btnPrimary} inline-flex items-center gap-2`}><Pencil className="h-4 w-4" />학생 정보 수정</button>
            <Link to="/students" className={`${btnSecondary} inline-flex items-center gap-2`}><ArrowLeft className="h-4 w-4" />목록으로 돌아가기</Link>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setTab(tab.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${activeTab === tab.id ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'info' && <InfoTab student={student} />}
      {activeTab === 'attendance' && <AttendanceTab studentId={student.id} />}
      {activeTab === 'progress' && <ProgressTab studentId={student.id} />}
      {activeTab === 'homework' && <HomeworkTab studentId={student.id} />}
      {activeTab === 'dailytest' && <DailyTestTab studentId={student.id} />}
      {activeTab === 'monthly' && <MonthlyTab studentId={student.id} />}
      {activeTab === 'makeup' && <MakeupPlanTab studentId={student.id} />}
      {activeTab === 'questions' && <QuestionsTab studentId={student.id} />}

      <StudentFormModal open={editOpen} student={student} onClose={() => setEditOpen(false)} onSubmit={(d) => data.updateStudent(student.id, d)} />
    </div>
  )
}

function InfoTab({ student }: { student: Student }) {
  const fields = [
    ['학생 연락처', student.studentPhone || '-'],
    ['학부모 연락처', student.parentPhone || '-'],
    ['등록일', student.enrollmentDate || '-'],
    ['메모', student.memo || '-'],
  ]
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-navy-50 px-4 py-3">
            <dt className="text-sm font-medium text-slate-500">{label}</dt>
            <dd className="mt-1 text-base font-semibold text-navy-900">{value}</dd>
          </div>
        ))}
      </dl>
      <StudentAccessLinkPanel student={student} />
    </div>
  )
}

function TabShell({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-navy-900">{title}</h3>
        <button type="button" onClick={onAdd} className={`${btnPrimary} inline-flex items-center gap-2`}><Plus className="h-4 w-4" />새 기록</button>
      </div>
      {children}
    </div>
  )
}

function AttendanceTab({ studentId }: { studentId: string }) {
  const { attendance, saveAttendanceRecord, deleteAttendanceRecord } = useData()
  const records = useMemo(() => sortByDateDesc(attendance.filter((a) => a.studentId === studentId)), [attendance, studentId])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<{ id: string; date: string; status: AttendanceStatus; reason: string; memo: string }>({ id: '', date: '', status: '출석', reason: '', memo: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openAdd = () => { setForm({ id: '', date: new Date().toISOString().slice(0, 10), status: '출석', reason: '', memo: '' }); setModal(true) }
  const openEdit = (r: typeof records[0]) => { setForm({ id: r.id, date: r.date, status: r.status, reason: r.reason, memo: r.memo }); setModal(true) }

  return (
    <TabShell title="출결 기록" onAdd={openAdd}>
      {records.length === 0 ? <EmptyState title="출결 기록이 없습니다." /> : (
        <div className="space-y-3">{records.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-semibold text-navy-900">{formatKoreanDate(r.date)}</p>{r.reason && <p className="mt-1 text-sm text-slate-600">사유: {r.reason}</p>}{r.memo && <p className="text-sm text-slate-500">{r.memo}</p>}</div>
              <div className="flex items-center gap-2"><StatusBadge label={r.status} colorClass={getAttendanceColor(r.status)} /><RecordActions onEdit={() => openEdit(r)} onDelete={() => setDeleteId(r.id)} /></div>
            </div>
          </div>
        ))}</div>
      )}
      <Modal open={modal} title={form.id ? '출결 수정' : '출결 추가'} onClose={() => setModal(false)}>
        <form onSubmit={(e) => { e.preventDefault(); saveAttendanceRecord({ ...form, studentId, id: form.id || undefined }); setModal(false) }} className="space-y-4">
          <div><label className="mb-1.5 block text-sm font-medium">날짜</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-xl border px-3 py-2.5 text-sm" /></div>
          <div><label className="mb-1.5 block text-sm font-medium">상태</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })} className="w-full rounded-xl border px-3 py-2.5 text-sm">{['출석', '지각', '결석', '조퇴'].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className="mb-1.5 block text-sm font-medium">사유</label><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="w-full rounded-xl border px-3 py-2.5 text-sm" /></div>
          <div><label className="mb-1.5 block text-sm font-medium">메모</label><input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} className="w-full rounded-xl border px-3 py-2.5 text-sm" /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setModal(false)} className={btnSecondary}>취소</button><button type="submit" className={btnPrimary}>저장</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} title="출결 삭제" message="이 기록을 삭제하시겠습니까?" onCancel={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteAttendanceRecord(deleteId); setDeleteId(null) }} />
    </TabShell>
  )
}

function ProgressTab({ studentId }: { studentId: string }) {
  const { progressRecords, saveProgressRecord, deleteProgressRecord } = useData()
  const records = useMemo(
    () => progressRecords.filter((p) => p.studentId === studentId),
    [progressRecords, studentId],
  )
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    id: '',
    subject: '수학',
    textbookName: '',
    currentProgress: '',
    currentPage: 0,
    totalPage: 100,
    lastStudyDate: new Date().toISOString().slice(0, 10),
    teacherMemo: '',
  })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openAdd = () => {
    setForm({
      id: '',
      subject: '수학',
      textbookName: '',
      currentProgress: '',
      currentPage: 0,
      totalPage: 100,
      lastStudyDate: new Date().toISOString().slice(0, 10),
      teacherMemo: '',
    })
    setModal(true)
  }

  return (
    <TabShell title="진도 과정" onAdd={openAdd}>
      {records.length === 0 ? (
        <EmptyState title="진도 기록이 없습니다." />
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="font-semibold text-navy-900">{r.textbookName}</p>
                  <p className="text-sm text-slate-600">진도: {r.currentProgress}</p>
                  <TextbookProgress value={r.progressRate} className="max-w-xs" />
                  <p className="text-sm text-slate-500">최근 학습: {formatKoreanDate(r.lastStudyDate)}</p>
                  {r.teacherMemo && (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {r.teacherMemo}
                    </p>
                  )}
                </div>
                <RecordActions
                  onEdit={() => {
                    setForm({
                      id: r.id,
                      subject: r.subject,
                      textbookName: r.textbookName,
                      currentProgress: r.currentProgress,
                      currentPage: r.currentPage,
                      totalPage: r.totalPage,
                      lastStudyDate: r.lastStudyDate,
                      teacherMemo: r.teacherMemo,
                    })
                    setModal(true)
                  }}
                  onDelete={() => setDeleteId(r.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={modal} title={form.id ? '진도 수정' : '진도 추가'} onClose={() => setModal(false)} wide>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            saveProgressRecord({ ...form, studentId, id: form.id || undefined })
            setModal(false)
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium">과목</label>
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <input
            required
            placeholder="교재명"
            value={form.textbookName}
            onChange={(e) => setForm({ ...form, textbookName: e.target.value })}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          />
          <input
            required
            placeholder="현재 진도"
            value={form.currentProgress}
            onChange={(e) => setForm({ ...form, currentProgress: e.target.value })}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={0}
              value={form.currentPage}
              onChange={(e) => setForm({ ...form, currentPage: Number(e.target.value) })}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              placeholder="현재 페이지"
            />
            <input
              type="number"
              min={1}
              value={form.totalPage}
              onChange={(e) => setForm({ ...form, totalPage: Number(e.target.value) })}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
              placeholder="전체 페이지"
            />
          </div>
          <TextbookProgress value={calcProgressRate(form.currentPage, form.totalPage)} />
          <input
            type="date"
            required
            value={form.lastStudyDate}
            onChange={(e) => setForm({ ...form, lastStudyDate: e.target.value })}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          />
          <textarea
            placeholder="강사 메모"
            value={form.teacherMemo}
            onChange={(e) => setForm({ ...form, teacherMemo: e.target.value })}
            rows={2}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className={btnSecondary}>취소</button>
            <button type="submit" className={btnPrimary}>저장</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!deleteId}
        title="삭제"
        message="삭제하시겠습니까?"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteProgressRecord(deleteId)
          setDeleteId(null)
        }}
      />
    </TabShell>
  )
}

function HomeworkTab({ studentId }: { studentId: string }) {
  const { homework, saveHomeworkRecord, deleteHomeworkRecord } = useData()
  const records = useMemo(() => sortByDateDesc(homework.filter((h) => h.studentId === studentId)), [homework, studentId])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<{ id: string; date: string; title: string; description: string; status: HomeworkStatus; teacherMemo: string }>({ id: '', date: '', title: '', description: '', status: '미완료', teacherMemo: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openAdd = () => { setForm({ id: '', date: new Date().toISOString().slice(0, 10), title: '', description: '', status: '미완료', teacherMemo: '' }); setModal(true) }
  const openEdit = (r: typeof records[0]) => { setForm({ id: r.id, date: r.date, title: r.title, description: r.description, status: r.status, teacherMemo: r.teacherMemo }); setModal(true) }

  return (
    <TabShell title="숙제 기록" onAdd={openAdd}>
      {records.length === 0 ? <EmptyState title="숙제 기록이 없습니다." /> : (
        <div className="space-y-3">{records.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><div className="flex items-center gap-2"><p className="font-semibold text-navy-900">{r.title}</p><StatusBadge label={r.status} colorClass={getHomeworkColor(r.status)} /></div><p className="mt-1 text-sm text-slate-500">{formatKoreanDate(r.date)}</p>{r.description && <p className="mt-1 text-sm text-slate-600">{r.description}</p>}</div>
              <RecordActions onEdit={() => openEdit(r)} onDelete={() => setDeleteId(r.id)} />
            </div>
          </div>
        ))}</div>
      )}
      <Modal open={modal} title={form.id ? '숙제 수정' : '숙제 추가'} onClose={() => setModal(false)} wide>
        <form onSubmit={(e) => { e.preventDefault(); if (!form.title.trim()) return; saveHomeworkRecord({ ...form, studentId, id: form.id || undefined }); setModal(false) }} className="space-y-4">
          <div><label className="mb-1.5 block text-sm font-medium">날짜</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-xl border px-3 py-2.5 text-sm" /></div>
          <div><label className="mb-1.5 block text-sm font-medium">제목 *</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-xl border px-3 py-2.5 text-sm" /></div>
          <div><label className="mb-1.5 block text-sm font-medium">내용</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-xl border px-3 py-2.5 text-sm" /></div>
          <div><label className="mb-1.5 block text-sm font-medium">상태</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })} className="w-full rounded-xl border px-3 py-2.5 text-sm">{HOMEWORK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setModal(false)} className={btnSecondary}>취소</button><button type="submit" className={btnPrimary}>저장</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} title="숙제 삭제" message="삭제하시겠습니까?" onCancel={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteHomeworkRecord(deleteId); setDeleteId(null) }} />
    </TabShell>
  )
}

function MakeupPlanTab({ studentId }: { studentId: string }) {
  const { makeupPlans, saveMakeupPlanRecord, deleteMakeupPlanRecord } = useData()
  const records = useMemo(
    () => sortMakeupPlans(makeupPlans.filter((p) => p.studentId === studentId)),
    [makeupPlans, studentId],
  )
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<{
    id: string
    scheduledDate: string
    scheduledTime: string
    method: MakeupMethod | ''
    subject: string
    reason: string
    memo: string
    status: MakeupPlanStatus
  }>({
    id: '',
    scheduledDate: '',
    scheduledTime: '19:00',
    method: '',
    subject: '수학',
    reason: '',
    memo: '',
    status: '예정',
  })
  const [errors, setErrors] = useState<{ method?: string; scheduledDate?: string; scheduledTime?: string }>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openAdd = () => {
    setForm({
      id: '',
      scheduledDate: new Date().toISOString().slice(0, 10),
      scheduledTime: '19:00',
      method: '',
      subject: '수학',
      reason: '',
      memo: '',
      status: '예정',
    })
    setErrors({})
    setModal(true)
  }

  const openEdit = (r: typeof records[0]) => {
    setForm({
      id: r.id,
      scheduledDate: r.scheduledDate,
      scheduledTime: r.scheduledTime,
      method: r.method,
      subject: r.subject,
      reason: r.reason,
      memo: r.memo,
      status: r.status,
    })
    setErrors({})
    setModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: typeof errors = {}
    if (!form.scheduledDate) nextErrors.scheduledDate = '보강 예정 날짜를 선택해 주세요.'
    if (!form.scheduledTime.trim()) nextErrors.scheduledTime = '시간을 선택해 주세요.'
    if (!form.method) nextErrors.method = '보강 방식을 선택해 주세요.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    saveMakeupPlanRecord({
      ...form,
      method: form.method as MakeupMethod,
      studentId,
      id: form.id || undefined,
    })
    setModal(false)
  }

  return (
    <TabShell title="보강계획" onAdd={openAdd}>
      {records.length === 0 ? (
        <EmptyState title="보강계획이 없습니다." />
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <p className="font-semibold text-navy-900">
                    {formatKoreanDateTime(r.scheduledDate, r.scheduledTime)}
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <StatusBadge label={r.method} colorClass={getMakeupMethodColor(r.method)} />
                    {r.subject.trim() && (
                      <StatusBadge label={r.subject.trim()} colorClass={getMakeupSubjectColor()} />
                    )}
                    <StatusBadge label={r.status} colorClass={getMakeupPlanStatusColor(r.status)} />
                  </div>
                  {r.reason && <p className="text-sm text-slate-600">{r.reason}</p>}
                  {r.memo && (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{r.memo}</p>
                  )}
                </div>
                <RecordActions onEdit={() => openEdit(r)} onDelete={() => setDeleteId(r.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={modal} title={form.id ? '보강계획 수정' : '보강계획 추가'} onClose={() => setModal(false)} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">보강 예정 날짜 *</label>
              <input
                type="date"
                required
                value={form.scheduledDate}
                onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              />
              {errors.scheduledDate && <p className="mt-1 text-sm text-rose-500">{errors.scheduledDate}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">보강 예정 시간 *</label>
              <input
                type="time"
                required
                value={form.scheduledTime}
                onChange={(e) => setForm({ ...form, scheduledTime: e.target.value })}
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              />
              {errors.scheduledTime && <p className="mt-1 text-sm text-rose-500">{errors.scheduledTime}</p>}
            </div>
          </div>
          <MakeupMethodPicker
            value={form.method}
            onChange={(method) => setForm({ ...form, method })}
            error={errors.method}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">과목</label>
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <input
            placeholder="보강 사유"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          />
          <textarea
            placeholder="메모"
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            rows={2}
            className="w-full rounded-xl border px-3 py-2.5 text-sm"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">진행 상태</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as MakeupPlanStatus })}
              className="w-full rounded-xl border px-3 py-2.5 text-sm"
            >
              {MAKEUP_PLAN_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className={btnSecondary}>취소</button>
            <button type="submit" className={btnPrimary}>저장</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!deleteId}
        title="삭제"
        message="삭제하시겠습니까?"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteMakeupPlanRecord(deleteId)
          setDeleteId(null)
        }}
      />
    </TabShell>
  )
}

function DailyTestTab({ studentId }: { studentId: string }) {
  const { dailyTests, saveDailyTestRecord, deleteDailyTestRecord } = useData()
  const records = useMemo(
    () => sortByDateDesc(dailyTests.filter((d) => d.studentId === studentId)),
    [dailyTests, studentId],
  )
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<DailyTestFormData>(() => ({
    ...emptyDailyTestForm(),
    studentId,
    date: new Date().toISOString().slice(0, 10),
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openAdd = () => {
    setForm({
      ...emptyDailyTestForm(),
      studentId,
      date: new Date().toISOString().slice(0, 10),
    })
    setErrors({})
    setModal(true)
  }

  const openEdit = (record: (typeof records)[number]) => {
    setForm(dailyTestRecordToForm(record))
    setErrors({})
    setModal(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validateDailyTestForm({ ...form, studentId })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    saveDailyTestRecord(dailyTestFormToSavePayload({ ...form, studentId }))
    setModal(false)
  }

  return (
    <TabShell title="일일테스트 기록" onAdd={openAdd}>
      {records.length === 0 ? (
        <EmptyState title="일일테스트 기록이 없습니다." />
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="font-semibold text-navy-900">{record.testName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatKoreanDate(record.date)} · {record.subject}
                    </p>
                    {record.memo && <p className="mt-1 text-sm text-slate-600">{record.memo}</p>}
                  </div>
                  <DailyTestSessionGrid record={record} compact />
                </div>
                <RecordActions onEdit={() => openEdit(record)} onDelete={() => setDeleteId(record.id)} />
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={modal} title={form.id ? '일일테스트 수정' : '일일테스트 추가'} onClose={() => setModal(false)} wide>
        <DailyTestForm
          form={{ ...form, studentId }}
          students={[]}
          errors={errors}
          onChange={(next) => setForm({ ...next, studentId })}
          onSubmit={handleSubmit}
          onCancel={() => setModal(false)}
          studentLocked
        />
      </Modal>
      <ConfirmDialog
        open={!!deleteId}
        title="삭제"
        message="삭제하시겠습니까?"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteDailyTestRecord(deleteId)
          setDeleteId(null)
        }}
      />
    </TabShell>
  )
}

function MonthlyTab({ studentId }: { studentId: string }) {
  const { monthlyEvaluations, saveMonthlyEvaluationRecord, deleteMonthlyEvaluationRecord } = useData()
  const records = useMemo(() => sortByDateDesc(monthlyEvaluations.filter((m) => m.studentId === studentId)), [monthlyEvaluations, studentId])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ id: '', evaluationDate: '', year: 2025, month: 1, subject: '수학', score: 0, totalScore: 100, teacherComment: '', strengths: '', improvements: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  return (
    <TabShell title="월말평가" onAdd={() => { const d = new Date(); setForm({ id: '', evaluationDate: d.toISOString().slice(0, 10), year: d.getFullYear(), month: d.getMonth() + 1, subject: '수학', score: 0, totalScore: 100, teacherComment: '', strengths: '', improvements: '' }); setModal(true) }}>
      <MonthlyEvaluationChart records={records} />
      {records.length === 0 ? <EmptyState title="월말평가 기록이 없습니다." /> : (
        <div className="space-y-3">{records.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><p className="font-semibold text-navy-900">{r.year}년 {r.month}월 · {r.subject}</p><p className={`mt-1 font-bold ${getScoreColor(r.percentage)}`}>{r.score}/{r.totalScore} ({r.percentage}%)</p>{r.teacherComment && <p className="mt-1 text-sm text-slate-600">{r.teacherComment}</p>}</div>
              <RecordActions onEdit={() => { setForm({ id: r.id, evaluationDate: r.evaluationDate, year: r.year, month: r.month, subject: r.subject, score: r.score, totalScore: r.totalScore, teacherComment: r.teacherComment, strengths: r.strengths, improvements: r.improvements }); setModal(true) }} onDelete={() => setDeleteId(r.id)} />
            </div>
          </div>
        ))}</div>
      )}
      <Modal open={modal} title="월말평가" onClose={() => setModal(false)} wide>
        <form onSubmit={(e) => { e.preventDefault(); saveMonthlyEvaluationRecord({ ...form, studentId, id: form.id || undefined }); setModal(false) }} className="space-y-4">
          <input type="date" required value={form.evaluationDate} onChange={(e) => { const d = new Date(e.target.value); setForm({ ...form, evaluationDate: e.target.value, year: d.getFullYear(), month: d.getMonth() + 1 }) }} className="w-full rounded-xl border px-3 py-2.5 text-sm" />
          <div className="grid grid-cols-2 gap-3"><input type="number" value={form.score} onChange={(e) => setForm({ ...form, score: Number(e.target.value) })} className="w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="점수" /><input type="number" value={form.totalScore} onChange={(e) => setForm({ ...form, totalScore: Number(e.target.value) })} className="w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="만점" /></div>
          <textarea value={form.teacherComment} onChange={(e) => setForm({ ...form, teacherComment: e.target.value })} rows={2} className="w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="강사 총평" />
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setModal(false)} className={btnSecondary}>취소</button><button type="submit" className={btnPrimary}>저장</button></div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteId} title="삭제" message="삭제하시겠습니까?" onCancel={() => setDeleteId(null)} onConfirm={() => { if (deleteId) deleteMonthlyEvaluationRecord(deleteId); setDeleteId(null) }} />
    </TabShell>
  )
}

function QuestionsTab({ studentId }: { studentId: string }) {
  const { questions, saveQuestionRecord, deleteQuestionRecord, showToast } = useData()
  const records = useMemo(
    () => sortByDateDesc(questions.filter((q) => q.studentId === studentId)),
    [questions, studentId],
  )
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState<QuestionFormState>(emptyQuestionForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openAdd = () => {
    setForm({ ...emptyQuestionForm(), studentId })
    setErrors({})
    setModal(true)
  }

  const openEdit = (record: (typeof records)[number]) => {
    setForm({ ...questionRecordToForm(record), studentId })
    setErrors({})
    setModal(true)
  }

  const validate = () => {
    const next: Record<string, string> = {}
    const dateErr = requireDate(form.date)
    if (dateErr) next.date = dateErr
    const titleErr = requireNonEmpty(form.title, '제목')
    if (titleErr) next.title = titleErr
    const contentErr = requireNonEmpty(form.content, '질문 내용')
    if (contentErr) next.content = contentErr
    setErrors(next)
    return Object.keys(next).length === 0
  }

  return (
    <TabShell title="질문 기록" onAdd={openAdd}>
      {records.length === 0 ? (
        <EmptyState title="질문 기록이 없습니다." />
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <QuestionRecordCard
              key={record.id}
              record={record}
              compactImages={false}
              actions={
                <RecordActions onEdit={() => openEdit(record)} onDelete={() => setDeleteId(record.id)} />
              }
            />
          ))}
        </div>
      )}
      <Modal open={modal} title={form.id ? '질문 수정' : '질문 등록'} onClose={() => setModal(false)} wide>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!validate()) return
            saveQuestionRecord({
              ...form,
              studentId,
              id: form.id || undefined,
              status: form.answer.trim() ? '답변완료' : '답변대기',
              questionImages: form.questionImages,
              answerImages: form.answerImages,
            })
            setModal(false)
          }}
          className="space-y-4"
        >
          <QuestionFormFields
            form={form}
            errors={errors}
            onChange={setForm}
            onImageError={showToast}
            allowQuestionImages
            allowAnswerEdit
            allowAnswerImages
          />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModal(false)} className={btnSecondary}>
              취소
            </button>
            <button type="submit" className={btnPrimary}>
              저장
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!deleteId}
        title="삭제"
        message="삭제하시겠습니까?"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteQuestionRecord(deleteId)
          setDeleteId(null)
        }}
      />
    </TabShell>
  )
}
