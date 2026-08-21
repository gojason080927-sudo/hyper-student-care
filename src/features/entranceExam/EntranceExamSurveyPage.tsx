import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import {
  fetchEntranceExamAttempts,
  fetchEntranceExamLearningSurveyByAttemptId,
  linkSurveyToEvaluationSession,
  upsertEntranceExamLearningSurvey,
} from '../../lib/db/entranceExamRepository'
import { btnPrimary, btnSecondary } from '../../utils/labels'
import {
  findUnansweredSurveyQuestions,
  LEARNING_SURVEY_AREAS,
  LEARNING_SURVEY_LIKERT,
  LEARNING_SURVEY_QUESTIONS,
  scoreLearningSurvey,
  type LearningSurveyResponses,
} from './learningSurvey'
import type { EntranceExamAttempt, EntranceExamLearningSurvey } from './types'

export function EntranceExamSurveyPage() {
  const { session } = useAuth()
  const location = useLocation()
  const initialAttemptId =
    typeof (location.state as { attemptId?: unknown } | null)?.attemptId === 'string'
      ? (location.state as { attemptId: string }).attemptId
      : ''
  const [attempts, setAttempts] = useState<EntranceExamAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [attemptId, setAttemptId] = useState(initialAttemptId)
  const [responses, setResponses] = useState<LearningSurveyResponses>({})
  const [savedSurvey, setSavedSurvey] = useState<EntranceExamLearningSurvey | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [unanswered, setUnanswered] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const questionRefs = useRef<Record<number, HTMLLIElement | null>>({})

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }, [])

  const reloadAttempts = useCallback(async () => {
    if (!session) {
      setAttempts([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const list = await fetchEntranceExamAttempts()
      setAttempts(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : '응시 결과를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void reloadAttempts()
  }, [reloadAttempts])

  const selectedAttempt = useMemo(
    () => attempts.find((item) => item.id === attemptId) ?? null,
    [attemptId, attempts],
  )

  useEffect(() => {
    if (!attemptId || !session) {
      setResponses({})
      setSavedSurvey(null)
      setShowResult(false)
      setUnanswered([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const existing = await fetchEntranceExamLearningSurveyByAttemptId(attemptId)
        if (cancelled) return
        if (existing) {
          setSavedSurvey(existing)
          setResponses(existing.responses)
          setShowResult(true)
        } else {
          setSavedSurvey(null)
          setResponses({})
          setShowResult(false)
        }
        setUnanswered([])
      } catch (err) {
        if (!cancelled) {
          showToast(err instanceof Error ? err.message : '설문 조회에 실패했습니다.')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [attemptId, session, showToast])

  const setAnswer = (questionNumber: number, value: number) => {
    setResponses((prev) => ({ ...prev, [String(questionNumber)]: value }))
    setUnanswered((prev) => prev.filter((n) => n !== questionNumber))
    setShowResult(false)
  }

  const previewScores = useMemo(() => scoreLearningSurvey(responses), [responses])

  const handleSubmit = async () => {
    if (!session) {
      showToast('로그인이 필요합니다.')
      return
    }
    if (!selectedAttempt) {
      showToast('응시 학생을 선택해 주세요.')
      return
    }
    const missing = findUnansweredSurveyQuestions(responses)
    if (missing.length > 0) {
      setUnanswered(missing)
      setShowResult(false)
      showToast('응답하지 않은 문항이 있습니다. 모든 문항에 답해주세요.')
      const first = missing[0]
      questionRefs.current[first]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const scores = scoreLearningSurvey(responses)
    const wasUpdate = Boolean(savedSurvey)
    setSaving(true)
    const result = await upsertEntranceExamLearningSurvey({
      attemptId: selectedAttempt.id,
      responses,
      motivationScore: scores.motivationScore,
      selfDirectedScore: scores.selfDirectedScore,
      concentrationScore: scores.concentrationScore,
      planningScore: scores.planningScore,
      persistenceScore: scores.persistenceScore,
      confidenceScore: scores.confidenceScore,
      overallScore: scores.overallScore,
    })
    setSaving(false)
    if (!result.success) {
      showToast(result.error || '설문 저장에 실패했습니다.')
      return
    }
    void linkSurveyToEvaluationSession({
      survey: result.record,
      attempt: selectedAttempt,
    })
    setSavedSurvey(result.record)
    setShowResult(true)
    setUnanswered([])
    showToast(wasUpdate ? '설문 결과를 수정·저장했습니다.' : '설문 결과를 저장했습니다.')
  }

  const displayScores = savedSurvey && showResult
    ? {
        motivationScore: savedSurvey.motivationScore,
        selfDirectedScore: savedSurvey.selfDirectedScore,
        concentrationScore: savedSurvey.concentrationScore,
        planningScore: savedSurvey.planningScore,
        persistenceScore: savedSurvey.persistenceScore,
        confidenceScore: savedSurvey.confidenceScore,
        overallScore: savedSurvey.overallScore,
        areaScores: LEARNING_SURVEY_AREAS.map((area) => ({
          label: area.label,
          score:
            area.id === 'motivation'
              ? savedSurvey.motivationScore
              : area.id === 'selfDirected'
                ? savedSurvey.selfDirectedScore
                : area.id === 'concentration'
                  ? savedSurvey.concentrationScore
                  : area.id === 'planning'
                    ? savedSurvey.planningScore
                    : area.id === 'persistence'
                      ? savedSurvey.persistenceScore
                      : savedSurvey.confidenceScore,
        })),
      }
    : null

  return (
    <div className="space-y-6">
      <div>
        <Link to=".." className="text-sm font-medium text-slate-500 hover:text-[#163A70]">
          ← 신입생 평가
        </Link>
        <PageHeader
          title="학습성향 설문"
          description="입학테스트 응시자를 선택한 뒤 24문항 설문을 입력·저장합니다."
        />
      </div>

      {loading ? <p className="text-sm text-slate-500">불러오는 중...</p> : null}
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-[#163A70]">응시 학생 선택</h2>
        {attempts.length === 0 && !loading ? (
          <EmptyState title="저장된 입학테스트 응시 결과가 없습니다. 먼저 응시 결과를 저장해 주세요." />
        ) : (
          <div className="space-y-2">
            {attempts.map((attempt) => {
              const selected = attempt.id === attemptId
              return (
                <button
                  key={attempt.id}
                  type="button"
                  onClick={() => setAttemptId(attempt.id)}
                  className={`flex w-full flex-col rounded-xl border px-4 py-3 text-left transition sm:flex-row sm:items-center sm:justify-between ${
                    selected
                      ? 'border-[#163A70] bg-[rgba(22,58,112,0.04)] ring-1 ring-[#163A70]/25'
                      : 'border-slate-200 hover:border-[#28C7B7]'
                  }`}
                >
                  <span>
                    <span className="block font-bold text-[#163A70]">
                      {attempt.studentName || '(이름 없음)'}
                      {attempt.school ? ` · ${attempt.school}` : ''}
                      {attempt.grade ? ` · ${attempt.grade}` : ''}
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      {attempt.subject} · {attempt.paperTitle} · 총점 {attempt.totalScore}점
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-slate-400 sm:mt-0">
                    {attempt.examDate || attempt.createdAt.slice(0, 10)}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {selectedAttempt ? (
        <>
          <section className="rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-[#0F766E]">
              HYPER 영수 전문학원
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-[#163A70]">신입생 학습성향 설문</h2>
            <div className="mt-3 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-500">학년</span> · {selectedAttempt.grade || '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-500">학교</span> ·{' '}
                {selectedAttempt.school || '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-500">학생 이름</span> ·{' '}
                {selectedAttempt.studentName || '-'}
              </p>
              <p>
                <span className="font-semibold text-slate-500">시험일</span> ·{' '}
                {selectedAttempt.examDate || '-'}
              </p>
              <p className="sm:col-span-2">
                <span className="font-semibold text-slate-500">시험 과목</span> ·{' '}
                {selectedAttempt.subject}
              </p>
            </div>
            {savedSurvey ? (
              <p className="mt-3 text-xs font-medium text-[#0F766E]">
                이미 저장된 설문이 있습니다. 수정 후 다시 저장할 수 있습니다.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-700">응답 척도</p>
            <ul className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {LEARNING_SURVEY_LIKERT.map((item) => (
                <li key={item.value}>
                  <span className="font-bold text-[#163A70]">{item.value}</span> = {item.label}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            {LEARNING_SURVEY_AREAS.map((area) => (
              <div
                key={area.id}
                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <h3 className="text-sm font-bold text-[#163A70]">{area.label}</h3>
                <ul className="space-y-3">
                  {LEARNING_SURVEY_QUESTIONS.filter((q) => q.areaId === area.id).map((question) => {
                    const value = responses[String(question.number)]
                    const missing = unanswered.includes(question.number)
                    return (
                      <li
                        key={question.number}
                        ref={(el) => {
                          questionRefs.current[question.number] = el
                        }}
                        className={`rounded-xl border px-3 py-3 sm:px-4 ${
                          missing
                            ? 'border-rose-300 bg-rose-50'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <p className="text-sm font-medium text-slate-800">
                          <span className="mr-2 font-bold text-[#163A70]">{question.number}.</span>
                          {question.text}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {LEARNING_SURVEY_LIKERT.map((item) => {
                            const on = value === item.value
                            return (
                              <button
                                key={item.value}
                                type="button"
                                aria-label={`${question.number}번 ${item.value}점 ${item.label}`}
                                title={item.label}
                                onClick={() => setAnswer(question.number, item.value)}
                                className={`min-h-10 min-w-10 rounded-xl px-3 text-sm font-bold transition ${
                                  on
                                    ? 'bg-[#163A70] text-white shadow-sm'
                                    : 'border border-slate-200 bg-white text-slate-700 hover:border-[#28C7B7]'
                                }`}
                              >
                                {item.value}
                              </button>
                            )
                          })}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </section>

          {unanswered.length > 0 ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              응답하지 않은 문항이 있습니다. 모든 문항에 답해주세요. (미응답:{' '}
              {unanswered.join(', ')}번)
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit()}
              className={btnPrimary}
            >
              {saving ? '저장 중...' : savedSurvey ? '설문 수정 저장' : '설문 제출·저장'}
            </button>
            {showResult ? (
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setShowResult(false)}
              >
                문항으로 돌아가기
              </button>
            ) : null}
          </div>

          {displayScores ? (
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-[#163A70]">학습성향 결과</h2>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {displayScores.areaScores.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                  >
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="font-bold text-[#163A70]">{item.score}점</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl bg-[rgba(22,58,112,0.06)] px-4 py-4">
                <p className="text-sm font-semibold text-slate-600">종합 학습성향</p>
                <p className="mt-1 text-3xl font-extrabold text-[#163A70]">
                  {displayScores.overallScore}점
                </p>
              </div>
            </section>
          ) : null}

          {!showResult && findUnansweredSurveyQuestions(responses).length === 0 ? (
            <p className="text-xs text-slate-400">
              미리보기 종합 {previewScores.overallScore}점 (제출 시 저장됩니다)
            </p>
          ) : null}
        </>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#163A70] px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
