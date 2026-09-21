import { useMemo, type ReactNode } from 'react'
import type {
  ClassTodayReportCommon,
  DailyTestRecord,
  StudentTextbookSlot,
} from '../../types/records'
import { DAILY_WRONG_TYPES } from '../../utils/learningDiagnosis'
import {
  buildParentWeeklyVocabClassContext,
  formatParentMathWrongTrackingStatus,
  formatParentWeeklyVocabSuccessRate,
  parentWeeklyVocabMemorizedWords,
  parentWeeklyVocabSuccessRate,
  pickLatestParentWeeklyVocab,
  resolveParentWeeklyVocabBookName,
  summarizeParentWeeklyMathRecovery,
} from '../../utils/parentWeeklyWrongVocab'
import { buildDailyTestWeeklyFlow } from '../../utils/studentCare/dailyTestWeeklyFlow'
import { PARENT_FIELD_EMPTY } from '../todayReport/parentTextbookDisplay'

function ReportCard({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
      <h3 className="text-base font-bold text-navy-900">{title}</h3>
      {children}
    </section>
  )
}

function StatTile({
  label,
  value,
  wrap = false,
  muted = false,
}: {
  label: string
  value: string
  wrap?: boolean
  muted?: boolean
}) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p
        className={
          wrap
            ? `mt-1 break-words text-base font-bold leading-snug ${
                muted ? 'text-slate-500' : 'text-[#163A70]'
              }`
            : 'mt-1 text-xl font-bold tabular-nums leading-none text-[#163A70]'
        }
      >
        {value}
      </p>
    </div>
  )
}

function EmptyNote({ message }: { message: string }) {
  return <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
}

export function ParentWeeklyWrongVocabReport({
  studentId,
  weekStart,
  dailyTests,
  studentTextbookSlots = [],
  classTodayReportCommon = [],
  grade = '',
  className = '',
}: {
  studentId: string
  weekStart: string
  dailyTests: DailyTestRecord[]
  studentTextbookSlots?: StudentTextbookSlot[]
  classTodayReportCommon?: ClassTodayReportCommon[]
  grade?: string
  className?: string
}) {
  const model = useMemo(
    () =>
      buildDailyTestWeeklyFlow({
        studentId,
        weekStart,
        dailyTests,
      }),
    [dailyTests, studentId, weekStart],
  )
  const recovery = summarizeParentWeeklyMathRecovery(
    model.weekRecoveryResults.map((item) => item.facts),
  )
  const vocab = pickLatestParentWeeklyVocab(model.weekCumulativeResults)
  const classContext = useMemo(
    () =>
      buildParentWeeklyVocabClassContext({
        grade,
        className,
        commonRecords: classTodayReportCommon,
        classSlots: studentTextbookSlots,
      }),
    [className, classTodayReportCommon, grade, studentTextbookSlots],
  )
  const bookName = vocab
    ? resolveParentWeeklyVocabBookName({
        studentId,
        date: vocab.date,
        studentTextbookSlots,
        classContext,
      })
    : ''
  const memorizedWords =
    vocab == null ? null : parentWeeklyVocabMemorizedWords(vocab.totalWords, vocab.wrongWords)
  const successRate =
    vocab == null || memorizedWords == null
      ? null
      : parentWeeklyVocabSuccessRate(vocab.totalWords, memorizedWords)

  return (
    <div className="space-y-3">
      <ReportCard title="수학 오답 추적">
        {model.hasMathWeekRecords ? (
          <>
            {recovery ? (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <StatTile label="발견 오답" value={`${recovery.discoveredWrong}문제`} />
                  <StatTile label="추적 학습" value={`${recovery.retakeQuestionCount}문제`} />
                  <div className="col-span-2">
                    <StatTile
                      label="추적 상태"
                      value={formatParentMathWrongTrackingStatus(recovery.trackingStatus)}
                      wrap
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  추적 후 필요한 내용은 보강·시험 대비에서 다시 점검합니다.
                </p>
              </>
            ) : (
              <EmptyNote message="이번 주 오답 추적 기록이 없습니다." />
            )}
            <h4 className="mt-5 text-sm font-bold text-navy-900">오답 원인</h4>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {DAILY_WRONG_TYPES.map((item) => (
                <StatTile
                  key={item.key}
                  label={item.label}
                  value={`${model.wrongTypes[item.key]}문제`}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyNote message="이번 주 수학 일일테스트 기록이 없습니다." />
        )}
      </ReportCard>

      <ReportCard title="영어 단어 누적">
        {vocab && memorizedWords != null ? (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <StatTile
              label="단어장명"
              value={bookName || PARENT_FIELD_EMPTY}
              wrap
              muted={!bookName}
            />
            <StatTile label="총 누적 단어" value={`${vocab.totalWords}개`} />
            <StatTile label="최종 암기 단어" value={`${memorizedWords}개`} />
            <StatTile
              label="총 암기 성공률"
              value={formatParentWeeklyVocabSuccessRate(successRate)}
            />
          </div>
        ) : (
          <EmptyNote message="이번 주 영어 누적 단어 TEST 기록이 없습니다." />
        )}
      </ReportCard>
    </div>
  )
}
