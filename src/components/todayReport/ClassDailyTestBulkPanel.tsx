import { Check } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DailyLearningDiagnosisFields } from '../diagnosis/DailyLearningDiagnosisFields'
import { DailyTestPassRuleBadge } from '../dailytest/DailyTestSessionFormSection'
import { useData } from '../../hooks/useData'
import type { DailyLearningDiagnosisData } from '../../types/records'
import type { Student } from '../../types/student'
import { formatKoreanDate } from '../../utils/date'
import {
  EMPTY_DAILY_LEARNING_DIAGNOSIS,
  hasDailyLearningDiagnosisContent,
  normalizeDailyLearningDiagnosis,
} from '../../utils/learningDiagnosis'
import { btnPrimary, inputClass } from '../../utils/labels'
import { getVisibleDailyTestSubjects } from '../../utils/todayReportVisibleSubjects'
import {
  bulkDailyTestToSavePayload,
  createEmptyMobileDailyTestRounds,
  defaultDailyTestNameForDate,
  hasBulkDailyTestContent,
  isValidMobileScoreDraft,
  selectBulkPassRound,
  sessionsToBulkDailyTestRounds,
  updateBulkScoreDraft,
  type MobileDailyTestRound,
} from '../../utils/teacherMobileDailyTest'

type StudentDraft = {
  recordId?: string
  rounds: MobileDailyTestRound[]
  /** daily_tests.memo — 학생별 오답 BANK */
  wrongAnswerBank: string
  learningDiagnosis: DailyLearningDiagnosisData
}

type ClassDailyTestBulkPanelProps = {
  date: string
  grade: string
  className: string
  students: Student[]
  compact?: boolean
}

function emptyStudentDraft(): StudentDraft {
  return {
    rounds: createEmptyMobileDailyTestRounds(),
    wrongAnswerBank: '',
    learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
  }
}

