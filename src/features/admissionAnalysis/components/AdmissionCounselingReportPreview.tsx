import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import '../styles/counselingReportPrint.css'
import type { CounselingReportSnapshot } from '../utils/counselingReport'
import { formatGradeAverage, formatPercentile } from '../utils/admissionGradeCalculator'
import {
  formatAdmissionEligibility,
  formatSignedDifference,
  supportBandLabel,
} from '../utils/universityAdmissionAnalyzer'
import { btnPrimary, btnSecondary } from '../../../utils/labels'
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock'
import type { UniversityMatchCard } from '../types'

type Props = {
  snapshot: CounselingReportSnapshot
  onClose: () => void
}

const BAND_ORDER: Record<string, number> = {
  ambitious: 0,
  target: 1,
  safe: 2,
}

function flattenSelected(snapshot: CounselingReportSnapshot): UniversityMatchCard[] {
  return [
    ...snapshot.selected.ambitious,
    ...snapshot.selected.target,
    ...snapshot.selected.safe,
  ].sort((a, b) => {
    const ba = BAND_ORDER[a.band ?? ''] ?? 9
    const bb = BAND_ORDER[b.band ?? ''] ?? 9
    if (ba !== bb) return ba - bb
    const da = a.difference === null ? 99 : Math.abs(a.difference)
    const db = b.difference === null ? 99 : Math.abs(b.difference)
    return da - db
  })
}

