import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import {
  fetchEntranceExamAttempts,
  fetchEntranceExamEvaluationSessions,
  fetchEntranceExamLearningSurveyById,
  fetchEntranceExamQuestions,
} from '../../lib/db/entranceExamRepository'
import { btnPrimary, btnSecondary } from '../../utils/labels'
import {
  buildEntranceExamIntegratedDiagnosis,
  type EntranceExamIntegratedDiagnosis,
} from './buildEntranceExamIntegratedDiagnosis'
import {
  buildEntranceExamIntegratedReport,
  type EntranceExamIntegratedReport,
} from './buildEntranceExamIntegratedReport'
import { EntranceExamIntegratedReportDocument } from './components/EntranceExamIntegratedReportDocument'
import type {
  EntranceExamAttempt,
  EntranceExamEvaluationSession,
  EntranceExamLearningSurvey,
  EntranceExamQuestion,
} from './types'
import './components/entranceExamReportPrint.css'

function runIntegratedReportPrint() {
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

/** 통합 REPORT 상세 — DB evaluation session 기준으로 수학/영어/설문 로드 */
export function EntranceExamIntegratedReportPage() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedSessionId = searchParams.get('sessionId') ?? ''

  const [sessions, setSessions] = useState<EntranceExamEvaluationSession[]>([])
  const [attempts, setAttempts] = useState<EntranceExamAttempt[]>([])
  const [questions, setQuestions] = useState<EntranceExamQuestion[]>([])
  const [survey, setSurvey] = useState<EntranceExamLearningSurvey | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingSurvey, setLoadingSurvey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!session) {
      setSessions([])
      setAttempts([])
      setQuestions([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [sessionList, attemptList, questionList] = await Promise.all([
        fetchEntranceExamEvaluationSessions(),
        fetchEntranceExamAttempts(),
        fetchEntranceExamQuestions(),
      ])
      setSessions(sessionList)
      setAttempts(attemptList)
      setQuestions(questionList)
    } catch (err) {
      console.error('[integrated report] reload failed', err)
      setError('데이터를 불러오지 못했습니다. 로그인 상태를 확인해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void reload()
  }, [reload])

  const selectedSession = useMemo(
    () => sessions.find((item) => item.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  )

  const mathAttempt = useMemo(() => {
    if (!selectedSession?.mathAttemptId) return null
    return attempts.find((item) => item.id === selectedSession.mathAttemptId) ?? null
  }, [attempts, selectedSession])

  const englishAttempt = useMemo(() => {
    if (!selectedSession?.englishAttemptId) return null
    return attempts.find((item) => item.id === selectedSession.englishAttemptId) ?? null
  }, [attempts, selectedSession])

  useEffect(() => {
    let cancelled = false
    async function loadSurvey() {
      if (!selectedSession?.learningSurveyId || !session) {
        setSurvey(null)
        return
      }
      setLoadingSurvey(true)
      try {
        const row = await fetchEntranceExamLearningSurveyById(selectedSession.learningSurveyId)
        if (!cancelled) setSurvey(row)
      } catch (err) {
        if (!cancelled) {
          console.error('[integrated report] survey load failed', err)
          setSurvey(null)
          setError('학습성향 결과를 불러오지 못했습니다.')
        }
      } finally {
        if (!cancelled) setLoadingSurvey(false)
      }
    }
    void loadSurvey()
    return () => {
      cancelled = true
    }
  }, [selectedSession?.learningSurveyId, session])

  const report: EntranceExamIntegratedReport | null = useMemo(() => {
    if (!selectedSession) return null
    return buildEntranceExamIntegratedReport({
      session: selectedSession,
      mathAttempt,
      englishAttempt,
      survey,
      questions,
    })
  }, [selectedSession, mathAttempt, englishAttempt, survey, questions])

  const diagnosis: EntranceExamIntegratedDiagnosis | null = useMemo(() => {
    if (!report) return null
    return buildEntranceExamIntegratedDiagnosis(report)
  }, [report])

  return (
    <div className="space-y-6">
      <div className="ee-report-no-print">
        <Link
          to="/entrance-exam/integrated"
          className="text-sm font-medium text-slate-500 hover:text-[#163A70]"
        >
          ← 통합 평가 세션
        </Link>
        <PageHeader
          title="신입생 통합 종합진단 REPORT"
          description="수학·영어·학습성향을 하나의 REPORT로 조회하고 출력합니다."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnSecondary} onClick={() => void reload()}>
                새로고침
              </button>
              <button
                type="button"
                className={`${btnPrimary} inline-flex items-center gap-2`}
                disabled={!report || loadingSurvey}
                onClick={runIntegratedReportPrint}
              >
                <Printer className="h-4 w-4" aria-hidden />
                통합 리포트 출력
              </button>
            </div>
          }
        />
      </div>

      {loading ? <p className="ee-report-no-print text-sm text-slate-500">불러오는 중...</p> : null}
      {error ? <p className="ee-report-no-print text-sm text-rose-500">{error}</p> : null}

      {!loading && sessions.length === 0 ? (
        <div className="ee-report-no-print">
          <EmptyState
            title="통합 평가 세션이 없습니다."
            description="통합 종합진단 REPORT 메뉴에서 새 세션을 만들어 주세요."
          />
        </div>
      ) : null}

      {sessions.length > 0 ? (
        <div className="ee-report-no-print">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">평가 세션 선택</span>
            <select
              className="w-full max-w-xl rounded-xl border border-slate-200 px-3 py-2"
              value={selectedSessionId}
              onChange={(e) =>
                setSearchParams(e.target.value ? { sessionId: e.target.value } : {})
              }
            >
              <option value="">세션을 선택하세요</option>
              {sessions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.studentName || '(이름 없음)'} · {item.school || '-'} · {item.grade || '-'} ·{' '}
                  {item.evaluationDate || '-'}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {report && diagnosis ? (
        <div className="ee-report-print-root">
          <EntranceExamIntegratedReportDocument report={report} diagnosis={diagnosis} />
        </div>
      ) : null}

      {!loading && selectedSessionId && !selectedSession ? (
        <p className="ee-report-no-print text-sm text-rose-500">선택한 세션을 찾을 수 없습니다.</p>
      ) : null}
    </div>
  )
}
