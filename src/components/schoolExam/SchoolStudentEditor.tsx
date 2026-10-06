import { useMemo, useState } from 'react'
import type { SchoolResultRow } from '../../lib/db/schoolExamRepo'
import {
  SCHOOL_CAUSES,
  SCHOOL_CAUSE_LABEL,
  SCHOOL_PLAN_MAX_LINES,
  calcSchoolScore,
  draftNote,
  type SchoolCause,
  type SchoolExam,
  type SchoolWrongItem,
} from '../../utils/schoolExamReport'
import { btnPrimary, btnSecondary, inputClass } from '../../utils/labels'

type Props = {
  exam: SchoolExam
  studentId: string
  studentName: string
  row: SchoolResultRow | undefined
  onSave: (row: Omit<SchoolResultRow, 'status' | 'sentAt'>) => Promise<void>
  onClose: () => void
}

/** 학생 1명 입력: 틀린 번호 탭 → 오답 원인(초안 채움) → 확인 체크 → 총평·대비 계획 */
export function SchoolStudentEditor({ exam, studentId, studentName, row, onSave, onClose }: Props) {
  const [absent, setAbsent] = useState(row?.absent ?? false)
  const [wrong, setWrong] = useState<SchoolWrongItem[]>(row?.wrongItems ?? [])
  const [confirmed, setConfirmed] = useState(row?.causeConfirmed ?? false)
  const [comment, setComment] = useState(row?.teacherComment ?? '')
  const [planText, setPlanText] = useState((row?.nextPlan ?? []).join('\n'))
  const [scoreManual, setScoreManual] = useState(row?.scoreManual ?? false)
  const [manualScore, setManualScore] = useState(row?.scoreManual ? row.score : 0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const itemByNo = useMemo(() => new Map(exam.items.map((i) => [i.no, i])), [exam.items])
  const autoScore = calcSchoolScore(exam.items, wrong.map((w) => w.no))
  const score = scoreManual ? manualScore : autoScore
  const wrongByNo = new Map(wrong.map((w) => [w.no, w]))
  const sortedWrong = [...wrong].sort((a, b) => a.no - b.no)

  const toggle = (no: number) => {
    const item = itemByNo.get(no)
    setConfirmed(false) // 새로 채워진 초안이 있으면 다시 확인해야 한다
    setWrong((list) =>
      list.some((w) => w.no === no)
        ? list.filter((w) => w.no !== no)
        : [...list, { no, cause: item?.recommendedCause ?? '', note: item ? draftNote(item) : '' }],
    )
  }
  const patch = (no: number, p: Partial<SchoolWrongItem>) =>
    setWrong((list) => list.map((w) => (w.no === no ? { ...w, ...p } : w)))

  const save = async () => {
    const plan = planText.split('\n').map((l) => l.trim()).filter(Boolean)
    if (plan.length > SCHOOL_PLAN_MAX_LINES) {
      setError(`대비 계획은 최대 ${SCHOOL_PLAN_MAX_LINES}줄입니다.`)
      return
    }
    if (!absent && scoreManual && (manualScore < 0 || manualScore > exam.totalPoints)) {
      setError(`점수는 0~${Math.round(exam.totalPoints)}점 사이여야 합니다.`)
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({
        studentId,
        absent,
        wrongItems: absent ? [] : sortedWrong,
        causeConfirmed: absent ? false : confirmed,
        score: absent ? 0 : score,
        scoreManual: absent ? false : scoreManual,
        teacherComment: comment.trim(),
        nextPlan: plan,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={absent} onChange={(e) => setAbsent(e.target.checked)} />
        결시 ({studentName})
      </label>

      {!absent && (
        <>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">틀린 문항을 탭하세요</p>
            <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
              {exam.items.map((item) => {
                const isWrong = wrongByNo.has(item.no)
                return (
                  <button
                    key={item.no}
                    type="button"
                    aria-pressed={isWrong}
                    aria-label={`${item.no}번 ${isWrong ? '틀림' : '맞힘'}`}
                    onClick={() => toggle(item.no)}
                    className={`min-h-11 rounded-lg border text-sm font-bold ${
                      isWrong ? 'border-rose-300 bg-rose-100 text-rose-700' : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {item.no}
                  </button>
                )
              })}
            </div>
          </div>

          {sortedWrong.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">
                오답 원인 · 강사 분석 <span className="font-normal text-slate-500">(패키지 추천 초안이 채워져 있습니다 — 확인·수정 후 체크)</span>
              </p>
              {sortedWrong.map((w) => {
                const item = itemByNo.get(w.no)
                return (
                  <div key={w.no} className="rounded-xl border border-slate-200 p-3">
                    <p className="mb-2 text-sm font-bold text-slate-800">
                      {w.no}번 <span className="font-normal text-slate-500">{item?.difficulty} · {item?.unit} · {item?.type}</span>
                    </p>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {SCHOOL_CAUSES.map((c: SchoolCause) => (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={w.cause === c}
                          onClick={() => patch(w.no, { cause: c })}
                          className={`min-h-10 rounded-full border px-3 text-sm font-semibold ${
                            w.cause === c ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {SCHOOL_CAUSE_LABEL[c]}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className={`${inputClass()} min-h-16`}
                      aria-label={`${w.no}번 강사 분석`}
                      placeholder="강사 분석 한 줄"
                      value={w.note}
                      onChange={(e) => patch(w.no, { note: e.target.value })}
                    />
                  </div>
                )
              })}
              <label className="flex items-start gap-2 rounded-xl bg-violet-50 p-3 text-sm font-semibold text-violet-900">
                <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                오답 원인과 강사 분석을 확인·수정했습니다 (체크해야 발송됩니다)
              </label>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
            <p>
              점수 <b className="text-base text-slate-900">{score}</b> / {Math.round(exam.totalPoints)}점
              <span className="ml-2 text-slate-500">(맞힌 문항 배점 합계 {autoScore}점)</span>
            </p>
            <label className="mt-2 flex flex-wrap items-center gap-2">
              <input type="checkbox" checked={scoreManual} onChange={(e) => { setScoreManual(e.target.checked); if (e.target.checked) setManualScore(autoScore) }} />
              점수 직접 입력
              {scoreManual && (
                <input type="number" min={0} max={exam.totalPoints} className={`${inputClass()} w-24`} value={manualScore} onChange={(e) => setManualScore(Number(e.target.value) || 0)} />
              )}
            </label>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">선생님 총평</label>
            <textarea className={`${inputClass()} min-h-24`} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              다음 시험 대비 계획 <span className="font-normal text-slate-500">(한 줄에 하나, 번호는 자동, 최대 {SCHOOL_PLAN_MAX_LINES}개)</span>
            </label>
            <textarea className={`${inputClass()} min-h-24`} value={planText} onChange={(e) => setPlanText(e.target.value)} />
          </div>
        </>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className={btnPrimary} onClick={save} disabled={saving}>{saving ? '저장 중…' : '임시 저장'}</button>
        <button type="button" className={btnSecondary} onClick={onClose}>닫기</button>
      </div>
    </div>
  )
}
