import type { DailyLearningDiagnosisData } from '../../types/records'
import {
  hasDailyLearningDiagnosisContent,
  normalizeDailyLearningDiagnosis,
} from '../../utils/learningDiagnosis'
import { inputClass } from '../../utils/labels'
import { KoreanTextarea } from '../ui/KoreanTextField'

type DailyLearningDiagnosisFieldsProps = {
  subject: string
  value: DailyLearningDiagnosisData
  onChange: (next: DailyLearningDiagnosisData) => void
  compact?: boolean
}

function parseNonNegIntInput(raw: string): number {
  if (raw.trim() === '') return 0
  return Math.max(0, Math.floor(Number(raw) || 0))
}

export function DailyLearningDiagnosisFields({
  subject,
  value,
  onChange,
  compact = false,
}: DailyLearningDiagnosisFieldsProps) {
  const diagnosis = normalizeDailyLearningDiagnosis(value)
  const isMath = subject.includes('수학')
  const isEnglish = subject.includes('영어')

  const patch = (partial: Partial<DailyLearningDiagnosisData>) => {
    onChange(normalizeDailyLearningDiagnosis({ ...diagnosis, ...partial }))
  }

  return (
    <div
      className={`space-y-3 rounded-xl border border-[rgba(22,58,112,0.12)] bg-[#F7FBFA] p-3 ${compact ? '' : 'sm:p-4'}`.trim()}
    >
      {isMath ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">오답 분석</p>
          <div className="grid grid-cols-3 gap-2">
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">개념 부족</span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
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
                value={diagnosis.calculationErrorCount || ''}
                onChange={(e) =>
                  patch({ calculationErrorCount: parseNonNegIntInput(e.target.value) })
                }
                className={inputClass()}
                placeholder="0"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">
                응용 능력 부족
              </span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={diagnosis.applicationLackCount || ''}
                onChange={(e) =>
                  patch({ applicationLackCount: parseNonNegIntInput(e.target.value) })
                }
                className={inputClass()}
                placeholder="0"
              />
            </label>
          </div>
        </div>
      ) : null}

      {isEnglish ? (
        <div className="grid gap-2 sm:grid-cols-3">
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">어휘 시험</span>
            <select
              value={diagnosis.englishVocabResult ?? ''}
              onChange={(e) =>
                patch({
                  englishVocabResult:
                    e.target.value === '합격' || e.target.value === '불합격'
                      ? e.target.value
                      : null,
                })
              }
              className={inputClass()}
            >
              <option value="">미응시</option>
              <option value="합격">합격</option>
              <option value="불합격">불합격</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">문법 오답 수</span>
            <input
              type="number"
              min={0}
              value={diagnosis.englishGrammarWrongCount ?? ''}
              onChange={(e) =>
                patch({
                  englishGrammarWrongCount:
                    e.target.value.trim() === '' ? null : Math.max(0, Number(e.target.value) || 0),
                })
              }
              className={inputClass()}
              placeholder="0"
            />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-slate-600">독해 오답 수</span>
            <input
              type="number"
              min={0}
              value={diagnosis.englishReadingWrongCount ?? ''}
              onChange={(e) =>
                patch({
                  englishReadingWrongCount:
                    e.target.value.trim() === '' ? null : Math.max(0, Number(e.target.value) || 0),
                })
              }
              className={inputClass()}
              placeholder="0"
            />
          </label>
        </div>
      ) : null}

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">강사의 피드백</span>
        <KoreanTextarea
          value={diagnosis.teacherFeedback}
          onChange={(e) => patch({ teacherFeedback: e.target.value })}
          rows={compact ? 3 : 5}
          className={`${inputClass()} min-h-[5.5rem] resize-y`}
          placeholder="학생·학부모에게 전달할 피드백을 입력해 주세요."
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-semibold text-slate-600">
            격주간 오답 재시험
          </span>
          <input
            type="number"
            min={0}
            value={diagnosis.fridayRetestTotal ?? ''}
            onChange={(e) =>
              patch({
                fridayRetestTotal:
                  e.target.value.trim() === '' ? null : Math.max(0, Number(e.target.value) || 0),
              })
            }
            className={inputClass()}
            placeholder="해당 시에만 입력"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold text-slate-600">재시험 오답 수</span>
          <input
            type="number"
            min={0}
            value={diagnosis.fridayRetestWrong ?? ''}
            onChange={(e) =>
              patch({
                fridayRetestWrong:
                  e.target.value.trim() === '' ? null : Math.max(0, Number(e.target.value) || 0),
              })
            }
            className={inputClass()}
            placeholder="0"
          />
        </label>
      </div>

      {hasDailyLearningDiagnosisContent(diagnosis) ? null : (
        <p className="text-[11px] text-slate-500">
          입력하지 않은 항목은 월간 점수 집계에서 제외됩니다.
        </p>
      )}
    </div>
  )
}
