import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { HyperTopBar } from '../../components/HyperTopBar'
import { HY, accentTile, darkTile, field, panel, stepOff, toggleOff, toggleOn } from '../../components/hyperUi'
import { WORKSHEET_PATH } from '../../components/Sidebar'
import { buildOdapPaper, type OdapItem, type OdapStatus, type PaperSlot } from '../../lib/odapPaper'

// shortcut: 화면 모양만 먼저 적용(원장 결정). 학생·오답은 DB와 아직 연결하지 않은 예시 데이터
const STUDENTS = [
  { id: 'a', name: '예시 학생 1', klass: '고1 A반' },
  { id: 'b', name: '예시 학생 2', klass: '고1 A반' },
  { id: 'c', name: '예시 학생 3', klass: '고1 A반' },
  { id: 'd', name: '예시 학생 4', klass: '고1 B반' },
]
const SAMPLE: OdapItem[] = [
  { id: '1', no: '12', unit: '집합과 명제', sub: '집합의 연산', level: '중', date: '2026-11-03', status: '남음' },
  { id: '2', no: '18', unit: '집합과 명제', sub: '명제', level: '중상', date: '2026-11-04', status: '남음' },
  { id: '3', no: '7', unit: '집합과 명제', sub: '집합의 뜻과 표현', level: '하', date: '2026-11-05', status: '쌍둥이 대기' },
  { id: '4', no: '21', unit: '함수와 그래프', sub: '함수', level: '상', date: '2026-11-06', status: '쌍둥이 대기' },
  { id: '5', no: '3', unit: '도형의 방정식', sub: '직선의 방정식', level: '중하', date: '2026-10-28', status: '회수 완료' },
  { id: '6', no: '9', unit: '함수와 그래프', sub: '유리함수', level: '중', date: '2026-10-30', status: '회수 완료' },
]
const FILTERS = ['전체', '남음', '쌍둥이 대기', '회수 완료'] as const
const STATUS_STYLE: Record<OdapStatus, { color: string; bg: string; edge: string }> = {
  남음: { color: '#8A3D0C', bg: '#FFE3CC', edge: '#F0C29C' },
  '쌍둥이 대기': { color: '#005A72', bg: '#CFF3FB', edge: '#9EDDEC' },
  '회수 완료': { color: '#1B6B40', bg: '#D5F5E2', edge: '#A8DDBE' },
}
const GRID = 'grid grid-cols-[28px_0.6fr_1.6fr_0.7fr_0.9fr_1fr] gap-2'
const sub = 'text-[12px] text-[#5F5B6E]'

function Check({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className="flex h-[18px] w-[18px] items-center justify-center rounded-md text-[12px] font-bold leading-none"
      style={on ? { border: '1.5px solid #17161C', background: '#17161C', boxShadow: '0 2px 0 #000', color: HY.accent } : { border: '1.5px solid #B9B5C8', background: '#FFFFFF' }}
    >
      {on ? '✓' : ''}
    </button>
  )
}

