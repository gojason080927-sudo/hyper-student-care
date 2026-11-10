import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HyperTopBar } from '../../components/HyperTopBar'
import { HY, accentTile, darkTile, field, panel, softChip, stepOff, toggleOff, toggleOn } from '../../components/hyperUi'
import { ODAP_BANK_PATH } from '../../components/Sidebar'

// shortcut: 화면 모양만 먼저 적용(원장 결정). 단원·문제는 문제 DB와 아직 연결하지 않아 아래 목록과 미리보기는 자리 표시용
const SUBJECTS = ['중1', '중2', '중3', '공통수학2', '대수', '미적분1']
const UNITS: Record<string, { name: string; subs: string[] }[]> = {
  공통수학2: [
    { name: '도형의 방정식', subs: ['평면좌표', '직선의 방정식', '원의 방정식', '도형의 이동'] },
    { name: '집합과 명제', subs: ['집합의 뜻과 표현', '집합의 연산', '명제'] },
    { name: '함수와 그래프', subs: ['함수', '유리함수', '무리함수'] },
  ],
}
export const LEVELS = ['하', '중하', '중', '중상', '상', '최상'] as const
const LEVEL_COLORS = ['#D6F5FC', '#A9E8F7', '#5CD6F2', '#00B0D6', '#006E8A', '#00303D']
const TARGETS = ['학생', '반', '학년 전체'] as const

const label = 'text-[13px] text-[#6B6779]'

