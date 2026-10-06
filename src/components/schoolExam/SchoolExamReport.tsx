import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  SCHOOL_CAUSES,
  SCHOOL_CAUSE_COLOR,
  SCHOOL_CAUSE_ICON,
  SCHOOL_CAUSE_LABEL,
  SCHOOL_DIFFICULTY_COLOR,
  SUMMARY_THRESHOLD,
  buildSchoolReportView,
  causeCounts,
  estimateCardHeight,
  paginateCards,
  splitForSummary,
  type SchoolExam,
  type SchoolExamItem,
  type SchoolImage,
  type SchoolReportData,
  type SchoolWrongItem,
} from '../../utils/schoolExamReport'
import { IsoBars, Pie3D, ScoreRing } from './SchoolExamCharts'
import '../../styles/schoolExamReport.css'

const PX_PER_MM = 96 / 25.4
const PAGE_W_PX = 210 * PX_PER_MM
const CARD_GAP_MM = 3.6
/** 카드 영역 높이(mm): 쪽 297 − 위 여백(첫 쪽 34 / 이후 25) − 아래 20 − 안전 1 */
const FIRST_CAP_MM = 297 - 34 - 20 - 1
const LATER_CAP_MM = 297 - 25 - 20 - 1
const MAX_CARDS_PER_PAGE = 4

const dateText = (iso: string) => iso.replaceAll('-', '. ') + '.'
const fmtPts = (p: number) => `${Number(p.toFixed(1))}`

type ImageMap = Map<number, SchoolImage>

export type SchoolImageLoader = (exam: SchoolExam, nos: number[]) => Promise<SchoolImage[]>

type Props = {
  student: { name: string }
  reports: SchoolReportData[]
  loadImages: SchoolImageLoader
}

