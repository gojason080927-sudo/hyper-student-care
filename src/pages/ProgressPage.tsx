import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ProgressRecordCard } from '../components/progress/ProgressRecordCard'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { HeroProgressBar } from '../components/ui/HeroProgressBar'
import { Modal } from '../components/ui/Modal'
import { StudentSelect } from '../components/ui/StudentSelect'
import { useData } from '../hooks/useData'
import type { ProgressRecord } from '../types/records'
import { calcProgressRate } from '../utils/calc'
import { getUniqueClassNames } from '../utils/filters'
import { GRADES, SUBJECTS, btnPrimary, btnSecondary, inputClass } from '../utils/labels'
import { requireDate, requireNonEmpty, validateCounts } from '../utils/validation'

type FormState = {
  id?: string
  studentId: string
  subject: string
  slotNumber: number
  textbookName: string
  currentProgress: string
  currentPage: number
  totalPage: number
  lastStudyDate: string
  teacherMemo: string
}

const emptyForm = (): FormState => ({
  studentId: '',
  subject: '수학',
  slotNumber: 1,
  textbookName: '',
  currentProgress: '',
  currentPage: 0,
  totalPage: 100,
  lastStudyDate: new Date().toISOString().slice(0, 10),
  teacherMemo: '',
})

const addButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 sm:px-6 sm:py-3.5 sm:text-base'