export function AdmissionCounselingReportPreview({ snapshot, onClose }: Props) {
  useBodyScrollLock(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handlePrint = () => {
    const root = document.documentElement
    root.classList.add('admission-printing-report')
    const cleanup = () => {
      root.classList.remove('admission-printing-report')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.setTimeout(cleanup, 2000)
    window.print()
  }

  const rows = flattenSelected(snapshot)

  return createPortal(
    <div
      className="admission-counseling-report-overlay fixed inset-0 z-[200] flex flex-col bg-slate-900/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admission-report-preview-title"
    >
      <div className="no-print flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <p
            id="admission-report-preview-title"
            className="text-sm font-bold text-[#163A70]"
          >
            대입 상담 REPORT 미리보기
          </p>
          <p className="text-xs text-slate-500">
            A4 1~2장 목표 · 인쇄 시 「PDF로 저장」 가능
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            닫기
          </button>
          <button type="button" className={btnPrimary} onClick={handlePrint}>
            인쇄 / PDF 저장
          </button>
        </div>
      </div>

      <div className="admission-counseling-report-scroll min-h-0 flex-1 overflow-y-auto bg-slate-100 p-3 sm:p-6">
        <div className="admission-counseling-report-root mx-auto max-w-[210mm] bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          <header className="admission-report-keep border-b border-[rgba(22,58,112,0.2)] pb-3">
            <p className="text-[10px] font-semibold tracking-wide text-[#0F766E]">
              HYPER STUDENT CARE
            </p>
            <h1 className="mt-0.5 text-lg font-black text-[#163A70] sm:text-xl">
              대입 내신 분석 REPORT
            </h1>
            <div className="mt-2 grid gap-0.5 text-xs text-[#163A70] sm:grid-cols-2">
              <p>
                <span className="text-slate-500">학생 </span>
                {snapshot.profile.name || '미입력'}
              </p>
              <p>
                <span className="text-slate-500">학교 </span>
                {snapshot.profile.school || '미입력'}
              </p>
              <p>
                <span className="text-slate-500">학년 </span>
                {snapshot.profile.gradeYear || '미선택'}
              </p>
              <p>
                <span className="text-slate-500">분석일 </span>
                {snapshot.counselingDateLabel}
              </p>
            </div>
          </header>

          <section className="admission-report-keep mt-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded border border-slate-200 px-2 py-2">
                <p className="text-[9px] text-slate-500">현재 내신 (5등급 예상)</p>
                <p className="text-lg font-black text-[#163A70]">
                  {formatGradeAverage(snapshot.grade5Average)}등급
                </p>
              </div>
              <div className="rounded border border-slate-200 px-2 py-2">
                <p className="text-[9px] text-slate-500">9등급 환산등급</p>
                <p className="text-lg font-black text-[#163A70]">
                  {formatGradeAverage(snapshot.grade9Average)}등급
                </p>
              </div>
            </div>
          </section>

          {snapshot.subjects.length > 0 ? (
            <section className="mt-3">
              <h2 className="text-xs font-bold text-[#163A70]">과목별 성적</h2>
              <table className="mt-1 w-full border-collapse text-left text-[9px]">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-500">
                    <th className="py-0.5 pr-1 font-medium">과목</th>
                    <th className="py-0.5 pr-1 font-medium">석차</th>
                    <th className="py-0.5 pr-1 font-medium">수강</th>
                    <th className="py-0.5 pr-1 font-medium">백분율</th>
                    <th className="py-0.5 pr-1 font-medium">5등급</th>
                    <th className="py-0.5 font-medium">9등급</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.subjects.map((s) => (
                    <tr
                      key={s.subjectId}
                      className="border-b border-slate-100 text-[#163A70]"
                    >
                      <td className="py-0.5 pr-1 font-medium">{s.subjectName}</td>
                      <td className="py-0.5 pr-1">{s.rank}</td>
                      <td className="py-0.5 pr-1">{s.totalStudents}</td>
                      <td className="py-0.5 pr-1">
                        {formatPercentile(s.percentile)}%
                      </td>
                      <td className="py-0.5 pr-1">{s.grade5}</td>
                      <td className="py-0.5">{s.grade9}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}

          <section className="mt-3">
            <h2 className="text-xs font-bold text-[#163A70]">추천 결과</h2>
            <p className="mt-0.5 text-[9px] text-slate-500">
              상향 {snapshot.selected.ambitious.length} · 적정{' '}
              {snapshot.selected.target.length} · 안정{' '}
              {snapshot.selected.safe.length}
            </p>
            <table className="mt-1 w-full border-collapse text-left text-[8.5px]">
              <thead>
                <tr className="border-b border-slate-300 text-slate-500">
                  <th className="py-0.5 pr-1 font-medium">지원구분</th>
                  <th className="py-0.5 pr-1 font-medium">대학</th>
                  <th className="py-0.5 pr-1 font-medium">모집단위</th>
                  <th className="py-0.5 pr-1 font-medium">최근 교과 70%컷</th>
                  <th className="py-0.5 pr-1 font-medium">등급차</th>
                  <th className="py-0.5 pr-1 font-medium">지원자격</th>
                  <th className="py-0.5 font-medium">공식출처</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="py-2 text-slate-500" colSpan={7}>
                      조건에 맞는 추천 대학이 없습니다.
                    </td>
                  </tr>
                ) : (
                  rows.map((m) => {
                    const u = m.university
                    return (
                      <tr
                        key={u.id}
                        className="border-b border-slate-100 text-[#163A70]"
                      >
                        <td className="py-0.5 pr-1 font-semibold">
                          {m.band ? supportBandLabel(m.band) : '—'}
                        </td>
                        <td className="py-0.5 pr-1">{u.universityName}</td>
                        <td className="py-0.5 pr-1">{u.departmentName}</td>
                        <td className="py-0.5 pr-1">
                          {u.admissionYear}{' '}
                          {m.cutoffUsed != null ? m.cutoffUsed.toFixed(2) : '—'}
                        </td>
                        <td className="py-0.5 pr-1">
                          {m.difference === null
                            ? '—'
                            : formatSignedDifference(m.difference)}
                        </td>
                        <td className="py-0.5 pr-1">
                          {formatAdmissionEligibility(u)}
                        </td>
                        <td className="py-0.5">
                          {u.sourceUrl ? (
                            <a
                              href={u.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#163A70] underline"
                            >
                              {u.sourceName}
                            </a>
                          ) : (
                            u.sourceName
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
            <p className="mt-1.5 text-[8px] leading-snug text-slate-400">
              ※ 학생 9등급 환산값과 최근 학생부교과 전형 최종등록자 70%컷을 비교한 상담
              참고 자료입니다. 대학별 반영교과·수능최저를 재확인하세요.
            </p>
          </section>

          <section className="admission-report-keep mt-3">
            <h3 className="text-xs font-bold text-[#163A70]">강사 상담 메모</h3>
            <p className="mt-1 whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-700">
              {snapshot.counselingMemo || '(메모 없음)'}
            </p>
          </section>

          <footer className="admission-report-keep mt-3 border-t border-slate-200 pt-1.5 text-[10px] text-slate-600">
            <p>
              상담일: {snapshot.counselingDateLabel}
              {snapshot.counselorName
                ? ` · 담당강사: ${snapshot.counselorName}`
                : ' · 담당강사: (미입력)'}
            </p>
            <p className="mt-1 text-[8px] leading-snug text-slate-400">
              본 자료는 상담 참고자료이며 실제 합격 여부를 보장하지 않습니다.
            </p>
          </footer>
        </div>
      </div>
    </div>,
    document.body,
  )
}