/** 학부모·학생·강사 열람용 — 발송된 학교 시험 리포트 (시험 선택, 전체/요약 보기, PDF 저장) */
export function SchoolExamReport({ student, reports, loadImages }: Props) {
  const sorted = useMemo(
    () => [...reports].sort((a, b) => b.exam.examDate.localeCompare(a.exam.examDate)),
    [reports],
  )
  const [selectedId, setSelectedId] = useState(sorted[0]?.exam.id ?? '')
  const data = sorted.find((r) => r.exam.id === selectedId) ?? sorted[0]
  const [mode, setMode] = useState<'full' | 'summary'>('full')
  const [loaded, setLoaded] = useState<{ examId: string; images: ImageMap } | null>(null)

  const examId = data?.exam.id
  const visible = data?.exam.imagesVisible === true
  useEffect(() => {
    if (!data || !visible) return
    let cancelled = false
    const nos = Array.from(new Set([...data.result.wrongItems.map((w) => w.no), ...data.exam.topProblems.slice(0, 1).map((t) => t.no)]))
    void loadImages(data.exam, nos).then((list) => {
      if (!cancelled) setLoaded({ examId: data.exam.id, images: new Map(list.map((i) => [i.no, i])) })
    })
    return () => {
      cancelled = true
    }
    // data 객체는 매 렌더 새로 만들어질 수 있어 id 로만 다시 불러온다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, visible, loadImages])

  if (!data) return null
  const images = loaded?.examId === data.exam.id ? loaded.images : null
  return (
    <SchoolExamReportView
      student={student}
      sorted={sorted}
      data={data}
      images={images}
      mode={mode}
      onMode={setMode}
      onSelect={setSelectedId}
    />
  )
}

type ViewProps = {
  student: { name: string }
  sorted: SchoolReportData[]
  data: SchoolReportData
  /** null = 아직 없음/비공개 → "문제 이미지 준비 중" */
  images: ImageMap | null
  mode: 'full' | 'summary'
  onMode: (mode: 'full' | 'summary') => void
  onSelect: (examId: string) => void
}

/** 화면(휴대폰: 쪽을 폭에 맞춰 축소) + 인쇄(A4) 공용 표시 컴포넌트 — 데이터 접근 없음 */
export function SchoolExamReportView({ student, sorted, data, images, mode, onMode, onSelect }: ViewProps) {
  const { exam, result } = data
  const view = useMemo(() => buildSchoolReportView(data), [data])
  const itemByNo = useMemo(() => new Map(exam.items.map((i) => [i.no, i])), [exam.items])
  const wrongSorted = useMemo(
    () => [...result.wrongItems].filter((w) => itemByNo.has(w.no)).sort((a, b) => a.no - b.no),
    [itemByNo, result.wrongItems],
  )
  const canSummarize = wrongSorted.length > SUMMARY_THRESHOLD
  const effectiveMode = canSummarize ? mode : 'full'
  const { cards, rest } = useMemo(
    () => (effectiveMode === 'summary' ? splitForSummary(wrongSorted, exam.items) : { cards: wrongSorted, rest: [] as SchoolWrongItem[] }),
    [effectiveMode, exam.items, wrongSorted],
  )
  const cardCount = cards.length
  const hasRest = rest.length > 0
  const flowCount = cardCount + (hasRest ? 1 : 0)

  // ── 쪽 나누기: 숨은 영역에 같은 카드를 그려 실제 높이를 잰 뒤 쪽에 채운다 ──
  const measureRef = useRef<HTMLDivElement>(null)
  const [heights, setHeights] = useState<{ cards: number[]; notes: number } | null>(null)
  const measureKey = `${exam.id}:${effectiveMode}:${images ? images.size : -1}`
  const measure = useCallback(() => {
    const root = measureRef.current
    if (!root) return
    const toMm = (el: Element) => el.getBoundingClientRect().height / PX_PER_MM
    const cardEls = Array.from(root.querySelectorAll('[data-flow]'))
    const notesEl = root.querySelector('[data-notes]')
    if (!notesEl) return
    const next = { cards: cardEls.map(toMm), notes: toMm(notesEl) }
    setHeights((prev) =>
      prev && prev.notes === next.notes && prev.cards.length === next.cards.length && prev.cards.every((h, i) => h === next.cards[i])
        ? prev
        : next,
    )
  }, [])
  useLayoutEffect(() => {
    measure()
    void document.fonts?.ready.then(measure)
  }, [measure, measureKey, flowCount, result.teacherComment, result.nextPlan])

  const imageDims = (no: number) => images?.get(no)
  const fallbackHeights = useMemo(
    () => cards.map((w) => estimateCardHeight(imageDims(w.no))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards, images],
  )
  const cardHeights = useMemo(() => {
    const base = heights && heights.cards.length === flowCount ? heights.cards : [...fallbackHeights, ...(hasRest ? [30] : [])]
    return base
  }, [fallbackHeights, flowCount, hasRest, heights])
  const notesHeight = heights?.notes ?? 60
  const pages = useMemo(
    () =>
      paginateCards(cardHeights, notesHeight, {
        firstCap: FIRST_CAP_MM,
        laterCap: LATER_CAP_MM,
        gap: CARD_GAP_MM,
        maxPerPage: MAX_CARDS_PER_PAGE,
      }),
    [cardHeights, notesHeight],
  )

  // ── 화면 폭에 맞춘 축소 ──
  const viewportRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const update = () => setZoom(Math.min(1, el.clientWidth / PAGE_W_PX) || 1)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const print = () => {
    document.body.classList.add('se-printing')
    const done = () => {
      document.body.classList.remove('se-printing')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }

  const title = [exam.schoolName, exam.title].filter(Boolean).join(' ')
  const subtitle = [exam.grade, exam.rangeText, `${view.itemCount}문항`].filter(Boolean).join(' · ')
  const top = exam.topProblems[0]
  const topItem = top ? itemByNo.get(top.no) : undefined
  const topWrong = top ? view.wrongNos.has(top.no) : false
  const topImg = top ? images?.get(top.no) : undefined
  const counts = causeCounts(wrongSorted)
  const plan = result.nextPlan.filter((p) => p.trim())
  const sign = [exam.subject, exam.author].filter(Boolean).join(' ')
  const lastIdx = pages.length - 1
  const wrongBadge = (no: number) => itemByNo.get(no)

  const notes = (
    <div className="se-cm">
      <div className="se-note-card">
        <h2 className="se-h2"><span className="se-ic">✎</span>선생님 총평</h2>
        {result.teacherComment.trim() || '—'}
        {sign && <div className="se-sign">{sign}{exam.author ? ' 선생님' : ' 담당'}</div>}
      </div>
      <div className="se-note-card plan">
        <h2 className="se-h2"><span className="se-ic">➜</span>다음 시험 대비 계획</h2>
        <div className="se-plan">
          {plan.length > 0 ? <ol>{plan.map((p, i) => <li key={i}>{p}</li>)}</ol> : '—'}
        </div>
      </div>
    </div>
  )

  const restTable = hasRest && (
    <div className="se-rest">
      <h3>그 밖의 오답 {rest.length}문항</h3>
      <table>
        <thead><tr><th>번호</th><th>난이도</th><th>단원</th><th>오답 원인</th></tr></thead>
        <tbody>
          {rest.map((w) => {
            const it = wrongBadge(w.no)
            return (
              <tr key={w.no}>
                <td>{w.no}번</td>
                <td>{it?.difficulty}</td>
                <td>{it?.unit}</td>
                <td>{w.cause ? `${SCHOOL_CAUSE_ICON[w.cause]} ${SCHOOL_CAUSE_LABEL[w.cause]}` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const foot = <div className="se-foot"><span>하이퍼 영수 전문학원</span><span>24시간 학습을 설계하다</span></div>
  const flowNode = (idx: number) =>
    idx < cardCount ? (
      <WrongCard key={cards[idx].no} wrong={cards[idx]} item={itemByNo.get(cards[idx].no)} image={images?.get(cards[idx].no)} />
    ) : (
      <div key="rest">{restTable}</div>
    )
  const detailTitle = `${student.name} · ${title} ${exam.subject}`

  return (
    <div className="se-root">
      <div className="se-toolbar se-no-print">
        {sorted.length > 1 ? (
          <select value={exam.id} onChange={(e) => onSelect(e.target.value)} aria-label="시험 선택">
            {sorted.map((r) => (
              <option key={r.exam.id} value={r.exam.id}>
                {dateText(r.exam.examDate)} {[r.exam.schoolName, r.exam.title].filter(Boolean).join(' ')} {r.exam.subject}
              </option>
            ))}
          </select>
        ) : null}
        {canSummarize && (
          <div className="se-seg" role="group" aria-label="오답 보기 방식">
            <button type="button" aria-pressed={effectiveMode === 'full'} onClick={() => onMode('full')}>전체 보기</button>
            <button type="button" aria-pressed={effectiveMode === 'summary'} onClick={() => onMode('summary')}>요약 보기</button>
          </div>
        )}
        <button type="button" className="se-btn" onClick={print}>PDF 저장</button>
      </div>

      <div className="se-viewport" ref={viewportRef} style={{ height: `${Math.round(zoom * (pages.length + 1) * (297 * PX_PER_MM + 12))}px` }}>
        <div className="se-print-root">
          <div className="se-pages" style={{ zoom }}>
            {/* ───── 1쪽 ───── */}
            <section className="se-page">
              <div className="se-hero">
                <div className="se-brand"><b>HYPER</b>ACADEMY · {exam.schoolName ? '학교 시험 분석 리포트' : '시험 분석 리포트'}</div>
                <h1>{title} · {exam.subject}</h1>
                <div className="se-sub">{subtitle}</div>
                <div className="se-who">
                  <span>학생</span><b>{student.name}</b>
                  {exam.author && <><span>출제</span><b>{exam.author} 선생님</b></>}
                  <span>시험일</span><b>{dateText(exam.examDate)}</b>
                </div>
                <div className="se-ring"><ScoreRing score={view.score} total={Math.round(view.totalPoints)} /><small>내 점수</small></div>
              </div>
              <div className="se-stats">
                <div className="se-stat"><small>맞힌 문항</small><b style={{ color: '#5B348A' }}>{view.correctCount}<span> / {view.itemCount}</span></b><i>정답률 {view.accuracy}%</i></div>
                <div className="se-stat"><small>틀린 문항</small><b style={{ color: '#E35D6A' }}>{view.wrongCount}<span> 문항</span></b><i>-{view.lostPoints}점</i></div>
                <div className="se-stat"><small>시험 난이도</small><b style={{ color: '#C98A12' }}>{view.levelLabel}<span> · {view.levelNote}</span></b><i>상·최상 {view.hardCount}문항 ({view.hardPercent}%)</i></div>
                <div className="se-stat"><small>최다 출제 단원</small><b style={{ fontSize: '15pt', marginTop: '2mm', color: '#8B5CC7' }}>{view.topUnit?.name ?? '—'}</b><i>{view.topUnit ? `배점 ${view.topUnit.percent}%` : ''}</i></div>
              </div>
              <div className="se-sec">
                <div className="se-grid2">
                  <div className="se-card">
                    <h2 className="se-h2"><span className="se-ic">▤</span>난이도별 결과<small>맞힌 문항 / 전체</small></h2>
                    <IsoBars stats={view.difficulties} />
                    <div className="se-legend"><span><i style={{ background: '#5B348A' }} />맞힘</span><span><i style={{ background: '#E35D6A' }} />틀림</span></div>
                    {view.barsTip && <div className="se-tip" dangerouslySetInnerHTML={{ __html: view.barsTip }} />}
                  </div>
                  <div className="se-card">
                    <h2 className="se-h2"><span className="se-ic">◔</span>단원별 출제 비중<small>배점 기준</small></h2>
                    <Pie3D units={view.units} />
                    {view.pieTip && <div className="se-tip" dangerouslySetInnerHTML={{ __html: view.pieTip }} />}
                  </div>
                </div>
                {top && topItem && (
                  <div className="se-top1">
                    <h2 className="se-h2"><span className="se-ic">★</span>1등급 완성 문제<span className="se-crown">이번 시험 최고난도 · {top.no}번</span></h2>
                    <div className="se-t1">
                      <div>
                        <Capture no={top.no} image={topImg} />
                        <p className="se-t1-note">{student.name} 학생 <b style={{ color: '#FFE29A' }}>{topWrong ? '오답' : '정답'}</b> · 정답 {topItem.answer}</p>
                      </div>
                      <div className="se-t1-body">
                        {top.why && <><h4>왜 어려운가</h4>{top.why}</>}
                        {top.idea && <><h4>핵심 아이디어</h4>{top.idea}</>}
                        {top.steps.length > 0 && <><h4>풀이</h4><ol>{top.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {foot}
            </section>

            {/* ───── 2쪽~ 틀린 문제 정밀 분석 ───── */}
            {pages.map((pg, k) => (
              <section className="se-page" key={k}>
                {pg.first ? (
                  <>
                    <div className="se-p2head"><div><p>{detailTitle}</p><h1>틀린 문제 <span>정밀 분석</span></h1></div></div>
                    <div className="se-chips">
                      {SCHOOL_CAUSES.map((c) => <span className="se-chip" key={c}>{SCHOOL_CAUSE_ICON[c]} {SCHOOL_CAUSE_LABEL[c]} {counts[c]}</span>)}
                    </div>
                  </>
                ) : (
                  <div className="se-p2head"><div><p>{student.name} · 틀린 문제 정밀 분석 ({k + 1}/{pages.length})</p></div></div>
                )}
                <div className={`se-body ${pg.first ? 'first' : 'later'}`}>
                  {pg.cardIdx.map(flowNode)}
                  {pg.notes && notes}
                  {k === lastIdx && cardCount === 0 && !hasRest && <p style={{ order: -1, fontSize: '9pt', color: '#7A7387' }}>이번 시험에서 틀린 문항이 없습니다.</p>}
                </div>
                {foot}
              </section>
            ))}
          </div>
        </div>
      </div>

      {/* 높이 측정용 숨은 영역 (화면·인쇄에 나오지 않음) */}
      <div className="se-measure" ref={measureRef} aria-hidden>
        {Array.from({ length: flowCount }, (_, i) => <div key={i} data-flow>{flowNode(i)}</div>)}
        <div data-notes>{notes}</div>
      </div>
    </div>
  )
}

function Capture({ no, image }: { no: number; image: SchoolImage | undefined }) {
  if (!image) {
    return <div className="se-cap"><div className="se-cap-wait">문제 이미지 준비 중</div><div className="se-cap-tag">{no}번</div></div>
  }
  return (
    <div className="se-cap">
      <div className="se-cap-paper">
        <img src={`data:image/jpeg;base64,${image.data}`} width={image.width} height={image.height} alt={`${no}번 문제`} />
      </div>
      <div className="se-cap-tag">시험지 캡처 · {no}번</div>
    </div>
  )
}

function WrongCard({ wrong, item, image }: { wrong: SchoolWrongItem; item: SchoolExamItem | undefined; image: SchoolImage | undefined }) {
  if (!item) return null
  const cause = wrong.cause || null
  const color = cause ? SCHOOL_CAUSE_COLOR[cause] : '#7A7387'
  return (
    <div className="se-wc">
      <Capture no={item.no} image={image} />
      <div>
        <div className="se-wc-row">
          <span className="se-badge" style={{ background: SCHOOL_DIFFICULTY_COLOR[item.difficulty] }}>{item.difficulty}</span>
          <span className="se-unit">{item.unit}</span>
          <span className="se-pts">-{fmtPts(item.points)}점</span>
        </div>
        <div className="se-wc-type"><small>문제 유형</small>{item.type}{item.answer && <span className="se-ans">정답 {item.answer}</span>}</div>
        <div className="se-cause" style={{ ['--c' as string]: color }}>
          <span className="se-ci">{cause ? SCHOOL_CAUSE_ICON[cause] : '•'}</span>
          <div><small>오답 원인</small><b>{cause ? SCHOOL_CAUSE_LABEL[cause] : '미지정'}</b></div>
        </div>
        {wrong.note.trim() && <p className="se-wc-note"><b>강사 분석</b>{wrong.note}</p>}
      </div>
    </div>
  )
}
