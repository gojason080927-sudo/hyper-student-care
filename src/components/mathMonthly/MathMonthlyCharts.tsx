import { MATH_CAUSES, MATH_CAUSE_COLOR, MATH_CAUSE_LABEL, type MathCause, type MathTrendPoint } from '../../utils/mathMonthlyReport'

const PURPLE = '#5B348A'
const GRID = '#ECE6F2'
const MUTE = '#6B6574'
const INK = '#161B3A'

/** 성적 추이: 학생 선 + 반 평균 점선(showAvg일 때만) */
export function TrendChart({ points, showAvg }: { points: MathTrendPoint[]; showAvg: boolean }) {
  const W = 330
  const H = 205
  const left = 34
  const right = 280
  const top = 14
  const bottom = 179
  const values = points.flatMap((p) => [p.percentage, ...(showAvg && p.classPercentage !== null ? [p.classPercentage] : [])])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const lo = Math.max(0, Math.floor((min - 10) / 10) * 10)
  const hi = Math.min(100, Math.max(lo + 20, Math.ceil((max + 10) / 10) * 10))
  const y = (v: number) => bottom - ((v - lo) / (hi - lo)) * (bottom - top)
  const x = (i: number) => (points.length === 1 ? (left + right) / 2 : left + (i * (right - left)) / (points.length - 1))
  const ticks: number[] = []
  for (let t = lo; t <= hi; t += 10) ticks.push(t)

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.percentage).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${bottom} L${x(0).toFixed(1)},${bottom} Z`
  const avgPts = showAvg ? points.map((p, i) => (p.classPercentage === null ? null : { i, v: p.classPercentage })) : []
  const avgLine = avgPts
    .filter((p): p is { i: number; v: number } => p !== null)
    .map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(' ')
  const last = points[points.length - 1]
  const lastIdx = points.length - 1

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="성적 추이 그래프">
      <defs>
        <linearGradient id="mm-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PURPLE} stopOpacity=".18" />
          <stop offset="1" stopColor={PURPLE} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke={GRID} />
          <text x={left - 6} y={y(t) + 3.5} textAnchor="end" fontSize="9" fill={MUTE}>{t}</text>
        </g>
      ))}
      {points.map((p, i) => (
        <text key={`${p.year}-${p.month}`} x={x(i)} y={197} textAnchor="middle" fontSize="9.5" fill={MUTE}>{p.label}</text>
      ))}
      {points.length > 1 && <path d={area} fill="url(#mm-area)" />}
      {avgLine && points.length > 1 && <path d={avgLine} fill="none" stroke="#A79FB3" strokeWidth="1.6" strokeDasharray="4 3" />}
      {points.length > 1 && <path d={line} fill="none" stroke={PURPLE} strokeWidth="2.6" strokeLinejoin="round" />}
      {points.map((p, i) => (
        <circle key={`c-${p.year}-${p.month}`} cx={x(i)} cy={y(p.percentage)} r={i === lastIdx ? 5 : 3.2} fill={PURPLE} stroke="#fff" strokeWidth="2" />
      ))}
      <text x={x(lastIdx) + 9} y={y(last.percentage) + 4} fontSize="10.5" fontWeight="800" fill={INK}>{Math.round(last.percentage)}점</text>
      {showAvg && last.classPercentage !== null && (
        <text x={x(lastIdx) + 9} y={y(last.percentage) + 24} fontSize="9" fill={MUTE}>반 {Math.round(last.classPercentage)}</text>
      )}
    </svg>
  )
}

/** 단원별 레이더 (3개 단원 이상). 반 평균 겹침은 showAvg일 때만. */
export function UnitRadar({
  units,
  showAvg,
}: {
  units: { name: string; rate: number; classRate: number | null }[]
  showAvg: boolean
}) {
  const W = 316
  const H = 226
  const cx = 158
  const cy = 113
  const R = 65
  const n = units.length
  const ang = (i: number) => (-90 + (360 * i) / n) * (Math.PI / 180)
  const pt = (i: number, v: number) => [cx + R * (v / 100) * Math.cos(ang(i)), cy + R * (v / 100) * Math.sin(ang(i))] as const
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v).map((c) => c.toFixed(1)).join(',')).join(' ')
  const rings = [25, 50, 75, 100]
  const avgVals = units.map((u) => u.classRate)
  const hasAvg = showAvg && avgVals.every((v) => v !== null)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="단원별 성취도 레이더">
      {rings.map((r) => (
        <polygon key={r} points={poly(units.map(() => r))} fill={r === 100 ? '#F8F5FB' : 'none'} stroke={GRID} />
      ))}
      {units.map((_, i) => {
        const [px, py] = pt(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={px} y2={py} stroke={GRID} />
      })}
      {hasAvg && <polygon points={poly(avgVals as number[])} fill="none" stroke="#A79FB3" strokeWidth="1.5" strokeDasharray="4 3" />}
      <polygon points={poly(units.map((u) => u.rate))} fill={PURPLE} fillOpacity=".16" stroke={PURPLE} strokeWidth="2.2" strokeLinejoin="round" />
      {units.map((u, i) => {
        const [px, py] = pt(i, u.rate)
        const [lx, ly] = pt(i, 100)
        const cos = Math.cos(ang(i))
        const sin = Math.sin(ang(i))
        const tx = lx + cos * 20
        const ty = ly + sin * 18
        const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end'
        return (
          <g key={u.name + i}>
            <circle cx={px} cy={py} r="3.2" fill={PURPLE} stroke="#fff" strokeWidth="1.5" />
            <text x={tx} y={ty - 1} textAnchor={anchor} fontSize="9.5" fill="#4A4458">{u.name}</text>
            <text x={tx} y={ty + 10} textAnchor={anchor} fontSize="10" fontWeight="800" fill={INK}>{u.rate}%</text>
          </g>
        )
      })}
    </svg>
  )
}

export function CauseDonut({ counts, total }: { counts: Record<MathCause, number>; total: number }) {
  const r = 37
  const circ = 2 * Math.PI * r
  const sum = MATH_CAUSES.reduce((s, c) => s + counts[c], 0)
  let offset = 0
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" role="img" aria-label="오답 원인">
      <circle cx="50" cy="50" r={r} fill="none" stroke={GRID} strokeWidth="15" />
      <g transform="rotate(-90 50 50)">
        {sum > 0 &&
          MATH_CAUSES.filter((c) => counts[c] > 0).map((c) => {
            const len = (counts[c] / sum) * circ
            const el = (
              <circle
                key={c}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={MATH_CAUSE_COLOR[c]}
                strokeWidth="15"
                strokeDasharray={`${Math.max(0, len - 2).toFixed(2)} ${(circ - Math.max(0, len - 2)).toFixed(2)}`}
                strokeDashoffset={(-offset).toFixed(2)}
              />
            )
            offset += len
            return el
          })}
      </g>
      <text x="50" y="49" textAnchor="middle" fontSize="20" fontWeight="800" fill={INK}>{total}</text>
      <text x="50" y="64" textAnchor="middle" fontSize="9" fill={MUTE}>오답 문항</text>
    </svg>
  )
}

export function CauseLegend({ counts }: { counts: Record<MathCause, number> }) {
  return (
    <ul>
      {MATH_CAUSES.map((c) => (
        <li key={c}>
          <span className="mm-sw" style={{ background: MATH_CAUSE_COLOR[c] }} />
          {MATH_CAUSE_LABEL[c]}
          <b>{counts[c]}문항</b>
        </li>
      ))}
    </ul>
  )
}

export function Gauge({
  value,
  color,
  label,
  sub,
  note,
  emptyLabel,
}: {
  value: number | null
  color: string
  label: string
  sub: string
  note?: string
  emptyLabel?: string
}) {
  const circ = 2 * Math.PI * 30
  const dash = value === null ? 0 : (Math.min(100, value) / 100) * circ
  return (
    <div className="mm-gauge">
      <svg viewBox="0 0 78 78" role="img" aria-label={`${label} ${value ?? '-'}%`}>
        <circle cx="39" cy="39" r="30" fill="none" stroke="#E7DCF3" strokeWidth="7" />
        <circle cx="39" cy="39" r="30" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`} transform="rotate(-90 39 39)" />
        {value === null && emptyLabel ? (
          <text x="39" y="43" textAnchor="middle" fontSize="11" fontWeight="700" fill={MUTE}>{emptyLabel}</text>
        ) : (
          <text x="39" y="44" textAnchor="middle" fontSize="15" fontWeight="800" fill={INK}>{value === null ? '-' : `${value}%`}</text>
        )}
      </svg>
      <b>{label}</b>
      <small>{sub}</small>
      {note ? <small className="mm-gnote">{note}</small> : null}
    </div>
  )
}
