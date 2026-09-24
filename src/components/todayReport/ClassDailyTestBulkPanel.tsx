import { useEffect, useMemo, useRef, useState } from 'react'
import { DailyLearningDiagnosisFields } from '../diagnosis/DailyLearningDiagnosisFields'
import { CumulativeVocabTestFields } from '../dailytest/CumulativeVocabTestFields'
import { HighRecoveryFields } from '../dailytest/HighRecoveryFields'
import { MathFixedWrongSessionFields } from '../dailytest/MathFixedWrongSessionFields'
import { DailyTestPassRuleBadge } from '../dailytest/DailyTestSessionFormSection'
import { useData } from '../../hooks/useData'
import type { DailyLearningDiagnosisData, TextbookSubject } from '../../types/records'
import type { Student } from '../../types/student'
import { formatKoreanDate } from '../../utils/date'
import {
  EMPTY_DAILY_LEARNING_DIAGNOSIS,
  hasDailyLearningDiagnosisContent,
  normalizeDailyLearningDiagnosis,
} from '../../utils/learningDiagnosis'
import { getDailyTestSessionColor, btnPrimary, inputClass } from '../../utils/labels'
import {
  applyCumulativeVocabToDiagnosis,
  hasCumulativeVocabDraftContent,
  shouldUseCumulativeEnglishVocabInput,
  validateCumulativeVocabInput,
} from '../../utils/englishVocabTest'
import { createDefaultSessionResults, dailyTestFormToSavePayload } from '../../utils/dailyTest'
import {
  applyFixedWrongFormatToDiagnosis,
  isMathSubject,
  shouldUseFixedWrongMathInput,
  validateMathFixedWrongDrafts,
} from '../../utils/mathDailyTest'
import {
  emptyHighRecoveryDrafts,
  hasHighRecoveryDraftContent,
  highDraftsFromDiagnosis,
  shouldUseHighRecoveryMathInput,
  validateHighRecoveryDrafts,
  type HighRecoveryDrafts,
} from '../../utils/mathHighRecovery'
import { getVisibleDailyTestSubjects } from '../../utils/todayReportVisibleSubjects'
import {
  bulkDailyTestToSavePayload,
  createEmptyMobileDailyTestRounds,
  defaultDailyTestNameForDate,
  hasBulkDailyTestContent,
  isValidMobileScoreDraft,
  mathWrongDraftsFromBulkRounds,
  sessionsToBulkDailyTestRounds,
  updateBulkScoreDraft,
  visualStatusFromScoreDraft,
  type MobileDailyTestRound,
} from '../../utils/teacherMobileDailyTest'
import { isFollowOnInputRequired, isStudentAbsentOnDate } from '../../utils/todayReportAbsence'
import { markChangedDraftKeys, overlayLoadedDrafts } from '../../utils/todayReportDraftMerge'
import { applyStudentDailyTestDraft } from '../../utils/voiceInput/applyVoiceDraft'
import { formatVoiceSummary } from '../../utils/voiceInput/parseVoiceTranscript'
import type { VoiceApplySummary } from '../../utils/voiceInput/types'
import {
  buildDailyTestVoiceDiagnostic,
  setStudentVoiceDiagnostic,
  type DailyTestVoiceDiagnosticSnapshot,
} from '../../utils/voiceInput/dailyTestVoiceDiagnostic'
import { parseStudentDailyTestVoice } from '../../utils/voiceInput/parseStudentDailyTestVoice'
import { AbsentFollowOnHint, StudentFollowOnRowHeader } from './AbsentFollowOnBadge'
import { DailyTestVoiceDiagnostic } from './DailyTestVoiceDiagnostic'
import { SectionVoiceInput } from './SectionVoiceInput'

type StudentDraft = {
  recordId?: string
  rounds: MobileDailyTestRound[]
  /** daily_tests.memo — 학생별 오답 BANK */
  wrongAnswerBank: string
  learningDiagnosis: DailyLearningDiagnosisData
  vocabTotalWords: string
  vocabWrongWords: string
  highDraft: HighRecoveryDrafts
}

