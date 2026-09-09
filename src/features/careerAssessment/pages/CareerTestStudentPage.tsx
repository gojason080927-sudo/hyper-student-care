import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LIKERT_OPTIONS } from '../data/labels'
import {
  loadCareerTest,
  saveCareerAnswers,
  submitCareerTest,
  type PublicCareerLoad,
  type PublicCareerQuestion,
} from '../api/careerAssessmentApi'
import { timeEstimateForVersion } from '../types'
import { CAREER_ENDED_LINK_MESSAGE, isCareerLinkEndedError } from '../utils/careerSessionDelete'

const PAGE_SIZE = 5
const SAVE_DEBOUNCE_MS = 350

function firstUnansweredIndex(
  questions: PublicCareerQuestion[],
  answers: Record<string, number>,
): number {
  const idx = questions.findIndex((q) => answers[q.id] == null)
  return idx < 0 ? 0 : idx
}

export function CareerTestStudentPage() {
  const { token = '' } = useParams()
  const [load, setLoad] = useState<PublicCareerLoad | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [page, setPage] = useState(0)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const pendingRef = useRef<Record<string, number>>({})
  const timerRef = useRef<number | null>(null)
  const questionRefs = useRef<Record<string, HTMLElement | null>>({})

  const questions = useMemo(
    () => [...(load?.questions ?? [])].sort((a, b) => a.displayOrder - b.displayOrder),
    [load],
  )
  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE))
  const pageQuestions = questions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const totalQuestions = load?.session.expectedQuestionCount || questions.length
  const answeredCount = questions.filter((q) => answers[q.id] != null).length
  const progress = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0
  const showEncouragement = totalQuestions === 140 && [7, 14, 21].includes(page)

  useEffect(() => {
    let cancelled = false
    void loadCareerTest(token)
      .then((data) => {
        if (cancelled) return
        const next: Record<string, number> = {}
        for (const row of data.answers) next[row.question_id] = row.answer
        setLoad(data)
        setAnswers(next)
        setCompleted(data.session.status === 'completed')
        const start = firstUnansweredIndex(
          [...data.questions].sort((a, b) => a.displayOrder - b.displayOrder),
          next,
        )
        setPage(Math.floor(start / PAGE_SIZE))
      })
      .catch(() => {
        if (!cancelled) setError(CAREER_ENDED_LINK_MESSAGE)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const flushSave = async () => {
    const pending = pendingRef.current
    const entries = Object.entries(pending)
    if (entries.length === 0) return
    pendingRef.current = {}
    setSaveState('saving')
    try {
      await saveCareerAnswers(
        token,
        entries.map(([questionId, answer]) => ({ questionId, answer })),
      )
      setSaveState('saved')
    } catch (saveError) {
      if (isCareerLinkEndedError(saveError)) {
        setLoad(null)
        setError(CAREER_ENDED_LINK_MESSAGE)
        return
      }
      setSaveState('error')
    }
  }

  const queueSave = (questionId: string, answer: number) => {
    pendingRef.current[questionId] = answer
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      void flushSave()
    }, SAVE_DEBOUNCE_MS)
  }

  const selectAnswer = (questionId: string, answer: number) => {
    if (completed) return
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
    setSaveState('saving')
    queueSave(questionId, answer)
  }

  const goMissing = () => {
    const missing = questions.find((q) => answers[q.id] == null)
    if (!missing) return
    setPage(Math.floor(questions.findIndex((q) => q.id === missing.id) / PAGE_SIZE))
    window.setTimeout(() => {
      questionRefs.current[missing.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  const handleSubmit = async () => {
    const missing = questions.filter((q) => answers[q.id] == null)
    if (missing.length > 0) {
      setError('응답하지 않은 문항이 있습니다.')
      goMissing()
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await flushSave()
      await submitCareerTest(token)
      setCompleted(true)
    } catch (submitError) {
      const missing = (submitError as { missing?: number[] }).missing
      if (missing?.length) {
        setError('응답하지 않은 문항이 있습니다.')
        goMissing()
      } else if ((submitError as { error?: string }).error === 'already_completed') {
        setCompleted(true)
      } else if (isCareerLinkEndedError(submitError)) {
        setLoad(null)
        setError(CAREER_ENDED_LINK_MESSAGE)
      } else {
        setError('제출에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !load) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#F6F8FB] px-4">
        <p className="text-center text-sm text-slate-600">{error}</p>
      </div>
    )
  }

  if (!load) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#F6F8FB] px-4">
        <p className="text-sm text-slate-500">검사를 준비하고 있습니다.</p>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#F6F8FB] px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#163A70]">HYPER ACADEMY</p>
          <h1 className="mt-3 text-xl font-bold text-navy-900">검사가 완료되었습니다.</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            결과는 학원 선생님과 학부모님께 안내됩니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[#F6F8FB]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-[#163A70]">HYPER ACADEMY</p>
        <h1 className="text-lg font-bold text-navy-900">진로·학과 적성검사</h1>
        <p className="mt-1 text-sm text-slate-600">
          {load.student.name} · {load.student.school} · {load.student.grade}
        </p>
        <p className="text-xs text-slate-500">
          총 {totalQuestions}문항 · 예상 소요시간 {timeEstimateForVersion(load.session.assessmentVersion)}
        </p>
        <div className="mt-2 flex items-center justify-between text-sm font-semibold text-navy-900">
          <span>
            {answeredCount} / {totalQuestions} · {progress}%
          </span>
          <span className="text-xs font-medium text-slate-500">
            {saveState === 'saved' ? '저장됨' : saveState === 'saving' ? '저장 중' : saveState === 'error' ? '저장 실패' : ''}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-2 bg-[#28C7B7]" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 px-4 py-4 pb-28">
        {showEncouragement ? (
          <p className="rounded-xl bg-white px-4 py-2 text-center text-sm text-slate-600 shadow-sm">
            여기까지 잘 진행하고 있어요.
          </p>
        ) : null}
        {pageQuestions.map((question, index) => (
          <section
            key={question.id}
            ref={(node) => {
              questionRefs.current[question.id] = node
            }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold text-slate-500">
              {page * PAGE_SIZE + index + 1} / {totalQuestions}
            </p>
            <p className="mt-1 text-[15px] font-medium leading-relaxed text-navy-900">{question.text}</p>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {LIKERT_OPTIONS.map((option) => {
                const selected = answers[question.id] === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => selectAnswer(question.id, option.value)}
                    className={`min-h-14 rounded-xl border px-1 py-2 text-center ${
                      selected
                        ? 'border-[#163A70] bg-[#163A70] text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block text-lg font-bold">{option.value}</span>
                    <span className="mt-1 block text-[10px] leading-tight">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-xl gap-2">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            className="min-h-11 flex-1 rounded-xl border border-slate-200 text-sm font-semibold disabled:opacity-40"
          >
            이전
          </button>
          {page < totalPages - 1 ? (
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              className="min-h-11 flex-1 rounded-xl bg-[#163A70] text-sm font-semibold text-white"
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="min-h-11 flex-1 rounded-xl bg-[#163A70] text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? '제출 중' : '완료'}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}
