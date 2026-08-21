import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'

export type EntranceExamRadarPoint = {
  axis: string
  shortAxis: string
  value: number
  displayScore: string
}

type Props = {
  points: EntranceExamRadarPoint[]
  /** navy | mint */
  tone?: 'navy' | 'mint'
  emptyText?: string
  /**
   * PRINT 전용: ResponsiveContainer 없이 고정 px로 SVG를 생성한다.
   * (print 시 container 크기 0 재계산으로 차트가 사라지는 문제 회피)
   * 화면용 기본 동작은 변경하지 않는다.
   */
  fixedSize?: { width: number; height: number }
  /** PRINT에서 fill/stroke/label 대비를 약간 높인다 */
  printEnhance?: boolean
}

type TickProps = {
  payload?: { value?: string }
  x?: string | number
  y?: string | number
  points: EntranceExamRadarPoint[]
  labelFill: string
  scoreFill: string
  fontSize: number
}

function AxisTick({
  payload,
  x = 0,
  y = 0,
  points,
  labelFill,
  scoreFill,
  fontSize,
}: TickProps) {
  const label = String(payload?.value ?? '')
  const point = points.find((item) => item.shortAxis === label || item.axis === label)
  const scoreText = point?.displayScore ?? '-'
  const nx = Number(x) || 0
  const ny = Number(y) || 0
  const dx = nx > 0 ? 2 : nx < 0 ? -2 : 0
  const dy = ny > 0 ? 4 : ny < 0 ? -2 : 0

  return (
    <g transform={`translate(${nx + dx},${ny + dy})`}>
      <text
        textAnchor="middle"
        fill={labelFill}
        style={{ fontSize, fontWeight: 700 }}
      >
        {label}
      </text>
      <text
        y={Math.round(fontSize * 1.3)}
        textAnchor="middle"
        fill={scoreFill}
        style={{ fontSize, fontWeight: 600 }}
      >
        {scoreText}
      </text>
    </g>
  )
}

/** 기존 recharts 재사용. 월간 REPORT 차트와 분리된 신입생 REPORT 전용 래퍼 */
export function EntranceExamRadarChart({
  points,
  tone = 'navy',
  emptyText = '표시할 점수가 없습니다.',
  fixedSize,
  printEnhance = false,
}: Props) {
  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500"
        style={
          fixedSize
            ? { width: fixedSize.width, height: fixedSize.height }
            : { height: 240 }
        }
      >
        {emptyText}
      </div>
    )
  }

  const stroke = tone === 'mint' ? '#0F766E' : '#163A70'
  const fill = printEnhance
    ? tone === 'mint'
      ? 'rgba(40,199,183,0.45)'
      : 'rgba(22,58,112,0.32)'
    : tone === 'mint'
      ? 'rgba(40,199,183,0.28)'
      : 'rgba(22,58,112,0.18)'
  const gridStroke = printEnhance ? '#94A3B8' : '#D7E2EF'
  const labelFill = printEnhance ? '#163A70' : '#163A70'
  const scoreFill = printEnhance ? '#475569' : '#64748B'
  const radiusTickFill = printEnhance ? '#64748B' : '#94A3B8'
  const largePrint = Boolean(printEnhance && fixedSize && fixedSize.width >= 420)
  const fontSize = printEnhance ? (largePrint ? 13 : 11) : 10
  const radiusTickSize = printEnhance ? (largePrint ? 11 : 10) : 9
  const outerRadius = printEnhance ? (largePrint ? '68%' : '66%') : '66%'
  const data = points.map((point) => ({ ...point, axisKey: point.shortAxis }))

  const chart = (
    <RadarChart
      {...(fixedSize
        ? { width: fixedSize.width, height: fixedSize.height }
        : {})}
      cx="50%"
      cy="52%"
      outerRadius={outerRadius}
      data={data}
    >
      <PolarGrid stroke={gridStroke} gridType="polygon" />
      <PolarAngleAxis
        dataKey="axisKey"
        tick={(props) => (
          <AxisTick
            {...props}
            points={points}
            labelFill={labelFill}
            scoreFill={scoreFill}
            fontSize={fontSize}
          />
        )}
        tickLine={false}
      />
      <PolarRadiusAxis
        angle={90}
        domain={[0, 100]}
        tickCount={6}
        axisLine={false}
        tick={{ fill: radiusTickFill, fontSize: radiusTickSize }}
      />
      <Radar
        name="점수"
        dataKey="value"
        stroke={stroke}
        fill={fill}
        fillOpacity={1}
        strokeWidth={printEnhance ? 2.5 : 2}
        isAnimationActive={false}
      />
    </RadarChart>
  )

  if (fixedSize) {
    return (
      <div
        className="ee-report-radar-fixed"
        style={{
          width: fixedSize.width,
          height: fixedSize.height,
          margin: '0 auto',
        }}
      >
        {chart}
      </div>
    )
  }

  return (
    <div className="h-[260px] w-full sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        {chart}
      </ResponsiveContainer>
    </div>
  )
}
