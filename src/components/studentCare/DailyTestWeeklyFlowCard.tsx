import { useId, useMemo, useState } from 'react'
import type { DailyTestRecord, WeeklySummaryGrade } from '../../types/records'
import { DAILY_WRONG_TYPES } from '../../utils/learningDiagnosis'
import { WEEKLY_GRADE_CLASS } from '../../utils/studentCare/weeklySummaryDisplay'
import {
  buildDailyTestWeeklyFlow,
  WEEKLY_FLOW_COLORS,
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
}

const WEEKLY_FLOW_WEEKDAYS_CLIP = ['monday', 'wednesday', 'friday'] as const

function catmullRomPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return ''
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

function formatStat(value: number | null): string {
  if (value == null) return '—'
  return `${value}`
}

function sessionLabel(session: WeeklyFlowSessionPoint): string {
  if (session.kind !== 'score' || session.score == null) return ''
  return session.passed
    ? `${session.session}차시 ${session.score} 합격`
    : `${session.session}차시 ${session.score}`
}

function labelShift(session: WeeklyFlowSessionPoint, indexInDay: number, score: number): {
  x: string
  y: string
} {
  const above = session.passed || score >= 82 || indexInDay % 2 === 0
  return {
    x: indexInDay === 0 ? '-8%' : indexInDay === 3 ? '-92%' : '-50%',
    y: above ? '-118%' : '18%',
  }
}

function scoreToPlotY(score: number, padT: number, plotH: number): number {
  return padT + plotH * (1 - (score - 50) / 50)
}

function FlowChart({ days, clipId }: { days: WeeklyFlowDay[]; clipId: string }) {
  const width = 360
  const height = 128
  const padL = 18
  const padR = 10
  const padT = 28
  const padB = 23
  const plotW = width - padL - padR
  const plotH = height - padT - padB
  const slots = days.flatMap((day) => day.sessions.map((session) => ({ day, session })))
  const points: ChartPoint[] = slots.map((slot, index) => {
    const x = padL + (plotW * index) / Math.max(slots.length - 1, 1)
    const scoreY =
      slot.session.kind === 'score' && slot.session.score != null
        ? scoreToPlotY(slot.session.score, padT, plotH)
        : null
    return {
      key: `${slot.day.weekday}-${slot.session.session}`,
      weekday: slot.day.weekday,
      session: slot.session,
      x,
      y: scoreY,
    }
  })
  const scored = points.filter((point): point is ChartPoint & { y: number } => point.y != null)
  const curve = catmullRomPath(scored.map((point) => ({ x: point.x, y: point.y })))
  const dayWidth = plotW / 3
  const dayIndex = (weekday: WeeklyFlowWeekday) =>
    weekday === 'monday' ? 0 : weekday === 'wednesday' ? 1 : 2

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="일일테스트 주간 흐름"
      >
        <defs>
          {WEEKLY_FLOW_WEEKDAYS_CLIP.map((weekday, index) => (
            <clipPath key={weekday} id={`${clipId}-${weekday}`}>
              <rect x={padL + dayWidth * index} y={padT - 6} width={dayWidth} height={plotH + 12} />
            </clipPath>
          ))}
        </defs>
        {[50, 100].map((tick) => {
          const y = scoreToPlotY(tick, padT, plotH)
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
              <text x={padL - 3} y={y + 3} textAnchor="end" fontSize="8" fill="#94a3b8">
                {tick}
              </text>
            </g>
          )
        })}
        {curve
          ? WEEKLY_FLOW_WEEKDAYS_CLIP.map((weekday) => (
              <path
                key={weekday}
                d={curve}
                fill="none"
                stroke={WEEKLY_FLOW_COLORS[weekday]}
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath={`url(#${clipId}-${weekday})`}
              />
            ))
          : null}
        {points.map((point) =>
          point.session.kind === 'score' && point.y != null ? (
            <circle
              key={point.key}
              cx={point.x}
              cy={point.y}
              r={point.session.passed ? 5 : 4.2}
              fill={WEEKLY_FLOW_COLORS[point.weekday]}
              stroke="#fff"
              strokeWidth="1.6"
            />
          ) : null,
        )}
      </svg>
      {points.map((point) => {
        if (point.session.kind !== 'score' || point.y == null || point.session.score == null) {
          return null
        }
        const indexInDay = point.session.session - 1
        const shift = labelShift(point.session, indexInDay, point.session.score)
        return (
          <span
            key={`${point.key}-label`}
            className="pointer-events-none absolute whitespace-nowrap text-[10px] font-bold leading-tight text-[#163A70] sm:text-[11px]"
            style={{
              left: `${(point.x / width) * 100}%`,
              top: `${(point.y / height) * 100}%`,
              transform: `translate(${shift.x}, ${shift.y})`,
              color: point.session.passed && dayIndex(point.weekday) === 1 ? '#b91c1c' : '#163A70',
            }}
          >
            {sessionLabel(point.session)}
          </span>
        )
      })}
    </div>
  )
}

