import { StudentSelect } from '../ui/StudentSelect'
import { DailyLearningDiagnosisFields } from '../diagnosis/DailyLearningDiagnosisFields'
import {
  DailyTestSessionFormSection,
  validateDailyTestSessions,
} from './DailyTestSessionFormSection'
import type { Student } from '../../types/student'
import type { DailyTestFormData } from '../../utils/dailyTest'
import { normalizeSessionResultsForForm } from '../../utils/dailyTest'
import { SUBJECTS, btnPrimary, btnSecondary, inputClass } from '../../utils/labels'
import { requireDate, requireNonEmpty } from '../../utils/validation'

type DailyTestFormProps = {
  form: DailyTestFormData
  students: Student[]
  errors: Record<string, string>
  onChange: (form: DailyTestFormData) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  studentLocked?: boolean
}

export function DailyTestForm({
  form,
  students,
  errors,
  onChange,
  onSubmit,
  onCancel,
  studentLocked = false,
}: DailyTestFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!studentLocked && (
        <StudentSelect
          students={students.filter((s) => s.status === '재원')}
          value={form.studentId}
          onChange={(v) => onChange({ ...form, studentId: v })}
          error={errors.studentId}
          required
        />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">날짜 *</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => onChange({ ...form, date: e.target.value })}
            className={inputClass(errors.date)}
          />
          {errors.date && <p className="mt-1 text-sm text-rose-500">{errors.date}</p>}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">과목 *</label>
          <select
            value={form.subject}
            onChange={(e) => onChange({ ...form, subject: e.target.value })}
            className={inputClass(errors.subject)}
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors.subject && <p className="mt-1 text-sm text-rose-500">{errors.subject}</p>}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">시험명 *</label>
        <input
          value={form.testName}
          onChange={(e) => onChange({ ...form, testName: e.target.value })}
          className={inputClass(errors.testName)}
        />
        {errors.testName && <p className="mt-1 text-sm text-rose-500">{errors.testName}</p>}
      </div>
      <DailyTestSessionFormSection
        sessions={form.sessionResults}
        onChange={(sessionResults) =>
          onChange({ ...form, sessionResults: normalizeSessionResultsForForm(sessionResults) })
        }
        errors={errors}
        sectionTitle={form.subject.includes('영어') ? '어휘 시험' : undefined}
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">메모</label>
        <textarea
          value={form.memo}
          onChange={(e) => onChange({ ...form, memo: e.target.value })}
          rows={2}
          className={inputClass()}
        />
      </div>
      <DailyLearningDiagnosisFields
        subject={form.subject}
        value={form.learningDiagnosis}
        onChange={(learningDiagnosis) => onChange({ ...form, learningDiagnosis })}
      />
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={btnSecondary}>
          취소
        </button>
        <button type="submit" className={btnPrimary}>
          저장
        </button>
      </div>
    </form>
  )
}

export function validateDailyTestForm(form: DailyTestFormData): Record<string, string> {
  const next: Record<string, string> = {}
  if (!form.studentId) next.studentId = '학생을 선택해 주세요.'
  const dateErr = requireDate(form.date)
  if (dateErr) next.date = dateErr
  const nameErr = requireNonEmpty(form.testName, '시험명')
  if (nameErr) next.testName = nameErr
  const subjectErr = requireNonEmpty(form.subject, '과목')
  if (subjectErr) next.subject = subjectErr
  Object.assign(next, validateDailyTestSessions(form.sessionResults))
  return next
}
