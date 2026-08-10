import { StudentSelect } from '../ui/StudentSelect'
import { WrongAnswerCauseEditor } from '../diagnosis/WrongAnswerCauseEditor'
import {
  DifficultyBreakdownFormSection,
  validateDifficultyBreakdown,
} from './DifficultyBreakdownFormSection'
import type { Student } from '../../types/student'
import type { MonthlyEvaluationFormData } from '../../utils/monthlyEvaluation'
import { TEACHER_COMMENT_MAX_LENGTH, trimComment } from '../../utils/monthlyEvaluation'
import { SUBJECTS, btnPrimary, btnSecondary, getScoreColor, inputClass } from '../../utils/labels'
import { calcPercentage } from '../../utils/calc'
import { requireDate, validateScore } from '../../utils/validation'

type MonthlyEvaluationFormProps = {
  form: MonthlyEvaluationFormData
  students: Student[]
  errors: Record<string, string>
  onChange: (form: MonthlyEvaluationFormData) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export function MonthlyEvaluationForm({
  form,
  students,
  errors,
  onChange,
  onSubmit,
  onCancel,
}: MonthlyEvaluationFormProps) {
  const previewPct = calcPercentage(form.score, form.totalScore)

  const syncYearMonth = (date: string) => {
    const d = new Date(date)
    onChange({
      ...form,
      evaluationDate: date,
      year: d.getFullYear(),
      month: d.getMonth() + 1,
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <StudentSelect
        students={students.filter((s) => s.status === '재원')}
        value={form.studentId}
        onChange={(v) => onChange({ ...form, studentId: v })}
        error={errors.studentId}
        required
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">평가 날짜 *</label>
          <input
            type="date"
            value={form.evaluationDate}
            onChange={(e) => syncYearMonth(e.target.value)}
            className={inputClass(errors.evaluationDate)}
          />
          {errors.evaluationDate && (
            <p className="mt-1 text-sm text-rose-500">{errors.evaluationDate}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">연도</label>
          <input
            type="number"
            value={form.year}
            onChange={(e) => onChange({ ...form, year: Number(e.target.value) })}
            className={inputClass()}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">월</label>
          <input
            type="number"
            min={1}
            max={12}
            value={form.month}
            onChange={(e) => onChange({ ...form, month: Number(e.target.value) })}
            className={inputClass()}
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">과목</label>
        <select
          value={form.subject}
          onChange={(e) => onChange({ ...form, subject: e.target.value })}
          className={inputClass()}
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">점수 *</label>
          <input
            type="number"
            min={0}
            value={form.score}
            onChange={(e) => onChange({ ...form, score: Number(e.target.value) })}
            className={inputClass(errors.score)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">만점 *</label>
          <input
            type="number"
            min={1}
            value={form.totalScore}
            onChange={(e) => onChange({ ...form, totalScore: Number(e.target.value) })}
            className={inputClass(errors.score)}
          />
        </div>
      </div>
      {errors.score && <p className="text-sm text-rose-500">{errors.score}</p>}
      <p className="text-sm text-slate-600">
        백분율: <strong className={getScoreColor(previewPct)}>{previewPct}%</strong>
      </p>
      <DifficultyBreakdownFormSection
        breakdown={form.difficultyBreakdown}
        totalScore={form.totalScore}
        onChange={(difficultyBreakdown) => onChange({ ...form, difficultyBreakdown })}
        errors={errors}
      />
      {form.subject.includes('수학') ? (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <p className="text-sm font-semibold text-slate-700">수학 오답 원인 (문항별)</p>
          <WrongAnswerCauseEditor
            items={form.wrongAnswerItems}
            onChange={(wrongAnswerItems) => onChange({ ...form, wrongAnswerItems })}
            questionTotal={form.questionTotal}
            onQuestionTotalChange={(questionTotal) => onChange({ ...form, questionTotal })}
          />
        </div>
      ) : null}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">시험 총평</label>
        <textarea
          value={form.teacherComment}
          onChange={(e) =>
            onChange({
              ...form,
              teacherComment: e.target.value.slice(0, TEACHER_COMMENT_MAX_LENGTH),
            })
          }
          rows={5}
          maxLength={TEACHER_COMMENT_MAX_LENGTH}
          placeholder="이번 월말평가의 학습 상태, 성취도, 보완할 점을 작성해 주세요."
          className={`${inputClass()} min-h-[120px] w-full`}
        />
        <p className="mt-1 text-right text-xs text-slate-500">
          {form.teacherComment.length}/{TEACHER_COMMENT_MAX_LENGTH}자
        </p>
        {errors.teacherComment && (
          <p className="mt-1 text-sm text-rose-500">{errors.teacherComment}</p>
        )}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">잘한 점</label>
        <textarea
          value={form.strengths}
          onChange={(e) => onChange({ ...form, strengths: e.target.value })}
          rows={2}
          className={inputClass()}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">보완할 점</label>
        <textarea
          value={form.improvements}
          onChange={(e) => onChange({ ...form, improvements: e.target.value })}
          rows={2}
          className={inputClass()}
        />
      </div>
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

export function validateMonthlyEvaluationForm(
  form: MonthlyEvaluationFormData,
): Record<string, string> {
  const next: Record<string, string> = {}
  if (!form.studentId) next.studentId = '학생을 선택해 주세요.'
  const dateErr = requireDate(form.evaluationDate, '평가 날짜')
  if (dateErr) next.evaluationDate = dateErr
  const scoreErr = validateScore(form.score, form.totalScore)
  if (scoreErr) next.score = scoreErr
  Object.assign(next, validateDifficultyBreakdown(form.difficultyBreakdown))
  if (trimComment(form.teacherComment).length > TEACHER_COMMENT_MAX_LENGTH) {
    next.teacherComment = `시험 총평은 ${TEACHER_COMMENT_MAX_LENGTH}자 이내로 작성해 주세요.`
  }
  return next
}
