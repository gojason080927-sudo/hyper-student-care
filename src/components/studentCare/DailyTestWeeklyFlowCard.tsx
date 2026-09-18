import { useMemo } from 'react'
import type { DailyTestRecord } from '../../types/records'
import {
  DAILY_TEST_FLOW_WEEKDAY_LABELS,
  buildDailyTestWeeklyFlow,
  type DailyTestFlowPoint,
  type DailyTestFlowWeekday,
} from '../../utils/studentCare/dailyTestWeeklyFlow'

const DAY_COLORS: Record<DailyTestFlowWeekday, string> = {
  mon: '#7dd3fc',
  wed: '#ef4444',
  fri: '#86efac',
}

function formatStat(value: number | null): string {
  if (value == null) return '—'
  return Number.isInteger(value) ? `${value}점` : `${value}점`
}

function catmullPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

function labelOffset(index: number, score: number): { dx: number; dy: number } {
  const above = index % 2 === 0 || score < 28
  return { dx: 0, dy: above ? -16 : 18 }
}

export function DailyTestWeeklyFlowCard({
  dailyTests,
  studentId,
  weekStart,
}: {
  dailyTests: DailyTestRecord[]
  studentId: string
  weekStart: string
}) {
  const flow = useMemo(
    () => buildDailyTestWeeklyFlow(dailyTests, studentId, weekStart),
    [dailyTests, studentId, weekStart],
  )

  const width = 360
  const height = 208
  const padL = 18
  const padR = 18
  const padT = 30
  const padB = 36
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const step = plotW / 11
  const unattemptedY = height - 22

  const xy = (point: DailyTestFlowPoint, index: number) => ({
    x: padL + index * step,
    y: padT + plotH - (Math.min(100, Math.max(0, point.score ?? 0)) / 100) * plotH,
  })

  const scoredCoords = flow.points
    .map((point, index) => ({ point, index, ...xy(point, index) }))
    .filter((item) => item.point.score != null)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-3 py-4 shadow-sm sm:px-4">
      <h3 className="text-sm font-bold text-navy-900">일일테스트 주간 흐름</h3>
      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mx-auto block h-auto w-full max-w-full"
          role="img"
          aria-label="월요일 수요일 금요일 일일테스트 차시 점수 곡선"
        >
          <defs>
            <linearGradient id="daily-test-flow-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={DAY_COLORS.mon} />
              <stop offset="33%" stopColor={DAY_COLORS.mon} />
              <stop offset="34%" stopColor={DAY_COLORS.wed} />
              <stop offset="66%" stopColor={DAY_COLORS.wed} />
              <stop offset="67%" stopColor={DAY_COLORS.fri} />
              <stop offset="100%" stopColor={DAY_COLORS.fri} />
            </linearGradient>
          </defs>
          {[50, 100].map((tick) => {
            const y = padT + plotH - (tick / 100) * plotH
            return (
              <line
                key={tick}
                x1={padL}
                x2={width - padR}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            )
          })}
          <path
            d={catmullPath(scoredCoords.map((item) => ({ x: item.x, y: item.y })))}
            fill="none"
            stroke="url(#daily-test-flow-stroke)"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {flow.points.map((point, index) => {
            const pos = xy(point, index)
            if (point.kind === 'unattempted') {
              return (
                <circle
                  key={`${point.weekday}-${point.session}`}
                  cx={pos.x}
                  cy={unattemptedY}
                  r="3.2"
                  fill="#cbd5e1"
                />
              )
            }
            const offset = labelOffset(index, point.score ?? 0)
            return (
              <g key={`${point.weekday}-${point.session}`}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="5"
                  fill={DAY_COLORS[point.weekday]}
                  stroke="#fff"
                  strokeWidth="1.6"
                />
                <text
                  x={pos.x + offset.dx}
                  y={pos.y + offset.dy}
                  textAnchor="middle"
                  className="fill-slate-700"
                  style={{ fontSize: 8.5, fontWeight: 700 }}
                >
                  {point.label}
                </text>
              </g>
            )
          })}
          {flow.days.map((day, dayIndex) => {
            const start = padL + dayIndex * 4 * step
            const mid = start + 1.5 * step
            return (
              <text
                key={day.weekday}
                x={mid}
                y={height - 6}
                textAnchor="middle"
                className="fill-slate-500"
                style={{ fontSize: 10, fontWeight: 700 }}
              >
                {DAILY_TEST_FLOW_WEEKDAY_LABELS[day.weekday]}
              </text>
            )
          })}
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatCell label="주간 최고" value={formatStat(flow.stats.highest)} />
        <StatCell label="주간 최저" value={formatStat(flow.stats.lowest)} />
        <StatCell label="주간 평균" value={formatStat(flow.stats.average)} />
      </div>
    </section>
  )
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2 text-center">
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-navy-900">{value}</p>
    </div>
  )
}
