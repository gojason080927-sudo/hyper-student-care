import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import {
  fetchEntranceExamAttempts,
  fetchEntranceExamLearningSurveys,
} from '../../lib/db/entranceExamRepository'
import { btnSecondary } from '../../utils/labels'
import type { EntranceExamAttempt, EntranceExamLearningSurvey } from './types'

export function EntranceExamResultsPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [attempts, setAttempts] = useState<EntranceExamAttempt[]>([])
  const [surveys, setSurveys] = useState<EntranceExamLearningSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!session) {
      setAttempts([])
      setSurveys([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [attemptList, surveyList] = await Promise.all([
        fetchEntranceExamAttempts(),
        fetchEntranceExamLearningSurveys(),
      ])
      setAttempts(attemptList)
      setSurveys(surveyList)
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 결과를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void reload()
  }, [reload])

  const surveyByAttempt = useMemo(() => {
    const map = new Map<string, EntranceExamLearningSurvey>()
    for (const survey of surveys) map.set(survey.attemptId, survey)
    return map
  }, [surveys])

  return (
    <div className="space-y-6">
      <div>
        <Link to=".." className="text-sm font-medium text-slate-500 hover:text-[#163A70]">
          ← 신입생 평가
        </Link>
        <PageHeader
          title="저장된 평가 결과"
          description="입학테스트 응시 결과와 학습성향 설문 저장 현황을 확인합니다."
          action={
            <button type="button" className={btnSecondary} onClick={() => void reload()}>
              새로고침
            </button>
          }
        />
      </div>

      {loading ? <p className="text-sm text-slate-500">불러오는 중...</p> : null}
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}

      {!loading && attempts.length === 0 ? (
        <EmptyState title="저장된 응시 결과가 없습니다." />
      ) : (
        <ul className="space-y-3">
          {attempts.map((attempt) => {
            const survey = surveyByAttempt.get(attempt.id)
            return (
              <li
                key={attempt.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-[#163A70]">
                      {attempt.studentName || '(이름 없음)'}
                      {attempt.school ? ` · ${attempt.school}` : ''}
                      {attempt.grade ? ` · ${attempt.grade}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {attempt.subject} · {attempt.paperTitle} · 시험일{' '}
                      {attempt.examDate || '-'}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      입학테스트 {attempt.totalScore}점 ({attempt.correctCount}/
                      {attempt.totalCount})
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      학습성향{' '}
                      {survey ? (
                        <span className="font-bold text-[#0F766E]">{survey.overallScore}점</span>
                      ) : (
                        <span className="text-slate-400">미실시</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => navigate('/entrance-exam/attempts')}
                    >
                      응시 결과
                    </button>
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() =>
                        navigate('/entrance-exam/survey', {
                          state: { attemptId: attempt.id },
                        })
                      }
                    >
                      {survey ? '설문 보기' : '설문 작성'}
                    </button>
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() =>
                        navigate(`/entrance-exam/report?attemptId=${encodeURIComponent(attempt.id)}`)
                      }
                    >
                      REPORT
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
