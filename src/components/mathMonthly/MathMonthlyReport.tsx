import { useEffect, useMemo, useState } from 'react'
import type { MonthlyEvaluationRecord } from '../../types/records'
import type { Student } from '../../types/student'
import { useData } from '../../hooks/useData'
import type { MathImage } from '../../lib/db/mathMonthlyRepo'
import { buildMathAttitude, type MathAttitude } from '../../utils/mathMonthlyAttitude'
import {
  DIAGNOSIS_LABEL,
  MATH_CAUSE_LABEL,
  MATH_DIFFICULTY_LABEL,
  buildMathTrend,
  buildReportView,
  buildSummaryText,
  unitInsight,
  previousMonthPoint,
  type MathMonthlyReportData,
  type MathWrongItem,
} from '../../utils/mathMonthlyReport'
import { CauseDonut, CauseLegend, Gauge, TrendChart, UnitRadar } from './MathMonthlyCharts'
import '../../styles/mathMonthlyReport.css'

type Props = {
  student: Student
  reports: MathMonthlyReportData[]
  evaluations: MonthlyEvaluationRecord[]
  /** 틀린 문제 사진 불러오기 (학부모: get_parent_math_monthly_images). 없으면 사진 없이 텍스트만 표시 */
  loadImages?: (examId: string, nos: number[]) => Promise<MathImage[]>
}

type ImageMap = Map<number, MathImage>
type WrongMode = 'full' | 'summary'

const CARDS_PER_PAGE = 3
/** 월말평가: 틀린 문항이 이 개수를 넘으면 전체/요약 보기 선택, 요약 보기는 사진 카드 N개만 */
const SUMMARY_THRESHOLD = 6
const SUMMARY_CARD_COUNT = 3
const DIFF_RANK = { basic: 0, middle: 1, high: 2, highest: 3 } as const

/** 요약 보기: 난이도 높은 오답 N개(같으면 번호순)는 카드, 나머지는 한 줄 목록 */
function splitWrong(wrong: MathWrongItem[], difficultyOf: (no: number) => keyof typeof DIFF_RANK) {
  const ordered = [...wrong].sort((a, b) => DIFF_RANK[difficultyOf(b.no)] - DIFF_RANK[difficultyOf(a.no)] || a.no - b.no)
  const cardNos = new Set(ordered.slice(0, SUMMARY_CARD_COUNT).map((w) => w.no))
  const byNo = (list: MathWrongItem[]) => [...list].sort((a, b) => a.no - b.no)
  return { cards: byNo(wrong.filter((w) => cardNos.has(w.no))), rest: byNo(wrong.filter((w) => !cardNos.has(w.no))) }
}

