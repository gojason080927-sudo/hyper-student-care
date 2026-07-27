import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { RecordActions } from '../components/ui/RecordActions'
import { StudentSelect } from '../components/ui/StudentSelect'
import { TextbookProgress } from '../components/ui/TextbookProgress'
import { useData } from '../hooks/useData'
import type { ProgressRecord } from '../types/records'
import { calcProgressRate } from '../utils/calc'
import { formatKoreanDate } from '../utils/date'
import { GRADES, SUBJECTS, btnPrimary, btnSecondary, inputClass } from '../utils/labels'
import { requireDate, requireNonEmpty, validateCounts } from '../utils/validation'

type FormState = {
  id?: string
  studentId: string
  subject: string
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
  textbookName: '',
  currentProgress: '',
  currentPage: 0,
  totalPage: 100,
  lastStudyDate: new Date().toISOString().slice(0, 10),
  teacherMemo: '',
})

export function ProgressPage() {
  const { students, progressRecords, saveProgressRecord, deleteProgressRecord } = useData()
  const [studentSearch, setStudentSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [textbookSearch, setTextbookSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<ProgressRecord | null>(null)

  const getStudent = (id: string) => students.find((s) => s.id === id)

  const filtered = useMemo(() => {
    return progressRecords.filter((record) => {
      const student = getStudent(record.studentId)
      if (!student) return false
      if (studentSearch.trim() && !student.name.includes(studentSearch.trim())) return false
      if (gradeFilter && student.grade !== gradeFilter) return false
      if (subjectFilter && record.subject !== subjectFilter) return false
      if (textbookSearch.trim() && !record.textbookName.includes(textbookSearch.trim())) {
        return false
      }
      return true
    })
  }, [gradeFilter, progressRecords, studentSearch, students, subjectFilter, textbookSearch])

  const previewRate = calcProgressRate(form.currentPage, form.totalPage)

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
      <PageHeader
        title="진도 과정"
        description="학생별 교재 진행 상황을 관리합니다."
        action={
          <button type="button" onClick={openAdd} className={`${btnPrimary} inline-flex items-center gap-2`}>
            <Plus className="h-4 w-4" />
            추가
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">학생 검색</label>
            <input
              type="search"
              placeholder="학생 이름"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className={inputClass()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">학년</label>
            <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className={inputClass()}>
              <option value="">전체</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">과목</label>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className={inputClass()}>
              <option value="">전체</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">교재명 검색</label>
            <input
              type="search"
              placeholder="교재명"
              value={textbookSearch}
              onChange={(e) => setTextbookSearch(e.target.value)}
              className={inputClass()}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="진도 기록이 없습니다." />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-3.5">학생명</th>
                  <th className="px-4 py-3.5">과목</th>
                  <th className="px-4 py-3.5">교재명</th>
                  <th className="px-4 py-3.5">현재 진도</th>
                  <th className="px-4 py-3.5">현재 페이지</th>
                  <th className="px-4 py-3.5">전체 페이지</th>
                  <th className="px-4 py-3.5">교재 진행률</th>
                  <th className="px-4 py-3.5">최근 학습일</th>
                  <th className="px-4 py-3.5 text-right">관리</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => {
                  const student = getStudent(record.studentId)
                  return (
                    <tr key={record.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3.5 font-semibold text-navy-900">{student?.name ?? '-'}</td>
                      <td className="px-4 py-3.5">{record.subject}</td>
                      <td className="px-4 py-3.5">{record.textbookName}</td>
                      <td className="px-4 py-3.5">{record.currentProgress}</td>
                      <td className="px-4 py-3.5">{record.currentPage}</td>
                      <td className="px-4 py-3.5">{record.totalPage}</td>
                      <td className="px-4 py-3.5">
                        <TextbookProgress value={record.progressRate} className="min-w-[140px]" />
                      </td>
                      <td className="px-4 py-3.5">{formatKoreanDate(record.lastStudyDate)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end">
                          <RecordActions onEdit={() => openEdit(record)} onDelete={() => setDeleteTarget(record)} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {filtered.map((record) => {
              const student = getStudent(record.studentId)
              return (
                <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-base font-bold text-navy-900">{student?.name ?? '-'}</p>
                  <p className="mt-1 text-sm text-slate-500">{record.subject} · {record.textbookName}</p>
                  <p className="mt-2 text-sm text-slate-700">진도: {record.currentProgress}</p>
                  <p className="mt-1 text-sm text-slate-600">{record.currentPage} / {record.totalPage} 페이지</p>
                  <div className="mt-3"><TextbookProgress value={record.progressRate} /></div>
                  <p className="mt-2 text-sm text-slate-500">최근 학습: {formatKoreanDate(record.lastStudyDate)}</p>
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <RecordActions onEdit={() => openEdit(record)} onDelete={() => setDeleteTarget(record)} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
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
              <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={inputClass()}>
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">교재명 *</label>
              <input value={form.textbookName} onChange={(e) => setForm({ ...form, textbookName: e.target.value })} className={inputClass(errors.textbookName)} />
              {errors.textbookName && <p className="mt-1 text-sm text-rose-500">{errors.textbookName}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">현재 진도 *</label>
            <input value={form.currentProgress} onChange={(e) => setForm({ ...form, currentProgress: e.target.value })} placeholder="예: 3단원 함수" className={inputClass(errors.currentProgress)} />
            {errors.currentProgress && <p className="mt-1 text-sm text-rose-500">{errors.currentProgress}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">현재 페이지</label>
              <input type="number" min={0} value={form.currentPage} onChange={(e) => setForm({ ...form, currentPage: Number(e.target.value) })} className={inputClass(errors.totalPage)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">전체 페이지</label>
              <input type="number" min={1} value={form.totalPage} onChange={(e) => setForm({ ...form, totalPage: Number(e.target.value) })} className={inputClass(errors.totalPage)} />
            </div>
          </div>
          {errors.totalPage && <p className="text-sm text-rose-500">{errors.totalPage}</p>}
          <TextbookProgress value={previewRate} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">최근 학습일 *</label>
            <input type="date" value={form.lastStudyDate} onChange={(e) => setForm({ ...form, lastStudyDate: e.target.value })} className={inputClass(errors.lastStudyDate)} />
            {errors.lastStudyDate && <p className="mt-1 text-sm text-rose-500">{errors.lastStudyDate}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">강사 메모</label>
            <textarea value={form.teacherMemo} onChange={(e) => setForm({ ...form, teacherMemo: e.target.value })} rows={2} className={inputClass()} />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>취소</button>
            <button type="submit" className={btnPrimary}>저장</button>
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
