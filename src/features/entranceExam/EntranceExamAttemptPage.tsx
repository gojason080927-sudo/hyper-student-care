import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { useAuth } from '../../contexts/AuthContext'
import { useData } from '../../hooks/useData'
import {
  fetchEntranceExamAttempts,
  fetchEntranceExamPapers,
  fetchEntranceExamQuestions,
  linkAttemptToEvaluationSession,
  upsertEntranceExamAttempt,
} from '../../lib/db/entranceExamRepository'
import { btnPrimary, btnSecondary, inputClass } from '../../utils/labels'
import { CHOICE_LABELS } from './constants'
import {
  choiceLabel,
  formatAreaScoreDisplay,
  gradeEntranceExamAttempt,
} from './grading'
import type {
  EntranceExamAttempt,
  EntranceExamPaper,
  EntranceExamQuestion,
} from './types'

type Step = 'form' | 'result' | 'saved'

function todayInputValue(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function EntranceExamAttemptPage() {
  const { session } = useAuth()
  const { students } = useData()
  const [papers, setPapers] = useState<EntranceExamPaper[]>([])
  const [questions, setQuestions] = useState<EntranceExamQuestion[]>([])
  const [attempts, setAttempts] = useState<EntranceExamAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [school, setSchool] = useState('')
  const [studentName, setStudentName] = useState('')
  const [grade, setGrade] = useState('')
  const [examDate, setExamDate] = useState(todayInputValue())
  const [linkedStudentId, setLinkedStudentId] = useState<string>('')
  const [paperId, setPaperId] = useState('')
  const [studentChoices, setStudentChoices] = useState<Record<string, number | null>>({})
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const [graded, setGraded] = useState<ReturnType<typeof gradeEntranceExamAttempt> | null>(null)
  const [step, setStep] = useState<Step>('form')
  const [saving, setSaving] = useState(false)
  const [viewingAttempt, setViewingAttempt] = useState<EntranceExamAttempt | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const reload = useCallback(async () => {
    if (!session) {
      setPapers([])
      setQuestions([])
      setAttempts([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [paperList, questionList, attemptList] = await Promise.all([
        fetchEntranceExamPapers(),
        fetchEntranceExamQuestions(),
        fetchEntranceExamAttempts(),
      ])
      setPapers(paperList)
      setQuestions(questionList)
      setAttempts(attemptList)
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void reload()
  }, [reload])

  const selectedPaper = useMemo(
    () => papers.find((item) => item.id === paperId) ?? null,
    [paperId, papers],
  )

  const paperQuestions = useMemo(() => {
    if (!selectedPaper) return []
    const byId = new Map(questions.map((item) => [item.id, item]))
    return selectedPaper.questionIds
      .map((id) => byId.get(id))
      .filter((item): item is EntranceExamQuestion => Boolean(item))
  }, [questions, selectedPaper])

  useEffect(() => {
    if (!selectedPaper) {
      setStudentChoices({})
      setGraded(null)
      setStep('form')
      setViewingAttempt(null)
      return
    }
    // 저장된 결과 조회 중이면 선택지/채점 상태를 덮어쓰지 않음
    if (viewingAttempt && viewingAttempt.paperId === selectedPaper.id) return
    setStudentChoices((prev) => {
      const next: Record<string, number | null> = {}
      for (const id of selectedPaper.questionIds) {
        next[id] = prev[id] ?? null
      }
      return next
    })
    setGraded(null)
    setStep('form')
    setActiveQuestionIndex(0)
  }, [selectedPaper, viewingAttempt])

  const applyStudent = (studentId: string) => {
    setLinkedStudentId(studentId)
    const student = students.find((item) => item.id === studentId)
    if (!student) return
    setSchool(student.school || '')
    setStudentName(student.name || '')
    setGrade(String(student.grade || ''))
  }

  const setChoice = (questionId: string, choice: number) => {
    setStudentChoices((prev) => ({ ...prev, [questionId]: choice }))
    setGraded(null)
    setStep('form')
  }

  useEffect(() => {
    if (step !== 'form' || paperQuestions.length === 0) return
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }
      const key = event.key
      if (key >= '1' && key <= '5') {
        const question = paperQuestions[activeQuestionIndex]
        if (!question) return
        event.preventDefault()
        setChoice(question.id, Number(key))
        setActiveQuestionIndex((prev) => Math.min(prev + 1, paperQuestions.length - 1))
        return
      }
      if (key === 'ArrowDown' || key === 'Enter') {
        event.preventDefault()
        setActiveQuestionIndex((prev) => Math.min(prev + 1, paperQuestions.length - 1))
      }
      if (key === 'ArrowUp') {
        event.preventDefault()
        setActiveQuestionIndex((prev) => Math.max(prev - 1, 0))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeQuestionIndex, paperQuestions, step])

  const unansweredCount = paperQuestions.filter((item) => !studentChoices[item.id]).length

  const handleGrade = () => {
    if (!selectedPaper || paperQuestions.length === 0) {
      showToast('시험지를 선택해 주세요.')
      return
    }
    if (!studentName.trim()) {
      showToast('학생 이름을 입력해 주세요.')
      return
    }
    if (paperQuestions.length !== selectedPaper.questionIds.length) {
      showToast('시험지 문제 일부를 불러오지 못했습니다. 문제은행을 확인해 주세요.')
      return
    }
    const result = gradeEntranceExamAttempt(
      paperQuestions,
      studentChoices,
      selectedPaper.subject,
    )
    setGraded(result)
    setStep('result')
    setViewingAttempt(null)
  }

  const handleSave = async () => {
    if (!session) {
      showToast('로그인이 필요합니다.')
      return
    }
    if (!selectedPaper || !graded) return
    setSaving(true)
    const result = await upsertEntranceExamAttempt({
      paperId: selectedPaper.id,
      paperTitle: selectedPaper.title,
      subject: selectedPaper.subject,
      school,
      studentName,
      grade,
      examDate,
      linkedStudentId: linkedStudentId || null,
      answers: graded.answers,
      correctCount: graded.correctCount,
      totalCount: graded.totalCount,
      totalScore: graded.totalScore,
      areaScores: graded.areaScores,
    })
    setSaving(false)
    if (!result.success) {
      showToast(result.error || '결과 저장에 실패했습니다.')
      return
    }
    void linkAttemptToEvaluationSession(result.record)
    setAttempts((prev) => [result.record, ...prev.filter((item) => item.id !== result.record.id)])
    setViewingAttempt(result.record)
    setStep('saved')
    showToast('응시 결과를 저장했습니다.')
  }

  const openSavedAttempt = (attempt: EntranceExamAttempt) => {
    setViewingAttempt(attempt)
    setPaperId(attempt.paperId)
    setSchool(attempt.school)
    setStudentName(attempt.studentName)
    setGrade(attempt.grade)
    setExamDate(attempt.examDate || todayInputValue())
    setLinkedStudentId(attempt.linkedStudentId || '')
    const choices: Record<string, number | null> = {}
    for (const answer of attempt.answers) {
      choices[answer.questionId] = answer.studentChoice
    }
    setStudentChoices(choices)
    setGraded({
      answers: attempt.answers,
      correctCount: attempt.correctCount,
      totalCount: attempt.totalCount,
      totalScore: attempt.totalScore,
      areaScores: attempt.areaScores,
    })
    setStep('saved')
  }

  const display = viewingAttempt
    ? {
        studentName: viewingAttempt.studentName,
        school: viewingAttempt.school,
        grade: viewingAttempt.grade,
        subject: viewingAttempt.subject,
        paperTitle: viewingAttempt.paperTitle,
        examDate: viewingAttempt.examDate,
        correctCount: viewingAttempt.correctCount,
        totalCount: viewingAttempt.totalCount,
        totalScore: viewingAttempt.totalScore,
        areaScores: viewingAttempt.areaScores,
        answers: viewingAttempt.answers,
      }
    : graded && selectedPaper
      ? {
          studentName,
          school,
          grade,
          subject: selectedPaper.subject,
          paperTitle: selectedPaper.title,
          examDate,
          correctCount: graded.correctCount,
          totalCount: graded.totalCount,
          totalScore: graded.totalScore,
          areaScores: graded.areaScores,
          answers: graded.answers,
        }
      : null

  return (
    <div className="space-y-6">
      <div>
        <Link to=".." className="text-sm font-medium text-slate-500 hover:text-[#163A70]">
          ← 신입생 평가
        </Link>
        <PageHeader
          title="응시 결과 입력"
          description="저장된 시험지를 선택하고 학생 답안을 입력한 뒤 자동채점·저장합니다."
        />
      </div>

      {loading ? <p className="text-sm text-slate-500">불러오는 중...</p> : null}
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-[#163A70]">1. 응시자 정보</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-600">
              기존 학생 불러오기 (선택)
            </span>
            <select
              value={linkedStudentId}
              onChange={(e) => {
                if (!e.target.value) {
                  setLinkedStudentId('')
                  return
                }
                applyStudent(e.target.value)
              }}
              className={inputClass()}
            >
              <option value="">직접 입력 (신입생 임시 응시자)</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.school} · {student.grade}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">학교</span>
            <input
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              className={inputClass()}
              placeholder="학교명"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">학생 이름</span>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className={inputClass()}
              placeholder="이름"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">학년</span>
            <input
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className={inputClass()}
              placeholder="예: 중1"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">시험일</span>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className={inputClass()}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-[#163A70]">2. 저장된 시험지 선택</h2>
        {papers.length === 0 && !loading ? (
          <EmptyState title="저장된 시험지가 없습니다. 문제은행에서 시험지를 저장해 주세요." />
        ) : (
          <div className="space-y-2">
            {papers.map((paper) => {
              const selected = paper.id === paperId
              return (
                <button
                  key={paper.id}
                  type="button"
                  onClick={() => {
                    setViewingAttempt(null)
                    setPaperId(paper.id)
                  }}
                  className={`flex w-full flex-col rounded-xl border px-4 py-3 text-left transition sm:flex-row sm:items-center sm:justify-between ${
                    selected
                      ? 'border-[#163A70] bg-[rgba(22,58,112,0.04)] ring-1 ring-[#163A70]/25'
                      : 'border-slate-200 bg-white hover:border-[#28C7B7]'
                  }`}
                >
                  <span>
                    <span className="block font-bold text-[#163A70]">{paper.title}</span>
                    <span className="mt-1 block text-sm text-slate-500">
                      {paper.subject} · {paper.targetGrade || '학년 미지정'} · {paper.questionCount}
                      문항
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-slate-400 sm:mt-0">
                    {paper.createdAt.slice(0, 10)} 생성
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {selectedPaper ? (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#163A70]">3. 답안 입력</h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedPaper.title} · {paperQuestions.length}문항
                {unansweredCount > 0 ? ` · 미입력 ${unansweredCount}문항` : ' · 모두 입력됨'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                숫자 키 1~5로 선택, ↑↓로 문항 이동
              </p>
            </div>
            <button type="button" onClick={handleGrade} className={btnPrimary}>
              자동채점
            </button>
          </div>

          {paperQuestions.length === 0 ? (
            <p className="text-sm text-rose-500">
              시험지에 연결된 문제를 불러오지 못했습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {paperQuestions.map((question, index) => {
                const selected = studentChoices[question.id] ?? null
                const active = index === activeQuestionIndex
                return (
                  <li
                    key={question.id}
                    className={`rounded-xl border px-3 py-2.5 ${
                      active ? 'border-[#163A70] bg-[rgba(22,58,112,0.03)]' : 'border-slate-200'
                    }`}
                    onClick={() => setActiveQuestionIndex(index)}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="w-10 shrink-0 text-sm font-bold text-[#163A70]">
                        {index + 1}번
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {CHOICE_LABELS.map((label, choiceIndex) => {
                          const value = choiceIndex + 1
                          const on = selected === value
                          return (
                            <button
                              key={label}
                              type="button"
                              aria-label={`${index + 1}번 ${label}`}
                              onClick={() => setChoice(question.id, value)}
                              className={`min-w-[2.5rem] rounded-lg px-2.5 py-1.5 text-sm font-bold transition ${
                                on
                                  ? 'bg-[#163A70] text-white'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:border-[#28C7B7]'
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : null}

      {display ? (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#163A70]">
                {step === 'saved' ? '저장된 결과' : '4. 채점 결과'}
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                {display.studentName}
                {display.school ? ` · ${display.school}` : ''}
                {display.grade ? ` · ${display.grade}` : ''}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {display.subject} · {display.paperTitle}
                {display.examDate ? ` · ${display.examDate}` : ''}
              </p>
            </div>
            {step === 'result' ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className={btnPrimary}
              >
                {saving ? '저장 중...' : '결과 저장'}
              </button>
            ) : null}
          </div>

          <div className="rounded-xl bg-[rgba(22,58,112,0.06)] px-4 py-4">
            <p className="text-3xl font-extrabold text-[#163A70]">{display.totalScore}점</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              정답 {display.correctCount} / {display.totalCount}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-700">평가영역별 결과</h3>
            <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
              {display.areaScores.map((area) => {
                const view = formatAreaScoreDisplay(area)
                return (
                  <li
                    key={area.area}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
                  >
                    <span className="font-semibold text-slate-700">{area.area}</span>
                    <span className="text-slate-500">{view.fractionText}</span>
                    <span className="min-w-[4rem] text-right font-bold text-[#163A70]">
                      {view.scoreText}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-700">문항별 채점 결과</h3>
            <ul className="mt-2 space-y-1.5">
              {display.answers.map((answer) => (
                <li
                  key={`${answer.questionId}-${answer.number}`}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-sm ${
                    answer.isCorrect ? 'bg-slate-50 text-slate-700' : 'bg-rose-50 text-rose-800'
                  }`}
                >
                  <span className="w-10 font-bold">{answer.number}번</span>
                  <span>학생답 {choiceLabel(answer.studentChoice)}</span>
                  <span>정답 {choiceLabel(answer.correctChoice)}</span>
                  <span className="font-bold">{answer.isCorrect ? 'O' : 'X'}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-[#163A70]">저장된 응시 결과</h2>
          <button type="button" className={btnSecondary} onClick={() => void reload()}>
            새로고침
          </button>
        </div>
        {attempts.length === 0 ? (
          <p className="text-sm text-slate-500">아직 저장된 결과가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                <button
                  type="button"
                  onClick={() => openSavedAttempt(attempt)}
                  className="flex w-full flex-col rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-[#28C7B7] sm:flex-row sm:items-center sm:justify-between"
                >
                  <span>
                    <span className="block font-bold text-[#163A70]">
                      {attempt.studentName} · {attempt.totalScore}점
                    </span>
                    <span className="mt-1 block text-sm text-slate-500">
                      {attempt.subject} · {attempt.paperTitle} · 정답 {attempt.correctCount}/
                      {attempt.totalCount}
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-slate-400 sm:mt-0">
                    {attempt.examDate || attempt.createdAt.slice(0, 10)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#163A70] px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
