import { ArrowLeft, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DifficultyBreakdownBadges } from '../components/monthly/DifficultyBreakdownBadges'
import {
  MonthlyEvaluationForm,
  validateMonthlyEvaluationForm,
} from '../components/monthly/MonthlyEvaluationForm'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { RecordActions } from '../components/ui/RecordActions'
import { StudentSelect } from '../components/ui/StudentSelect'
import { useData } from '../hooks/useData'
import type { MonthlyEvaluationRecord } from '../types/records'
import { sortByDateDesc } from '../utils/filters'
import { formatKoreanDate } from '../utils/date'
import {
  emptyMonthlyEvaluationForm,
  monthlyEvaluationFormToSavePayload,
  monthlyEvaluationRecordToForm,
  type MonthlyEvaluationFormData,
} from '../utils/monthlyEvaluation'
import { SUBJECTS, btnPrimary, getScoreColor, inputClass } from '../utils/labels'

export function MonthlyEvaluationPage() {
  const navigate = useNavigate()
  const { students, monthlyEvaluations, saveMonthlyEvaluationRecord, deleteMonthlyEvaluationRecord } =
    useData()
  const [yearFilter, setYearFilter] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [studentFilter, setStudentFilter] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<MonthlyEvaluationFormData>(emptyMonthlyEvaluationForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<MonthlyEvaluationRecord | null>(null)

  const filtered = useMemo(() => {
    let list = sortByDateDesc(monthlyEvaluations)
    if (yearFilter) list = list.filter((m) => m.year === Number(yearFilter))
    if (monthFilter) list = list.filter((m) => m.month === Number(monthFilter))
    if (studentFilter) list = list.filter((m) => m.studentId === studentFilter)
    if (subjectFilter) list = list.filter((m) => m.subject === subjectFilter)
    return list
  }, [monthFilter, monthlyEvaluations, studentFilter, subjectFilter, yearFilter])

  const openAdd = () => {
    setForm(emptyMonthlyEvaluationForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (record: MonthlyEvaluationRecord) => {
    setForm(monthlyEvaluationRecordToForm(record))
    setErrors({})
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validateMonthlyEvaluationForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    saveMonthlyEvaluationRecord(monthlyEvaluationFormToSavePayload(form))
    setModalOpen(false)
  }

  const getStudentName = (id: string) => students.find((s) => s.id === id)?.name ?? '-'

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() =>
          navigate('/monthly-evaluations', { state: { resetAt: Date.now() } })
        }
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-1 py-0.5 text-sm font-medium text-slate-600 transition hover:text-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        월말평가 보기로 돌아가기
      </button>
      <PageHeader
        title="강사용 평가 관리"
        description="월말평가를 입력하고 수정합니다."
        action={
          <button type="button" onClick={openAdd} className={`${btnPrimary} inline-flex items-center gap-2`}>
            <Plus className="h-4 w-4" />
            평가 입력
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">연도</label>
            <input
              type="number"
              placeholder="전체"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className={inputClass()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">월</label>
            <input
              type="number"
              min={1}
              max={12}
              placeholder="전체"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className={inputClass()}
            />
          </div>
          <div>
            <StudentSelect
              students={students}
              value={studentFilter}
              onChange={setStudentFilter}
              label="학생"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">과목</label>
            <select
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
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="월말평가 기록이 없습니다." />
      ) : (
        <div className="space-y-3">
          {filtered.map((record) => (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <Link
                      to={`/students/${record.studentId}/monthly-evaluation`}
                      className="text-base font-bold text-navy-900 underline-offset-2 hover:text-blue-700 hover:underline"
                    >
                      {getStudentName(record.studentId)}
                    </Link>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatKoreanDate(record.evaluationDate)} · {record.year}년 {record.month}월 ·{' '}
                      {record.subject}
                    </p>
                    <p className={`mt-2 text-lg font-bold ${getScoreColor(record.percentage)}`}>
                      {record.score}/{record.totalScore}점 ({record.percentage}%)
                    </p>
                  </div>
                  <DifficultyBreakdownBadges breakdown={record.difficultyBreakdown} />
                  {record.teacherComment && (
                    <p className="whitespace-pre-wrap text-sm text-slate-700">
                      <span className="font-semibold">시험 총평: </span>
                      {record.teacherComment}
                    </p>
                  )}
                </div>
                <RecordActions
                  onEdit={() => openEdit(record)}
                  onDelete={() => setDeleteTarget(record)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={form.id ? '월말평가 수정' : '월말평가 입력'}
        onClose={() => setModalOpen(false)}
        wide
      >
        <MonthlyEvaluationForm
          form={form}
          students={students}
          errors={errors}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="월말평가 삭제"
        message="이 평가 기록을 삭제하시겠습니까?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteMonthlyEvaluationRecord(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
