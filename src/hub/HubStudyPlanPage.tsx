import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Angry, Annoyed, ChevronLeft, ChevronRight, Frown, Laugh, Meh, Pencil, Plus, Smile, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { addDays, formatKoreanDate } from '../utils/date'
import { HubPageHeader } from './HubChrome'
import { useHub } from './HubContext'
import {
  rpcDeleteStudentStudyPlan,
  rpcListStudentStudyPlans,
  rpcSetStudentStudyPlanResult,
  rpcUpsertStudentStudyPlan,
} from './hubRpc'
import {
  canDeleteStudyPlan,
  computeWeeklyAchievement,
  dayNumber,
  effectiveStudyPlanResult,
  emptyDateMessage,
  formatPlanTimeRange,
  isStudyPlanResultLocked,
  isStudyPlanScheduleLocked,
  plansOnDate,
  startOfWeekMonday,
  studyPlanErrorMessage,
  timeInputValue,
  todayInSeoul,
  weekDatesFromMonday,
  weekdayKo,
  type StudyPlanRateBand,
  type WeeklyAchievement,
} from './studyPlan'
import { STUDY_PLAN_SUBJECT_PRESETS, type StudentStudyPlan, type StudyPlanResult } from './types'

type EditorDraft = {
  id: string | null
  planDate: string
  subjectPreset: string
  customSubject: string
  content: string
  startTime: string
  endTime: string
}

function emptyDraft(planDate: string): EditorDraft {
  return {
    id: null,
    planDate,
    subjectPreset: '수학',
    customSubject: '',
    content: '',
    startTime: '19:00',
    endTime: '20:30',
  }
}

function draftFromPlan(plan: StudentStudyPlan): EditorDraft {
  const preset = STUDY_PLAN_SUBJECT_PRESETS.includes(plan.subject as (typeof STUDY_PLAN_SUBJECT_PRESETS)[number])
    ? plan.subject
    : 'custom'
  return {
    id: plan.id,
    planDate: plan.planDate,
    subjectPreset: preset,
    customSubject: preset === 'custom' ? plan.subject : '',
    content: plan.content,
    startTime: timeInputValue(plan.startTime),
    endTime: timeInputValue(plan.endTime),
  }
}

function resolvedSubject(draft: EditorDraft): string {
  if (draft.subjectPreset === 'custom') return draft.customSubject.trim()
  return draft.subjectPreset.trim()
}

function RateFace({ band }: { band: Exclude<StudyPlanRateBand, 'neutral'> }) {
  const Icon =
    band === 'great' ? Laugh : band === 'try_more' ? Smile : band === 'lack' ? Meh : band === 'trouble' ? Frown : band === 'danger' ? Annoyed : Angry
  return (
    <span className="hub-rate-face" data-band={band} aria-hidden="true">
      <Icon className="h-5 w-5" strokeWidth={2.2} />
    </span>
  )
}

