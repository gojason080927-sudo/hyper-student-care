import { useMemo, useState } from 'react'
import { btnPrimary } from '../../../utils/labels'
import type { AdmissionStudentProfile } from '../types'
import type {
  RegularRecommendationMatch,
  RegularRecommendationResult,
  StudentMetrics,
  SupportBand,
} from '../../../lib/admissions/regular/types'
import { recommendationUniqueKey } from '../../../lib/admissions/regular/exclusions'
import {
  formatCount,
  formatCounselingPrintDate,
  formatGrade,
  formatScore,
  formatSigned,
  regularBandLabel,
} from '../../../lib/admissions/regular/format'
import '../styles/regularAdmissionPrint.css'

type Props = {
  profile: AdmissionStudentProfile
  analysis: RegularRecommendationResult
}

const BANDS: SupportBand[] = ['reach', 'ambitious', 'target']

function bandList(
  analysis: RegularRecommendationResult,
  band: SupportBand,
): RegularRecommendationMatch[] {
  if (band === 'reach') return analysis.reach
  if (band === 'ambitious') return analysis.ambitious
  return analysis.target
}

function bandTone(band: SupportBand): string {
  if (band === 'reach') return 'regular-band-reach'
  if (band === 'ambitious') return 'regular-band-ambitious'
  return 'regular-band-target'
}

