import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import 'katex/dist/katex.min.css'
import katexCss from 'katex/dist/katex.min.css?inline'
import { HyperTopBar } from '../../components/HyperTopBar'
import { HY, accentTile, darkTile, field, panel, softChip, stepOff, toggleOff, toggleOn } from '../../components/hyperUi'
import { ODAP_BANK_PATH } from '../../components/Sidebar'
import { fetchStudents } from '../../lib/db/repository'
import { CM2_UNITS, LEVELS, fixPercents, generate as generatePaper, splitChoices, swap, type BankData, type BankProblem } from '../../lib/questionBank'
import { getSupabase } from '../../lib/supabase'
import { buildWorksheetHtml, mathHtml } from '../../lib/worksheetPrint'

export { LEVELS }
const SUBJECTS = ['중1', '중2', '중3', '공통수학2', '대수', '미적분1']
const LEVEL_COLORS = ['#D6F5FC', '#A9E8F7', '#5CD6F2', '#00B0D6', '#006E8A', '#00303D']
const TARGETS = ['학생', '반', '학년 전체'] as const

const label = 'text-[13px] text-[#6B6779]'

/** 문제은행 읽기(api/question-bank.ts, 강사 로그인 토큰 필요) */
async function loadBank(): Promise<BankData> {
  const { data } = await getSupabase().auth.getSession()
  const r = await fetch('/api/question-bank', { headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` } })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(body.message ?? `문제은행을 읽지 못했습니다(${r.status}).`)
  return body as BankData
}

type Node = { key: string; name: string; typeIds: string[]; children: Node[] }

export function TeacherWorksheetPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [title, setTitle] = useState('일일 테스트')
  const [date, setDate] = useState(today)
  const [subject, setSubject] = useState('공통수학2')
  const [open, setOpen] = useState<Set<string>>(new Set(['05']))
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [count, setCount] = useState(20)
  // shortcut: 기본 난이도 비율은 임시값(원장 확정 전)
  const [levels, setLevels] = useState<number[]>([10, 20, 30, 25, 10, 5])
  const [formats, setFormats] = useState<Set<string>>(new Set(['객관식', '단답형', '서술형']))
  const [target, setTarget] = useState<(typeof TARGETS)[number]>('반')
  const [chips, setChips] = useState<string[]>([])
  const [chipText, setChipText] = useState('')
  const [preview, setPreview] = useState<BankProblem[]>([])
  const [notes, setNotes] = useState<string[]>([])
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6))
  const [right, setRight] = useState('')
  const [bank, setBank] = useState<BankData | null>(null)
  const [bankError, setBankError] = useState('')
  const [names, setNames] = useState<Record<(typeof TARGETS)[number], string[]>>({ 학생: [], 반: [], '학년 전체': [] })

  useEffect(() => {
    loadBank().then(setBank, (e: Error) => setBankError(e.message))
    fetchStudents().then(
      (ss) => {
        const act = ss.filter((s) => s.status !== '퇴원')
        const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'))
        setNames({ 학생: uniq(act.map((s) => s.name)), 반: uniq(act.map((s) => (s.className ? `${s.grade} ${s.className}` : ''))), '학년 전체': uniq(act.map((s) => s.grade)) })
      },
      () => {},
    )
  }, [])

  const total = levels.reduce((a, b) => a + b, 0)
  const pool = useMemo(() => bank?.problems ?? [], [bank])
  const countOf = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of pool) m.set(p.typeId, (m.get(p.typeId) ?? 0) + 1)
    return m
  }, [pool])
  // 단원 나무: 공통수학2 > 대단원 > 소단원 > 주제유형
  const tree = useMemo<Node[]>(() => {
    if (subject !== '공통수학2' || !bank) return []
    return CM2_UNITS.map((u) => {
      const subs = u.subs.map(([no, name]) => {
        const ts = bank.types.filter((t) => t.sub === no)
        return { key: no, name: `${no} ${name}`, typeIds: ts.map((t) => t.id), children: ts.map((t) => ({ key: t.id, name: t.name, typeIds: [t.id], children: [] })) }
      })
      return { key: u.no, name: `${u.no} ${u.name}`, typeIds: subs.flatMap((s) => s.typeIds), children: subs }
    })
  }, [bank, subject])
  const pickedIds = useMemo(() => tree.flatMap((n) => n.typeIds).filter((id) => picked.has(id)), [tree, picked])
  const pickedCount = pickedIds.reduce((a, id) => a + (countOf.get(id) ?? 0), 0)
  const firstUnit = tree.find((u) => u.typeIds.some((id) => picked.has(id)))?.name.replace(/^\d+ /, '')
  const rightLabel = right || `${firstUnit ?? '단원'} - 1회`
  const typeName = useMemo(() => new Map((bank?.types ?? []).map((t) => [t.id, t.name])), [bank])

  const toggleSet = (s: Set<string>, v: string) => {
    const n = new Set(s)
    if (n.has(v)) n.delete(v)
    else n.add(v)
    return n
  }
  const toggleNode = (n: Node) => {
    const all = n.typeIds.every((id) => picked.has(id))
    const next = new Set(picked)
    n.typeIds.forEach((id) => (all ? next.delete(id) : next.add(id)))
    setPicked(next)
  }

  const generate = () => {
    const pct = fixPercents(levels)
    if (total !== 100) setLevels(pct)
    const g = generatePaper(pool, pickedIds, count, pct, formats, seed)
    const msg: string[] = []
    if (g.substituted) msg.push(`난이도 부족 ${g.substituted}개, 인접 난이도로 대체`)
    if (g.shortage) msg.push(`출제 가능한 문제가 부족해 ${g.shortage}개 덜 출제(${g.items.length}/${count})`)
    setPreview(g.items)
    setNotes(msg)
  }

  const swapAt = (i: number) => {
    const r = swap(pool, preview, i, seed + i + Date.now())
    if (!r) return setNotes([`${i + 1}번: 같은 유형에 바꿀 문제가 없습니다`])
    setPreview(preview.map((p, j) => (j === i ? r.item : p)))
    setNotes(r.near ? [`${i + 1}번: 같은 난이도에 남은 문제가 없어 ${LEVELS[r.item.level]}(인접 난이도)로 바꿨습니다`] : [])
  }

  const printPdf = () => {
    const who = chips.join('·')
    const fileName = [title, who, date].filter(Boolean).join('_')
    const html = buildWorksheetHtml(
      { left: `${subject} 예상문제`, right: rightLabel, meta: [title, date.replace(/-/g, '.'), who].filter(Boolean).join(' · '), fileName, items: preview },
      { katexCss, base: `${location.origin}/` },
    )
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    window.open(`${url}#print`, '_blank')
  }

  const renderNode = (n: Node, depth: number) => {
    const all = n.typeIds.length > 0 && n.typeIds.every((id) => picked.has(id))
    const some = !all && n.typeIds.some((id) => picked.has(id))
    const cnt = n.typeIds.reduce((a, id) => a + (countOf.get(id) ?? 0), 0)
    return (
      <div key={n.key} className="flex flex-col gap-1">
        <div className="flex min-h-6 items-center gap-2.5 rounded-[10px] py-2 pr-2" style={{ paddingLeft: 8 + depth * 18, background: all ? '#E3F8FD' : 'transparent' }}>
          {n.children.length ? (
            <button type="button" onClick={() => setOpen(toggleSet(open, n.key))} aria-label={`${n.name} 펼치기`} className="w-4 text-left">
              {open.has(n.key) ? '▾' : '▸'}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <input
            type="checkbox"
            checked={all}
            ref={(el) => {
              if (el) el.indeterminate = some
            }}
            onChange={() => toggleNode(n)}
            aria-label={n.name}
            className="h-[18px] w-[18px] flex-none"
            style={{ accentColor: HY.link }}
          />
          <span className={`min-w-0 flex-1 ${depth === 0 ? 'font-bold' : ''} ${cnt ? '' : 'text-[#6B6779]'}`}>{n.name}</span>
          <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ ...softChip, color: cnt ? '#005A72' : '#6B6779' }}>
            {cnt}
          </span>
        </div>
        {open.has(n.key) && n.children.map((c) => renderNode(c, depth + 1))}
      </div>
    )
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
            {subject !== '공통수학2' && <div className="px-2 py-2.5 text-[#6B6779]">단원 목록 준비 중</div>}
            {subject === '공통수학2' && !bank && <div className="px-2 py-2.5 text-[#6B6779]">{bankError || '문제은행 불러오는 중…'}</div>}
            {tree.map((u) => renderNode(u, 0))}
          </div>
          <div className="mt-auto rounded-xl p-3.5 text-[12px] leading-[1.6] text-[#6B6779]" style={{ background: HY.bg }}>
            고른 단원의 검수 완료 문제
            <br />
            <span className="text-[22px] font-bold" style={{ fontFamily: HY.display, color: HY.ink }}>{pickedCount}</span> 문제
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
              <span className={label}>난이도 비율(%)</span>
              <span className="text-[12px]" style={{ color: total === 100 ? '#6B6779' : '#C2410C' }}>
                합계 <b className="text-[15px]" style={{ fontFamily: HY.display, color: total === 100 ? HY.ink : '#C2410C' }}>{total}</b>%
                {total !== 100 && ' · 출제할 때 100%로 자동 보정'}
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
                    aria-label={`${lv} 비율(%)`}
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
              <datalist id="worksheet-targets">
                {names[target].map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <input
                list="worksheet-targets"
                value={chipText}
                onChange={(e) => setChipText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && chipText.trim() && !e.nativeEvent.isComposing) {
                    if (!chips.includes(chipText.trim())) setChips([...chips, chipText.trim()])
                    setChipText('')
                  }
                }}
                placeholder={`${target === '학생' ? '학생' : target === '반' ? '반' : '학년'} 이름 검색`}
                aria-label="받는 대상 검색"
                className="min-w-[90px] flex-1 border-none bg-transparent text-[14px] outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={generate}
            disabled={!pickedIds.length || !count}
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
              <button type="button" onClick={printPdf} disabled={!preview.length} className="h-11 rounded-xl px-4 text-[14px] text-white" style={{ ...darkTile, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #000000, 0 8px 16px rgba(23,22,28,0.22)' }}>
                PDF 출력
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-md border border-[#E3E1EC] bg-white px-[30px] py-7" style={{ boxShadow: '0 18px 40px rgba(23,22,28,0.08)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#17161C] px-3.5 py-1.5 text-[13px] font-bold">{subject} 예상문제</span>
                <input
                  value={rightLabel}
                  onChange={(e) => setRight(e.target.value)}
                  aria-label="머릿말 오른쪽 칸"
                  className="rounded-lg border border-[#17161C] px-3 py-1.5 text-[12px] outline-none"
                  style={{ width: `${Math.max(8, rightLabel.length + 2)}ch` }}
                />
                <span className="text-[12px]">
                  {title} · {date.replace(/-/g, '.')}
                  {chips.length > 0 && ` · ${chips.join('·')}`}
                </span>
              </div>
              <div role="img" aria-label="답안 입력용 QR 코드 자리" className="flex h-14 w-14 items-center justify-center border border-[#17161C] text-[11px]" style={{ fontFamily: HY.display }}>
                QR
              </div>
            </div>
            <div className="h-px bg-[#17161C]" />
            {(notes.length > 0 || preview.length > 0) && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#6B6779]">
                <span style={{ color: notes.length ? '#C2410C' : undefined }}>{notes.join(' · ')}</span>
                <label className="flex items-center gap-1.5">
                  난수
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value) || 0)}
                    aria-label="출제 난수(같은 값이면 같은 출제)"
                    className="w-24 rounded-md border border-[#E3E1EC] px-2 py-1 outline-none"
                  />
                </label>
              </div>
            )}
            {preview.length === 0 ? (
              <div className="py-16 text-center text-[13px] text-[#6B6779]">단원과 조건을 고른 뒤 ‘자동 출제’를 누르세요.</div>
            ) : (
              <div className="grid grid-cols-2">
                {[preview.slice(0, half), preview.slice(half)].map((col, ci) => (
                  <div key={ci} className={`flex flex-col gap-10 py-3 ${ci === 0 ? 'border-r border-[#BDB9CC] pr-[18px]' : 'pl-[18px]'}`}>
                    {col.map((p, k) => {
                      const i = ci * half + k
                      const { stem, choices } = splitChoices(p.text)
                      return (
                        <div key={p.id} className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-bold">
                              {i + 1} <span className="ml-1 text-[11px] font-normal text-[#6B6779]">{LEVELS[p.level]} · {typeName.get(p.typeId)}</span>
                            </span>
                            <button type="button" onClick={() => swapAt(i)} className="h-11 rounded-lg px-2.5 text-[12px]" style={softChip}>
                              바꾸기
                            </button>
                          </div>
                          <span className="text-[13px] leading-[1.6]" dangerouslySetInnerHTML={{ __html: mathHtml(stem) }} />
                          {p.image && <img src={p.image} alt="" className="max-w-full" />}
                          {choices.length > 0 && (
                            <div className="flex flex-col text-[12px]">
                              {choices.map((c, j) => (
                                <div key={j} className="flex">
                                  <span className="w-5 flex-none">{'①②③④⑤'[j]}</span>
                                  <span dangerouslySetInnerHTML={{ __html: mathHtml(c) }} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
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
