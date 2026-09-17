import { useId, useMemo, useState } from 'react'
import type { DailyTestRecord } from '../../types/records'
import {
  buildDailyTestWeeklyFlow,
  WEEKLY_FLOW_COLORS,
  WEEKLY_FLOW_DAY_LABELS,
  type WeeklyFlowDay,
  type WeeklyFlowSessionPoint,
  type WeeklyFlowWeekday,
} from '../../utils/studentCare/dailyTestWeeklyFlow'

type ChartPoint = {
  key: string
  weekday: WeeklyFlowWeekday
  session: WeeklyFlowSessionPoint
  x: number
  y: number | null
  markerY: number
}

function catmullRomPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  if (points.length === 1) return ''
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }
  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return path
}

function labelOffset(index: number, passed: boolean): { dy: number; anchor: 'start' | 'middle' | 'end' } {
  const column = index % 4
  const anchor = column === 0 ? 'start' : column === 3 ? 'end' : 'middle'
  const dy = passed ? -28 : index % 2 === 0 ? -18 : 20
  return { dy, anchor }
}

function formatStat(value: number | null): string {
  if (value == null) return '—'
  return Number.isInteger(value) ? `${value}` : `${value}`
}

function FlowChart({ days, clipId }: { days: WeeklyFlowDay[]; clipId: string }) {
  const width = 640
  const height = 268
  const padL = 22
  const padR = 22
  const padT = 42
  const padB = 46
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const slots = days.flatMap((day) => day.sessions.map((session) => ({ day, session })))
  const points: ChartPoint[] = slots.map((slot, index) => {
    const x = padL + (plotW * index) / Math.max(slots.length - 1, 1)
    const scoreY =
      slot.session.kind === 'score' && slot.session.score != null
        ? padT + plotH * (1 - slot.session.score / 100)
        : null
    return {
      key: `${slot.day.weekday}-${slot.session.session}`,
      weekday: slot.day.weekday,
      session: slot.session,
      x,
      y: scoreY,
      markerY: padT + plotH + 8,
    }
  })
  const scored = points.filter((point): point is ChartPoint & { y: number } => point.y != null)
  const curve = catmullRomPath(scored.map((point) => ({ x: point.x, y: point.y })))
  const dayWidth = plotW / 3

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full"
      role="img"
      aria-label="일일테스트 주간 흐름"
    >
      <defs>
        {WEEKLY_FLOW_WEEKDAYS_CLIP.map((weekday, index) => (
          <clipPath key={weekday} id={`${clipId}-${weekday}`}>
            <rect x={padL + dayWidth * index} y={padT - 8} width={dayWidth} height={plotH + 16} />
          </clipPath>
        ))}
      </defs>
      {[0, 50, 100].map((tick) => {
        const y = padT + plotH * (1 - tick / 100)
        return (
          <g key={tick}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y}
              y2={y}
              stroke="rgba(22, 58, 112, 0.08)"
              strokeWidth="1"
            />
            <text
              x={padL - 4}
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fill="#94a3b8"
            >
              {tick}
            </text>
          </g>
        )
      })}
      {curve
        ? (['monday', 'wednesday', 'friday'] as const).map((weekday) => (
            <path
              key={weekday}
              d={curve}
              fill="none"
              stroke={WEEKLY_FLOW_COLORS[weekday]}
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath={`url(#${clipId}-${weekday})`}
            />
          ))
        : null}
      {points.map((point, index) => {
        if (point.session.kind === 'absent') {
          return (
            <circle
              key={point.key}
              cx={point.x}
              cy={point.markerY}
              r="4"
              fill="#cbd5e1"
              stroke="#94a3b8"
              strokeWidth="1"
            />
          )
        }
        const { dy, anchor } = labelOffset(index, point.session.passed)
        return (
          <g key={point.key}>
            <circle
              cx={point.x}
              cy={point.y ?? 0}
              r={point.session.passed ? 6 : 5}
              fill={WEEKLY_FLOW_COLORS[point.weekday]}
              stroke="#fff"
              strokeWidth="2"
            />
            <text
              x={point.x}
              y={(point.y ?? 0) + dy}
              textAnchor={anchor}
              fontSize="10"
              fontWeight="700"
              fill="#163A70"
            >
              {point.session.session}차시 {point.session.score}
            </text>
            {point.session.passed ? (
              <text
                x={point.x}
                y={(point.y ?? 0) + dy - 13}
                textAnchor={anchor}
                fontSize="10"
                fontWeight="800"
                fill={WEEKLY_FLOW_COLORS[point.weekday] === '#ef4444' ? '#b91c1c' : '#163A70'}
              >
                {point.session.session}차시 합격
              </text>
            ) : null}
          </g>
        )
      })}
      {days.map((day, index) => (
        <text
          key={day.weekday}
          x={padL + dayWidth * index + dayWidth / 2}
          y={height - 14}
          textAnchor="middle"
          fontSize="12"
          fontWeight="700"
          fill="#163A70"
        >
          {WEEKLY_FLOW_DAY_LABELS[day.weekday]}
        </text>
      ))}
    </svg>
  )
}

const WEEKLY_FLOW_WEEKDAYS_CLIP = ['monday', 'wednesday', 'friday'] as const

export function DailyTestWeeklyFlowCard({
  studentId,
  weekStart,
  dailyTests,
}: {
  studentId: string
  weekStart: string
  dailyTests: DailyTestRecord[]
}) {
  const [subject, setSubject] = useState<string | null>(null)
  const clipId = useId().replace(/:/g, '')
  const model = useMemo(
    () =>
      buildDailyTestWeeklyFlow({
        studentId,
        weekStart,
        dailyTests,
        subject,
      }),
    [dailyTests, studentId, subject, weekStart],
  )

  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-3 py-4 shadow-sm sm:px-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Daily Test
          </p>
          <h3 className="mt-0.5 text-sm font-bold text-navy-900">일일테스트 주간 흐름</h3>
        </div>
      </div>
      {model.subjects.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {model.subjects.map((item) => {
            const active = (subject ?? model.selectedSubject) === item
            return (
              <button
                key={item}
                type="button"
                onClick={() => setSubject(item)}
                className={`min-h-9 rounded-full px-3 text-xs font-semibold ${
                  active ? 'bg-[#163A70] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item}
              </button>
            )
          })}
        </div>
      ) : null}
      <div className="mt-2 overflow-visible">
        <FlowChart days={model.days} clipId={clipId} />
      </div>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {[
          { label: '주간 최고', value: model.max },
          { label: '주간 최저', value: model.min },
          { label: '주간 평균', value: model.avg },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-slate-50 px-2 py-2 text-center">
            <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
            <p className="mt-0.5 text-sm font-bold text-[#163A70]">
              {item.value == null ? '—' : `${formatStat(item.value)}점`}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
