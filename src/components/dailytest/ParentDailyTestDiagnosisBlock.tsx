import type { ClassNoteRecord, DailyTestRecord } from '../../types/records'
import {
  normalizeDailyLearningDiagnosis,
  sumWrongAnalysisCounts,
} from '../../utils/learningDiagnosis'
import { SectionTitleWithHint } from '../ui/SectionTitleWithHint'

const TITLE_EMPHASIS_CLASS = 'text-sm font-bold text-[#DC2626]'

type ParentDailyTestDiagnosisBlockProps = {
  record: DailyTestRecord
  /** 하단 강사 피드백(class_notes) — 일일테스트 teacherFeedback이 비어 있을 때 보조 표시 */
  classNote?: ClassNoteRecord
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

function resolveTeacherFeedbackText(
  diagnosis: ReturnType<typeof normalizeDailyLearningDiagnosis>,
  classNote?: ClassNoteRecord,
): { text: string; explicitNone: boolean } {
  const fromDaily = diagnosis.teacherFeedback.trim()
  if (fromDaily) return { text: fromDaily, explicitNone: false }

  if (classNote?.hasClassNote && classNote.note.trim()) {
    return { text: classNote.note.trim(), explicitNone: false }
  }
  if (classNote && !classNote.hasClassNote) {
    return { text: '', explicitNone: true }
  }
  return { text: '', explicitNone: false }
}

/**
 * 학부모 일일테스트 부가 정보 (읽기 전용) — /care/{ID}/today-report 전용
 *
 * 렌더 순서 (과거·오늘 동일, 저장된 레코드 기준):
 * 1) 오답 분석
 * 2) 강사 피드백  ← learning_diagnosis.teacherFeedback (없으면 class_notes)
 * 3) 격주간 오답 재시험 / 재시험 오답 수
 * 호출부(DailyTestParentSection)에서 이어서 오답 BANK
 */
export function ParentDailyTestDiagnosisBlock({
  record,
  classNote,
  className = '',
}: ParentDailyTestDiagnosisBlockProps) {
  const diagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
  const isMath = record.subject.includes('수학')
  const isEnglish = record.subject.includes('영어')
  const counts = resolveAnalysisCounts(diagnosis)
  const feedback = resolveTeacherFeedbackText(diagnosis, classNote)
  const hasRetest =
    diagnosis.fridayRetestTotal !== null || diagnosis.fridayRetestWrong !== null
  const hasEnglishExtras =
    isEnglish &&
    (diagnosis.englishVocabResult !== null ||
      diagnosis.englishGrammarWrongCount !== null ||
      diagnosis.englishReadingWrongCount !== null)

  return (
    <div className={`space-y-2.5 ${className}`.trim()}>
      {/* 1. 오답 분석 */}
      {isMath ? (
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

      {/* 2. 강사 피드백 — 오답 분석 바로 아래 (항상 표시, 날짜 무관) */}
      <div>
        <div className={TITLE_EMPHASIS_CLASS}>
          <SectionTitleWithHint
            title="강사 피드백"
            hint="수업을 통해 확인한 학습 상태"
            hintClassName="text-[11px] font-medium text-slate-500"
          />
        </div>
        {feedback.explicitNone ? (
          <p className="mt-1.5 text-sm font-medium text-slate-600">특이사항 없음</p>
        ) : feedback.text ? (
          <div className="mt-1.5 min-w-0 max-w-full overflow-hidden rounded-xl border border-amber-100 bg-amber-50/40 px-3.5 py-3.5 sm:px-4 sm:py-4">
            <p className="max-w-full whitespace-pre-wrap break-anywhere text-[15px] leading-relaxed text-slate-800">
              {feedback.text}
            </p>
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-slate-400">등록된 코멘트가 없습니다.</p>
        )}
      </div>

      {/* 3. 격주간 오답 재시험 / 재시험 오답 수 */}
      {hasRetest || isMath ? (
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
