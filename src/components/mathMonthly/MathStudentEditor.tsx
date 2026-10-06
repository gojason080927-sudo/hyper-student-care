import { useMemo, useState } from 'react'
import type { MathResultRow } from '../../lib/db/mathMonthlyRepo'
import {
  MATH_CAUSES,
  MATH_CAUSE_LABEL,
  MATH_DIFFICULTY_LABEL,
  MATH_PLAN_MAX_LINES,
  calcScore,
  recommendComments,
  recommendPlan,
  totalPoints,
  type MathCause,
  type MathMonthlyExam,
  type MathPlanLine,
  type MathWrongItem,
} from '../../utils/mathMonthlyReport'
import { btnPrimary, btnSecondary, inputClass } from '../../utils/labels'

type Props = {
  exam: MathMonthlyExam
  studentId: string
  studentName: string
  row: MathResultRow | undefined
  onSave: (row: Omit<MathResultRow, 'status' | 'sentAt'>) => Promise<void>
  onClose: () => void
}

/** 학생 1명 입력: ✕ 문항 탭 → 점수 자동 계산, 오답 원인, 결시, 의견, 다음 달 계획 */
export function MathStudentEditor({ exam, studentId, studentName, row, onSave, onClose }: Props) {
  const [absent, setAbsent] = useState(row?.absent ?? false)
  const [wrong, setWrong] = useState<MathWrongItem[]>(row?.wrongItems ?? [])
  const [strengths, setStrengths] = useState(row?.strengths ?? '')
  const [improvements, setImprovements] = useState(row?.improvements ?? '')
  const [comment, setComment] = useState(row?.teacherComment ?? '')
  const [plan, setPlan] = useState<MathPlanLine[]>(row?.nextPlan ?? [])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const total = useMemo(() => totalPoints(exam.items), [exam.items])
  const score = calcScore(exam.items, wrong.map((w) => w.no))
  const wrongByNo = new Map(wrong.map((w) => [w.no, w]))

  const toggle = (no: number) => {
    setWrong((list) => (list.some((w) => w.no === no) ? list.filter((w) => w.no !== no) : [...list, { no, cause: '' }]))
  }
  const setCause = (no: number, cause: MathCause | '') => {
    setWrong((list) => list.map((w) => (w.no === no ? { ...w, cause } : w)))
  }

  const recommend = () => {
    const comments = recommendComments(exam, wrong)
    if (!strengths.trim() && comments.strengths) setStrengths(comments.strengths)
    if (!improvements.trim() && comments.improvements) setImprovements(comments.improvements)
    const lines = recommendPlan(exam, wrong)
    if (plan.some((p) => p.content.trim()) && !window.confirm('작성한 다음 달 계획을 추천 초안으로 바꿀까요?')) return
    setPlan(lines)
  }

  const save = async () => {
    if (!absent && wrong.some((w) => !w.cause)) {
      setError('틀린 문항마다 오답 원인을 골라 주세요.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        studentId,
        absent,
        wrongItems: absent ? [] : [...wrong].sort((a, b) => a.no - b.no),
        score: absent ? 0 : score,
        strengths,
        improvements,
        teacherComment: comment,
        nextPlan: plan.filter((p) => p.content.trim() || p.goal.trim()).slice(0, MATH_PLAN_MAX_LINES),
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-bold text-slate-900">{studentName}</p>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" className="h-5 w-5" checked={absent} onChange={(e) => setAbsent(e.target.checked)} />
          결시 (반 평균에서 제외)
        </label>
      </div>

      {!absent && (
        <>
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-sm font-semibold text-slate-700">틀린 문항을 탭하세요 (✕)</p>
              <p className="text-lg font-bold text-violet-800">{score}<span className="text-sm font-medium text-slate-500"> / {total}점</span></p>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 md:grid-cols-10">
              {exam.items.map((item) => {
                const isWrong = wrongByNo.has(item.no)
                return (
                  <button
                    key={item.no}
                    type="button"
                    onClick={() => toggle(item.no)}
                    aria-pressed={isWrong}
                    className={`min-h-12 rounded-lg border text-center leading-tight ${isWrong ? 'border-rose-300 bg-rose-100 text-rose-700' : 'border-slate-200 bg-white text-slate-700'}`}
                  >
                    <span className="block text-xs text-slate-500">{item.no}번</span>
                    <span className="block text-base font-bold">{isWrong ? '✕' : '○'}</span>
                    <span className="block text-[10px] text-slate-400">{MATH_DIFFICULTY_LABEL[item.difficulty]} · {item.points}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {wrong.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">오답 원인</p>
              {[...wrong].sort((a, b) => a.no - b.no).map((w) => (
                <div key={w.no} className="flex flex-wrap items-center gap-2">
                  <span className="w-12 text-sm font-bold text-rose-700">{w.no}번</span>
                  {MATH_CAUSES.map((cause) => (
                    <button
                      key={cause}
                      type="button"
                      onClick={() => setCause(w.no, cause)}
                      aria-pressed={w.cause === cause}
                      className={`min-h-10 rounded-full border px-3 text-sm ${w.cause === cause ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                    >
                      {MATH_CAUSE_LABEL[cause]}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">잘한 점</label>
          <textarea className={inputClass()} rows={3} value={strengths} onChange={(e) => setStrengths(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">보완할 점</label>
          <textarea className={inputClass()} rows={3} value={improvements} onChange={(e) => setImprovements(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-600">총평</label>
        <textarea className={inputClass()} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">다음 달 계획 (최대 {MATH_PLAN_MAX_LINES}줄: 내용 + 목표)</p>
          {!absent && (
            <button type="button" className={btnSecondary} onClick={recommend}>추천 불러오기</button>
          )}
        </div>
        {plan.map((line, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
            <input className={inputClass()} placeholder="내용" value={line.content} onChange={(e) => setPlan((l) => l.map((p, k) => (k === i ? { ...p, content: e.target.value } : p)))} />
            <input className={inputClass()} placeholder="목표 (예: 단원 정답률 80%)" value={line.goal} onChange={(e) => setPlan((l) => l.map((p, k) => (k === i ? { ...p, goal: e.target.value } : p)))} />
            <button type="button" className={btnSecondary} onClick={() => setPlan((l) => l.filter((_, k) => k !== i))}>삭제</button>
          </div>
        ))}
        {plan.length < MATH_PLAN_MAX_LINES && (
          <button type="button" className={btnSecondary} onClick={() => setPlan((l) => [...l, { content: '', goal: '' }])}>+ 줄 추가</button>
        )}
      </div>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={btnPrimary} onClick={save} disabled={saving}>
          {saving ? '저장 중…' : row?.status === 'sent' ? '수정 저장 (학부모 화면에 반영)' : '임시 저장'}
        </button>
        <button type="button" className={btnSecondary} onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}
