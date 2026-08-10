import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import type { DiagnosisSubject } from '../../utils/monthlyLearningDiagnosis'
import {
  getReportTheme,
  type ReportRadarPoint,
} from '../../utils/monthlyLearningReportDisplay'

type MonthlyLearningReportRadarChartProps = {
  subject: DiagnosisSubject
  points: ReportRadarPoint[]
}

type TickProps = {
  payload?: { value?: string }
  x?: string | number
  y?: string | number
  points: ReportRadarPoint[]
}

function AxisTick({ payload, x = 0, y = 0, points }: TickProps) {
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
        className="fill-[#163A70]"
        style={{ fontSize: 10, fontWeight: 700 }}
      >
        {label}
      </text>
      <text
        y={13}
        textAnchor="middle"
        className="fill-slate-500"
        style={{ fontSize: 10, fontWeight: 600 }}
      >
        {scoreText}
      </text>
    </g>
  )
}

export function MonthlyLearningReportRadarChart({
  subject,
  points,
}: MonthlyLearningReportRadarChartProps) {
  const theme = getReportTheme(subject)
  const data = points.map((point) => ({
    ...point,
    axisKey: point.shortAxis,
  }))

  return (
    <div className="mlr-radar-wrap h-[260px] w-full sm:h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="52%" outerRadius="66%" data={data}>
          <PolarGrid stroke="#D7E2EF" gridType="polygon" />
          <PolarAngleAxis
            dataKey="axisKey"
            tick={(props) => <AxisTick {...props} points={points} />}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tickCount={6}
            axisLine={false}
            tick={{ fill: '#94A3B8', fontSize: 9 }}
          />
          <Radar
            name="진단점수"
            dataKey="value"
            stroke={theme.chartStroke}
            fill={theme.chartFill}
            fillOpacity={1}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
