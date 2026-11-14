import { useMemo, useState } from 'react'
import { btnPrimary, inputClass } from '../../../utils/labels'
import {
  ADMISSION_THRESHOLDS_NOTE,
  MANUAL_REVIEW_UNIVERSITIES,
} from '../config/admissionThresholds'
import { formatGradeAverage } from '../utils/admissionGradeCalculator'
import {
  formatAdmissionEligibility,
  formatSignedDifference,
  listDisplayedAdmissionCards,
  pickAutoSelectIds,
  supportBandLabel,
  type UniversityAnalysisResult,
} from '../utils/universityAdmissionAnalyzer'
import {
  ADMISSION_REPORT_COUNTS,
  buildCounselingReportSnapshot,
  type CounselingReportSnapshot,
} from '../utils/counselingReport'
import type {
  AdmissionStudentProfile,
  AdmissionSupportBand,
  SubjectAdmissionResult,
  UniversityMatchCard,
} from '../types'
import { AdmissionCounselingReportPreview } from './AdmissionCounselingReportPreview'

type Props = {
  profile: AdmissionStudentProfile
  subjects: SubjectAdmissionResult[]
  grade5Average: number | null
  grade9Average: number | null
  analysis: UniversityAnalysisResult
}

function StatusBadge({ band }: { band: AdmissionSupportBand }) {
  const styles =
    band === 'ambitious'
      ? 'bg-amber-50 text-amber-800'
      : band === 'safe'
        ? 'bg-emerald-50 text-emerald-800'
        : 'bg-[rgba(40,199,183,0.14)] text-[#0F766E]'
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold ${styles}`}
    >
      {supportBandLabel(band)}
    </span>
  )
}

function formatCut(year: number, cut: number): string {
  return `${year} ${cut.toFixed(2)}`
}

export function UniversityAdmissionResultPanel({
  profile,
  subjects,
  grade5Average,
  grade9Average,
  analysis,
}: Props) {
  const autoSelectIds = useMemo(
    () => (analysis.ready ? pickAutoSelectIds(analysis) : []),
    [analysis],
  )
  const autoSelectKey = autoSelectIds.join('|')
  const [selection, setSelection] = useState<{
    key: string
    ids: Set<string>
  }>({ key: '', ids: new Set() })
  const [counselorName, setCounselorName] = useState('')
  const [counselingMemo, setCounselingMemo] = useState('')
  const [reportSnapshot, setReportSnapshot] =
    useState<CounselingReportSnapshot | null>(null)

  if (selection.key !== autoSelectKey) {
    setSelection({ key: autoSelectKey, ids: new Set(autoSelectIds) })
  }

  const selectedIds = useMemo(() => {
    if (selection.key === autoSelectKey) return selection.ids
    return new Set(autoSelectIds)
  }, [selection, autoSelectKey, autoSelectIds])

  const displayed = useMemo(
    () => listDisplayedAdmissionCards(analysis),
    [analysis],
  )

  const selectedMatches = useMemo(() => {
    const map = new Map(displayed.map((m) => [m.university.id, m] as const))
    return [...selectedIds]
      .map((id) => map.get(id))
      .filter((m): m is UniversityMatchCard => Boolean(m))
  }, [displayed, selectedIds])

  const toggleSelect = (id: string, next: boolean) => {
    setSelection((prev) => {
      const base =
        prev.key === autoSelectKey ? prev.ids : new Set(autoSelectIds)
      const copy = new Set(base)
      if (next) copy.add(id)
      else copy.delete(id)
      return { key: autoSelectKey, ids: copy }
    })
  }

  const openReportPreview = () => {
    setReportSnapshot(
      buildCounselingReportSnapshot({
        profile,
        subjects,
        grade5Average,
        grade9Average,
        selectedMatches,
        counselorName,
        counselingMemo,
      }),
    )
  }

  return (
    <section
      className="space-y-4 rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-4 shadow-sm sm:p-5"
      data-section="university-admission-cutoff"
    >
      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-[#163A70]">
        <p className="font-semibold break-words">{profile.name || '이름 미입력'}</p>
        <p className="mt-0.5 text-slate-600 break-words">
          {profile.school || '학교 미입력'}
          {profile.gradeYear ? ` · ${profile.gradeYear}` : ' · 학년 미선택'}
        </p>
        <p className="mt-2 text-slate-700">
          학생 9등급 환산{' '}
          <span className="text-lg font-black">
            {formatGradeAverage(grade9Average)}
          </span>
          {grade9Average != null ? (
            <span className="ml-2 text-xs font-normal text-slate-500">
              기본 추천 |70%컷 차이| ≤ {analysis.appliedMaxDistance.toFixed(2)}
            </span>
          ) : null}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          5등급제 예상 내신 {formatGradeAverage(grade5Average)} (참고) ·{' '}
          {ADMISSION_THRESHOLDS_NOTE}
        </p>
      </div>

      {!analysis.ready ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          {analysis.message}
        </div>
      ) : (
        <>
          <div>
            <h3 className="text-base font-bold text-[#163A70]">
              내신 기준 지원 검토 대학
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              표시 {displayed.length}개 · 상향 {analysis.ambitious.length} · 적정{' '}
              {analysis.target.length} · 안정 {analysis.safe.length}
            </p>
          </div>

          {displayed.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              학생 환산등급과 가까운 공식 교과 70%컷 모집단위가 없습니다. 성적 차이가
              큰 대학은 표시하지 않습니다.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[52rem] border-collapse text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-2 py-2 font-medium">포함</th>
                    <th className="px-2 py-2 font-medium">지원구분</th>
                    <th className="px-2 py-2 font-medium">대학</th>
                    <th className="px-2 py-2 font-medium">모집단위</th>
                    <th className="px-2 py-2 font-medium">최근 교과 70%컷</th>
                    <th className="px-2 py-2 font-medium">학생 환산등급</th>
                    <th className="px-2 py-2 font-medium">등급차</th>
                    <th className="px-2 py-2 font-medium">지원자격</th>
                    <th className="px-2 py-2 font-medium">공식출처</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((m) => {
                    const u = m.university
                    return (
                      <tr
                        key={u.id}
                        className="border-t border-slate-100 hover:bg-[rgba(40,199,183,0.06)]"
                      >
                        <td className="px-2 py-2">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={selectedIds.has(u.id)}
                            onChange={(e) =>
                              toggleSelect(u.id, e.target.checked)
                            }
                            aria-label={`${u.universityName} ${u.departmentName} 보고서에 포함`}
                          />
                        </td>
                        <td className="px-2 py-2">
                          {m.band ? <StatusBadge band={m.band} /> : '—'}
                        </td>
                        <td className="px-2 py-2 font-medium text-[#163A70]">
                          {u.universityName}
                        </td>
                        <td className="px-2 py-2 text-slate-700">
                          {u.departmentName}
                        </td>
                        <td className="px-2 py-2 font-semibold text-[#163A70]">
                          {m.cutoffUsed != null
                            ? formatCut(u.admissionYear, m.cutoffUsed)
                            : '—'}
                        </td>
                        <td className="px-2 py-2">
                          {m.studentComparableGrade.toFixed(2)}
                        </td>
                        <td className="px-2 py-2">
                          {m.difference === null
                            ? '—'
                            : formatSignedDifference(m.difference)}
                        </td>
                        <td
                          className="max-w-[10rem] truncate px-2 py-2 text-slate-600"
                          title={formatAdmissionEligibility(u)}
                        >
                          {formatAdmissionEligibility(u)}
                        </td>
                        <td className="px-2 py-2">
                          {u.sourceUrl ? (
                            <a
                              href={u.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#0F766E] underline-offset-2 hover:underline"
                            >
                              {u.sourceName}
                            </a>
                          ) : (
                            <span className="text-slate-400">{u.sourceName}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-[#163A70]">
              별도 검토 대학 · 공식 교과 70%컷 데이터 없음
            </p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {MANUAL_REVIEW_UNIVERSITIES.map((u) => (
                <li key={u.universityName}>
                  <span className="font-medium text-[#163A70]">
                    {u.universityName}
                  </span>
                  {' · '}
                  {u.note}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-slate-500">
              임의 등급을 만들어 상향·적정·안정으로 판정하지 않습니다.
            </p>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500">
            ※ 대학별 교과 반영방식이 다르므로 70%컷을 완전 동일 기준으로 직접 비교할 수
            없습니다. 출처 확인된 최근 교과전형 최종등록자 70%컷만 사용합니다. 한 대학당
            모집단위는 최대 2개까지 표시합니다.
          </p>
        </>
      )}

      <div className="space-y-3 rounded-xl border border-[rgba(22,58,112,0.12)] bg-slate-50 p-4">
        <p className="text-sm font-bold text-[#163A70]">
          대입 상담 REPORT · 선택 {selectedMatches.length}개
        </p>
        {displayed.length === 0 ? (
          <p className="text-xs text-slate-500">
            조건에 맞는 추천 대학이 없어도 학생 정보 REPORT는 열 수 있습니다.
          </p>
        ) : selectedMatches.length === 0 ? (
          <p className="text-xs text-rose-600" role="alert">
            보고서에 포함할 대학을 선택해주세요. 학생 정보만 출력하려면 미리보기를
            그대로 열 수 있습니다.
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            기본 자동선택: 상향 {ADMISSION_REPORT_COUNTS.ambitious} · 적정{' '}
            {ADMISSION_REPORT_COUNTS.target} · 안정 {ADMISSION_REPORT_COUNTS.safe}{' '}
            이내 실제 추천분
          </p>
        )}
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">담당강사</span>
          <input
            className={inputClass()}
            value={counselorName}
            onChange={(e) => setCounselorName(e.target.value)}
            placeholder="예: 홍길동"
            autoComplete="off"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">강사 상담 메모</span>
          <textarea
            className={`${inputClass()} min-h-[4.5rem] resize-y`}
            value={counselingMemo}
            onChange={(e) => setCounselingMemo(e.target.value)}
            placeholder="상담 메모를 입력하세요."
          />
        </label>
        <button
          type="button"
          className={`${btnPrimary} w-full bg-[#163A70] hover:bg-[#122f5c]`}
          disabled={!analysis.ready}
          onClick={openReportPreview}
        >
          대입 상담 REPORT 미리보기
        </button>
      </div>

      {reportSnapshot ? (
        <AdmissionCounselingReportPreview
          snapshot={reportSnapshot}
          onClose={() => setReportSnapshot(null)}
        />
      ) : null}
    </section>
  )
}
