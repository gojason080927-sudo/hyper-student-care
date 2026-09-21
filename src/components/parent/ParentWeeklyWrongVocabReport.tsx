import { useMemo, type ReactNode } from 'react'
import type { DailyTestRecord } from '../../types/records'
import { DAILY_WRONG_TYPES } from '../../utils/learningDiagnosis'
import {
  pickLatestParentWeeklyVocab,
  summarizeParentWeeklyMathRecovery,
} from '../../utils/parentWeeklyWrongVocab'
import { buildDailyTestWeeklyFlow } from '../../utils/studentCare/dailyTestWeeklyFlow'

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

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums leading-none text-[#163A70]">{value}</p>
    </div>
  )
}

function EmptyNote({ message }: { message: string }) {
  return <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
}

function formatRate(rate: number | null): string {
  if (rate == null) return '해당 없음'
  return `${Math.round(rate)}%`
}

export function ParentWeeklyWrongVocabReport({
  studentId,
  weekStart,
  dailyTests,
}: {
  studentId: string
  weekStart: string
  dailyTests: DailyTestRecord[]
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
  const correctWords =
    vocab == null ? null : Math.max(0, vocab.totalWords - vocab.wrongWords)

  return (
    <div className="space-y-3">
      <ReportCard title="수학 오답 추적">
        {model.hasMathWeekRecords ? (
          <>
            {recovery ? (
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <StatTile label="발견 오답" value={`${recovery.discoveredWrong}개`} />
                <StatTile label="추적 학습" value={`${recovery.retakeQuestionCount}문제`} />
                <StatTile label="회수 완료" value={`${recovery.recoveredWrong}개`} />
                <StatTile label="회수율" value={formatRate(recovery.recoveryRate)} />
              </div>
            ) : (
              <EmptyNote message="이번 주 오답 회수 기록이 없습니다." />
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
        {vocab ? (
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <StatTile label="누적 단어" value={`${vocab.totalWords}`} />
            <StatTile label="틀린 단어" value={`${vocab.wrongWords}`} />
            {correctWords != null ? (
              <StatTile label="맞힌 단어" value={`${correctWords}`} />
            ) : null}
          </div>
        ) : (
          <EmptyNote message="이번 주 영어 누적 단어 TEST 기록이 없습니다." />
        )}
      </ReportCard>
    </div>
  )
}
