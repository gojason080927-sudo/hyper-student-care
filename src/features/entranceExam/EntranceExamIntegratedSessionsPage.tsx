import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileStack, Plus } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import {
  fetchEntranceExamAttempts,
  fetchEntranceExamEvaluationSessions,
  fetchEntranceExamLearningSurveys,
  upsertEntranceExamEvaluationSession,
} from '../../lib/db/entranceExamRepository'
import { btnPrimary, btnSecondary } from '../../utils/labels'
import { ENTRANCE_EXAM_GRADES } from './constants'
import { scoreEvaluationCandidateMatch } from './buildEntranceExamIntegratedReport'
import type {
  EntranceExamAttempt,
  EntranceExamEvaluationSession,
  EntranceExamLearningSurvey,
} from './types'

function todayIsoDate() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

type SurveyOption = EntranceExamLearningSurvey & {
  studentName: string
  school: string
  grade: string
  examDate: string
}

/**
 * 통합 종합진단 REPORT — 평가 세션 목록 + 수동 연결 생성.
 * 이름만으로 강제 연결하지 않고, 후보를 보여준 뒤 사용자가 선택한다.
 */
export function EntranceExamIntegratedSessionsPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [sessions, setSessions] = useState<EntranceExamEvaluationSession[]>([])
  const [attempts, setAttempts] = useState<EntranceExamAttempt[]>([])
  const [surveys, setSurveys] = useState<EntranceExamLearningSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)

  const [studentName, setStudentName] = useState('')
  const [school, setSchool] = useState('')
  const [grade, setGrade] = useState('중1')
  const [evaluationDate, setEvaluationDate] = useState(todayIsoDate())
  const [mathAttemptId, setMathAttemptId] = useState('')
  const [englishAttemptId, setEnglishAttemptId] = useState('')
  const [learningSurveyId, setLearningSurveyId] = useState('')

  const reload = useCallback(async () => {
    if (!session) {
      setSessions([])
      setAttempts([])
      setSurveys([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [sessionList, attemptList, surveyList] = await Promise.all([
        fetchEntranceExamEvaluationSessions(),
        fetchEntranceExamAttempts(),
        fetchEntranceExamLearningSurveys(),
      ])
      setSessions(sessionList)
      setAttempts(attemptList)
      setSurveys(surveyList)
    } catch (err) {
      console.error('[integrated sessions] reload failed', err)
      setError('목록을 불러오지 못했습니다. 로그인 상태를 확인해 주세요.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void reload()
  }, [reload])

  const attemptById = useMemo(() => {
    const map = new Map<string, EntranceExamAttempt>()
    for (const item of attempts) map.set(item.id, item)
    return map
  }, [attempts])

  const surveyOptions: SurveyOption[] = useMemo(() => {
    return surveys.map((survey) => {
      const linked = attemptById.get(survey.attemptId)
      return {
        ...survey,
        studentName: linked?.studentName ?? '(응시 정보 없음)',
        school: linked?.school ?? '-',
        grade: linked?.grade ?? '-',
        examDate: linked?.examDate || survey.createdAt.slice(0, 10),
      }
    })
  }, [surveys, attemptById])

  const meta = useMemo(
    () => ({ studentName, school, grade, evaluationDate }),
    [studentName, school, grade, evaluationDate],
  )

  const mathCandidates = useMemo(() => {
    return attempts
      .filter((item) => item.subject === '수학')
      .map((item) => ({
        item,
        match: scoreEvaluationCandidateMatch(meta, {
          studentName: item.studentName,
          school: item.school,
          grade: item.grade,
          examDate: item.examDate,
          createdAt: item.createdAt,
        }),
      }))
      .sort((a, b) => b.match - a.match || b.item.createdAt.localeCompare(a.item.createdAt))
  }, [attempts, meta])

  const englishCandidates = useMemo(() => {
    return attempts
      .filter((item) => item.subject === '영어')
      .map((item) => ({
        item,
        match: scoreEvaluationCandidateMatch(meta, {
          studentName: item.studentName,
          school: item.school,
          grade: item.grade,
          examDate: item.examDate,
          createdAt: item.createdAt,
        }),
      }))
      .sort((a, b) => b.match - a.match || b.item.createdAt.localeCompare(a.item.createdAt))
  }, [attempts, meta])

  const surveyCandidates = useMemo(() => {
    return surveyOptions
      .map((item) => ({
        item,
        match: scoreEvaluationCandidateMatch(meta, {
          studentName: item.studentName,
          school: item.school,
          grade: item.grade,
          examDate: item.examDate,
          createdAt: item.createdAt,
        }),
      }))
      .sort((a, b) => b.match - a.match || b.item.createdAt.localeCompare(a.item.createdAt))
  }, [surveyOptions, meta])

  const resetForm = () => {
    setEditingSessionId(null)
    setStudentName('')
    setSchool('')
    setGrade('중1')
    setEvaluationDate(todayIsoDate())
    setMathAttemptId('')
    setEnglishAttemptId('')
    setLearningSurveyId('')
  }

  const openCreate = () => {
    resetForm()
    setCreating(true)
    setError(null)
  }

  const openEdit = (item: EntranceExamEvaluationSession) => {
    setEditingSessionId(item.id)
    setStudentName(item.studentName)
    setSchool(item.school)
    setGrade(item.grade || '중1')
    setEvaluationDate(item.evaluationDate || todayIsoDate())
    setMathAttemptId(item.mathAttemptId ?? '')
    setEnglishAttemptId(item.englishAttemptId ?? '')
    setLearningSurveyId(item.learningSurveyId ?? '')
    setCreating(true)
    setError(null)
  }

  const handleCreate = async () => {
    if (!session) {
      setError('로그인이 필요합니다.')
      return
    }
    if (!studentName.trim()) {
      setError('학생 이름을 입력해 주세요.')
      return
    }
    if (!mathAttemptId && !englishAttemptId && !learningSurveyId) {
      setError('수학·영어·학습성향 결과 중 하나 이상을 선택해 주세요.')
      return
    }
    setSaving(true)
    setError(null)
    const result = await upsertEntranceExamEvaluationSession({
      id: editingSessionId ?? undefined,
      studentName,
      school,
      grade,
      evaluationDate,
      mathAttemptId: mathAttemptId || null,
      englishAttemptId: englishAttemptId || null,
      learningSurveyId: learningSurveyId || null,
    })
    setSaving(false)
    if (!result.success) {
      console.error('[integrated session] save failed', result.error)
      setError('평가 세션을 저장하지 못했습니다. 로그인 상태와 선택 값을 확인해 주세요.')
      return
    }
    setCreating(false)
    resetForm()
    await reload()
    navigate(`/entrance-exam/integrated-report?sessionId=${encodeURIComponent(result.record.id)}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to=".." className="text-sm font-medium text-slate-500 hover:text-[#163A70]">
          ← 신입생 평가
        </Link>
        <PageHeader
          title="통합 종합진단 REPORT"
          description="수학·영어 입학테스트와 학습성향 결과를 하나의 평가 세션으로 묶어 조회·출력합니다."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnSecondary} onClick={() => void reload()}>
                새로고침
              </button>
              <button
                type="button"
                className={`${btnPrimary} inline-flex items-center gap-2`}
                onClick={openCreate}
              >
                <Plus className="h-4 w-4" aria-hidden />
                새 평가 세션 만들기
              </button>
            </div>
          }
        />
      </div>

      {loading ? <p className="text-sm text-slate-500">불러오는 중...</p> : null}
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}

      {creating ? (
        <section className="space-y-4 rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-base font-bold text-[#163A70]">
            {editingSessionId ? '평가 세션 수정' : '새 평가 세션'}
          </h3>
          <p className="text-sm text-slate-500">
            이름만으로 자동 연결하지 않습니다. 후보를 확인한 뒤 직접 선택해 주세요.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">학생 이름</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="예: 김새롬"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">학교</span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="예: 양지중"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">학년</span>
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                {ENTRANCE_EXAM_GRADES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">평가일</span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                value={evaluationDate}
                onChange={(e) => setEvaluationDate(e.target.value)}
              />
            </label>
          </div>

          <ResultPicker
            title="수학 결과 선택"
            value={mathAttemptId}
            onChange={setMathAttemptId}
            emptyLabel="수학 평가 없음 (선택 안 함)"
            options={mathCandidates.map(({ item, match }) => ({
              id: item.id,
              match,
              lines: [
                `${item.studentName} · ${item.school || '-'} · ${item.grade || '-'}`,
                `시험일 ${item.examDate || '-'} · ${item.paperTitle || '시험지'} · ${item.totalScore}점 (${item.correctCount}/${item.totalCount})`,
              ],
            }))}
          />

          <ResultPicker
            title="영어 결과 선택"
            value={englishAttemptId}
            onChange={setEnglishAttemptId}
            emptyLabel="영어 평가 없음 (선택 안 함)"
            options={englishCandidates.map(({ item, match }) => ({
              id: item.id,
              match,
              lines: [
                `${item.studentName} · ${item.school || '-'} · ${item.grade || '-'}`,
                `시험일 ${item.examDate || '-'} · ${item.paperTitle || '시험지'} · ${item.totalScore}점 (${item.correctCount}/${item.totalCount})`,
              ],
            }))}
          />

          <ResultPicker
            title="학습성향 결과 선택"
            value={learningSurveyId}
            onChange={setLearningSurveyId}
            emptyLabel="학습성향 설문 없음 (선택 안 함)"
            options={surveyCandidates.map(({ item, match }) => ({
              id: item.id,
              match,
              lines: [
                `${item.studentName} · ${item.school || '-'} · ${item.grade || '-'}`,
                `설문일 ${item.examDate || item.createdAt.slice(0, 10)} · 종합 ${item.overallScore}점`,
              ],
            }))}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={saving}
              onClick={() => void handleCreate()}
            >
              {saving
                ? '저장 중...'
                : editingSessionId
                  ? '세션 수정 후 REPORT 열기'
                  : '세션 저장 후 REPORT 열기'}
            </button>
            <button
              type="button"
              className={btnSecondary}
              disabled={saving}
              onClick={() => {
                setCreating(false)
                resetForm()
              }}
            >
              취소
            </button>
          </div>
        </section>
      ) : null}

      {!loading && sessions.length === 0 && !creating ? (
        <EmptyState
          title="저장된 통합 평가 세션이 없습니다."
          description="새 평가 세션을 만들어 기존 수학·영어·학습성향 결과를 연결하세요."
        />
      ) : null}

      {sessions.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-600">저장된 평가 세션</h3>
          <ul className="space-y-3">
            {sessions.map((item) => {
              const math = item.mathAttemptId ? attemptById.get(item.mathAttemptId) : null
              const english = item.englishAttemptId
                ? attemptById.get(item.englishAttemptId)
                : null
              const survey = surveys.find((row) => row.id === item.learningSurveyId)
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#163A70]">
                      {item.studentName || '(이름 없음)'} · {item.school || '-'} ·{' '}
                      {item.grade || '-'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      평가일 {item.evaluationDate || '-'} · 수학{' '}
                      {math ? `${math.totalScore}점` : '없음'} · 영어{' '}
                      {english ? `${english.totalScore}점` : '없음'} · 성향{' '}
                      {survey ? `${survey.overallScore}점` : '없음'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => openEdit(item)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className={`${btnPrimary} inline-flex items-center gap-2`}
                      onClick={() =>
                        navigate(
                          `/entrance-exam/integrated-report?sessionId=${encodeURIComponent(item.id)}`,
                        )
                      }
                    >
                      <FileStack className="h-4 w-4" aria-hidden />
                      통합 REPORT
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function ResultPicker(props: {
  title: string
  value: string
  onChange: (id: string) => void
  emptyLabel: string
  options: Array<{ id: string; match: number; lines: string[] }>
}) {
  const { title, value, onChange, emptyLabel, options } = props
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-sm font-semibold text-[#163A70]">{title}</p>
      <select
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.match > 0 ? `[후보 ${option.match}] ` : ''}
            {option.lines.join(' | ')}
          </option>
        ))}
      </select>
      {value ? (
        <p className="text-xs text-slate-500">
          {options.find((item) => item.id === value)?.lines.join(' · ')}
        </p>
      ) : null}
    </div>
  )
}