export function ProgressPage() {
  const { students, progressRecords, saveProgressRecord, deleteProgressRecord } = useData()
  const [studentSearch, setStudentSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [textbookSearch, setTextbookSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<ProgressRecord | null>(null)

  const classNames = useMemo(() => getUniqueClassNames(students), [students])

  const getStudent = (id: string) => students.find((s) => s.id === id)

  const filtered = useMemo(() => {
    return progressRecords.filter((record) => {
      const student = getStudent(record.studentId)
      if (!student) return false
      if (studentSearch.trim() && !student.name.includes(studentSearch.trim())) return false
      if (gradeFilter && student.grade !== gradeFilter) return false
      if (classFilter && student.className !== classFilter) return false
      if (subjectFilter && record.subject !== subjectFilter) return false
      if (textbookSearch.trim() && !record.textbookName.includes(textbookSearch.trim())) {
        return false
      }
      return true
    })
  }, [classFilter, gradeFilter, progressRecords, studentSearch, students, subjectFilter, textbookSearch])

  const previewRate = calcProgressRate(form.currentPage, form.totalPage)
  const hasRecords = progressRecords.length > 0
  const hasFilteredResults = filtered.length > 0

  const openAdd = () => {
    setForm(emptyForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (record: ProgressRecord) => {
    setForm({
      id: record.id,
      studentId: record.studentId,
      subject: record.subject,
      slotNumber: record.slotNumber ?? 1,
      textbookName: record.textbookName,
      currentProgress: record.currentProgress,
      currentPage: record.currentPage,
      totalPage: record.totalPage,
      lastStudyDate: record.lastStudyDate,
      teacherMemo: record.teacherMemo,
    })
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.studentId) next.studentId = '학생을 선택해 주세요.'
    const nameErr = requireNonEmpty(form.textbookName, '교재명')
    if (nameErr) next.textbookName = nameErr
    const progressErr = requireNonEmpty(form.currentProgress, '현재 진도')
    if (progressErr) next.currentProgress = progressErr
    const dateErr = requireDate(form.lastStudyDate, '최근 학습일')
    if (dateErr) next.lastStudyDate = dateErr
    const countErr = validateCounts(form.currentPage, form.totalPage)
    if (countErr) next.totalPage = countErr
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    saveProgressRecord(form)
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">진도 과정</h2>
          <p className="mt-1 text-sm text-slate-500">학생별 교재 진행 상황을 관리합니다.</p>
        </div>
        <button type="button" onClick={openAdd} className={addButtonClass}>
          <Plus className="h-5 w-5" />
          추가
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label htmlFor="progress-student-search" className="mb-1.5 block text-sm font-medium text-slate-600">
              학생 검색
            </label>
            <input
              id="progress-student-search"
              type="search"
              placeholder="학생 이름"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className={inputClass()}
            />
          </div>
          <div>
            <label htmlFor="progress-grade" className="mb-1.5 block text-sm font-medium text-slate-600">
              학년
            </label>
            <select
              id="progress-grade"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className={inputClass()}
            >
              <option value="">전체</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="progress-class" className="mb-1.5 block text-sm font-medium text-slate-600">
              반/과정
            </label>
            <select
              id="progress-class"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className={inputClass()}
            >
              <option value="">전체</option>
              {classNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="progress-subject" className="mb-1.5 block text-sm font-medium text-slate-600">
              과목
            </label>
            <select
              id="progress-subject"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className={inputClass()}
            >
              <option value="">전체</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="progress-textbook" className="mb-1.5 block text-sm font-medium text-slate-600">
              교재명 검색
            </label>
            <input
              id="progress-textbook"
              type="search"
              placeholder="교재명"
              value={textbookSearch}
              onChange={(e) => setTextbookSearch(e.target.value)}
              className={inputClass()}
            />
          </div>
        </div>
      </div>

      {!hasRecords ? (
        <EmptyState
          title="아직 등록된 진도 과정이 없습니다."
          description="오른쪽 상단의 [추가] 버튼을 눌러 첫 번째 교재를 등록해 보세요. 학생별 교재 진행 상황을 한곳에서 편하게 관리할 수 있습니다."
        />
      ) : !hasFilteredResults ? (
        <EmptyState
          title="검색 결과가 없습니다."
          description="검색어나 필터 조건을 변경해 보세요."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((record) => (
            <ProgressRecordCard
              key={record.id}
              record={record}
              student={getStudent(record.studentId)}
              onEdit={() => openEdit(record)}
              onDelete={() => setDeleteTarget(record)}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} title={form.id ? '진도 수정' : '진도 추가'} onClose={() => setModalOpen(false)} wide>
        <form onSubmit={handleSubmit} className="space-y-4">
          <StudentSelect
            students={students.filter((s) => s.status === '재원')}
            value={form.studentId}
            onChange={(v) => setForm({ ...form, studentId: v })}
            error={errors.studentId}
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">과목</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className={inputClass()}
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">교재명 *</label>
              <input
                value={form.textbookName}
                onChange={(e) => setForm({ ...form, textbookName: e.target.value })}
                className={inputClass(errors.textbookName)}
              />
              {errors.textbookName && <p className="mt-1 text-sm text-rose-500">{errors.textbookName}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">현재 진도 *</label>
            <input
              value={form.currentProgress}
              onChange={(e) => setForm({ ...form, currentProgress: e.target.value })}
              placeholder="예: 3단원 함수"
              className={inputClass(errors.currentProgress)}
            />
            {errors.currentProgress && (
              <p className="mt-1 text-sm text-rose-500">{errors.currentProgress}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">현재 페이지</label>
              <input
                type="number"
                min={0}
                value={form.currentPage}
                onChange={(e) => setForm({ ...form, currentPage: Number(e.target.value) })}
                className={inputClass(errors.totalPage)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">전체 페이지</label>
              <input
                type="number"
                min={1}
                value={form.totalPage}
                onChange={(e) => setForm({ ...form, totalPage: Number(e.target.value) })}
                className={inputClass(errors.totalPage)}
              />
            </div>
          </div>
          {errors.totalPage && <p className="text-sm text-rose-500">{errors.totalPage}</p>}
          <HeroProgressBar value={previewRate} size="large" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">최근 학습일 *</label>
            <input
              type="date"
              value={form.lastStudyDate}
              onChange={(e) => setForm({ ...form, lastStudyDate: e.target.value })}
              className={inputClass(errors.lastStudyDate)}
            />
            {errors.lastStudyDate && <p className="mt-1 text-sm text-rose-500">{errors.lastStudyDate}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">강사 메모</label>
            <textarea
              value={form.teacherMemo}
              onChange={(e) => setForm({ ...form, teacherMemo: e.target.value })}
              rows={2}
              className={inputClass()}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>
              취소
            </button>
            <button type="submit" className={btnPrimary}>
              저장
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="진도 삭제"
        message="이 진도 기록을 삭제하시겠습니까?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteProgressRecord(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
