import {
  ENTRANCE_EXAM_DIFFICULTIES,
  ENTRANCE_EXAM_GRADES,
  ENTRANCE_EXAM_SUBJECTS,
  ENGLISH_EVALUATION_AREAS,
  ENGLISH_LEGACY_EVALUATION_AREAS,
  MATH_EVALUATION_AREAS,
  getFilterEvaluationAreasForSubject,
} from '../constants'
import type {
  EntranceExamDifficulty,
  EntranceExamGrade,
  EntranceExamSubject,
} from '../types'
import { inputClass } from '../../../utils/labels'

export type EntranceExamQuestionFilterState = {
  subject: '' | EntranceExamSubject
  grade: '' | EntranceExamGrade
  difficulty: '' | EntranceExamDifficulty
  evaluationArea: string
  unitName: string
}

type Props = {
  value: EntranceExamQuestionFilterState
  onChange: (next: EntranceExamQuestionFilterState) => void
  unitOptions: string[]
  /** 폴더 탐색으로 과목/학년이 고정된 목록 화면에서는 해당 필터를 숨김 */
  hideSubjectGrade?: boolean
  /** hideSubjectGrade일 때 평가영역 옵션을 해당 과목으로 제한 */
  scopedSubject?: EntranceExamSubject
}

const ALL_AREAS = [
  ...MATH_EVALUATION_AREAS,
  ...ENGLISH_EVALUATION_AREAS,
  ...ENGLISH_LEGACY_EVALUATION_AREAS,
]

export function EntranceExamQuestionFilters({
  value,
  onChange,
  unitOptions,
  hideSubjectGrade = false,
  scopedSubject,
}: Props) {
  const areaOptions =
    hideSubjectGrade && scopedSubject
      ? getFilterEvaluationAreasForSubject(scopedSubject)
      : ALL_AREAS

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      {!hideSubjectGrade ? (
        <>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">과목</span>
            <select
              value={value.subject}
              onChange={(e) =>
                onChange({
                  ...value,
                  subject: (e.target.value || '') as '' | EntranceExamSubject,
                })
              }
              className={`${inputClass()} w-28`}
            >
              <option value="">전체</option>
              {ENTRANCE_EXAM_SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">학년</span>
            <select
              value={value.grade}
              onChange={(e) =>
                onChange({
                  ...value,
                  grade: (e.target.value || '') as '' | EntranceExamGrade,
                })
              }
              className={`${inputClass()} w-28`}
            >
              <option value="">전체</option>
              {ENTRANCE_EXAM_GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}
      <label>
        <span className="mb-1 block text-xs font-semibold text-slate-600">난이도</span>
        <select
          value={value.difficulty}
          onChange={(e) =>
            onChange({
              ...value,
              difficulty: (e.target.value || '') as '' | EntranceExamDifficulty,
            })
          }
          className={`${inputClass()} w-24`}
        >
          <option value="">전체</option>
          {ENTRANCE_EXAM_DIFFICULTIES.map((difficulty) => (
            <option key={difficulty} value={difficulty}>
              {difficulty}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-xs font-semibold text-slate-600">평가영역</span>
        <select
          value={value.evaluationArea}
          onChange={(e) => onChange({ ...value, evaluationArea: e.target.value })}
          className={`${inputClass()} min-w-[160px]`}
        >
          <option value="">전체</option>
          {areaOptions.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </label>
      <label className="min-w-[160px] flex-1">
        <span className="mb-1 block text-xs font-semibold text-slate-600">단원</span>
        <input
          list="entrance-exam-unit-filter-options"
          value={value.unitName}
          onChange={(e) => onChange({ ...value, unitName: e.target.value })}
          className={inputClass()}
          placeholder="단원명 검색"
        />
        <datalist id="entrance-exam-unit-filter-options">
          {unitOptions.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
      </label>
    </div>
  )
}
