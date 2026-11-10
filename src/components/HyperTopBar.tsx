import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { HY, accentTile } from './hyperUi'

/** 문제은행 화면 위 어두운 막대: HYPER / 문제은행 / 현재 화면 + 오른쪽 내용 */
export function HyperTopBar({ crumbs, right }: { crumbs: string[]; right?: ReactNode }) {
  return (
    <header
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-6 py-4 text-white sm:px-8"
      style={{ background: '#141318' }}
    >
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/" className="flex items-center gap-2.5 text-white">
          <span
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] font-bold"
            style={{ ...accentTile, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 0 rgba(0,0,0,0.5), 0 6px 14px rgba(0,0,0,0.35)', fontFamily: HY.display }}
          >
            H
          </span>
          <span className="font-bold tracking-[0.12em]" style={{ fontFamily: HY.display }}>
            HYPER
          </span>
        </Link>
        {crumbs.map((c, i) => (
          <span key={c} className="flex items-center gap-4">
            <span className="text-[#5A566A]">/</span>
            <span className={`text-[14px] ${i === crumbs.length - 1 ? 'font-medium text-white' : 'text-[#C9C6D6]'}`}>{c}</span>
          </span>
        ))}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#B8B4C8]">{right}</div>}
    </header>
  )
}