function sourceHref(url: string): string | null {
  const t = url.trim()
  if (/^https?:\/\//i.test(t)) return t
  return null
}

function MatchDetail({
  m,
  metrics,
}: {
  m: RegularRecommendationMatch
  metrics: StudentMetrics
}) {
  const e = m.evaluation
  const r = e.row
  const href = sourceHref(r.sourceUrl) ?? sourceHref(r.officialSource)

  return (
    <div className="mt-1.5 space-y-0.5 text-xs leading-relaxed text-slate-600">
      <p>
        {e.studentValueLabel} {formatScore(e.studentValue)} · {e.cutoffValueLabel}{' '}
        {formatScore(e.cutoffValue)} · 차이 {formatSigned(e.supportGap)}
      </p>
      <p>
        비교기준: {e.comparisonBasis}
        <span className="ml-1 text-slate-500">({e.dataQuality})</span>
      </p>
      <p>
        국어 70 {formatScore(r.korean70)} · 수학 70 {formatScore(r.math70)} · 탐구1 70{' '}
        {formatScore(r.inquiry1_70)} · 탐구2 70 {formatScore(r.inquiry2_70)}
      </p>
      <p>
        영어 등급 {formatGrade(r.english70Grade)} · 대학환산70 {formatScore(r.universityConverted70)}{' '}
        · 환산총점 {formatScore(r.universityConvertedMax)}
      </p>
      {e.explanation ? <p className="text-[#163A70]">{e.explanation}</p> : null}
      {r.interviewApplied ? (
        <p className="text-amber-800">수능 기준 분석이며 면접 결과에 따라 변동 가능</p>
      ) : null}
      {href ? (
        <p>
          공식 입결 출처{' '}
          <a
            className="break-all text-[#163A70] underline"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {href}
          </a>
        </p>
      ) : r.sourceUrl || r.officialSource ? (
        <p className="break-all">공식 입결 출처 {r.sourceUrl || r.officialSource}</p>
      ) : (
        <p>공식 입결 출처 -</p>
      )}
      <p className="text-slate-400">
        학생 국어 {formatScore(metrics.koreanPercentile)} · 수학 {formatScore(metrics.mathPercentile)}{' '}
        · 탐구1 {formatScore(metrics.inquiry1Percentile)} · 탐구2{' '}
        {formatScore(metrics.inquiry2Percentile)}
      </p>
    </div>
  )
}

function ScoreLine({ metrics }: { metrics: StudentMetrics }) {
  return (
    <p className="regular-print-scores mt-2 text-xs leading-relaxed">
      국어 {formatScore(metrics.koreanPercentile)} · 수학{' '}
      {metrics.mathSelection ? `${metrics.mathSelection} ` : ''}
      {formatScore(metrics.mathPercentile)} · 영어 {formatGrade(metrics.englishGrade)} · 탐구1{' '}
      {formatScore(metrics.inquiry1Percentile)} · 탐구2 {formatScore(metrics.inquiry2Percentile)} ·
      한국사 {formatGrade(metrics.historyGrade)}
    </p>
  )
}

export function RegularAdmissionResultPanel({ profile, analysis }: Props) {
  const [tab, setTab] = useState<SupportBand | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const printedAt = useMemo(() => formatCounselingPrintDate(), [])

  return (
    <section
      className="regular-print-root space-y-4 rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-4 shadow-sm sm:p-5"
      data-section="regular-admission-recommendation"
    >
      <div className="regular-print-hero regular-print-section rounded-xl px-4 py-3 text-sm">
        <p className="regular-print-hero-kicker text-[11px] font-bold tracking-wide">
          HYPER STUDENT CARE
        </p>
        <p className="regular-print-hero-title text-base font-bold">정시 대입 분석 결과</p>
        <p className="mt-2 font-semibold break-words">{profile.name.trim() || '이름 미입력'}</p>
        <p className="mt-0.5 break-words">
          {profile.school.trim() || '학교 미입력'}
          {profile.gradeYear ? ` · ${profile.gradeYear}` : ' · 학년 미선택'}
        </p>
        <ScoreLine metrics={analysis.metrics} />
        <p className="regular-print-grade mt-2 font-bold">
          상향 {analysis.reach.length} · 소신 {analysis.ambitious.length} · 적정{' '}
          {analysis.target.length}
        </p>
        <p className="mt-1 text-xs">출력일 {printedAt}</p>
      </div>

      <div className="no-print flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`${btnPrimary} bg-[#163A70] hover:bg-[#122f5c]`}
          onClick={() => window.print()}
          disabled={!analysis.ready}
        >
          인쇄하기
        </button>
        <p className="text-xs text-slate-500">
          브라우저 인쇄에서 A4 세로 · PDF로 저장할 수 있습니다.
        </p>
      </div>

      {!analysis.ready ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          {analysis.message}
        </div>
      ) : (
        <>
          <div className="regular-screen-tabs no-print flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                tab === 'all' ? 'bg-[#163A70] text-white' : 'bg-slate-100 text-slate-600'
              }`}
              onClick={() => setTab('all')}
            >
              전체
            </button>
            {BANDS.map((band) => (
              <button
                key={band}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  tab === band ? 'bg-[#163A70] text-white' : 'bg-slate-100 text-slate-600'
                }`}
                onClick={() => setTab(band)}
              >
                {regularBandLabel(band)} {bandList(analysis, band).length}
              </button>
            ))}
          </div>

          {BANDS.map((band) => {
            const rows = bandList(analysis, band)
            return (
              <div
                key={band}
                className={`regular-print-section space-y-2${
                  tab !== 'all' && tab !== band ? ' regular-screen-hide' : ''
                }`}
              >
                <h3 className="flex items-center gap-2 text-base font-bold text-[#163A70]">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${bandTone(band)}`}
                  >
                    {regularBandLabel(band)} {rows.length}
                  </span>
                </h3>
                {rows.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    해당 구간의 정시 모집단위가 없습니다.
                  </p>
                ) : (
                  <>
                    <div className="regular-desktop-table hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                      <table className="regular-print-table w-full min-w-[56rem] border-collapse text-left text-xs sm:text-sm">
                        <thead className="regular-print-table-head">
                          <tr>
                            <th className="px-2 py-2 font-bold">대학명</th>
                            <th className="px-2 py-2 font-bold">모집단위</th>
                            <th className="px-2 py-2 font-bold">모집군</th>
                            <th className="regular-screen-only px-2 py-2 font-bold">전형</th>
                            <th className="px-2 py-2 font-bold">2025 정시 70%컷</th>
                            <th className="px-2 py-2 font-bold">학생 비교성적</th>
                            <th className="regular-screen-only px-2 py-2 font-bold">차이</th>
                            <th className="px-2 py-2 font-bold">경쟁률</th>
                            <th className="regular-screen-only px-2 py-2 font-bold">충원</th>
                            <th className="regular-screen-only px-2 py-2 font-bold">모집인원</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((m) => {
                            const rec = m.evaluation.row
                            const rowKey = recommendationUniqueKey(rec)
                            const open = openId === rec.id
                            return (
                              <tr
                                key={rowKey}
                                className="border-t border-slate-100 align-top text-[#163A70]"
                              >
                                <td className="px-2 py-2 font-medium">{rec.university}</td>
                                <td className="px-2 py-2">
                                  {rec.department}
                                  <button
                                    type="button"
                                    className="regular-screen-only mt-1 block text-[11px] font-semibold text-slate-500 underline"
                                    onClick={() => setOpenId(open ? null : rec.id)}
                                  >
                                    {open ? '접기' : '세부 보기'}
                                  </button>
                                  {open ? (
                                    <div className="regular-screen-only">
                                      <MatchDetail m={m} metrics={analysis.metrics} />
                                    </div>
                                  ) : null}
                                </td>
                                <td className="px-2 py-2">{rec.admissionGroup}군</td>
                                <td className="regular-screen-only px-2 py-2">{rec.admissionType || '-'}</td>
                                <td className="px-2 py-2">{formatScore(m.evaluation.cutoffValue)}</td>
                                <td className="px-2 py-2 font-semibold">
                                  {formatScore(m.evaluation.studentValue)}
                                </td>
                                <td className="regular-screen-only px-2 py-2">
                                  {formatSigned(m.evaluation.supportGap)}
                                </td>
                                <td className="px-2 py-2">{formatCount(rec.competitionRate)}</td>
                                <td className="regular-screen-only px-2 py-2">
                                  {formatCount(rec.fillCount)}
                                </td>
                                <td className="regular-screen-only px-2 py-2">
                                  {formatCount(rec.recruitmentCount)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <ul className="regular-mobile-cards space-y-2 md:hidden">
                      {rows.map((m) => (
                        <li
                          key={recommendationUniqueKey(m.evaluation.row)}
                          className="regular-print-card rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-relaxed text-[#163A70]"
                        >
                          <p>
                            <span
                              className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${bandTone(m.band)}`}
                            >
                              {regularBandLabel(m.band)}
                            </span>
                            <span className="font-semibold">{m.evaluation.row.university}</span>
                            <span className="text-slate-400"> | </span>
                            <span>
                              {m.evaluation.row.department} / {m.evaluation.row.admissionGroup}군
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            전형 {m.evaluation.row.admissionType || '-'} · 70%컷{' '}
                            {formatScore(m.evaluation.cutoffValue)} · 학생성적{' '}
                            {formatScore(m.evaluation.studentValue)} · 차이{' '}
                            {formatSigned(m.evaluation.supportGap)}
                          </p>
                          <p className="text-xs text-slate-600">
                            경쟁률 {formatCount(m.evaluation.row.competitionRate)} · 충원{' '}
                            {formatCount(m.evaluation.row.fillCount)} · 모집인원{' '}
                            {formatCount(m.evaluation.row.recruitmentCount)}
                          </p>
                          <MatchDetail m={m} metrics={analysis.metrics} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )
          })}
        </>
      )}

      <p className="regular-print-section text-[11px] leading-relaxed text-slate-500">
        본 자료는 2025학년도 공식 정시 입시결과와 대학별 반영방식을 바탕으로 한 상담 참고자료이며,
        실제 합격 가능성을 보장하지 않습니다. 공식 미공개 값은 0이 아니라 - 로 표시합니다. 대학환산점수는
        서로 다른 대학끼리 비교하지 않습니다. 최종 지원 전 해당 대학의 최신 모집요강을 확인해야 합니다.
      </p>
    </section>
  )
}
