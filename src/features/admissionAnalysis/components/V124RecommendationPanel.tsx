import { useMemo, useState } from 'react'
import { btnPrimary } from '../../../utils/labels'
import type { AdmissionStudentProfile } from '../types'
import type {
  V124RecommendationMatch,
  V124RecommendationResult,
  V124SupportBand,
} from '../types/v124Recommendation'
import { formatGradeAverage } from '../utils/admissionGradeCalculator'
import {
  formatCounselingPrintDate,
  formatV124CompetitionRate,
  formatV124CsatStatus,
  formatV124Cutoff70,
  v124BandLabel,
} from '../utils/v124Recommendation'
import { v124RegionLabel, classifyV124RegionGroup } from '../utils/v124Region'
import '../styles/v124RecommendationPrint.css'

type Props = {
  profile: AdmissionStudentProfile
  grade5Average: number | null
  grade9Average: number | null
  analysis: V124RecommendationResult
}

const BANDS: V124SupportBand[] = ['reach', 'ambitious', 'target']

function bandList(
  analysis: V124RecommendationResult,
  band: V124SupportBand,
): V124RecommendationMatch[] {
  if (band === 'reach') return analysis.reach
  if (band === 'ambitious') return analysis.ambitious
  return analysis.target
}

function bandTone(band: V124SupportBand): string {
  if (band === 'reach') return 'v124-band-reach'
  if (band === 'ambitious') return 'v124-band-ambitious'
  return 'v124-band-target'
}

function competitionLabel(m: V124RecommendationMatch): string {
  const r = m.record
  if (r.comprehensiveCompetitionRate != null) {
    return formatV124CompetitionRate(r.comprehensiveCompetitionRate, '학종')
  }
  if (r.curriculumCompetitionRate != null) {
    return formatV124CompetitionRate(r.curriculumCompetitionRate, '교과')
  }
  return '경쟁률 -'
}

function ResultLine({ m }: { m: V124RecommendationMatch }) {
  const r = m.record
  const jongCut =
    r.comprehensiveCutoff70 == null
      ? '학종 공식 미공개'
      : formatV124Cutoff70(r.comprehensiveCutoff70, '학종 70%')

  return (
    <>
      <span className="font-semibold text-[#163A70]">{r.universityName}</span>
      <span className="text-slate-400"> | </span>
      <span>{r.departmentName}</span>
      <span className="text-slate-400"> | </span>
      <span>{formatV124Cutoff70(r.curriculumCutoff70, '교과 70%')}</span>
      <span className="text-slate-400"> | </span>
      <span>{formatV124CsatStatus(r.csatStatus)}</span>
      <span className="text-slate-400"> | </span>
      <span>{jongCut}</span>
      <span className="text-slate-400"> | </span>
      <span>{competitionLabel(m)}</span>
    </>
  )
}