export function ClassDailyTestBulkPanel({
  date,
  grade,
  className,
  students,
  compact = false,
}: ClassDailyTestBulkPanelProps) {
  const { dailyTests, saveDailyTestRecordAsync, showToast } = useData()
  const [saving, setSaving] = useState(false)
  const [testName, setTestName] = useState(() => defaultDailyTestNameForDate(date))
  const [subject, setSubject] = useState('수학')
  const [drafts, setDrafts] = useState<Record<string, StudentDraft>>({})

  const subjectOptions = useMemo(
    () => getVisibleDailyTestSubjects(className),
    [className],
  )

  const studentIdsKey = useMemo(
    () => students.map((s) => s.id).join('|'),
    [students],
  )

  useEffect(() => {
    if (subjectOptions.length === 0) return
    if (!subjectOptions.includes(subject as (typeof subjectOptions)[number])) {
      setSubject(subjectOptions[0] ?? '수학')
    }
  }, [subject, subjectOptions])

  useEffect(() => {
    const next: Record<string, StudentDraft> = {}
    let sharedTestName = ''
    let sharedSubject = ''

    for (const student of students) {
      const record = dailyTests.find(
        (item) => item.studentId === student.id && item.date === date,
      )
      if (record) {
        if (!sharedTestName && record.testName.trim()) {
          sharedTestName = record.testName.trim()
        }
        if (!sharedSubject && record.subject.trim()) {
          sharedSubject = record.subject.trim()
        }
        next[student.id] = {
          recordId: record.id,
          rounds: sessionsToBulkDailyTestRounds(record.sessionResults),
          wrongAnswerBank: record.memo ?? '',
          learningDiagnosis: normalizeDailyLearningDiagnosis(record.learningDiagnosis),
        }
      } else {
        next[student.id] = emptyStudentDraft()
      }
    }

    setDrafts(next)
    setTestName(sharedTestName || defaultDailyTestNameForDate(date))
    if (sharedSubject) {
      setSubject(sharedSubject)
    } else if (subjectOptions[0]) {
      setSubject(subjectOptions[0])
    }
  }, [dailyTests, date, studentIdsKey, students, subjectOptions])

  const updateRounds = (
    studentId: string,
    updater: (rounds: MobileDailyTestRound[]) => MobileDailyTestRound[],
  ) => {
    setDrafts((prev) => {
      const current = prev[studentId] ?? emptyStudentDraft()
      return {
        ...prev,
        [studentId]: {
          ...current,
          rounds: updater(current.rounds),
        },
      }
    })
  }

  const updateLearningDiagnosis = (
    studentId: string,
    learningDiagnosis: DailyLearningDiagnosisData,
  ) => {
    setDrafts((prev) => {
      const current = prev[studentId] ?? emptyStudentDraft()
      return {
        ...prev,
        [studentId]: {
          ...current,
          learningDiagnosis,
        },
      }
    })
  }

  const handleScoreChange = (
    studentId: string,
    round: 1 | 2 | 3 | 4,
    raw: string,
  ) => {
    if (!isValidMobileScoreDraft(raw)) return
    updateRounds(studentId, (rounds) => updateBulkScoreDraft(rounds, round, raw))
  }

  const handleSelectPass = (studentId: string, round: 1 | 2 | 3 | 4) => {
    updateRounds(studentId, (rounds) => selectBulkPassRound(rounds, round))
  }

  const handleSaveAll = async () => {
    if (saving || students.length === 0) return

    const targets = students.filter((student) => {
      const draft = drafts[student.id]
      return (
        draft &&
        hasBulkDailyTestContent(
          draft.rounds,
          draft.wrongAnswerBank,
          hasDailyLearningDiagnosisContent(draft.learningDiagnosis),
        )
      )
    })

    if (targets.length === 0) {
      showToast('저장할 일일테스트가 없습니다.')
      return
    }

    if (!testName.trim()) {
      showToast('시험명을 입력해 주세요.')
      return
    }

    setSaving(true)
    const failures: string[] = []

    try {
      const results = await Promise.all(
        targets.map(async (student) => {
          const draft = drafts[student.id]
          if (!draft) {
            return { student, success: false as const }
          }
          try {
            const payload = bulkDailyTestToSavePayload({
              id: draft.recordId,
              studentId: student.id,
              date,
              testName,
              subject,
              memo: draft.wrongAnswerBank,
              rounds: draft.rounds,
              learningDiagnosis: draft.learningDiagnosis,
            })
            const result = await saveDailyTestRecordAsync(payload, { silent: true })
            if (!result.success) {
              console.error('[class-daily-test] save failed', {
                studentId: student.id,
                name: student.name,
                date,
                error: result.error,
              })
              return { student, success: false as const }
            }
            return {
              student,
              success: true as const,
              recordId: result.recordId ?? draft.recordId,
            }
          } catch (error) {
            console.error('[class-daily-test] save threw', {
              studentId: student.id,
              name: student.name,
              date,
              error,
            })
            return { student, success: false as const }
          }
        }),
      )

      for (const result of results) {
        if (!result.success) {
          failures.push(result.student.name)
          continue
        }
        if (result.recordId) {
          setDrafts((prev) => ({
            ...prev,
            [result.student.id]: {
              ...(prev[result.student.id] ?? emptyStudentDraft()),
              recordId: result.recordId,
            },
          }))
        }
      }

      if (failures.length > 0) {
        console.error('[class-daily-test] partial/full failure', {
          date,
          grade,
          className,
          failures,
        })
        showToast('일일테스트 저장에 실패했습니다.')
        return
      }

      showToast('일일테스트가 저장되었습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (students.length === 0) {
    return (
      <p className="px-1 py-3 text-center text-sm text-slate-500">
        표시할 학생이 없습니다.
      </p>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">
          {formatKoreanDate(date)} / {className || grade} · {students.length}명
        </p>
        <DailyTestPassRuleBadge />
      </div>

      <div
        className={
          compact
            ? 'space-y-2 rounded-xl border border-[rgba(22,58,112,0.08)] bg-white p-2.5'
            : 'space-y-3 rounded-xl border border-slate-200 bg-white p-3'
        }
      >
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            시험명
          </label>
          <input
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            disabled={saving}
            placeholder="시험명"
            className={`${inputClass()} min-h-10 py-2 text-sm`}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">
            과목
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={saving}
            className={`${inputClass()} min-h-10 py-2 text-sm`}
          >
            {subjectOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        className={
          compact
            ? 'divide-y divide-[rgba(22,58,112,0.06)] rounded-xl border border-[rgba(22,58,112,0.08)] bg-white'
            : 'divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white'
        }
      >
        {students.map((student) => {
          const draft = drafts[student.id] ?? emptyStudentDraft()
          const passRound =
            draft.rounds.find((round) => round.passed)?.round ?? null

          return (
            <div
              key={student.id}
              className={compact ? 'px-2.5 py-2' : 'px-3 py-2.5'}
            >
              <p
                className={
                  compact
                    ? 'mb-1.5 text-sm font-bold text-[#163A70]'
                    : 'mb-1.5 text-sm font-bold text-navy-900'
                }
              >
                {student.name}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {draft.rounds.map((round) => {
                  const isPassSelected = passRound === round.round
                  const dimmed =
                    passRound !== null && round.round > passRound && !round.score
                  return (
                    <div
                      key={round.round}
                      className={`flex items-center gap-1 rounded-lg border px-1.5 py-1 ${
                        dimmed
                          ? 'border-slate-100 bg-slate-50/80 opacity-60'
                          : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <span className="w-7 shrink-0 text-[11px] font-semibold text-slate-600">
                        {round.round}차
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={round.score}
                        onChange={(e) =>
                          handleScoreChange(student.id, round.round, e.target.value)
                        }
                        disabled={saving}
                        placeholder="점수"
                        className="min-h-7 w-full min-w-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-center text-sm font-semibold text-slate-800 outline-none focus:border-[#163A70]/40"
                      />
                      <button
                        type="button"
                        onClick={() => handleSelectPass(student.id, round.round)}
                        disabled={saving}
                        className={`inline-flex min-h-7 min-w-[2.6rem] shrink-0 items-center justify-center gap-0.5 rounded-md border px-1.5 text-[10px] font-semibold transition ${
                          isPassSelected
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        {isPassSelected ? (
                          <Check className="h-3 w-3 shrink-0" aria-hidden />
                        ) : null}
                        합격
                      </button>
                    </div>
                  )
                })}
              </div>
              {passRound ? (
                <p className="mt-1 text-[11px] font-medium text-emerald-700">
                  최종 합격: {passRound}차시
                </p>
              ) : null}
              <div className="mt-2">
                <DailyLearningDiagnosisFields
                  subject={subject}
                  value={draft.learningDiagnosis}
                  onChange={(next) => updateLearningDiagnosis(student.id, next)}
                  compact
                />
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => void handleSaveAll()}
        disabled={saving || students.length === 0}
        className={compact ? 'tm-btn-primary w-full min-h-11' : `${btnPrimary} w-full`}
      >
        {saving ? '저장 중…' : '일일테스트 전체 저장'}
      </button>
    </div>
  )
}