export function TeacherOdapBankPage() {
  const [mode, setMode] = useState<'학생' | '반'>('반')
  const [q, setQ] = useState('')
  const [studentId, setStudentId] = useState(STUDENTS[1].id)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('전체')
  const [checked, setChecked] = useState<Set<string>>(new Set(['1', '2', '3', '4']))
  const [count, setCount] = useState(10)
  const [includeRecovered, setIncludeRecovered] = useState(false)
  const [paper, setPaper] = useState<PaperSlot[] | null>(null)

  const items = SAMPLE
  const student = STUDENTS.find((s) => s.id === studentId) ?? STUDENTS[0]
  const shown = STUDENTS.filter((s) => (s.name + s.klass).includes(q.trim()))
  const n = (st: OdapStatus) => items.filter((x) => x.status === st).length
  const remaining = n('남음') + n('쌍둥이 대기')
  const rows = filter === '전체' ? items : items.filter((x) => x.status === filter)
  const inScope = (x: OdapItem) => includeRecovered || x.status !== '회수 완료'
  const checkedInScope = items.filter((x) => checked.has(x.id) && inScope(x)).length
  const allOn = rows.length > 0 && rows.every((x) => checked.has(x.id))

  const units = useMemo(() => {
    const m = new Map<string, number>()
    items.filter((x) => x.status !== '회수 완료').forEach((x) => m.set(x.unit, (m.get(x.unit) ?? 0) + 1))
    const max = Math.max(1, ...m.values())
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([u, c]) => ({ u, c, w: (c / max) * 100 }))
  }, [items])

  const toggle = (id: string) => {
    const s = new Set(checked)
    if (s.has(id)) s.delete(id)
    else s.add(id)
    setChecked(s)
    setPaper(null)
  }
  const toggleAll = () => {
    const s = new Set(checked)
    rows.forEach((x) => (allOn ? s.delete(x.id) : s.add(x.id)))
    setChecked(s)
    setPaper(null)
  }

  return (
    <div className="flex w-full flex-col gap-5" style={{ fontFamily: HY.font, color: HY.ink }}>
      <HyperTopBar
        crumbs={['문제은행', '학생별 오답Bank']}
        right={
          <>
            <Link to={WORKSHEET_PATH} className="rounded-full px-3.5 py-2 text-[13px] text-white" style={stepOff}>
              문제지 만들기
            </Link>
            <span className="rounded-full px-3.5 py-2 text-[13px] font-bold" style={accentTile}>학생별 오답Bank</span>
          </>
        }
      />

      <div className="flex flex-wrap gap-5">
        <section aria-label="학생 목록" className="flex min-w-0 max-w-[320px] flex-[1_1_260px] flex-col gap-3.5" style={panel}>
          <h2 className="m-0 text-[16px] font-bold">학생 선택</h2>
          <div className="flex gap-2">
            {(['학생', '반'] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)} className="h-11 flex-1 rounded-xl text-[14px]" style={m === mode ? toggleOn : toggleOff}>
                {m}
              </button>
            ))}
          </div>
          <label className="flex h-11 items-center px-3.5" style={field}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 반 검색" aria-label="학생 검색" className="min-w-0 flex-1 border-none bg-transparent text-[14px] outline-none" />
          </label>
          <span className={sub}>
            {student.klass} · {STUDENTS.filter((s) => s.klass === student.klass).length}명
          </span>
          <div className="flex flex-col gap-1">
            {shown.map((s) => {
              const on = s.id === studentId
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setStudentId(s.id)
                    setPaper(null)
                  }}
                  className={`flex min-h-12 items-center justify-between gap-2.5 rounded-xl px-3 text-left text-[14px] ${on ? 'font-bold' : ''}`}
                  style={on ? { background: '#E3F8FD', border: '1px solid #A9E8F7' } : { border: '1px solid transparent' }}
                >
                  <span>{s.name}</span>
                  <span className="text-[13px] text-[#5F5B6E]" style={{ fontFamily: HY.display }}>오답 {on ? remaining : '-'}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section aria-label="학생 오답Bank" className="flex min-w-0 flex-[3_1_520px] flex-col gap-[18px]" style={panel}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 text-[20px] font-bold">{student.name}의 오답Bank</h2>
            <span className="text-[13px] text-[#5F5B6E]">{student.klass}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { t: '남은 오답', v: remaining, dark: true },
              { t: '쌍둥이 재시험 대기', v: n('쌍둥이 대기') },
              { t: '회수 완료', v: n('회수 완료') },
            ].map((c) => (
              <div key={c.t} className="flex flex-col gap-1.5 rounded-2xl px-[18px] py-4" style={c.dark ? darkTile : { background: HY.bg }}>
                <span className="text-[12px]" style={{ color: c.dark ? '#B8B4C8' : '#5F5B6E' }}>{c.t}</span>
                <span className="text-[28px] font-bold" style={{ fontFamily: HY.display }}>{c.v}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className="h-11 rounded-full px-4 text-[13px]" style={f === filter ? toggleOn : toggleOff}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex flex-col overflow-x-auto">
            <div className={`${GRID} border-b border-[#ECEAF3] px-1 py-2.5 text-[12px] text-[#5F5B6E]`}>
              <Check on={allOn} onClick={toggleAll} label="보이는 문제 모두 선택" />
              <span>문제</span>
              <span>단원</span>
              <span>난이도</span>
              <span>틀린 날</span>
              <span>상태</span>
            </div>
            {rows.map((x) => {
              const st = STATUS_STYLE[x.status]
              return (
                <div key={x.id} className={`${GRID} items-center border-b border-[#F2F1F7] px-1 py-3 text-[14px]`}>
                  <Check on={checked.has(x.id)} onClick={() => toggle(x.id)} label={`${x.no}번 선택`} />
                  <span style={{ fontFamily: HY.display }}>{x.no}</span>
                  <span>{x.sub}</span>
                  <span>{x.level}</span>
                  <span className="text-[#5F5B6E]">{x.date.replace(/-/g, '.')}</span>
                  <span
                    className="justify-self-start rounded-full px-2.5 py-1 text-[12px] font-medium"
                    style={{ color: st.color, backgroundColor: st.bg, backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0) 60%)', boxShadow: `inset 0 1px 0 #FFFFFF, 0 2px 0 ${st.edge}` }}
                  >
                    {x.status}
                  </span>
                </div>
              )
            })}
            {rows.length === 0 && <div className="py-10 text-center text-[13px] text-[#5F5B6E]">해당하는 오답이 없어요.</div>}
          </div>
        </section>

        <section aria-label="오답 작업" className="flex min-w-0 max-w-[360px] flex-[2_1_280px] flex-col gap-4">
          <div className="flex flex-col gap-3" style={panel}>
            <h2 className="m-0 text-[16px] font-bold">오답 문제지</h2>
            <span className="text-[13px] leading-[1.6] text-[#5F5B6E]">남은 오답의 쌍둥이 문제(같은 소단원 · 난이도)로 개인 시험지를 만들어요.</span>
            <div className="flex flex-col gap-1.5">
              <span className={sub}>문제 수 (직접 입력)</span>
              <div className="flex items-center gap-2">
                <label className="flex h-12 flex-1 items-center justify-between px-3.5" style={{ ...field, boxShadow: 'inset 0 2px 4px rgba(23,22,28,0.06)' }}>
                  <input
                    type="number"
                    min={1}
                    value={count}
                    onChange={(e) => {
                      setCount(Math.max(0, Number(e.target.value) || 0))
                      setPaper(null)
                    }}
                    aria-label="문제 수"
                    className="w-full min-w-0 border-none bg-transparent text-[20px] font-bold outline-none"
                    style={{ fontFamily: HY.display }}
                  />
                  <span className="text-[13px] text-[#5F5B6E]">문제</span>
                </label>
                <span className="whitespace-nowrap text-[12px] text-[#5F5B6E]">
                  선택 {checkedInScope} / 남은 오답 {remaining}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={sub}>출제 범위</span>
              <div className="flex gap-2">
                {[
                  { t: '남은 오답만', v: false },
                  { t: '회수 완료 포함', v: true },
                ].map((b) => (
                  <button
                    key={b.t}
                    type="button"
                    onClick={() => {
                      setIncludeRecovered(b.v)
                      setPaper(null)
                    }}
                    className="h-11 flex-1 rounded-xl text-[13px]"
                    style={b.v === includeRecovered ? toggleOn : toggleOff}
                  >
                    {b.t}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[12px] leading-[1.5] text-[#5F5B6E]">왼쪽 목록에서 체크한 문제를 우선 출제하고, 부족하면 같은 소단원·난이도 쌍둥이로 채워요.</span>
            <button
              type="button"
              disabled={!count}
              onClick={() => setPaper(buildOdapPaper(items, checked, count, includeRecovered))}
              className="h-[52px] rounded-[14px] text-[16px] font-bold disabled:opacity-50"
              style={{ ...accentTile, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 3px 0 rgba(0,0,0,0.35), 0 12px 22px rgba(23,22,28,0.18)' }}
            >
              오답 문제지 만들기
            </button>
            {paper && (
              <ol className="m-0 flex max-h-56 list-none flex-col gap-1 overflow-y-auto rounded-xl p-3 text-[13px]" style={{ background: HY.bg }}>
                {paper.length === 0 && <li className="text-[#5F5B6E]">출제 범위에 오답이 없어요.</li>}
                {paper.map((s, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>
                      <b style={{ fontFamily: HY.display }}>{i + 1}</b>{' '}
                      {s.kind === '오답' ? `${s.item.no}번 · ${s.item.sub}` : `쌍둥이 · ${s.sub}`}
                    </span>
                    <span className="text-[#5F5B6E]">{s.kind === '오답' ? s.item.level : `${s.level} (${s.from.no}번)`}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="flex gap-2">
              <button type="button" className="h-12 flex-1 rounded-xl text-[14px]" style={toggleOff}>앱으로 보내기</button>
              <button type="button" onClick={() => window.print()} className="h-12 flex-1 rounded-xl text-[14px]" style={toggleOff}>PDF 출력</button>
            </div>
          </div>

          <div className="flex flex-col gap-3" style={panel}>
            <h2 className="m-0 text-[16px] font-bold">단원별 남은 오답</h2>
            {units.map(({ u, c, w }, i) => (
              <div key={u} className="flex flex-col gap-1.5 text-[13px]">
                <span className="flex justify-between">
                  {u}
                  <span style={{ fontFamily: HY.display }}>{c}</span>
                </span>
                <div className="h-2 rounded bg-[#EFEDF6]">
                  <div className="h-2 rounded" style={{ width: `${w}%`, background: [HY.accent, '#5CD6F2', '#A9E8F7'][Math.min(i, 2)] }} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5" style={panel}>
            <h2 className="m-0 text-[16px] font-bold">반 전체 많이 틀린 문제</h2>
            {['[문제 번호 · 소단원]', '[문제 번호 · 소단원]', '[문제 번호 · 소단원]'].map((t, i, a) => (
              <div key={i} className={`flex justify-between py-2 text-[13px] ${i < a.length - 1 ? 'border-b border-[#F2F1F7]' : ''}`}>
                <span>{t}</span>
                <span style={{ fontFamily: HY.display }}>[n]명</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