function WeeklyRateCard({ summary }: { summary: WeeklyAchievement }) {
  const percentLabel = summary.percent == null ? '—' : `${summary.percent}%`
  const width = summary.percent == null ? 0 : summary.percent
  return (
    <section className="hub-rate-card" data-study-plan-rate={summary.band} aria-label={summary.title}>
      <p className="hub-rate-kicker whitespace-nowrap">{summary.title}</p>
      <div className="hub-rate-top">
        <p className={`hub-rate-percent ${summary.percent == null ? 'is-empty' : ''}`} data-study-plan-percent={percentLabel}>
          {percentLabel}
        </p>
        <p className="hub-rate-counts">
          완료 {summary.completedCount} / 판정 {summary.judgedCount}
        </p>
      </div>
      <div className="hub-rate-bar" aria-hidden="true">
        <span style={{ width: `${width}%` }} />
      </div>
      <div className="hub-rate-mood">
        {summary.band === 'neutral' ? null : <RateFace band={summary.band} />}
        <div className="min-w-0">
          <p className="hub-rate-message">{summary.message}</p>
          {summary.band === 'neutral' ? (
            <p className="hub-rate-hint">아직 결과가 나온 계획만 반영됩니다.</p>
          ) : (
            <p className="hub-rate-hint">유예 중인 계획은 아직 포함하지 않습니다.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export function HubStudyPlanScreen({
  selectedDate,
  weekStart,
  today,
  nowMs,
  plans,
  loading,
  error,
  editor,
  busy,
  onSelectDate,
  onShiftWeek,
  onToday,
  onAdd,
  onEdit,
  onSetResult,
  onAskDelete,
  onSave,
  onCancel,
  onDraftChange,
}: {
  selectedDate: string
  weekStart: string
  today: string
  nowMs: number
  plans: StudentStudyPlan[]
  loading: boolean
  error: string
  editor: EditorDraft | null
  busy: boolean
  onSelectDate: (date: string) => void
  onShiftWeek: (delta: number) => void
  onToday: () => void
  onAdd: () => void
  onEdit: (plan: StudentStudyPlan) => void
  onSetResult: (plan: StudentStudyPlan, result: Extract<StudyPlanResult, 'completed' | 'failed'>) => void
  onAskDelete: (plan: StudentStudyPlan) => void
  onSave: (event: FormEvent) => void
  onCancel: () => void
  onDraftChange: (next: EditorDraft) => void
}) {
  const weekDates = weekDatesFromMonday(weekStart)
  const visible = plansOnDate(plans, selectedDate)
  const selectedLabel = formatKoreanDate(selectedDate)
  const weekly = computeWeeklyAchievement({ plans, weekStart, today, nowMs })
  const editingPlan = editor?.id ? plans.find((item) => item.id === editor.id) : undefined
  const scheduleLocked = editingPlan ? isStudyPlanScheduleLocked(editingPlan, nowMs) : false

  return (
    <div className="mx-auto w-full max-w-lg px-3 pb-10 pt-4">
      <HubPageHeader title="My Study Plan" />
      <WeeklyRateCard summary={weekly} />

      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#161b3a] shadow-sm"
          aria-label="이전 주"
          onClick={() => onShiftWeek(-7)}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="min-h-10 flex-1 rounded-full bg-white px-3 text-sm font-bold text-[#5b348a] shadow-sm"
        >
          오늘
        </button>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#161b3a] shadow-sm"
          aria-label="다음 주"
          onClick={() => onShiftWeek(7)}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="hub-week-strip" role="tablist" aria-label="이번 주 날짜">
        {weekDates.map((date) => {
          const selected = date === selectedDate
          const isToday = date === today
          return (
            <button
              key={date}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`hub-week-day ${selected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
              onClick={() => onSelectDate(date)}
            >
              <span className="block">{weekdayKo(date)}</span>
              <span className="mt-0.5 block text-sm">{dayNumber(date)}</span>
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-sm font-bold text-[#161b3a]">{selectedLabel}</p>
      {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">불러오는 중…</p>
      ) : visible.length === 0 && !editor ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[#e7dcf3] bg-white px-4 py-10 text-center">
          <p className="break-keep text-sm text-slate-500">{emptyDateMessage(selectedDate, today)}</p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#5b348a] px-5 text-sm font-bold text-white"
          >
            계획 추가
          </button>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {visible.map((plan) => {
            const effective = effectiveStudyPlanResult(plan, nowMs)
            const locked = isStudyPlanResultLocked(plan, nowMs)
            const deletable = canDeleteStudyPlan(plan, nowMs)
            return (
              <li
                key={plan.id}
                className={`hub-plan-card ${effective === 'completed' ? 'is-done' : ''} ${effective === 'failed' ? 'is-failed' : ''}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-[#161b3a]">{plan.subject}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[#5b348a]">
                    {formatPlanTimeRange(plan.startTime, plan.endTime)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-keep text-sm leading-6 text-slate-700">{plan.content}</p>
                </div>
                <div className="hub-result-row">
                  <button
                    type="button"
                    className={`hub-result-btn ${effective === 'completed' ? 'is-completed' : 'is-idle'}`}
                    aria-pressed={effective === 'completed'}
                    data-result-completed=""
                    disabled={busy || locked}
                    onClick={() => onSetResult(plan, 'completed')}
                  >
                    완료
                  </button>
                  <button
                    type="button"
                    className={`hub-result-btn ${effective === 'failed' ? 'is-failed' : 'is-idle'}`}
                    aria-pressed={effective === 'failed'}
                    data-result-failed=""
                    disabled={busy || locked}
                    onClick={() => onSetResult(plan, 'failed')}
                  >
                    실패
                  </button>
                </div>
                {locked ? (
                  <p className="hub-result-lock">종료 후 48시간이 지나 결과가 확정되었습니다.</p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-[#f3eef8] text-sm font-bold text-[#5b348a]"
                    onClick={() => onEdit(plan)}
                  >
                    <Pencil className="h-4 w-4" />
                    수정
                  </button>
                  {deletable ? (
                    <button
                      type="button"
                      data-plan-delete=""
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-1 rounded-xl bg-rose-50 text-sm font-bold text-rose-600"
                      onClick={() => onAskDelete(plan)}
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </button>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!editor && visible.length > 0 ? (
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-1 rounded-xl bg-[#5b348a] text-sm font-bold text-white"
        >
          <Plus className="h-4 w-4" />
          계획 추가
        </button>
      ) : null}

      {editor ? (
        <form onSubmit={onSave} className="hub-plan-card mt-4 space-y-3">
          <p className="text-sm font-extrabold text-[#161b3a]">{editor.id ? '계획 수정' : '계획 추가'}</p>
          <label className="block text-xs font-bold text-slate-500">
            날짜
            <input
              type="date"
              value={editor.planDate}
              onChange={(event) => onDraftChange({ ...editor, planDate: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-100"
              required
              disabled={scheduleLocked}
            />
          </label>
          <div>
            <p className="text-xs font-bold text-slate-500">과목</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {STUDY_PLAN_SUBJECT_PRESETS.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  className={`min-h-10 rounded-full px-3 text-sm font-bold ${
                    editor.subjectPreset === subject ? 'bg-[#5b348a] text-white' : 'bg-[#f3eef8] text-[#5b348a]'
                  }`}
                  onClick={() => onDraftChange({ ...editor, subjectPreset: subject })}
                >
                  {subject}
                </button>
              ))}
              <button
                type="button"
                className={`min-h-10 rounded-full px-3 text-sm font-bold ${
                  editor.subjectPreset === 'custom' ? 'bg-[#5b348a] text-white' : 'bg-[#f3eef8] text-[#5b348a]'
                }`}
                onClick={() => onDraftChange({ ...editor, subjectPreset: 'custom' })}
              >
                직접 입력
              </button>
            </div>
            {editor.subjectPreset === 'custom' ? (
              <input
                value={editor.customSubject}
                onChange={(event) => onDraftChange({ ...editor, customSubject: event.target.value })}
                placeholder="과목명"
                maxLength={40}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            ) : null}
          </div>
          <label className="block text-xs font-bold text-slate-500">
            공부할 내용
            <textarea
              value={editor.content}
              onChange={(event) => onDraftChange({ ...editor, content: event.target.value })}
              placeholder="예: 쎈 수학 72~80p"
              maxLength={500}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-slate-500">
              시작 시간
              <input
                type="time"
                value={editor.startTime}
                onChange={(event) => onDraftChange({ ...editor, startTime: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-100"
                required
                disabled={scheduleLocked}
              />
            </label>
            <label className="block text-xs font-bold text-slate-500">
              종료 시간
              <input
                type="time"
                value={editor.endTime}
                onChange={(event) => onDraftChange({ ...editor, endTime: event.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm disabled:bg-slate-100"
                required
                disabled={scheduleLocked}
              />
            </label>
          </div>
          {scheduleLocked ? (
            <p className="text-xs font-semibold text-slate-500">종료된 계획의 날짜와 시간은 바꿀 수 없습니다. 과목과 내용은 수정할 수 있습니다.</p>
          ) : null}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 flex-1 rounded-xl bg-slate-100 text-sm font-bold text-slate-600"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 flex-1 rounded-xl bg-[#5b348a] text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

export function HubStudyPlanPage() {
  const { accessKey } = useHub()
  const today = todayInSeoul()
  const [selectedDate, setSelectedDate] = useState(today)
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(today))
  const [plans, setPlans] = useState<StudentStudyPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState<EditorDraft | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StudentStudyPlan | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const range = useMemo(() => {
    const from = weekStart
    const to = addDays(weekStart, 6)
    return { from, to }
  }, [weekStart])

  const load = async (from: string, to: string) => {
    setLoading(true)
    setError('')
    try {
      const rows = await rpcListStudentStudyPlans(accessKey, from, to)
      setPlans(rows)
    } catch (err) {
      setPlans([])
      setError(studyPlanErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(range.from, range.to)
    // accessKey + week range only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessKey, range.from, range.to])

  const selectDate = (date: string) => {
    setSelectedDate(date)
    setWeekStart(startOfWeekMonday(date))
    if (editor?.id == null) {
      setEditor(editor ? { ...editor, planDate: date } : null)
    }
  }

  const shiftWeek = (delta: number) => {
    const nextStart = addDays(weekStart, delta)
    setWeekStart(nextStart)
    setSelectedDate(addDays(selectedDate, delta))
  }

  const goToday = () => {
    setSelectedDate(today)
    setWeekStart(startOfWeekMonday(today))
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (!editor) return
    const subject = resolvedSubject(editor)
    if (!subject) {
      setError('과목을 입력해 주세요.')
      return
    }
    if (!editor.content.trim()) {
      setError('공부할 내용을 입력해 주세요.')
      return
    }
    if (editor.endTime <= editor.startTime) {
      setError('종료 시간은 시작 시간보다 늦어야 합니다.')
      return
    }
    const original = editor.id ? plans.find((item) => item.id === editor.id) : undefined
    if (original && isStudyPlanScheduleLocked(original, Date.now())) {
      if (
        editor.planDate !== original.planDate ||
        timeInputValue(editor.startTime) !== timeInputValue(original.startTime) ||
        timeInputValue(editor.endTime) !== timeInputValue(original.endTime)
      ) {
        setError('종료된 계획의 날짜와 시간은 바꿀 수 없습니다.')
        return
      }
    }
    setBusy(true)
    setError('')
    try {
      await rpcUpsertStudentStudyPlan({
        accessKey,
        id: editor.id,
        planDate: editor.planDate,
        subject,
        content: editor.content,
        startTime: editor.startTime,
        endTime: editor.endTime,
      })
      setEditor(null)
      setSelectedDate(editor.planDate)
      setWeekStart(startOfWeekMonday(editor.planDate))
      await load(startOfWeekMonday(editor.planDate), addDays(startOfWeekMonday(editor.planDate), 6))
    } catch (err) {
      setError(studyPlanErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const setResult = async (plan: StudentStudyPlan, result: Extract<StudyPlanResult, 'completed' | 'failed'>) => {
    setNowMs(Date.now())
    if (isStudyPlanResultLocked(plan, Date.now())) return
    if (storedEquals(plan, result)) return
    setBusy(true)
    setError('')
    try {
      const next = await rpcSetStudentStudyPlanResult(accessKey, plan.id, result)
      setPlans((current) => current.map((item) => (item.id === next.id ? next : item)))
    } catch (err) {
      setError(studyPlanErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    if (!canDeleteStudyPlan(deleteTarget, Date.now())) {
      setError('확정된 계획은 삭제할 수 없습니다.')
      setDeleteTarget(null)
      return
    }
    setBusy(true)
    setError('')
    try {
      await rpcDeleteStudentStudyPlan(accessKey, deleteTarget.id)
      setPlans((current) => current.filter((item) => item.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setError(studyPlanErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <HubStudyPlanScreen
        selectedDate={selectedDate}
        weekStart={weekStart}
        today={today}
        nowMs={nowMs}
        plans={plans}
        loading={loading}
        error={error}
        editor={editor}
        busy={busy}
        onSelectDate={selectDate}
        onShiftWeek={shiftWeek}
        onToday={goToday}
        onAdd={() => {
          setError('')
          setEditor(emptyDraft(selectedDate))
        }}
        onEdit={(plan) => {
          setError('')
          setEditor(draftFromPlan(plan))
        }}
        onSetResult={(plan, result) => void setResult(plan, result)}
        onAskDelete={setDeleteTarget}
        onSave={(event) => void save(event)}
        onCancel={() => setEditor(null)}
        onDraftChange={setEditor}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="학습 계획 삭제"
        message="이 계획을 삭제할까요?"
        confirmLabel="삭제"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}

function storedEquals(plan: StudentStudyPlan, result: Extract<StudyPlanResult, 'completed' | 'failed'>): boolean {
  return plan.result === result
}
