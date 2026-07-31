import { useMemo } from 'react'
import { useData } from '../../hooks/useData'
import {
  SCORE_DEDUCTION_RULES,
  aggregateMonthlyLearningProgress,
} from '../../utils/monthlyLearningProgress'

type MonthlyLearningProgressSectionProps = {
  studentId: string
  year: number
  month: number
}

const SUMMARY_ROWS = [
  { key: 'lateCount', label: '지각' },
  { key: 'absentCount', label: '결석' },
  { key: 'partialHomeworkCount', label: '과제 부분 완료' },
  { key: 'incompleteHomeworkCount', label: '과제 미완료' },
  { key: 'testPass2Count', label: '일일테스트 2차시 통과' },
  { key: 'testPass3Count', label: '일일테스트 3차시 통과' },
  { key: 'testPass4Count', label: '일일테스트 4차시 통과' },
] as const

export function MonthlyLearningProgressSection({
  studentId,
  year,
  month,
}: MonthlyLearningProgressSectionProps) {
  const { attendance, homework, homeworkTextbookEntries, dailyTests } = useData()

  const { counts, score, grade } = useMemo(
    () =>
      aggregateMonthlyLearningProgress({
        studentId,
        year,
        month,
        attendance,
        homework,
        homeworkTextbookEntries,
        dailyTests,
      }),
    [attendance, dailyTests, homework, homeworkTextbookEntries, month, studentId, year],
  )

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {SUMMARY_ROWS.map((row) => (
                <th
                  key={row.key}
                  className="whitespace-nowrap px-3 py-3 text-center text-xs font-semibold text-slate-600"
                >
                  {row.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {SUMMARY_ROWS.map((row) => (
                <td
                  key={row.key}
                  className="px-3 py-4 text-center text-lg font-bold text-navy-900"
                >
                  {counts[row.key]}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">종합평가 점수</p>
        <div className="relative h-14 overflow-hidden rounded-xl bg-slate-100">
          <div
            className="flex h-full items-center rounded-xl bg-gradient-to-r from-navy-700 to-navy-500 transition-all duration-500"
            style={{ width: `${score}%`, minWidth: score > 0 ? '4.5rem' : '0' }}
          >
            <span className="px-4 text-2xl font-bold text-white sm:text-3xl">{score}점</span>
          </div>
          {score < 100 && (
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-lg font-semibold text-slate-500">
              {score}%
            </span>
          )}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-600">
        위 평가는 월간 출결, 과제 수행, 일일테스트 결과를 종합 평가한 결과값입니다.
      </p>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="mb-2 text-xs font-semibold text-slate-500">평가 기준</p>
        <ul className="space-y-1 text-sm text-slate-700">
          {SCORE_DEDUCTION_RULES.map((rule) => (
            <li key={rule.label}>
              {rule.label} : -{rule.points}점
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
        <p className="text-xs font-semibold text-slate-500">평가 등급 기준</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li>70점 미만 : 부족</li>
          <li>70점 이상 ~ 80점 미만 : 양호</li>
          <li>80점 이상 ~ 90점 미만 : 우수</li>
          <li>90점 이상 : 매우 우수</li>
        </ul>
        <div className="mt-4 flex flex-wrap items-baseline gap-2 border-t border-slate-100 pt-4">
          <span className="text-base font-bold text-navy-900">종합평가</span>
          <span className="text-2xl font-bold text-navy-700">{grade}</span>
          <span className="text-sm text-slate-500">
            ({score}점 · {year}년 {month}월)
          </span>
        </div>
      </div>
    </div>
  )
}
