import { useId } from 'react'
import type { DifficultyStat, UnitShare } from '../../utils/schoolExamReport'

/** 확정 시안의 점수 링 · 입체 막대 · 입체 원그래프 (SVG) */

const GOLD = '#F2B544'
const CORAL = '#E35D6A'
const INK = '#1B1530'
const INK2 = '#4A4458'
const LAV = '#F4EFFA'

function shade(hex: string, f: number): string {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f))))
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function ScoreRing({ score, total, size = 150 }: { score: number; total: number; size?: number }) {
  const id = useId().replace(/:/g, '')
  const r = 58
  const c = size / 2
  const circ = 2 * Math.PI * r
  const ratio = total > 0 ? Math.max(0, Math.min(1, score / total)) : 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`내 점수 ${score}점`}>
      <defs>
        <linearGradient id={`rg${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={GOLD} />
          <stop offset="1" stopColor="#FFE29A" />
        </linearGradient>
        <filter id={`gl${id}`}>
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="12" />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={`url(#rg${id})`}
        strokeWidth="12"
        strokeLinecap="round"
        filter={`url(#gl${id})`}
        strokeDasharray={`${(circ * ratio).toFixed(1)} ${circ.toFixed(1)}`}
        transform={`rotate(-90 ${c} ${c})`}
      />
      <text x={c} y={c + 6} textAnchor="middle" fontSize="44" fontWeight="900" fill="#fff" letterSpacing="-2">{score}</text>
      <text x={c} y={c + 28} textAnchor="middle" fontSize="11" fill="#E6DAF5">/ {total}점</text>
    </svg>
  )
}

/** 난이도별 입체 막대 — 맞힘(보라) 아래, 틀림(코랄) 위로 쌓는다 */
export function IsoBars({ stats, correctColor = '#5B348A' }: { stats: DifficultyStat[]; correctColor?: string }) {
  const id = useId().replace(/:/g, '')
  const w = 330
  const h = 222
  const baseY = h - 40
  const bw = 34
  const dx = 14
  const dy = 8
  const gap = 78
  const x0 = 30
  const maxTotal = Math.max(1, ...stats.map((s) => s.total))
  const unit = Math.min(20, 120 / maxTotal)

  const box = (x: number, yBot: number, hgt: number, color: string, opacity = 1) => {
    const yTop = yBot - hgt
    return (
      <g opacity={opacity}>
        <polygon points={`${x},${yBot} ${x + bw},${yBot} ${x + bw},${yTop} ${x},${yTop}`} fill={color} />
        <polygon points={`${x + bw},${yBot} ${x + bw + dx},${yBot - dy} ${x + bw + dx},${yTop - dy} ${x + bw},${yTop}`} fill={shade(color, 0.72)} />
        <polygon points={`${x},${yTop} ${x + bw},${yTop} ${x + bw + dx},${yTop - dy} ${x + dx},${yTop - dy}`} fill={shade(color, 1.18)} />
      </g>
    )
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="난이도별 결과">
      <defs>
        <filter id={`sh${id}`} x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#2E1A4F" floodOpacity=".18" />
        </filter>
      </defs>
      <polygon
        points={`${x0 - 12},${baseY + 4} ${x0 + gap * 3 + bw + 12},${baseY + 4} ${x0 + gap * 3 + bw + 12 + dx},${baseY + 4 - dy} ${x0 - 12 + dx},${baseY + 4 - dy}`}
        fill={LAV}
      />
      {stats.map((s, i) => {
        const x = x0 + gap * i
        const top = baseY - s.total * unit - dy
        return (
          <g key={s.difficulty}>
            <g filter={`url(#sh${id})`}>
              {s.correct > 0 && box(x, baseY, s.correct * unit, correctColor)}
              {s.total > s.correct && box(x, baseY - s.correct * unit, (s.total - s.correct) * unit, CORAL, 0.9)}
            </g>
            {s.total > 0 && (
              <text x={x + bw / 2 + dx / 2} y={top - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill={INK}>
                {s.correct}/{s.total}
              </text>
            )}
            <text x={x + bw / 2} y={baseY + 22} textAnchor="middle" fontSize="11" fontWeight="700" fill={INK2}>
              {s.difficulty}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** 단원 비중 입체 원그래프 */
export function Pie3D({ units }: { units: UnitShare[] }) {
  const id = useId().replace(/:/g, '')
  const w = 300
  const h = 190
  const cx = 110
  const cy = 78
  const rx = 92
  const ry = 52
  const depth = 22
  const total = units.reduce((a, u) => a + u.percent, 0) || 1
  const pt = (a: number, dz = 0): [number, number] => [cx + rx * Math.cos(a), cy + ry * Math.sin(a) + dz]

  const segs = units.map((u, idx) => {
    const before = units.slice(0, idx).reduce((a, x) => a + x.percent, 0)
    const a1 = -Math.PI / 2 + (2 * Math.PI * before) / total
    return { a1, a2: a1 + (2 * Math.PI * u.percent) / total, u }
  })

  const walls: { key: number; z: number; points: string; color: string }[] = []
  for (const { a1, a2, u } of segs) {
    const n = Math.max(2, Math.floor((a2 - a1) / 0.05))
    for (let k = 0; k < n; k += 1) {
      const b1 = a1 + ((a2 - a1) * k) / n
      const b2 = a1 + ((a2 - a1) * (k + 1)) / n
      const mid = (b1 + b2) / 2
      if (Math.sin(mid) > -0.02) {
        const [p1, p2, q1, q2] = [pt(b1), pt(b2), pt(b1, depth), pt(b2, depth)]
        walls.push({
          key: walls.length,
          z: Math.sin(mid),
          points: `${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)} ${q2[0].toFixed(1)},${q2[1].toFixed(1)} ${q1[0].toFixed(1)},${q1[1].toFixed(1)}`,
          color: shade(u.color, 0.68),
        })
      }
    }
  }
  walls.sort((a, b) => a.z - b.z)

  const step = Math.min(30, (h - 24) / Math.max(1, units.length))
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="단원별 출제 비중">
      <defs>
        <filter id={`ps${id}`}>
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#2E1A4F" floodOpacity=".22" />
        </filter>
      </defs>
      <g filter={`url(#ps${id})`}>
        {walls.map((wl) => (
          <polygon key={wl.key} points={wl.points} fill={wl.color} stroke={wl.color} strokeWidth=".6" />
        ))}
        {segs.map(({ a1, a2, u }) => {
          const n = Math.max(2, Math.floor((a2 - a1) / 0.04))
          const pts = [`${cx},${cy}`]
          for (let k = 0; k <= n; k += 1) {
            const p = pt(a1 + ((a2 - a1) * k) / n)
            pts.push(`${p[0].toFixed(1)},${p[1].toFixed(1)}`)
          }
          return <polygon key={u.name} points={pts.join(' ')} fill={u.color} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
        })}
      </g>
      {units.map((u, i) => {
        const y = 22 + i * step
        return (
          <g key={u.name}>
            <rect x={w - 92} y={y - 9} width="11" height="11" rx="3" fill={u.color} />
            <text x={w - 76} y={y} fontSize="10" fill={INK2}>{u.name.length > 9 ? `${u.name.slice(0, 8)}…` : u.name}</text>
            <text x={w - 76} y={y + 11} fontSize="10.5" fontWeight="800" fill={INK}>{u.percent}%</text>
          </g>
        )
      })}
    </svg>
  )
}