function FactEmpty({ title }: { title: string }) {
  return (
    <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[11px] font-semibold text-[#163A70]">{title}</p>
      <p className="text-sm font-semibold text-slate-500">이번 주 기록 없음</p>
    </div>
  )
}

export function DailyTestWeeklyFlowCard({
  studentId,
  weekStart,
  dailyTests,
  grade,
  showRecoveryFacts = false,
}: {
  studentId: string
  weekStart: string
  dailyTests: DailyTestRecord[]
  grade: WeeklySummaryGrade | null
  /** 주간 SUMMARY는 false. 별도 weekly-wrong-vocab에서만 오답 회수·4유형을 연다. */
  showRecoveryFacts?: boolean
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
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Daily Test</p>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-navy-900">일일테스트 주간 흐름</h3>
        {grade ? (
          <span
            className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${WEEKLY_GRADE_CLASS[grade]}`}
          >
            {grade}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-slate-400">기록 없음</span>
        )}
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
      {showRecoveryFacts ? (
        model.weekCumulativeResults.length > 0 ? (
          <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-[#163A70]">누적 단어 TEST</p>
            {model.weekCumulativeResults.map((item) => (
              <p key={item.date} className="text-sm font-semibold text-slate-800">
                {item.label}
              </p>
            ))}
          </div>
        ) : (
          <FactEmpty title="누적 단어 TEST" />
        )
      ) : null}
      {showRecoveryFacts ? (
        model.weekRecoveryResults.length > 0 ? (
          <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-[#163A70]">오답 회수</p>
            {model.weekRecoveryResults.map((item) => (
              <p key={item.date} className="text-sm font-semibold leading-snug text-slate-800">
                {item.label}
              </p>
            ))}
          </div>
        ) : (
          <FactEmpty title="오답 회수" />
        )
      ) : null}
      {model.days.some((day) => day.sessions.some((session) => session.kind === 'score')) ? (
        <div className="mt-3 overflow-visible pt-5">
          <FlowChart days={model.days} clipId={clipId} />
        </div>
      ) : null}
      {showRecoveryFacts ? (
      <div className="mt-3">
        <h4 className="text-sm font-bold text-navy-900">주간 오답 현황</h4>
        {model.hasMathWeekRecords ? (
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {DAILY_WRONG_TYPES.map((item) => {
            const count = model.wrongTypes[item.key]
            const percent =
              model.wrongTypeTotal > 0 ? Math.round((count / model.wrongTypeTotal) * 100) : null
            return (
              <div key={item.key} className="rounded-xl bg-slate-50 px-2.5 py-2">
                <p className="text-[11px] font-semibold leading-tight text-slate-600">{item.label}</p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-[#163A70]">
                  {count}문제
                  {percent != null ? (
                    <span className="ml-1 text-[11px] font-semibold text-slate-400">{percent}%</span>
                  ) : null}
                </p>
              </div>
            )
          })}
        </div>
        ) : (
          <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-500">
            이번 주 기록 없음
          </p>
        )}
      </div>
      ) : null}
      {model.max != null ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
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
      ) : null}
    </section>
  )
}