const dateText = (iso: string) => iso.replaceAll('-', '. ') + '.'
const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`)
const diffClass = (v: number) => (v >= 0 ? 'mm-up' : 'mm-dn')
const diagClass = { strength: 'good', normal: 'mid', weak: 'bad' } as const

/** 학부모·학생·강사 열람용 — 발송된 수학 월말평가 보고서 (월 선택, PDF 저장) */
export function MathMonthlyReport({ student, reports, evaluations, loadImages }: Props) {
  const sorted = useMemo(
    () => [...reports].sort((a, b) => b.exam.year * 12 + b.exam.month - (a.exam.year * 12 + a.exam.month)),
    [reports],
  )
  const [selectedId, setSelectedId] = useState(sorted[0]?.exam.id ?? '')
  const data = sorted.find((r) => r.exam.id === selectedId) ?? sorted[0]

  const [mode, setMode] = useState<WrongMode>('full')
  const [loaded, setLoaded] = useState<{ examId: string; images: ImageMap } | null>(null)
  const examId = data?.exam.id ?? ''
  const wrongNosKey = data ? data.result.wrongItems.map((w) => w.no).sort((a, b) => a - b).join(',') : ''
  useEffect(() => {
    if (!loadImages || !examId || !wrongNosKey) return
    let cancelled = false
    void loadImages(examId, wrongNosKey.split(',').map(Number)).then((list) => {
      if (!cancelled) setLoaded({ examId, images: new Map(list.map((i) => [i.no, i])) })
    })
    return () => {
      cancelled = true
    }
  }, [examId, wrongNosKey, loadImages])

  const { attendance, homework, homeworkTextbookEntries, dailyTests, studentDailyCare } = useData()
  const attitude = useMemo(
    () =>
      data
        ? buildMathAttitude({
            studentId: student.id,
            year: data.exam.year,
            month: data.exam.month,
            attendance,
            homework,
            homeworkTextbookEntries,
            dailyTests,
            studentDailyCare,
          })
        : null,
    [attendance, dailyTests, data, homework, homeworkTextbookEntries, student.id, studentDailyCare],
  )

  if (!data || !attitude) return null
  return (
    <MathMonthlyReportView
      student={student}
      sorted={sorted}
      data={data}
      attitude={attitude}
      evaluations={evaluations}
      images={loaded?.examId === data.exam.id ? loaded.images : null}
      mode={mode}
      onMode={setMode}
      onSelect={setSelectedId}
    />
  )
}

type ViewProps = {
  student: Pick<Student, 'name'>
  sorted: MathMonthlyReportData[]
  data: MathMonthlyReportData
  attitude: MathAttitude
  evaluations: MonthlyEvaluationRecord[]
  images?: ImageMap | null
  mode?: WrongMode
  onMode?: (mode: WrongMode) => void
  onSelect: (examId: string) => void
}

/** 화면(휴대폰 세로 카드) + 인쇄(A4 2쪽) 공용 표시 컴포넌트 — 데이터 접근 없음 */
export function MathMonthlyReportView({ student, sorted, data, attitude, evaluations, images = null, mode = 'full', onMode, onSelect }: ViewProps) {
  const { exam, result } = data
  const view = buildReportView(data)
  const showAvg = view.classAvg !== null
  const trend = buildMathTrend(evaluations, sorted, { year: exam.year, month: exam.month })
  const prev = previousMonthPoint(trend, { year: exam.year, month: exam.month })
  const first = trend[0]
  const scoreDiff = prev ? view.score - prev.score : null
  const avgDiff = view.classAvg ? Math.round((view.score - view.classAvg.avgScore) * 10) / 10 : null
  const unitRange = exam.units.length ? `${exam.units[0].name}${exam.units.length > 1 ? ` ~ ${exam.units[exam.units.length - 1].name}` : ''}` : ''
  const subtitle = [`${exam.year}년 ${exam.month}월`, exam.title, unitRange].filter(Boolean).join(' · ')
  const wrongCount = view.wrongNos.size
  const insight = unitInsight(view.units)
  const wrongUnitGroups = (() => {
    const map = new Map<string, number[]>()
    for (const u of exam.units) if (u.from === 0) map.set(u.name, [])
    for (const w of result.wrongItems) {
      const name = (w.unit || '').trim() || '단원 미분류'
      map.set(name, [...(map.get(name) ?? []), w.no])
    }
    return [...map.entries()].map(([name, nos]) => ({ name, nos: nos.sort((a, b) => a - b) })).sort((a, b) => b.nos.length - a.nos.length)
  })()
  const maxWrongInUnit = Math.max(1, ...wrongUnitGroups.map((g) => g.nos.length))
  const nextMonth = exam.month === 12 ? 1 : exam.month + 1
  const plan = result.nextPlan.filter((p) => p.content.trim())
  const hasComments = result.strengths.trim() || result.improvements.trim() || result.teacherComment.trim()
  const itemByNo = new Map(exam.items.map((i) => [i.no, i]))

  // 틀린 문제 분석 — 틀린 문항이 있을 때만 3쪽부터 추가
  const wrongSorted = [...result.wrongItems].sort((a, b) => a.no - b.no)
  const canSummarize = wrongSorted.length > SUMMARY_THRESHOLD
  const effectiveMode: WrongMode = canSummarize ? mode : 'full'
  const { cards, rest } =
    effectiveMode === 'summary'
      ? splitWrong(wrongSorted, (no) => itemByNo.get(no)?.difficulty ?? 'middle')
      : { cards: wrongSorted, rest: [] as MathWrongItem[] }
  const cardPages: MathWrongItem[][] = []
  for (let i = 0; i < cards.length; i += CARDS_PER_PAGE) cardPages.push(cards.slice(i, i + CARDS_PER_PAGE))
  const totalPages = 2 + cardPages.length

  const print = () => {
    document.body.classList.add('mm-printing')
    const done = () => {
      document.body.classList.remove('mm-printing')
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }

  return (
    <div className="mm-root">
      <div className="mm-toolbar mm-no-print">
        <select value={exam.id} onChange={(e) => onSelect(e.target.value)} aria-label="보고서 월 선택">
          {sorted.map((r) => (
            <option key={r.exam.id} value={r.exam.id}>
              {r.exam.year}년 {r.exam.month}월 수학 월말평가
            </option>
          ))}
        </select>
        {canSummarize && onMode && (
          <div className="mm-seg" role="group" aria-label="틀린 문제 보기 방식">
            <button type="button" aria-pressed={effectiveMode === 'full'} onClick={() => onMode('full')}>전체 보기</button>
            <button type="button" aria-pressed={effectiveMode === 'summary'} onClick={() => onMode('summary')}>요약 보기</button>
          </div>
        )}
        <button type="button" className="mm-btn" onClick={print}>PDF 저장</button>
      </div>

      <div className="mm-print-root">
        {/* ───── 1쪽 ───── */}
        <section className="mm-page">
          <div className="mm-pno">1 / {totalPages}</div>
          <div className="mm-band">
            <div className="mm-brand"><b>HYPER</b><span>ACADEMY</span></div>
            <div className="mm-title"><b>수학 월말평가 결과 보고서</b><span>{subtitle}</span></div>
            <div className="mm-pill">{exam.month}월</div>
          </div>
          <div className="mm-who">
            <span>학생<b>{student.name}</b></span>
            <span>학년<b>{exam.grade}</b></span>
            <span>반<b>{exam.className}</b></span>
            <span>평가일<b>{dateText(exam.examDate)}</b></span>
            {exam.teacherName && <span>담당<b>{exam.teacherName} 선생님</b></span>}
          </div>

          <h2 className="mm-h2">이번 달 결과 보기</h2>
          <div className={`mm-cards${showAvg ? '' : ' no-avg'}`}>
            <div className="mm-card">
              <div className="mm-sub">점수</div>
              <div className="mm-big">{view.score}<small>/ {view.total}</small></div>
              {scoreDiff !== null && prev ? (
                <span className={`mm-chip ${scoreDiff >= 0 ? 'up' : 'dn'}`}>
                  {scoreDiff > 0 ? '▲' : scoreDiff < 0 ? '▼' : '='} {Math.abs(scoreDiff)}점 (지난달 {prev.score})
                </span>
              ) : (
                <span className="mm-chip">지난달 기록 없음</span>
              )}
            </div>
            {showAvg && avgDiff !== null && view.classAvg && (
              <div className="mm-card">
                <div className="mm-sub">반 평균 대비</div>
                <div className="mm-big">{signed(avgDiff)}<small>점</small></div>
                <span className="mm-chip">반 평균 {Math.round(view.classAvg.avgScore)}점</span>
              </div>
            )}
            <div className="mm-card">
              <div className="mm-sub">정답 문항</div>
              <div className="mm-big">{view.correctCount}<small>/ {exam.items.length}</small></div>
              <span className="mm-chip">정답률 {Math.round((view.correctCount / exam.items.length) * 100)}%</span>
            </div>
            <div className="mm-card sum">
              <div className="mm-sub">종합 평가</div>
              <div className="mm-grade">
                {view.grade.label}
                <span className="mm-stars">{'★'.repeat(view.grade.stars)}{'☆'.repeat(5 - view.grade.stars)}</span>
              </div>
              <p>{buildSummaryText(view, trend, exam.month)}</p>
            </div>
          </div>

          <div className="mm-row2">
            <div className="mm-box">
              <h2 className="mm-h2">성적 추이<small>최근 6개월</small></h2>
              <div className="mm-chart">
                {trend.length > 0 && <TrendChart points={trend} showAvg={showAvg} />}
              </div>
              <div className="mm-legend">
                <span><i />{student.name}</span>
                {showAvg && <span><i className="d" />반 평균</span>}
              </div>
            </div>
            <div className="mm-box">
              <h2 className="mm-h2">월별 기록</h2>
              <table className="mm-t">
                <thead>
                  <tr>
                    <th>월</th><th>점수</th>
                    {showAvg && <><th>반 평균</th><th>차이</th></>}
                  </tr>
                </thead>
                <tbody>
                  {trend.map((p, i) => {
                    const avg = p.classPercentage === null ? null : Math.round(p.classPercentage)
                    return (
                      <tr key={`${p.year}-${p.month}`} className={i === trend.length - 1 ? 'now' : ''}>
                        <td>{p.label}</td>
                        <td className="b">{p.score}</td>
                        {showAvg && (
                          <>
                            <td className="m">{avg ?? '-'}</td>
                            <td className={avg === null ? 'm' : diffClass(p.score - avg)}>
                              {avg === null ? '-' : signed(p.score - avg)}
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {first && trend.length >= 2 && (
                <div className="mm-insight">
                  <b>성장 포인트</b> · {first.label} 대비 <b>{signed(view.score - first.score)}점</b>.
                </div>
              )}
            </div>
          </div>

          {view.units.length === 0 ? (
            <div className="mm-unit" style={{ gridTemplateColumns: '1fr' }}>
              <div className="mm-box">
                <h2 className="mm-h2">단원별 틀린 문제</h2>
                {wrongUnitGroups.length === 0 ? (
                  <p className="mm-note">틀린 문제가 없습니다.</p>
                ) : (
                  <table className="mm-t">
                    <thead><tr><th>단원</th><th>틀린 문항</th><th>그래프</th><th className="c">개수</th></tr></thead>
                    <tbody>
                      {wrongUnitGroups.map((g) => (
                        <tr key={g.name}>
                          <td><b>{g.name}</b></td>
                          <td>{g.nos.length ? g.nos.map((n) => `${n}번`).join(', ') : '-'}</td>
                          <td style={{ width: '30%' }}><div style={{ height: 10, borderRadius: 5, background: '#e2e8f0' }}><div style={{ height: 10, borderRadius: 5, background: '#ef4444', width: `${(g.nos.length / maxWrongInUnit) * 100}%` }} /></div></td>
                          <td className="c b">{g.nos.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {wrongUnitGroups.length > 0 && wrongUnitGroups[0].nos.length > 0 && wrongUnitGroups[0].name !== '단원 미분류' && (
                  <div className="mm-insight"><b>가장 많이 틀린 단원</b> · {wrongUnitGroups[0].name} ({wrongUnitGroups[0].nos.length}문항)</div>
                )}
              </div>
            </div>
          ) : (
          <div className="mm-unit">
            <div className="mm-box">
              <h2 className="mm-h2">단원별 성취도</h2>
              <div className="mm-chart center">
                {view.units.length >= 3 ? (
                  <UnitRadar units={view.units} showAvg={showAvg} />
                ) : (
                  <p className="mm-note">단원이 3개 이상일 때 레이더 차트로 표시됩니다.</p>
                )}
              </div>
              <div className="mm-legend">
                <span><i />{student.name} 정답률</span>
                {showAvg && <span><i className="d" />반 평균</span>}
              </div>
            </div>
            <div className="mm-box">
              <h2 className="mm-h2">단원별 결과</h2>
              <table className="mm-t">
                <thead>
                  <tr>
                    <th>단원</th><th>맞힘</th><th>정답률</th>
                    {showAvg && <><th>반 평균</th><th>차이</th></>}
                    <th className="c">진단</th>
                  </tr>
                </thead>
                <tbody>
                  {view.units.map((u) => (
                    <tr key={u.name}>
                      <td><b>{u.name}</b><small>{u.from}~{u.to}번</small></td>
                      <td>{u.correct}/{u.total}</td>
                      <td className="b">{u.rate}%</td>
                      {showAvg && (
                        <>
                          <td className="m">{u.classRate === null ? '-' : `${Math.round(u.classRate)}%`}</td>
                          <td className={u.diff === null ? 'm' : diffClass(u.diff)}>{u.diff === null ? '-' : signed(u.diff)}</td>
                        </>
                      )}
                      <td className="c"><span className={`mm-st ${diagClass[u.diagnosis]}`}>{DIAGNOSIS_LABEL[u.diagnosis]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {insight.highest && insight.lowest && (
                <div className="mm-insight">
                  {insight.strength ? (
                    <><b>강점</b> {insight.strength.name} {insight.strength.rate}%</>
                  ) : (
                    <><b>가장 높은 단원</b>: {insight.highest.name} {insight.highest.rate}%</>
                  )}
                  {insight.highest.name !== insight.lowest.name && (
                    <>
                      {' '}&nbsp;·&nbsp;{' '}
                      {insight.weak ? (
                        <>
                          <b>보강</b> {insight.weak.name} {insight.weak.rate}%
                          {showAvg && insight.weak.classRate !== null && insight.weak.diff !== null && insight.weak.diff < 0 &&
                            ` — 반 평균(${Math.round(insight.weak.classRate)}%)보다 ${Math.abs(insight.weak.diff)}%p 낮습니다.`}
                        </>
                      ) : (
                        <><b>가장 낮은 단원</b>: {insight.lowest.name} {insight.lowest.rate}%</>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          )}
          <div className="mm-foot"><span>하이퍼 영수 전문학원</span><span>24시간 학습을 설계하다</span></div>
        </section>

        {/* ───── 2쪽 ───── */}
        <section className="mm-page">
          <div className="mm-pno">2 / {totalPages}</div>
          <div className="mm-run">{student.name} · {exam.year}년 {exam.month}월 수학 월말평가<span>문항 분석 · 학습 태도 · 선생님 의견 · 다음 달 계획</span></div>

          <div className="mm-p2a">
            <div className="mm-box">
              <h2 className="mm-h2">난이도별 정답률</h2>
              {view.difficulties.map((d) => (
                <div className="mm-db-row" key={d.difficulty}>
                  <span className="mm-db-l">{MATH_DIFFICULTY_LABEL[d.difficulty]}<small>{d.total}문항</small></span>
                  <div className="mm-db-track">
                    <div className="mm-db-fill" style={{ width: `${d.rate}%` }} />
                    {showAvg && d.classRate !== null && <div className="mm-db-avg" style={{ left: `${Math.min(100, d.classRate)}%` }} />}
                  </div>
                  <span className="mm-db-v">{d.rate}%<small>{d.correct}/{d.total}{showAvg && d.classRate !== null ? ` · 반 ${Math.round(d.classRate)}%` : ''}</small></span>
                </div>
              ))}
              <div className="mm-legend">
                <span><i />{student.name}</span>
                {showAvg && <span><i style={{ width: 2, height: 10, borderTop: 'none', borderLeft: '2px solid #161B3A' }} />반 평균</span>}
              </div>
            </div>
            <div className="mm-box">
              <h2 className="mm-h2">문항별 결과<small>{exam.items.length}문항 · 정답 {view.correctCount}</small></h2>
              <div className="mm-qgrid">
                {exam.items.map((item) => {
                  const wrong = view.wrongNos.has(item.no)
                  return (
                    <div key={item.no} className={`mm-q${wrong ? ' x' : ''}`}>
                      <b>{item.no}-{MATH_DIFFICULTY_LABEL[itemByNo.get(item.no)?.difficulty ?? 'middle']}</b><span>{wrong ? '✕' : '○'}</span>
                    </div>
                  )
                })}
              </div>
              {wrongCount > 0 && (
                <>
                  <h2 className="mm-h2" style={{ marginTop: 14 }}>오답 원인</h2>
                  <div className="mm-cause">
                    <CauseDonut counts={view.causes} total={wrongCount} />
                    <CauseLegend counts={view.causes} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mm-box" style={{ marginTop: 12 }}>
            <h2 className="mm-h2">이번 달 학습 태도<small>출결·과제·일일테스트 기록에서 자동 집계</small></h2>
            <div className="mm-gauges">
              <Gauge value={attitude.attendance.rate} color="#16A34A" label="출석" sub={`결석 ${attitude.attendance.absent} · 지각 ${attitude.attendance.late}`} />
              <Gauge value={attitude.homework.rate} color="#16A34A" label="과제 완료" sub={`${attitude.homework.total}회 중 ${attitude.homework.done}회`} />
              <Gauge value={attitude.firstPass.rate} color="#5B348A" label="일일테스트 1차 통과" sub={`합격 ${attitude.firstPass.total}회 중 ${attitude.firstPass.passed}회`} note={attitude.unrecordedTests > 0 ? `기록 없음 ${attitude.unrecordedTests}회` : undefined} />
              <Gauge
                value={attitude.classAttitude.rate}
                color="#16A34A"
                label="수업 태도"
                emptyLabel="기록 없음"
                sub={attitude.classAttitude.recordedDays > 0 ? `문제없음 ${attitude.classAttitude.okDays}일 / ${attitude.classAttitude.recordedDays}일` : '이번 달 기록 없음'}
                note={Object.keys(attitude.classAttitude.issues).length > 0 ? Object.entries(attitude.classAttitude.issues).map(([k, n]) => `${k} ${n}`).join(' · ') : undefined}
              />
            </div>
            <div className="mm-att">
              <span className="mm-att-l">학습 태도 종합<small>지각·과제·일일테스트 차시 감점 기준</small></span>
              <span className="mm-att-r"><b>{attitude.score}점</b> {attitude.grade}</span>
            </div>
          </div>

          {hasComments && (
            <>
              <h2 className="mm-h2" style={{ marginTop: 14 }}>선생님 의견</h2>
              <div className="mm-comments">
                {result.strengths.trim() && <div className="mm-cm good"><h3>👍 잘한 점</h3>{result.strengths}</div>}
                {result.improvements.trim() && <div className="mm-cm imp"><h3>✏️ 보완할 점</h3>{result.improvements}</div>}
                {result.teacherComment.trim() && (
                  <div className="mm-cm all">
                    <h3>총평</h3>
                    {result.teacherComment}
                    {exam.teacherName && <div className="mm-sign">수학 {exam.teacherName}</div>}
                  </div>
                )}
              </div>
            </>
          )}

          {plan.length > 0 && (
            <div className="mm-plan">
              <h2 className="mm-h2">{nextMonth}월 학습 계획<small>담당 선생님 작성</small></h2>
              <ul>
                {plan.map((line, i) => (
                  <li key={i}>
                    <span className="mm-num">{i + 1}</span>
                    <span>{line.content}</span>
                    {line.goal.trim() && <small className="mm-goal">{line.goal}</small>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mm-note">※ 학생 개인의 성장을 보기 위한 자료로 석차는 표시하지 않습니다.{showAvg ? ' 반 평균은 같은 반 학생들의 평균입니다.' : ''}</p>
          <div className="mm-foot"><span>하이퍼 영수 전문학원</span><span>24시간 학습을 설계하다</span></div>
        </section>

        {/* ───── 틀린 문제 분석 (틀린 문제가 있을 때만) ───── */}
        {cardPages.map((pageCards, pi) => (
          <section className="mm-page" key={pi}>
            <div className="mm-pno">{3 + pi} / {totalPages}</div>
            <div className="mm-run">{student.name} · {exam.year}년 {exam.month}월 수학 월말평가<span>틀린 문제 분석</span></div>
            <h2 className="mm-h2">틀린 문제 분석<small>{wrongSorted.length}문항{effectiveMode === 'summary' ? ' · 요약 보기' : ''}</small></h2>
            <div className="mm-wlist">
              {pageCards.map((w) => {
                const img = images?.get(w.no)
                return (
                  <div className="mm-wcard" key={w.no}>
                    {img && <img className="mm-wimg" src={`data:image/jpeg;base64,${img.data}`} alt={`${w.no}번 문제`} />}
                    <div className="mm-wbody">
                      <div className="mm-whead">
                        <b>{w.no}번</b>
                        {w.unit && <span>{w.unit}</span>}
                        {w.type && <span>{w.type}</span>}
                        <i>{MATH_DIFFICULTY_LABEL[itemByNo.get(w.no)?.difficulty ?? 'middle']}</i>
                      </div>
                      {w.cause && <div className="mm-wcause">오답 원인 · <b>{MATH_CAUSE_LABEL[w.cause]}</b></div>}
                      {w.note && <p className="mm-wnote">{w.note}</p>}
                    </div>
                  </div>
                )
              })}
              {pi === cardPages.length - 1 && rest.length > 0 && (
                <div className="mm-wrest">
                  <h3>그 밖의 틀린 문항</h3>
                  <ul>
                    {rest.map((w) => (
                      <li key={w.no}>
                        <b>{w.no}번</b>
                        <span>{[w.unit, w.type, w.cause ? MATH_CAUSE_LABEL[w.cause] : ''].filter(Boolean).join(' · ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="mm-foot"><span>하이퍼 영수 전문학원</span><span>24시간 학습을 설계하다</span></div>
          </section>
        ))}
      </div>
    </div>
  )
}