type ClassDailyTestBulkPanelProps = {
  date: string
  grade: string
  className: string
  students: Student[]
  compact?: boolean
  focusSubject?: TextbookSubject | null
}

function emptyStudentDraft(): StudentDraft {
  return {
    rounds: createEmptyMobileDailyTestRounds(),
    wrongAnswerBank: '',
    learningDiagnosis: { ...EMPTY_DAILY_LEARNING_DIAGNOSIS },
    vocabTotalWords: '',
    vocabWrongWords: '',
    highDraft: emptyHighRecoveryDrafts(),
  }
}

function vocabDraftsFromDiagnosis(diagnosis: DailyLearningDiagnosisData): {
  vocabTotalWords: string
  vocabWrongWords: string
} {
  return {
    vocabTotalWords:
      diagnosis.englishVocabTotalWords == null ? '' : String(diagnosis.englishVocabTotalWords),
    vocabWrongWords:
      diagnosis.englishVocabWrongWords == null ? '' : String(diagnosis.englishVocabWrongWords),
  }
}

export function ClassDailyTestBulkPanel({
  date,
  grade,
  className,
  students,
  compact = false,
  focusSubject = null,
}: ClassDailyTestBulkPanelProps) {
  const { attendance, dailyTests, saveDailyTestRecordAsync, showToast } = useData()
  const [saving, setSaving] = useState(false)
  const [testName, setTestName] = useState(() => defaultDailyTestNameForDate(date))
  const [subject, setSubject] = useState('수학')
  const [drafts, setDrafts] = useState<Record<string, StudentDraft>>({})
  const [voiceDiagnostics, setVoiceDiagnostics] = useState<
    Record<string, DailyTestVoiceDiagnosticSnapshot>
  >({})
  const [voiceConfirmations, setVoiceConfirmations] = useState<
    Record<string, VoiceApplySummary>
  >({})
  const dirtyDailyTestKeysRef = useRef(new Set<string>())
  const dirtyTestNameRef = useRef(false)

  const subjectOptions = useMemo(() => {
    const visible = getVisibleDailyTestSubjects(className)
    return focusSubject ? visible.filter((subject) => subject === focusSubject) : visible
  }, [className, focusSubject])

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
    dirtyDailyTestKeysRef.current.clear()
    dirtyTestNameRef.current = false
  }, [date, studentIdsKey, subject])

  useEffect(() => {
    const loaded: Record<string, StudentDraft> = {}
    let sharedTestName = ''

    for (const student of students) {
      const record = dailyTests.find(
        (item) =>
          item.studentId === student.id &&
          item.date === date &&
          item.subject === subject,
      )
      if (record) {
        if (!sharedTestName && record.testName.trim()) {
          sharedTestName = record.testName.trim()
        }
        const learningDiagnosis = normalizeDailyLearningDiagnosis(record.learningDiagnosis)
        loaded[student.id] = {
          recordId: record.id,
          rounds: sessionsToBulkDailyTestRounds(record.sessionResults),
          wrongAnswerBank: record.memo ?? '',
          learningDiagnosis,
          ...vocabDraftsFromDiagnosis(learningDiagnosis),
          highDraft: highDraftsFromDiagnosis(learningDiagnosis),
        }
      } else {
        loaded[student.id] = emptyStudentDraft()
      }
    }

    setDrafts((prev) =>
      overlayLoadedDrafts(
        prev,
        loaded,
        dirtyDailyTestKeysRef.current,
        (local, server) => ({
          ...local,
          recordId: server?.recordId ?? local.recordId,
        }),
      ),
    )
    if (!dirtyTestNameRef.current) {
      setTestName(sharedTestName || defaultDailyTestNameForDate(date))
    }
    if (subjectOptions[0] && !subjectOptions.includes(subject as (typeof subjectOptions)[number])) {
      setSubject(subjectOptions[0])
    }
  }, [dailyTests, date, studentIdsKey, students, subject, subjectOptions])

  const updateRounds = (
    studentId: string,
    updater: (rounds: MobileDailyTestRound[]) => MobileDailyTestRound[],
  ) => {
    dirtyDailyTestKeysRef.current.add(studentId)
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
    dirtyDailyTestKeysRef.current.add(studentId)
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

  const handleWrongCountsChange = (
    studentId: string,
    nextDrafts: ReturnType<typeof mathWrongDraftsFromBulkRounds>,
  ) => {
    updateRounds(studentId, (rounds) =>
      rounds.map((round) => ({
        ...round,
        wrongCount: nextDrafts[round.round] ?? '',
      })),
    )
  }

  const updateVocabDraft = (
    studentId: string,
    patch: Partial<Pick<StudentDraft, 'vocabTotalWords' | 'vocabWrongWords'>>,
  ) => {
    dirtyDailyTestKeysRef.current.add(studentId)
    setDrafts((prev) => {
      const current = prev[studentId] ?? emptyStudentDraft()
      return {
        ...prev,
        [studentId]: {
          ...current,
          ...patch,
        },
      }
    })
  }

  const handleSaveAll = async () => {
    if (saving || students.length === 0) return

    const targets = students.filter((student) => {
      if (!isFollowOnInputRequired(attendance, student.id, date)) return false
      const draft = drafts[student.id]
      const existing = dailyTests.find(
        (item) =>
          item.studentId === student.id && item.date === date && item.subject === subject,
      )
      const useVocab = shouldUseCumulativeEnglishVocabInput(subject, existing)
      const useHighRecovery = shouldUseHighRecoveryMathInput(subject, existing, grade)
      const useFixedWrong = shouldUseFixedWrongMathInput(subject, existing, grade)
      const roundsForContent = useFixedWrong
        ? draft.rounds.map((round) => ({ ...round, score: '', passed: false }))
        : draft.rounds
      return (
        draft &&
        (useHighRecovery
          ? hasHighRecoveryDraftContent(draft.highDraft) ||
            hasBulkDailyTestContent(
              roundsForContent,
              draft.wrongAnswerBank,
              hasDailyLearningDiagnosisContent(draft.learningDiagnosis),
            )
          : useVocab
            ? hasCumulativeVocabDraftContent(draft.vocabTotalWords, draft.vocabWrongWords) ||
              hasBulkDailyTestContent(
                roundsForContent,
                draft.wrongAnswerBank,
                hasDailyLearningDiagnosisContent(draft.learningDiagnosis),
              )
            : hasBulkDailyTestContent(
                roundsForContent,
                draft.wrongAnswerBank,
                hasDailyLearningDiagnosisContent(draft.learningDiagnosis),
              ))
      )
    })

    if (targets.length === 0) {
      const required = students.filter((student) =>
        isFollowOnInputRequired(attendance, student.id, date),
      )
      if (required.length === 0) {
        showToast('결석 학생은 일일테스트 입력 대상이 아닙니다.')
        return
      }
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
            const existing = dailyTests.find(
              (item) =>
                item.studentId === student.id &&
                item.date === date &&
                item.subject === subject,
            )
            const useVocab = shouldUseCumulativeEnglishVocabInput(subject, existing)
            const useHighRecovery = shouldUseHighRecoveryMathInput(subject, existing, grade)
            const useFixedWrong = shouldUseFixedWrongMathInput(subject, existing, grade)
            const savingVocab = useVocab && hasCumulativeVocabDraftContent(
              draft.vocabTotalWords,
              draft.vocabWrongWords,
            )
            if (savingVocab) {
              const vocabError = validateCumulativeVocabInput(
                draft.vocabTotalWords,
                draft.vocabWrongWords,
              )
              if (vocabError) {
                showToast(vocabError)
                return { student, success: false as const }
              }
            }
            if (useHighRecovery && !savingVocab) {
              const highError = validateHighRecoveryDrafts(draft.highDraft)
              if (highError) {
                showToast(highError)
                return { student, success: false as const }
              }
            }
            if (useFixedWrong && !savingVocab) {
              const mathError = validateMathFixedWrongDrafts(
                mathWrongDraftsFromBulkRounds(draft.rounds),
              )
              if (mathError) {
                showToast(mathError)
                return { student, success: false as const }
              }
            }
            const payload = useHighRecovery
              ? dailyTestFormToSavePayload({
                  id: draft.recordId,
                  studentId: student.id,
                  date,
                  testName,
                  subject,
                  memo: draft.wrongAnswerBank,
                  sessionResults: createDefaultSessionResults(),
                  learningDiagnosis: draft.learningDiagnosis,
                  studentGrade: grade,
                  highFirstWrong: draft.highDraft.firstWrong,
                  highEndSession: draft.highDraft.endSession,
                  highSession3Questions: draft.highDraft.session3Questions,
                  highSession4Questions: draft.highDraft.session4Questions,
                })
              : bulkDailyTestToSavePayload({
                  id: draft.recordId,
                  studentId: student.id,
                  date,
                  testName,
                  subject,
                  memo: draft.wrongAnswerBank,
                  rounds: savingVocab ? createEmptyMobileDailyTestRounds() : draft.rounds,
                  learningDiagnosis: savingVocab
                    ? applyCumulativeVocabToDiagnosis(
                        draft.learningDiagnosis,
                        Number(draft.vocabTotalWords),
                        Number(draft.vocabWrongWords),
                      )
                    : useFixedWrong
                      ? applyFixedWrongFormatToDiagnosis(draft.learningDiagnosis)
                      : draft.learningDiagnosis,
                })
            if (savingVocab) {
              payload.sessionResults = createDefaultSessionResults()
            }
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
          dirtyDailyTestKeysRef.current.delete(result.student.id)
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
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-xs font-medium text-slate-500">
          {formatKoreanDate(date)} / {className || grade} · {students.length}명
        </p>
        {shouldUseCumulativeEnglishVocabInput(subject) || isMathSubject(subject) ? null : (
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
            <DailyTestPassRuleBadge />
          </div>
        )}
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
            onChange={(e) => {
              dirtyTestNameRef.current = true
              setTestName(e.target.value)
            }}
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
          const existingRecord = dailyTests.find(
            (item) =>
              item.studentId === student.id &&
              item.date === date &&
              item.subject === subject,
          )
          const excluded = isStudentAbsentOnDate(attendance, student.id, date)

          return (
            <div
              key={student.id}
              className={compact ? 'px-2.5 py-2' : 'px-3 py-2.5'}
              data-absent-excluded={excluded ? 'true' : 'false'}
            >
              <StudentFollowOnRowHeader
                name={student.name}
                excluded={excluded}
                compact={compact}
                extra={
                  excluded ? undefined : (
                    <SectionVoiceInput
                      label={`${student.name} 일일테스트 음성 입력`}
                      chipLabel="음성입력"
                      compact={compact}
                      disabled={saving}
                      explicitStop
                      hideStatus
                      onApply={(transcript) => {
                        const applied = applyStudentDailyTestDraft(
                          drafts,
                          transcript,
                          student,
                          students,
                          attendance,
                          date,
                        )
                        markChangedDraftKeys(drafts, applied.drafts, dirtyDailyTestKeysRef.current)
                        setDrafts(applied.drafts)
                        setVoiceConfirmations((prev) => ({
                          ...prev,
                          [student.id]: applied.summary,
                        }))
                        return applied.summary
                      }}
                      onSaveCommand={() => void handleSaveAll()}
                      onDiagnostic={(payload) => {
                        const parserInput =
                          payload.routed.kind === 'form-fill' ? payload.routed.transcript : ''
                        const parseResult = parserInput
                          ? parseStudentDailyTestVoice(
                              parserInput,
                              student,
                              students,
                              excluded,
                            )
                          : null
                        setVoiceDiagnostics((prev) =>
                          setStudentVoiceDiagnostic(
                            prev,
                            student.id,
                            buildDailyTestVoiceDiagnostic({
                              accumulatedRaw: payload.rawTranscript,
                              routed: payload.routed,
                              summary: payload.summary,
                              parseResult,
                              endReason: payload.endReason,
                              heldTrace: payload.heldTrace,
                              voiceApplyCount: payload.routed.kind === 'form-fill' && payload.summary ? 1 : 0,
                            }),
                          ),
                        )
                      }}
                    />
                  )
                }
              />
              {!excluded && voiceConfirmations[student.id] ? (
                <p
                  data-voice-summary="true"
                  className="mb-1 w-full min-w-0 max-w-full whitespace-normal break-words text-[11px] leading-4 text-slate-600 [overflow-wrap:anywhere]"
                >
                  {formatVoiceSummary(voiceConfirmations[student.id]!)}
                  {voiceConfirmations[student.id]!.needsReview[0]
                    ? ` — ${voiceConfirmations[student.id]!.needsReview[0]!.label} ${voiceConfirmations[student.id]!.needsReview[0]!.reason}`
                    : ''}
                </p>
              ) : null}
              {import.meta.env.DEV && !excluded && voiceDiagnostics[student.id] ? (
                <DailyTestVoiceDiagnostic snapshot={voiceDiagnostics[student.id]!} />
              ) : null}
              {excluded ? (
                <AbsentFollowOnHint compact={compact} />
              ) : (
              <>
              {shouldUseHighRecoveryMathInput(subject, existingRecord, grade) ? (
                <HighRecoveryFields
                  drafts={draft.highDraft}
                  onChange={(highDraft) => {
                    dirtyDailyTestKeysRef.current.add(student.id)
                    setDrafts((prev) => ({
                      ...prev,
                      [student.id]: {
                        ...(prev[student.id] ?? emptyStudentDraft()),
                        highDraft,
                      },
                    }))
                  }}
                  compact
                  disabled={saving}
                />
              ) : shouldUseCumulativeEnglishVocabInput(subject, existingRecord) ? (
                <CumulativeVocabTestFields
                  totalWords={draft.vocabTotalWords}
                  wrongWords={draft.vocabWrongWords}
                  onTotalWordsChange={(value) =>
                    updateVocabDraft(student.id, { vocabTotalWords: value })
                  }
                  onWrongWordsChange={(value) =>
                    updateVocabDraft(student.id, { vocabWrongWords: value })
                  }
                  compact
                  disabled={saving}
                />
              ) : shouldUseFixedWrongMathInput(subject, existingRecord, grade) ? (
                <MathFixedWrongSessionFields
                  drafts={mathWrongDraftsFromBulkRounds(draft.rounds)}
                  onChange={(next) => handleWrongCountsChange(student.id, next)}
                  compact
                  disabled={saving}
                  showHeader={false}
                />
              ) : (
                <>
              {isMathSubject(subject) ? <DailyTestPassRuleBadge /> : null}
              {subject.includes('영어') ? (
                <p
                  className={
                    compact
                      ? 'mb-1 text-[11px] font-semibold text-[#163A70]'
                      : 'mb-1 text-xs font-semibold text-navy-900'
                  }
                >
                  어휘 시험
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-1.5">
                {draft.rounds.map((round) => {
                  const result = visualStatusFromScoreDraft(round.score)
                  const dimmed =
                    passRound !== null && round.round > passRound && !round.score
                  return (
                    <div
                      key={round.round}
                      className={`flex min-w-0 items-center gap-1 rounded-lg border px-1.5 py-1 ${
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
                      <span
                        data-daily-test-result={result ?? 'neutral'}
                        className={`inline-flex min-h-7 min-w-[2.8rem] shrink-0 items-center justify-center rounded-md border px-1 text-[10px] font-semibold ${
                          result
                            ? getDailyTestSessionColor(result)
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                      >
                        {result ?? ''}
                      </span>
                    </div>
                  )
                })}
              </div>
              {passRound ? (
                <p className="mt-1 text-[11px] font-medium text-emerald-700">
                  최종 합격: {passRound}차시
                </p>
              ) : null}
                </>
              )}
              <div className="mt-2">
                <DailyLearningDiagnosisFields
                  subject={subject}
                  value={draft.learningDiagnosis}
                  onChange={(next) => updateLearningDiagnosis(student.id, next)}
                  compact
                  disabled={saving}
                />
              </div>
              </>
              )}
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
