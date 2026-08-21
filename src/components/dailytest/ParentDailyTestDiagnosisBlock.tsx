import type { DailyTestRecord } from '../../types/records'
import {
  normalizeDailyLearningDiagnosis,
  sumWrongAnalysisCounts,
} from '../../utils/learningDiagnosis'

const TITLE_EMPHASIS_CLASS = 'text-sm font-bold text-[#DC2626]'

type ParentDailyTestDiagnosisBlockProps = {
  record: DailyTestRecord
  className?: string
}

function resolveAnalysisCounts(diagnosis: ReturnType<typeof normalizeDailyLearningDiagnosis>) {
  if (sumWrongAnalysisCounts(diagnosis) > 0) {
    return {
      concept: diagnosis.conceptLackCount,
      calculation: diagnosis.calculationErrorCount,
      application: diagnosis.applicationLackCount,
    }
  }
  if (diagnosis.wrongAnswerItems.length > 0) {
    return {
      concept: diagnosis.wrongAnswerItems.filter((i) => i.cause === '개념 부족').length,
      calculation: diagnosis.wrongAnswerItems.filter((i) => i.cause === '계산 실수').length,
      application: diagnosis.wrongAnswerItems.filter((i) => i.cause === '문제 이해 부족').length,
    }
  }
  return {
    concept: diagnosis.conceptLackCount,
    calculation: diagnosis.calculationErrorCount,
    application: diagnosis.applicationLackCount,
  }
}

/** 학부모 일일테스트 — 오답 분석 / 강사 피드백 / 격주간 재시험 (읽기 전용) */
export function ParentDailyTestDiagnosisBlock({
  record,
  className = '',
}: ParentDailyTestDiagnosisBlockProps) {
  const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
  const isMath = record.subject.includes('수학')
  const isEnglish = record.subject.includes('영어')
  const counts = resolveAnalysisCounts(diagnosis)
  const hasFeedback = Boolean(diagnosis.teacherFeedback.trim())
  const hasRetest =
    diagnosis.fridayRetestTotal !== null || diagnosis.fridayRetestWrong !== null
  const hasEnglishExtras =
    isEnglish &&
    (diagnosis.englishVocabResult !== null ||
      diagnosis.englishGrammarWrongCount !== null ||
      diagnosis.englishReadingWrongCount !== null)

  const showMathAnalysis = isMath
  if (!showMathAnalysis && !hasFeedback && !hasRetest && !hasEnglishExtras) {
    return null
  }

  return (
    <div className={`space-y-2.5 ${className}`.trim()}>
      {showMathAnalysis ? (
        <div>
          <h4 className={TITLE_EMPHASIS_CLASS}>오답 분석</h4>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-lg bg-[rgba(22,58,112,0.04)] px-1.5 py-2">
              <p className="text-[11px] font-semibold text-slate-600">개념 부족</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-[#163A70]">
                {counts.concept}문항
              </p>
            </div>
            <div className="rounded-lg bg-[rgba(22,58,112,0.04)] px-1.5 py-2">
              <p className="text-[11px] font-semibold text-slate-600">계산 실수</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-[#163A70]">
                {counts.calculation}문항
              </p>
            </div>
            <div className="rounded-lg bg-[rgba(22,58,112,0.04)] px-1.5 py-2">
              <p className="text-[11px] font-semibold leading-tight text-slate-600">
                응용 능력 부족
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-[#163A70]">
                {counts.application}문항
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {hasEnglishExtras ? (
        <div className="grid grid-cols-3 gap-1.5 text-center text-sm">
          <div className="rounded-lg bg-[rgba(22,58,112,0.04)] px-1.5 py-2">
            <p className="text-[11px] font-semibold text-slate-600">어휘</p>
            <p className="mt-0.5 font-bold text-[#163A70]">
              {diagnosis.englishVocabResult ?? '-'}
            </p>
          </div>
          <div className="rounded-lg bg-[rgba(22,58,112,0.04)] px-1.5 py-2">
            <p className="text-[11px] font-semibold text-slate-600">문법 오답</p>
            <p className="mt-0.5 font-bold tabular-nums text-[#163A70]">
              {diagnosis.englishGrammarWrongCount ?? '-'}
            </p>
          </div>
          <div className="rounded-lg bg-[rgba(22,58,112,0.04)] px-1.5 py-2">
            <p className="text-[11px] font-semibold text-slate-600">독해 오답</p>
            <p className="mt-0.5 font-bold tabular-nums text-[#163A70]">
              {diagnosis.englishReadingWrongCount ?? '-'}
            </p>
          </div>
        </div>
      ) : null}

      {hasFeedback ? (
        <div>
          <h4 className={TITLE_EMPHASIS_CLASS}>강사의 피드백</h4>
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
            {diagnosis.teacherFeedback}
          </p>
        </div>
      ) : null}

      {(hasRetest || showMathAnalysis || hasFeedback) ? (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-xs font-semibold text-slate-600">격주간 오답 재시험</p>
            <p className="mt-0.5 font-bold tabular-nums text-[#163A70]">
              {diagnosis.fridayRetestTotal ?? '-'}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600">재시험 오답 수</p>
            <p className="mt-0.5 font-bold tabular-nums text-[#163A70]">
              {diagnosis.fridayRetestWrong ?? '-'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
