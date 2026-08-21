import {
  CHOICE_LABELS,
  ENTRANCE_EXAM_DIFFICULTIES,
  ENTRANCE_EXAM_GRADES,
  ENTRANCE_EXAM_SUBJECTS,
  getEvaluationAreasForSubject,
  normalizeEntranceExamAreaLabel,
} from '../constants'
import type {
  EntranceExamDifficulty,
  EntranceExamGrade,
  EntranceExamQuestion,
  EntranceExamQuestionInput,
  EntranceExamSubject,
} from '../types'
import { btnPrimary, btnSecondary, inputClass } from '../../../utils/labels'

export type EntranceExamQuestionFormState = {
  id?: string
  subject: EntranceExamSubject
  targetGrade: EntranceExamGrade
  stem: string
  choices: string[]
  correctChoice: number
  explanation: string
  difficulty: EntranceExamDifficulty
  evaluationAreas: string[]
  unitName: string
}

export function emptyEntranceExamQuestionForm(
  defaults?: Partial<Pick<EntranceExamQuestionFormState, 'subject' | 'targetGrade'>>,
): EntranceExamQuestionFormState {
  return {
    subject: defaults?.subject ?? '수학',
    targetGrade: defaults?.targetGrade ?? '중1',
    stem: '',
    choices: ['', '', '', '', ''],
    correctChoice: 1,
    explanation: '',
    difficulty: '중',
    evaluationAreas: [],
    unitName: '',
  }
}

export function questionToForm(record: EntranceExamQuestion): EntranceExamQuestionFormState {
  return {
    id: record.id,
    subject: record.subject,
    targetGrade: record.targetGrade,
    stem: record.stem,
    choices: [...record.choices],
    correctChoice: record.correctChoice,
    explanation: record.explanation,
    difficulty: record.difficulty,
    // 영어 legacy 영역명은 편집 시 확정 명칭으로 정규화 (원본 DB는 저장 전까지 유지)
    evaluationAreas: record.evaluationAreas.map((area) =>
      normalizeEntranceExamAreaLabel(area, record.subject),
    ),
    unitName: record.unitName,
  }
}

type Props = {
  value: EntranceExamQuestionFormState
  errors: Record<string, string>
  saving?: boolean
  onChange: (next: EntranceExamQuestionFormState) => void
  onSubmit: () => void
  onCancel: () => void
}

export function EntranceExamQuestionForm({
  value,
  errors,
  saving = false,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  const areaOptions = getEvaluationAreasForSubject(value.subject)

  const toggleArea = (area: string) => {
    const selected = value.evaluationAreas.includes(area)
      ? value.evaluationAreas.filter((item) => item !== area)
      : [...value.evaluationAreas, area]
    onChange({ ...value, evaluationAreas: selected })
  }

  const handleSubjectChange = (subject: EntranceExamSubject) => {
    const allowed = new Set(getEvaluationAreasForSubject(subject))
    onChange({
      ...value,
      subject,
      evaluationAreas: value.evaluationAreas
        .map((area) => normalizeEntranceExamAreaLabel(area, subject))
        .filter((area) => allowed.has(area)),
    })
  }

  return (
    <form
      className="space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-600">과목</span>
          <select
            value={value.subject}
            onChange={(e) => handleSubjectChange(e.target.value as EntranceExamSubject)}
            className={inputClass(errors.subject)}
          >
            {ENTRANCE_EXAM_SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-600">대상 학년</span>
          <select
            value={value.targetGrade}
            onChange={(e) =>
              onChange({ ...value, targetGrade: e.target.value as EntranceExamGrade })
            }
            className={inputClass(errors.targetGrade)}
          >
            {ENTRANCE_EXAM_GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-600">난이도</span>
          <select
            value={value.difficulty}
            onChange={(e) =>
              onChange({ ...value, difficulty: e.target.value as EntranceExamDifficulty })
            }
            className={inputClass(errors.difficulty)}
          >
            {ENTRANCE_EXAM_DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">단원</span>
        <input
          value={value.unitName}
          onChange={(e) => onChange({ ...value, unitName: e.target.value })}
          className={inputClass(errors.unitName)}
          placeholder="예: 문자와 식"
        />
        {errors.unitName ? <p className="mt-1 text-xs text-rose-500">{errors.unitName}</p> : null}
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">문제</span>
        <textarea
          value={value.stem}
          onChange={(e) => onChange({ ...value, stem: e.target.value })}
          rows={4}
          className={inputClass(errors.stem)}
          placeholder="문제 본문을 입력하세요."
        />
        {errors.stem ? <p className="mt-1 text-xs text-rose-500">{errors.stem}</p> : null}
      </label>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600">객관식 보기 (5지선다)</p>
        {CHOICE_LABELS.map((label, index) => (
          <label key={label} className="flex items-start gap-2">
            <span className="mt-2 w-6 shrink-0 text-sm font-semibold text-[#163A70]">{label}</span>
            <input
              value={value.choices[index] ?? ''}
              onChange={(e) => {
                const choices = [...value.choices]
                choices[index] = e.target.value
                onChange({ ...value, choices })
              }}
              className={inputClass(errors[`choice${index}`])}
              placeholder={`${label} 보기`}
            />
          </label>
        ))}
        {errors.choices ? <p className="text-xs text-rose-500">{errors.choices}</p> : null}
      </div>

      <fieldset>
        <legend className="mb-1 text-xs font-semibold text-slate-600">정답</legend>
        <div className="flex flex-wrap gap-2">
          {CHOICE_LABELS.map((label, index) => {
            const choice = index + 1
            const selected = value.correctChoice === choice
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ ...value, correctChoice: choice })}
                className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                  selected
                    ? 'border-[#163A70] bg-[#163A70] text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
        {errors.correctChoice ? (
          <p className="mt-1 text-xs text-rose-500">{errors.correctChoice}</p>
        ) : null}
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-xs font-semibold text-slate-600">
          평가영역 (복수 선택 가능)
        </legend>
        <div className="flex flex-wrap gap-2">
          {areaOptions.map((area) => {
            const selected = value.evaluationAreas.includes(area)
            return (
              <button
                key={area}
                type="button"
                onClick={() => toggleArea(area)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  selected
                    ? 'border-[#28C7B7] bg-[rgba(40,199,183,0.14)] text-[#0F766E]'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {area}
              </button>
            )
          })}
        </div>
        {errors.evaluationAreas ? (
          <p className="mt-1 text-xs text-rose-500">{errors.evaluationAreas}</p>
        ) : null}
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-slate-600">해설</span>
        <textarea
          value={value.explanation}
          onChange={(e) => onChange({ ...value, explanation: e.target.value })}
          rows={3}
          className={inputClass()}
          placeholder="해설 (선택)"
        />
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className={btnSecondary} disabled={saving}>
          취소
        </button>
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}

export function formToInput(form: EntranceExamQuestionFormState): EntranceExamQuestionInput {
  const areas = [
    ...new Set(
      form.evaluationAreas.map((area) =>
        normalizeEntranceExamAreaLabel(area, form.subject),
      ),
    ),
  ].filter(Boolean)
  return {
    id: form.id,
    subject: form.subject,
    targetGrade: form.targetGrade,
    stem: form.stem,
    choices: form.choices,
    correctChoice: form.correctChoice,
    explanation: form.explanation,
    difficulty: form.difficulty,
    evaluationAreas: areas,
    unitName: form.unitName,
  }
}
