import { Check, X } from 'lucide-react'
import type { DailyLearningDiagnosisData } from '../../types/records'
import {
  hasDailyLearningDiagnosisContent,
  normalizeDailyLearningDiagnosis,
} from '../../utils/learningDiagnosis'
import {
  COMPOSITION_GRADES,
  GRAMMAR_WRITTEN_RESULTS,
  type CompositionGrade,
  type GrammarWrittenResult,
} from '../../utils/englishWrittenAssessment'
import { getDailyTestSessionColor, inputClass } from '../../utils/labels'
import { KoreanTextarea } from '../ui/KoreanTextField'

type DailyLearningDiagnosisFieldsProps = {
  subject: string
  value: DailyLearningDiagnosisData
  onChange: (next: DailyLearningDiagnosisData) => void
  compact?: boolean
  disabled?: boolean
}

type PassFail = '합격' | '불합격'

function parseNonNegIntInput(raw: string): number {
  if (raw.trim() === '') return 0
  return Math.max(0, Math.floor(Number(raw) || 0))
}

function parseListeningScoreInput(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Math.floor(Number(raw))
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, n))
}

export function DailyLearningDiagnosisFields({
  subject,
  value,
  onChange,
  compact = false,
  disabled = false,
}: DailyLearningDiagnosisFieldsProps) {
  const diagnosis = normalizeDailyLearningDiagnosis(value)
  const isMath = subject.includes('수학')
  const isEnglish = subject.includes('영어')

  const patch = (partial: Partial<DailyLearningDiagnosisData>) => {
    onChange(normalizeDailyLearningDiagnosis({ ...diagnosis, ...partial }))
  }

  const setListeningResult = (next: PassFail) => {
    patch({
      englishListeningResult: diagnosis.englishListeningResult === next ? null : next,
    })
  }

  return (
    <div
      className={`space-y-3 rounded-xl border border-[rgba(22,58,112,0.12)] bg-[#F7FBFA] p-3 ${compact ? '' : 'sm:p-4'}`.trim()}
    >
      {isMath ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">오답 분석</p>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">개념 부족</span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                disabled={disabled}
                value={diagnosis.conceptLackCount || ''}
                onChange={(e) => patch({ conceptLackCount: parseNonNegIntInput(e.target.value) })}
                className={inputClass()}
                placeholder="0"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">계산 실수</span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                disabled={disabled}
                value={diagnosis.calculationErrorCount || ''}
                onChange={(e) =>
                  patch({ calculationErrorCount: parseNonNegIntInput(e.target.value) })
                }
                className={inputClass()}
                placeholder="0"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold leading-tight text-slate-600">
                응용 능력 부족
              </span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                disabled={disabled}
                value={diagnosis.applicationLackCount || ''}
                onChange={(e) =>
                  patch({ applicationLackCount: parseNonNegIntInput(e.target.value) })
                }
                className={inputClass()}
                placeholder="0"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold leading-tight text-slate-600">
                문제 이해 부족
              </span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                disabled={disabled}
                value={diagnosis.comprehensionLackCount || ''}
                onChange={(e) =>
                  patch({ comprehensionLackCount: parseNonNegIntInput(e.target.value) })
                }
                className={inputClass()}
                placeholder="0"
              />
            </label>
          </div>
        </div>
      ) : null}

      {isEnglish ? (
        <div className="space-y-2">
          <p className={`font-semibold text-slate-700 ${compact ? 'text-xs' : 'text-sm'}`}>
            문법 서술형 TEST
          </p>
          <div className={`grid grid-cols-3 ${compact ? 'gap-1.5' : 'gap-2'}`}>
            {GRAMMAR_WRITTEN_RESULTS.map((status) => {
              const selected = diagnosis.englishGrammarWrittenResult === status
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() =>
                    patch({
                      englishGrammarWrittenResult: selected ? null : (status as GrammarWrittenResult),
                    })
                  }
                  className={`flex items-center justify-center rounded-lg border font-semibold ${
                    compact
                      ? 'min-h-9 px-1 py-1 text-xs'
                      : 'min-h-[44px] rounded-xl px-2 py-2 text-xs sm:text-sm'
                  } ${
                    selected
                      ? getDailyTestSessionColor(status === '불합격' ? '불합격' : '합격')
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {status}
                </button>
              )
            })}
          </div>
          <p className={`font-semibold text-slate-700 ${compact ? 'text-xs' : 'text-sm'}`}>
            영어 작문
          </p>
          <div className={`grid grid-cols-3 ${compact ? 'gap-1.5' : 'gap-2'}`}>
            {COMPOSITION_GRADES.map((grade) => {
              const selected = diagnosis.englishCompositionGrade === grade
              return (
                <button
                  key={grade}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() =>
                    patch({
                      englishCompositionGrade: selected ? null : (grade as CompositionGrade),
                    })
                  }
                  className={`flex items-center justify-center rounded-lg border font-semibold ${
                    compact
                      ? 'min-h-9 px-1 py-1 text-xs'
                      : 'min-h-[44px] rounded-xl px-2 py-2 text-xs sm:text-sm'
                  } ${
                    selected
                      ? 'border-navy-200 bg-navy-50 text-navy-900 ring-1 ring-navy-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {grade}
                </button>
              )
            })}
          </div>
          <p className={`font-semibold text-slate-700 ${compact ? 'text-xs' : 'text-sm'}`}>
            듣기 평가
          </p>
          <div className={`grid grid-cols-3 ${compact ? 'gap-1.5' : 'gap-2'}`}>
            <div
              className={`flex items-center gap-1 rounded-lg border bg-white px-1.5 ${
                compact ? 'min-h-9' : 'min-h-[44px]'
              } ${
                diagnosis.englishListeningScore === null
                  ? 'border-slate-200'
                  : 'border-navy-200 ring-1 ring-navy-100'
              }`}
            >
              <input
                type="number"
                min={0}
                max={100}
                inputMode="numeric"
                disabled={disabled}
                value={diagnosis.englishListeningScore ?? ''}
                onChange={(e) =>
                  patch({ englishListeningScore: parseListeningScoreInput(e.target.value) })
                }
                className={`min-w-0 flex-1 border-0 bg-transparent px-1 text-center text-sm font-semibold text-navy-900 outline-none placeholder:font-normal placeholder:text-slate-400 ${
                  compact ? 'py-1' : 'py-2'
                }`}
                placeholder="점수"
                aria-label="듣기 평가 점수"
              />
              <span className="shrink-0 text-xs font-medium text-slate-400">점</span>
            </div>
            {(['합격', '불합격'] as const).map((status) => {
              const selected = diagnosis.englishListeningResult === status
              const Icon = status === '합격' ? Check : X
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => setListeningResult(status)}
                  className={`flex items-center justify-center gap-1 rounded-lg border font-semibold ${
                    compact
                      ? 'min-h-9 px-1.5 py-1 text-xs'
                      : 'min-h-[44px] gap-1.5 rounded-xl px-2 py-2 text-xs sm:text-sm'
                  } ${
                    selected
                      ? getDailyTestSessionColor(status)
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {status}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">강사의 피드백</span>
        <KoreanTextarea
          value={diagnosis.teacherFeedback}
          onChange={(e) => patch({ teacherFeedback: e.target.value })}
          rows={compact ? 3 : 5}
          disabled={disabled}
          className={`${inputClass()} min-h-[5.5rem] resize-y`}
          placeholder="학생·학부모에게 전달할 피드백을 입력해 주세요."
        />
      </label>

      {hasDailyLearningDiagnosisContent(diagnosis) ? null : (
        <p className="text-[11px] text-slate-500">
          입력하지 않은 항목은 월간 점수 집계에서 제외됩니다.
        </p>
      )}
    </div>
  )
}