export function V124RecommendationPanel({
  profile,
  grade5Average,
  grade9Average,
  analysis,
}: Props) {
  const [tab, setTab] = useState<V124SupportBand | 'all'>('all')
  const printedAt = useMemo(() => formatCounselingPrintDate(), [])

  const handlePrint = () => {
    window.print()
  }

  const visibleBands = BANDS

  return (
    <section
      className="v124-print-root space-y-4 rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-4 shadow-sm sm:p-5"
      data-section="v124-university-recommendation"
    >
      <div className="v124-print-hero v124-print-section rounded-xl px-4 py-3 text-sm">
        <p className="v124-print-hero-kicker text-[11px] font-bold tracking-wide">
          HYPER STUDENT CARE
        </p>
        <p className="v124-print-hero-title text-base font-bold">
          대입 내신 분석 결과
        </p>
        <p className="mt-2 font-semibold break-words">
          {profile.name.trim() || '이름 미입력'}
        </p>
        <p className="mt-0.5 break-words">
          {profile.school.trim() || '학교 미입력'}
          {profile.gradeYear ? ` · ${profile.gradeYear}` : ' · 학년 미선택'}
        </p>
        <p className="v124-print-grade mt-2 font-bold">
          5등급제 예상 내신{' '}
          <span className="text-lg font-black">
            {formatGradeAverage(grade5Average)}등급
          </span>
        </p>
        <p className="v124-print-grade mt-0.5 font-bold">
          9등급 환산 내신{' '}
          <span className="text-lg font-black">
            {formatGradeAverage(grade9Average)}등급
          </span>
        </p>
        <p className="mt-1 text-xs">출력일 {printedAt}</p>
      </div>

      <div className="no-print flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`${btnPrimary} bg-[#163A70] hover:bg-[#122f5c]`}
          onClick={handlePrint}
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
          <div className="v124-screen-tabs no-print flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                tab === 'all'
                  ? 'bg-[#163A70] text-white'
                  : 'bg-slate-100 text-slate-600'
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
                  tab === band
                    ? 'bg-[#163A70] text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
                onClick={() => setTab(band)}
              >
                {v124BandLabel(band)} {bandList(analysis, band).length}
              </button>
            ))}
          </div>

          {visibleBands.map((band) => {
            const rows = bandList(analysis, band)
            return (
              <div
                key={band}
                className={`v124-print-section space-y-2${
                  tab !== 'all' && tab !== band ? ' v124-screen-hide' : ''
                }`}
              >
                <h3 className="flex items-center gap-2 text-base font-bold text-[#163A70]">
                  <span
                    className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-bold ${bandTone(band)}`}
                  >
                    {v124BandLabel(band)} {rows.length}
                  </span>
                </h3>
                {rows.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    해당 구간의 공식 교과 70%컷 모집단위가 없습니다.
                  </p>
                ) : (
                  <>
                    <div className="v124-desktop-table hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                      <table className="v124-print-table w-full min-w-[48rem] border-collapse text-left text-xs sm:text-sm">
                        <thead className="v124-print-table-head">
                          <tr>
                            <th className="px-2 py-2 font-bold">대학</th>
                            <th className="px-2 py-2 font-bold">모집단위</th>
                            <th className="px-2 py-2 font-bold">교과 70%컷</th>
                            <th className="px-2 py-2 font-bold">수능최저</th>
                            <th className="px-2 py-2 font-bold">학종 70%컷</th>
                            <th className="px-2 py-2 font-bold">학종 50%컷</th>
                            <th className="px-2 py-2 font-bold">경쟁률</th>
                            <th className="px-2 py-2 font-bold">지역</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((m) => {
                            const rec = m.record
                            return (
                              <tr
                                key={rec.id}
                                className="border-t border-slate-100 text-[#163A70]"
                              >
                                <td className="px-2 py-2 font-medium">
                                  {rec.universityName}
                                </td>
                                <td className="px-2 py-2">{rec.departmentName}</td>
                                <td className="px-2 py-2 font-semibold">
                                  {formatV124Cutoff70(
                                    rec.curriculumCutoff70,
                                    '교과 70%',
                                  )}
                                </td>
                                <td className="px-2 py-2" title={rec.csatNote || undefined}>
                                  {formatV124CsatStatus(rec.csatStatus)}
                                </td>
                                <td className="px-2 py-2">
                                  {rec.comprehensiveCutoff70 == null
                                    ? '공식 미공개'
                                    : formatV124Cutoff70(
                                        rec.comprehensiveCutoff70,
                                        '학종 70%',
                                      )}
                                </td>
                                <td className="px-2 py-2 text-slate-500">
                                  {rec.comprehensiveCutoff50 == null
                                    ? '-'
                                    : formatV124Cutoff70(
                                        rec.comprehensiveCutoff50,
                                        '학종 50%',
                                      )}
                                </td>
                                <td className="px-2 py-2">
                                  {competitionLabel(m)}
                                </td>
                                <td className="px-2 py-2 text-slate-500">
                                  {v124RegionLabel(
                                    classifyV124RegionGroup(
                                      rec.campus,
                                      rec.universityName,
                                    ),
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>

                    <ul className="v124-mobile-cards space-y-2 md:hidden">
                      {rows.map((m) => (
                        <li
                          key={m.record.id}
                          className="v124-print-card rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-relaxed text-[#163A70]"
                        >
                          <ResultLine m={m} />
                          {m.record.comprehensiveCutoff50 != null ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {formatV124Cutoff70(
                                m.record.comprehensiveCutoff50,
                                '학종 50%',
                              )}
                            </p>
                          ) : null}
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

      <p className="v124-print-section text-[11px] leading-relaxed text-slate-500">
        본 자료는 전년도 공식 입시결과를 바탕으로 한 상담 참고자료이며, 실제 합격
        가능성을 보장하지 않습니다. 대학별 전형방법 및 모집요강은 해당 연도에
        변경될 수 있으므로 최종 지원 전 반드시 해당 대학의 최신 모집요강을
        확인해야 합니다.
      </p>
    </section>
  )
}