export function TeacherWorksheetPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [title, setTitle] = useState('일일 테스트')
  const [date, setDate] = useState(today)
  const [subject, setSubject] = useState('공통수학2')
  const [open, setOpen] = useState<string | null>('집합과 명제')
  const [picked, setPicked] = useState<Set<string>>(new Set(['집합의 뜻과 표현', '집합의 연산']))
  const [count, setCount] = useState(20)
  const [levels, setLevels] = useState<number[]>([2, 4, 6, 4, 3, 1])
  const [formats, setFormats] = useState<Set<string>>(new Set(['객관식', '단답형']))
  const [target, setTarget] = useState<(typeof TARGETS)[number]>('반')
  const [chips, setChips] = useState<string[]>([])
  const [chipText, setChipText] = useState('')
  const [preview, setPreview] = useState<{ no: number; level: string }[]>([])

  const total = levels.reduce((a, b) => a + b, 0)
  const units = UNITS[subject] ?? []
  const firstUnit = units.find((u) => u.subs.some((s) => picked.has(s)))?.name

  const toggleSet = (s: Set<string>, v: string) => {
    const n = new Set(s)
    if (n.has(v)) n.delete(v)
    else n.add(v)
    return n
  }

  const generate = () => {
    const out: { no: number; level: string }[] = []
    levels.forEach((n, i) => {
      for (let j = 0; j < n; j++) out.push({ no: out.length + 1, level: LEVELS[i] })
    })
    setPreview(out)
  }

  const half = Math.ceil(preview.length / 2)

  return (
    <div className="flex w-full flex-col gap-5" style={{ fontFamily: HY.font, color: HY.ink }}>
      <HyperTopBar
        crumbs={['문제은행', '문제지 만들기']}
        right={
          <>
            <span className="rounded-full px-3 py-1.5 font-bold" style={accentTile}>① 출제 단원 선택</span>
            <span className="rounded-full px-3 py-1.5" style={stepOff}>② 출제 조건 설정</span>
            <span className="rounded-full px-3 py-1.5" style={stepOff}>③ 미리보기 · 출력</span>
            <Link to={ODAP_BANK_PATH} className="rounded-full px-3.5 py-2 text-[13px] text-white" style={stepOff}>
              학생별 오답Bank →
            </Link>
          </>
        }
      />

      <div className="flex flex-wrap gap-5">
        <section aria-label="단원 나무" className="flex min-w-0 max-w-[340px] flex-[1_1_280px] flex-col gap-4" style={panel}>
          <h2 className="m-0 text-[16px] font-bold">출제 단원 선택</h2>
          <div className="flex flex-col gap-2">
            <span className={label}>시험명</span>
            <label className="flex h-12 items-center px-3.5" style={field}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 일일 테스트, 오답 테스트, 월말평가"
                aria-label="시험명"
                className="min-w-0 flex-1 border-none bg-transparent text-[15px] font-medium outline-none"
              />
            </label>
          </div>
          <div className="flex flex-col gap-2">
            <span className={label}>시험 날짜</span>
            <label className="flex h-12 items-center px-3.5" style={field}>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="시험 날짜"
                className="min-w-0 flex-1 border-none bg-transparent text-[15px] font-medium outline-none"
              />
            </label>
          </div>
          <span className={`${label} -mb-2`}>학년 · 과목</span>
          <div className="grid grid-cols-3 gap-2">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(s)}
                className="h-11 rounded-[10px] px-1.5 text-[13px]"
                style={s === subject ? toggleOn : { ...toggleOff, color: '#6B6779' }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1 text-[14px]">
            {units.length === 0 && <div className="px-2 py-2.5 text-[#6B6779]">단원 목록 준비 중</div>}
            {units.map((u) => (
              <div key={u.name} className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => setOpen(open === u.name ? null : u.name)}
                  className={`px-2 py-2.5 text-left ${open === u.name ? 'font-bold' : 'text-[#6B6779]'}`}
                >
                  {open === u.name ? '▾' : '▸'} {u.name}
                </button>
                {open === u.name &&
                  u.subs.map((s) => (
                    <label
                      key={s}
                      className="flex min-h-6 items-center gap-2.5 rounded-[10px] py-2.5 pl-7 pr-2"
                      style={{ background: picked.has(s) ? '#E3F8FD' : 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        checked={picked.has(s)}
                        onChange={() => setPicked(toggleSet(picked, s))}
                        className="h-[18px] w-[18px]"
                        style={{ accentColor: HY.link }}
                      />
                      {s}
                    </label>
                  ))}
              </div>
            ))}
          </div>
          <div className="mt-auto rounded-xl p-3.5 text-[12px] leading-[1.6] text-[#6B6779]" style={{ background: HY.bg }}>
            고른 단원의 검수 완료 문제
            <br />
            <span className="text-[22px] font-bold" style={{ fontFamily: HY.display, color: HY.ink }}>[n]</span> 문제
          </div>
        </section>

        <section aria-label="출제 조건" className="flex min-w-0 max-w-[380px] flex-[1_1_300px] flex-col gap-5" style={panel}>
          <h2 className="m-0 text-[16px] font-bold">출제 조건 설정</h2>
          <div className="flex flex-col gap-2">
            <span className={label}>문제 수</span>
            <label className="flex h-[52px] items-center gap-2.5 px-4" style={field}>
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onChange={(e) => setCount(Math.max(0, Number(e.target.value) || 0))}
                aria-label="문제 수"
                className="min-w-0 flex-1 border-none bg-transparent text-[22px] font-bold outline-none"
                style={{ fontFamily: HY.display }}
              />
              <span className="text-[14px] text-[#6B6779]">문제</span>
            </label>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between">
              <span className={label}>난이도별 문제 수</span>
              <span className="text-[12px]" style={{ color: total === count ? '#6B6779' : '#C2410C' }}>
                합계 <b className="text-[15px]" style={{ fontFamily: HY.display, color: total === count ? HY.ink : '#C2410C' }}>{total}</b> / {count}
                {total !== count && ' · 문제 수와 다름'}
              </span>
            </div>
            <div className="flex h-3.5 overflow-hidden rounded-[7px]" style={{ background: '#ECEAF3' }}>
              {levels.map((n, i) => (
                <div key={LEVELS[i]} style={{ width: total ? `${(n / total) * 100}%` : 0, background: LEVEL_COLORS[i] }} />
              ))}
            </div>
            <div className="grid grid-cols-6 gap-1">
              {LEVELS.map((lv, i) => (
                <label key={lv} className="flex flex-col items-center gap-1 text-[11px] text-[#6B6779]">
                  <input
                    type="number"
                    min={0}
                    value={levels[i]}
                    onChange={(e) => setLevels(levels.map((v, j) => (j === i ? Math.max(0, Number(e.target.value) || 0) : v)))}
                    aria-label={`${lv} 문제 수`}
                    className="h-10 w-full min-w-0 rounded-[10px] text-center text-[15px] font-bold outline-none"
                    style={{ ...field, borderRadius: 10, fontFamily: HY.display, color: HY.ink, borderTop: `3px solid ${LEVEL_COLORS[i]}` }}
                  />
                  {lv}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className={label}>문제 형식</span>
            {['객관식', '단답형', '서술형'].map((f) => (
              <label key={f} className="flex min-h-11 items-center gap-2.5 text-[14px]">
                <input
                  type="checkbox"
                  checked={formats.has(f)}
                  onChange={() => setFormats(toggleSet(formats, f))}
                  className="h-[18px] w-[18px]"
                  style={{ accentColor: HY.link }}
                />
                {f}
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <span className={label}>받는 대상</span>
            <div className="flex gap-2">
              {TARGETS.map((t) => (
                <button key={t} type="button" onClick={() => setTarget(t)} className="h-11 flex-1 rounded-[10px] text-[14px]" style={t === target ? toggleOn : toggleOff}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex min-h-[52px] flex-wrap items-center gap-2 px-3 py-2" style={field}>
              {chips.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChips(chips.filter((x) => x !== c))}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium"
                  style={{ ...softChip, color: '#005A72', backgroundColor: '#CFF3FB' }}
                >
                  {c} ✕
                </button>
              ))}
              <input
                value={chipText}
                onChange={(e) => setChipText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && chipText.trim() && !e.nativeEvent.isComposing) {
                    if (!chips.includes(chipText.trim())) setChips([...chips, chipText.trim()])
                    setChipText('')
                  }
                }}
                placeholder={`${target === '학생' ? '학생' : '반'} 이름 검색`}
                aria-label="받는 대상 검색"
                className="min-w-[90px] flex-1 border-none bg-transparent text-[14px] outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={!total}
            className="mt-auto h-[52px] rounded-[14px] text-[16px] font-bold disabled:opacity-50"
            style={{ ...accentTile, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 3px 0 rgba(0,0,0,0.35), 0 12px 22px rgba(23,22,28,0.18)' }}
          >
            자동 출제
          </button>
        </section>

        <section aria-label="미리보기" className="flex min-w-0 flex-[2_1_420px] flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <h2 className="m-0 text-[16px] font-bold">미리보기</h2>
            <div className="flex gap-2">
              <button type="button" className="h-11 rounded-xl px-4 text-[14px]" style={toggleOff}>앱으로 보내기</button>
              <button type="button" onClick={() => window.print()} className="h-11 rounded-xl px-4 text-[14px] text-white" style={{ ...darkTile, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #000000, 0 8px 16px rgba(23,22,28,0.22)' }}>
                PDF 출력
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-md border border-[#E3E1EC] bg-white px-[30px] py-7" style={{ boxShadow: '0 18px 40px rgba(23,22,28,0.08)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#17161C] px-3.5 py-1.5 text-[13px] font-bold">{subject} 예상문제</span>
                <span className="rounded-lg border border-[#17161C] px-3 py-1.5 text-[12px]">{firstUnit ?? '단원'} - 1회</span>
                <span className="text-[12px]">
                  {title} · {date.replace(/-/g, '.')}
                </span>
              </div>
              <div role="img" aria-label="답안 입력용 QR 코드 자리" className="flex h-14 w-14 items-center justify-center border border-[#17161C] text-[11px]" style={{ fontFamily: HY.display }}>
                QR
              </div>
            </div>
            <div className="h-px bg-[#17161C]" />
            {preview.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-[#6B6779]">단원과 조건을 고른 뒤 ‘자동 출제’를 누르세요.</div>
            ) : (
              <div className="grid grid-cols-2">
                {[preview.slice(0, half), preview.slice(half)].map((col, ci) => (
                  <div key={ci} className={`flex flex-col gap-10 py-3 ${ci === 0 ? 'border-r border-[#BDB9CC] pr-[18px]' : 'pl-[18px]'}`}>
                    {col.map((p) => (
                      <div key={p.no} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[14px] font-bold">
                            {p.no} <span className="ml-1 text-[11px] font-normal text-[#6B6779]">{p.level}</span>
                          </span>
                          <button type="button" className="h-11 rounded-lg px-2.5 text-[12px]" style={softChip}>
                            바꾸기
                          </button>
                        </div>
                        <span className="text-[13px] leading-[1.6] text-[#6B6779]">[문제 글과 수식]</span>
                        <span className="text-[12px] text-[#6B6779]">① ② ③ ④ ⑤</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between border-t border-[#E3E1EC] pt-2.5 text-[11px] text-[#6B6779]">
              <span />
              <span>1</span>
              <span>하이퍼 영수 전문학원</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
