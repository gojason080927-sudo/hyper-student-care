import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthlyEvaluationRecord } from '../../types/records'
import {
  Y_AXIS_PERCENT_TICKS,
  buildFixedMonthlyChartData,
  sortMonthlyEvaluationsAsc,
  type FixedMonthChartPoint,
} from '../../utils/monthlyEvaluation'
import { EmptyState } from './EmptyState'

type MonthlyEvaluationChartProps = {
  records: MonthlyEvaluationRecord[]
  subject?: string
  title?: string
  subtitle?: string
  /** 학생 개인 화면: 선택 연도 1~12월 고정 축 */
  variant?: 'default' | 'fixedMonths'
  selectedYear?: number
  /** 모바일에서 차트가 화면 너비에 맞게 표시 */
  mobileFit?: boolean
}

type TimelineChartPoint = {
  label: string
  percentage: number
  date: string
  dateLabel: string
  subject: string
  score: number
  totalScore: number
}

function formatChartDateLabel(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number)
  return `${year}년 ${month}월 ${day}일`
}

function FixedMonthTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: FixedMonthChartPoint }>
}) {
  if (!active || !payload?.[0]) return null
  const item = payload[0].payload

  if (!item.hasRecord) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
        <p className="font-semibold text-navy-900">{item.monthLabel}</p>
        <p className="text-slate-500">평가 기록 없음</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-navy-900">{item.monthLabel}</p>
      {item.evaluationDate && (
        <p className="text-slate-600">{formatChartDateLabel(item.evaluationDate)}</p>
      )}
      {item.subject && <p className="text-slate-600">{item.subject}</p>}
      {item.score !== null && item.totalScore !== null && (
        <p className="font-medium text-navy-800">
          {item.score}/{item.totalScore}점
        </p>
      )}
      {item.percentage !== null && (
        <p className="font-semibold text-blue-700">{item.percentage}%</p>
      )}
    </div>
  )
}

function TimelineTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: TimelineChartPoint }>
}) {
  if (!active || !payload?.[0]) return null
  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-navy-900">{item.dateLabel}</p>
      <p className="text-slate-600">{item.subject}</p>
      <p className="font-medium text-navy-800">
        {item.score}/{item.totalScore}점
      </p>
      <p className="font-semibold text-blue-700">{item.percentage}%</p>
    </div>
  )
}

export function MonthlyEvaluationChart({
  records,
  subject,
  title = '성적 추이',
  subtitle = '최근 월말평가 점수 변화를 확인할 수 있습니다.',
  variant = 'default',
  selectedYear,
  mobileFit = false,
}: MonthlyEvaluationChartProps) {
  const fixedChartData = useMemo(() => {
    if (variant !== 'fixedMonths' || selectedYear === undefined) return []
    return buildFixedMonthlyChartData(records, selectedYear, subject)
  }, [records, selectedYear, subject, variant])

  const timelineChartData = useMemo((): TimelineChartPoint[] => {
    if (variant !== 'default') return []
    return sortMonthlyEvaluationsAsc(records)
      .filter((r) => !subject || r.subject === subject)
      .map((r) => ({
        label: `${r.year}.${String(r.month).padStart(2, '0')}`,
        percentage: r.percentage,
        date: r.evaluationDate,
        dateLabel: formatChartDateLabel(r.evaluationDate),
        subject: r.subject,
        score: r.score,
        totalScore: r.totalScore,
      }))
  }, [records, subject, variant])

  const isEmpty =
    variant === 'fixedMonths'
      ? records.length === 0
      : timelineChartData.length === 0

  if (isEmpty) {
    return (
      <EmptyState
        title="아직 등록된 월말평가가 없습니다."
        description="월말평가 기록이 추가되면 성적 추이를 확인할 수 있습니다."
      />
    )
  }

  const chartData: FixedMonthChartPoint[] | TimelineChartPoint[] =
    variant === 'fixedMonths' ? fixedChartData : timelineChartData

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-navy-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className={mobileFit ? 'w-full' : 'overflow-x-auto'}>
        <div
          className={`w-full ${
            mobileFit ? 'h-[260px] sm:h-[360px]' : 'min-w-[640px] h-[360px] sm:h-[420px]'
          }`}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData as FixedMonthChartPoint[]}
              margin={
                mobileFit
                  ? { top: 8, right: 8, left: 0, bottom: 8 }
                  : { top: 8, right: 16, left: 20, bottom: 24 }
              }
            >
              {mobileFit ? (
                <Area
                  type="monotone"
                  dataKey="percentage"
                  fill="url(#tmMintAreaFill)"
                  stroke="none"
                  connectNulls={variant === 'fixedMonths'}
                  isAnimationActive={false}
                />
              ) : null}
              <defs>
                <linearGradient id="tmMintAreaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#28C7B7" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#28C7B7" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey={variant === 'fixedMonths' ? 'monthLabel' : 'label'}
                interval={variant === 'fixedMonths' ? 0 : undefined}
                tickMargin={mobileFit ? 6 : 10}
                tick={{ fontSize: mobileFit ? 10 : 11 }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={Y_AXIS_PERCENT_TICKS}
                tickFormatter={(value) => `${value}%`}
                allowDecimals={false}
                tick={{ fontSize: mobileFit ? 9 : 10 }}
                width={mobileFit ? 36 : 44}
              />
              <Tooltip
                content={
                  variant === 'fixedMonths' ? (
                    <FixedMonthTooltip />
                  ) : (
                    <TimelineTooltip />
                  )
                }
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke={mobileFit ? '#28C7B7' : '#1e3a8a'}
                strokeWidth={mobileFit ? 3 : 4}
                connectNulls={variant === 'fixedMonths'}
                dot={
                  variant === 'fixedMonths'
                    ? (props) => {
                        const { cx, cy, payload } = props as {
                          cx?: number
                          cy?: number
                          payload?: FixedMonthChartPoint
                        }
                        if (
                          cx === undefined ||
                          cy === undefined ||
                          !payload?.hasRecord ||
                          payload.percentage === null
                        ) {
                          return null
                        }
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill={mobileFit ? '#28C7B7' : '#1e3a8a'}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        )
                      }
                    : {
                        r: 4,
                        fill: mobileFit ? '#28C7B7' : '#1e3a8a',
                        strokeWidth: 2,
                        stroke: '#fff',
                      }
                }
                activeDot={{ r: 6, fill: mobileFit ? '#55E3D5' : '#1e40af' }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
