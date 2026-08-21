import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronDown, FileBarChart2, Printer } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import {
  fetchEntranceExamAttempts,
  fetchEntranceExamLearningSurveyByAttemptId,
  fetchEntranceExamQuestions,
} from '../../lib/db/entranceExamRepository'
import { btnPrimary, btnSecondary } from '../../utils/labels'
import {
  buildEntranceExamDiagnosis,
  type EntranceExamDiagnosis,
} from './buildEntranceExamDiagnosis'
import {
  buildEntranceExamDiagnosticReport,
  type EntranceExamDiagnosticReport,
} from './buildEntranceExamReport'
import { EntranceExamRadarChart } from './components/EntranceExamRadarChart'
import type { EntranceExamAttempt, EntranceExamLearningSurvey, EntranceExamQuestion } from './types'
import './components/entranceExamReportPrint.css'

/** PRINT용 Radar 고정 크기 (ResponsiveContainer 우회) */
const PRINT_RADAR_SIZE = { width: 320, height: 280 } as const

function runEntranceExamReportPrint() {
  const root = document.documentElement
  root.classList.add('ee-printing-report')
  const cleanup = () => {
    root.classList.remove('ee-printing-report')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  try {
    window.print()
  } catch {
    cleanup()
  }
}

/**
 * 개별 종합진단 REPORT (attempt 단위).
 * 수학/영어 개별 응시 + 해당 attempt에 연결된 학습성향을 조회한다.
 * 통합 REPORT(`/entrance-exam/integrated`)와 별개로 유지한다.
 */
export function EntranceExamReportPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedAttemptId = searchParams.get('attemptId') ?? ''

  const [attempts, setAttempts] = useState<EntranceExamAttempt[]>([])
  const [questions, setQuestions] = useState<EntranceExamQuestion[]>([])
  const [survey, setSurvey] = useState<EntranceExamLearningSurvey | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openQuestions, setOpenQuestions] = useState(false)
  const [openSurveyDetail, setOpenSurveyDetail] = useState(false)

  const reloadList = useCallback(async () => {
    if (!session) {
      setAttempts([])
      setQuestions([])
      setLoadingList(false)
      return
    }
    setLoadingList(true)
    setError(null)
    try {
      const [attemptList, questionList] = await Promise.all([
        fetchEntranceExamAttempts(),
        fetchEntranceExamQuestions(),
      ])
      setAttempts(attemptList)
      setQuestions(questionList)
    } catch (err) {
      setError(err instanceof Error ? err.message : '응시자 목록을 불러오지 못했습니다.')
    } finally {
      setLoadingList(false)
    }
  }, [session])

  useEffect(() => {
    void reloadList()
  }, [reloadList])

  const selectedAttempt = useMemo(
    () => attempts.find((item) => item.id === selectedAttemptId) ?? null,
    [attempts, selectedAttemptId],
  )

  useEffect(() => {
    let cancelled = false
    async function loadSurvey() {
      if (!selectedAttemptId || !session) {
        setSurvey(null)
        return
      }
      setLoadingDetail(true)
      setError(null)
      try {
        const row = await fetchEntranceExamLearningSurveyByAttemptId(selectedAttemptId)
        if (!cancelled) setSurvey(row)
      } catch (err) {
        if (!cancelled) {
          setSurvey(null)
          setError(err instanceof Error ? err.message : '설문을 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) setLoadingDetail(false)
      }
    }
    void loadSurvey()
    return () => {
      cancelled = true
    }
  }, [selectedAttemptId, session])

  const report: EntranceExamDiagnosticReport | null = useMemo(() => {
    if (!selectedAttempt) return null
    return buildEntranceExamDiagnosticReport({
      attempt: selectedAttempt,
      survey,
      questions,
    })
  }, [selectedAttempt, survey, questions])

  const diagnosis: EntranceExamDiagnosis | null = useMemo(() => {
    if (!report) return null
    return buildEntranceExamDiagnosis(report)
  }, [report])

  const selectAttempt = (attemptId: string) => {
    setOpenQuestions(false)
    setOpenSurveyDetail(false)
    setSearchParams(attemptId ? { attemptId } : {})
  }

  return (
    <div className="space-y-6">
      <div className="ee-report-no-print">
        <Link to=".." className="text-sm font-medium text-slate-500 hover:text-[#163A70]">
          ← 신입생 평가
        </Link>
        <PageHeader
          title="종합진단 REPORT"
          description="입학테스트·학습성향 데이터를 바탕으로 규칙 기반 종합 학습진단을 제공합니다. (과목별 개별 응시)"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnSecondary} onClick={() => void reloadList()}>
                새로고침
              </button>
              <button
                type="button"
                className={`${btnPrimary} inline-flex items-center gap-2`}
                disabled={!report || loadingDetail}
                onClick={runEntranceExamReportPrint}
              >
                <Printer className="h-4 w-4" aria-hidden />
                리포트 출력
              </button>
            </div>
          }
        />
      </div>

      {loadingList ? (
        <p className="ee-report-no-print text-sm text-slate-500">불러오는 중...</p>
      ) : null}
      {error ? <p className="ee-report-no-print text-sm text-rose-500">{error}</p> : null}

      {!loadingList && attempts.length === 0 ? (
        <div className="ee-report-no-print">
          <EmptyState
            title="저장된 응시 결과가 없습니다."
            description="응시 결과 입력 후 REPORT를 확인할 수 있습니다."
          />
        </div>
      ) : null}

      {!loadingList && attempts.length > 0 ? (
        <section className="ee-report-no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-bold text-[#163A70]">응시자 선택</h2>
          <p className="mt-1 text-xs text-slate-500">
            과목별 개별 응시 결과입니다. 수학·영어·학습성향을 한 문서로 보려면 「통합 종합진단
            REPORT」를 사용하세요.
          </p>
          <ul className="mt-3 space-y-2">
            {attempts.map((attempt) => {
              const active = attempt.id === selectedAttemptId
              return (
                <li key={attempt.id}>
                  <button
                    type="button"
                    onClick={() => selectAttempt(attempt.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${
                      active
                        ? 'border-[#28C7B7] bg-[rgba(40,199,183,0.08)]'
                        : 'border-slate-200 bg-white hover:border-[#28C7B7]/50'
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-bold text-[#163A70]">
                        {attempt.studentName || '(이름 없음)'}
                        {attempt.school ? ` · ${attempt.school}` : ''}
                        {attempt.grade ? ` · ${attempt.grade}` : ''}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {attempt.subject} · {attempt.examDate || '-'} · {attempt.totalScore}점
                      </span>
                    </span>
                    <FileBarChart2
                      className={`h-5 w-5 shrink-0 ${active ? 'text-[#0F766E]' : 'text-slate-300'}`}
                      aria-hidden
                    />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {selectedAttemptId && !selectedAttempt && !loadingList ? (
        <div className="ee-report-no-print">
          <EmptyState title="선택한 응시 결과를 찾을 수 없습니다." />
        </div>
      ) : null}

      {selectedAttempt && loadingDetail ? (
        <p className="ee-report-no-print text-sm text-slate-500">REPORT 데이터를 불러오는 중...</p>
      ) : null}

      {report && diagnosis && !loadingDetail ? (
        <div className="ee-report-print-root">
          <IndividualReportDocument report={report} diagnosis={diagnosis} />
        </div>
      ) : null}

      {report && !loadingDetail ? (
        <div className="ee-report-no-print space-y-3">
          <details
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
            open={openQuestions}
            onToggle={(event) => setOpenQuestions((event.target as HTMLDetailsElement).open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-[#163A70] sm:px-5">
              입학테스트 문항별 상세보기
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition ${openQuestions ? 'rotate-180' : ''}`}
              />
            </summary>
            <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
              <ul className="space-y-2 text-sm">
                {report.questionDetails.map((item) => (
                  <li
                    key={item.questionId}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-50 pb-2 last:border-0"
                  >
                    <span className="font-medium text-slate-800">
                      {item.number}. {item.isCorrect ? '정답' : '오답'} · 선택 {item.studentLabel} /
                      정답 {item.correctLabel}
                    </span>
                    <span className="text-xs text-slate-500">
                      {item.evaluationAreas.join(', ') || '-'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </details>

          <details
            className="rounded-2xl border border-slate-200 bg-white shadow-sm"
            open={openSurveyDetail}
            onToggle={(event) => setOpenSurveyDetail((event.target as HTMLDetailsElement).open)}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-[#163A70] sm:px-5">
              학습성향 설문 응답 상세보기
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition ${openSurveyDetail ? 'rotate-180' : ''}`}
              />
            </summary>
            <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
              {report.surveyDetails ? (
                <ul className="space-y-2 text-sm">
                  {report.surveyDetails.map((item) => (
                    <li key={item.number} className="border-b border-slate-50 pb-2 last:border-0">
                      <p className="font-medium text-slate-800">
                        {item.number}. {item.text}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {item.areaLabel} · {item.valueLabel}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">연결된 학습성향 설문이 없습니다.</p>
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() =>
                      navigate('/entrance-exam/survey', {
                        state: { attemptId: report.studentInfo.attemptId },
                      })
                    }
                  >
                    학습성향 설문으로 이동
                  </button>
                </div>
              )}
            </div>
          </details>
        </div>
      ) : null}
    </div>
  )
}

function IndividualReportDocument(props: {
  report: EntranceExamDiagnosticReport
  diagnosis: EntranceExamDiagnosis
}) {
  const { report, diagnosis } = props
  const { studentInfo, academicResult, academicAreas, learningSurvey } = report

  return (
    <article className="ee-report-document space-y-5 rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-5 shadow-sm sm:p-7">
      <div className="ee-report-print-page ee-report-print-page--1 space-y-5">
        <header className="border-b border-slate-200 pb-5 text-center">
          <p className="ee-report-brand text-sm font-semibold tracking-wide text-[#0F766E]">
            HYPER 영수 전문학원
          </p>
          <h2 className="ee-report-title mt-1 text-xl font-bold text-[#163A70] sm:text-2xl">
            신입생 종합진단 REPORT
          </h2>
          <p className="ee-report-subtitle mt-1 text-sm font-medium text-slate-600">
            신입생 종합 학습진단 및 관리방향
          </p>
          <dl className="mx-auto mt-4 grid max-w-xl grid-cols-2 gap-x-4 gap-y-2 text-left text-sm sm:grid-cols-3">
            <div>
              <dt className="ee-report-info-label text-xs font-medium text-slate-600">학생</dt>
              <dd className="ee-report-info-value font-semibold text-slate-900">
                {studentInfo.studentName || '-'}
              </dd>
            </div>
            <div>
              <dt className="ee-report-info-label text-xs font-medium text-slate-600">학교</dt>
              <dd className="ee-report-info-value font-semibold text-slate-900">
                {studentInfo.school || '-'}
              </dd>
            </div>
            <div>
              <dt className="ee-report-info-label text-xs font-medium text-slate-600">학년</dt>
              <dd className="ee-report-info-value font-semibold text-slate-900">
                {studentInfo.grade || '-'}
              </dd>
            </div>
            <div>
              <dt className="ee-report-info-label text-xs font-medium text-slate-600">시험 과목</dt>
              <dd className="ee-report-info-value font-semibold text-slate-900">
                {studentInfo.subject}
              </dd>
            </div>
            <div>
              <dt className="ee-report-info-label text-xs font-medium text-slate-600">시험일</dt>
              <dd className="ee-report-info-value font-semibold text-slate-900">
                {studentInfo.examDate || '-'}
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="ee-report-info-label text-xs font-medium text-slate-600">시험지</dt>
              <dd className="ee-report-info-value font-semibold text-slate-900">
                {studentInfo.paperTitle || '-'}
              </dd>
            </div>
          </dl>
        </header>

        <section className="space-y-4">
          <h3 className="ee-report-section-title text-base font-bold text-[#163A70]">
            입학테스트 결과
          </h3>
          <div className="ee-report-score-panel ee-report-score-panel-navy rounded-xl bg-[rgba(22,58,112,0.06)] px-4 py-4">
            <p className="text-sm font-semibold text-slate-700">
              {academicResult.subject} 입학테스트
            </p>
            <p className="ee-report-score-big mt-1 text-3xl font-bold text-[#163A70]">
              {academicResult.totalScore}점
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              정답 {academicResult.correctCount} / {academicResult.totalCount}
            </p>
          </div>
          <div className="ee-report-score-grid grid gap-4 lg:grid-cols-2">
            <div className="ee-report-radar-panel rounded-xl border border-slate-200 px-3 py-3">
              <p className="mb-1 text-sm font-semibold text-slate-700">과목 평가영역</p>
              <div className="ee-report-radar-screen-only">
                <EntranceExamRadarChart
                  points={report.academicRadarPoints}
                  tone="navy"
                  emptyText="표시할 평가영역 점수가 없습니다."
                />
              </div>
              <div className="ee-report-radar-print-only">
                <EntranceExamRadarChart
                  points={report.academicRadarPoints}
                  tone="navy"
                  emptyText="표시할 평가영역 점수가 없습니다."
                  fixedSize={PRINT_RADAR_SIZE}
                  printEnhance
                />
              </div>
            </div>
            <div className="ee-report-score-panel rounded-xl border border-slate-200 px-4 py-3">
              <p className="mb-3 text-sm font-semibold text-slate-700">영역별 점수</p>
              <ul className="space-y-2">
                {academicAreas.map((item) => (
                  <li
                    key={item.area}
                    className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-0"
                  >
                    <span className="text-slate-800">{item.area}</span>
                    <span className="shrink-0 text-right">
                      <span className="font-bold text-[#163A70]">
                        {item.score != null && item.status === 'accuracy' ? item.score : '-'}
                      </span>
                      <span className="ml-1 text-xs font-medium text-slate-500">
                        {item.fractionText}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>

      <div className="ee-report-print-page ee-report-print-page--2 space-y-5">
        <section className="space-y-4">
          <h3 className="ee-report-section-title text-base font-bold text-[#163A70]">
            학습성향 결과
          </h3>
          {!learningSurvey ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
              학습성향 설문 결과가 아직 없습니다.
            </div>
          ) : (
            <>
              <div className="ee-report-score-panel ee-report-score-panel-mint rounded-xl bg-[rgba(40,199,183,0.12)] px-4 py-4">
                <p className="text-sm font-semibold text-slate-700">종합 학습성향</p>
                <p className="ee-report-score-big mt-1 text-3xl font-bold text-[#0F766E]">
                  {learningSurvey.overallScore}점
                </p>
              </div>
              <div className="ee-report-score-grid grid gap-4 lg:grid-cols-2">
                <div className="ee-report-radar-panel rounded-xl border border-slate-200 px-3 py-3">
                  <p className="mb-1 text-sm font-semibold text-slate-700">학습성향 영역</p>
                  <div className="ee-report-radar-screen-only">
                    <EntranceExamRadarChart points={learningSurvey.radarPoints} tone="mint" />
                  </div>
                  <div className="ee-report-radar-print-only">
                    <EntranceExamRadarChart
                      points={learningSurvey.radarPoints}
                      tone="mint"
                      fixedSize={PRINT_RADAR_SIZE}
                      printEnhance
                    />
                  </div>
                </div>
                <div className="ee-report-score-panel rounded-xl border border-slate-200 px-4 py-3">
                  <p className="mb-3 text-sm font-semibold text-slate-700">6개 영역 점수</p>
                  <ul className="space-y-2">
                    {learningSurvey.areas.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-0"
                      >
                        <span className="text-slate-800">{item.label}</span>
                        <span className="font-bold text-[#0F766E]">{item.score}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>

        <IndividualDiagnosisSection diagnosis={diagnosis} hasSurvey={report.completeness.hasSurvey} />
      </div>
    </article>
  )
}

function IndividualDiagnosisSection({
  diagnosis,
  hasSurvey,
}: {
  diagnosis: EntranceExamDiagnosis
  hasSurvey: boolean
}) {
  return (
    <section className="ee-report-diagnosis-section space-y-4 rounded-xl border border-[rgba(22,58,112,0.12)] bg-[rgba(22,58,112,0.03)] px-4 py-4">
      <h3 className="ee-report-section-title text-base font-bold text-[#163A70]">종합 학습진단</h3>
      <div className="ee-report-block rounded-lg bg-white/80 px-3 py-3">
        <p className="text-sm font-semibold text-[#163A70]">① 학업 역량</p>
        <p className="ee-report-body-text mt-1 text-sm leading-relaxed text-slate-700">
          {diagnosis.academicDiagnosis}
        </p>
      </div>
      <div className="ee-report-block rounded-lg bg-white/80 px-3 py-3">
        <p className="text-sm font-semibold text-[#163A70]">② 학습성향</p>
        <p className="ee-report-body-text mt-1 text-sm leading-relaxed text-slate-700">
          {hasSurvey
            ? diagnosis.learningDiagnosis
            : '학습성향 설문이 아직 없어 성향 진단을 보류합니다.'}
        </p>
      </div>
      <div className="ee-report-block rounded-lg bg-white/80 px-3 py-3">
        <p className="text-sm font-semibold text-[#163A70]">③ 종합 진단</p>
        <p className="ee-report-body-text mt-1 text-sm leading-relaxed text-slate-700">
          {diagnosis.integratedDiagnosis}
        </p>
      </div>
      <div className="ee-report-chip-block rounded-lg bg-white/80 px-3 py-3">
        <p className="text-sm font-semibold text-[#163A70]">④ 주요 강점</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {diagnosis.strengths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="ee-report-chip-block rounded-lg bg-white/80 px-3 py-3">
        <p className="text-sm font-semibold text-[#163A70]">⑤ 우선 보완 영역</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {diagnosis.improvementAreas.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="ee-report-manage-block rounded-lg border border-[rgba(15,118,110,0.25)] bg-[rgba(40,199,183,0.1)] px-3 py-3">
        <p className="text-sm font-semibold text-[#0F766E]">⑥ HYPER 맞춤 학습관리 방향</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
          {diagnosis.managementRecommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="ee-report-block rounded-lg bg-white/70 px-3 py-3">
        <p className="text-sm font-semibold text-slate-700">해석 유의사항</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {diagnosis.reliabilityNotes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
