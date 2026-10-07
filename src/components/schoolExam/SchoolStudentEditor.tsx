import { NumInput } from '../mathMonthly/NumInput'
import { useMemo, useState } from 'react'
import type { SchoolResultRow } from '../../lib/db/schoolExamRepo'
import { generateSchoolExamAiComment } from '../../lib/schoolExamAiComment'
import {
  SCHOOL_CAUSES,
  SCHOOL_CAUSE_LABEL,
  SCHOOL_DIFFICULTIES,
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
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')

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

  /** AI 초안: 총평·계획 칸만 채운다 (확인 체크·발송 조건은 건드리지 않는다) */
  const writeAiDraft = async () => {
    if (sortedWrong.length === 0 || aiLoading) return
    if ((comment.trim() || planText.trim()) && !window.confirm('기존 내용을 AI 초안으로 바꿀까요?')) return
    const wrongNos = new Set(sortedWrong.map((w) => w.no))
    setAiLoading(true)
    setAiError('')
    const result = await generateSchoolExamAiComment({
      exam: { title: exam.title, subject: exam.subject, grade: exam.grade, range: exam.rangeText },
      score,
      totalPoints: exam.totalPoints,
      itemCount: exam.items.length,
      wrongItems: sortedWrong.map((w) => {
        const item = itemByNo.get(w.no)
        return {
          no: w.no,
          difficulty: item?.difficulty ?? '',
          unit: item?.unit ?? '',
          type: item?.type ?? '',
          cause: w.cause ? SCHOOL_CAUSE_LABEL[w.cause] : '',
          note: w.note,
        }
      }),
      correctByDifficulty: SCHOOL_DIFFICULTIES.map((d) => {
        const items = exam.items.filter((i) => i.difficulty === d)
        return { difficulty: d, total: items.length, correct: items.filter((i) => !wrongNos.has(i.no)).length }
      }).filter((d) => d.total > 0),
    })
    setAiLoading(false)
    if (!result.ok) {
      setAiError(result.message)
      return
    }
    setComment(result.comment)
    setPlanText(result.plan.join('\n'))
  }

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
                <NumInput min={0} max={exam.totalPoints} className={`${inputClass()} w-24`} value={manualScore} onValue={(v) => setManualScore(v)} />
              )}
            </label>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnSecondary} onClick={writeAiDraft} disabled={sortedWrong.length === 0 || aiLoading}>
                {aiLoading ? '작성 중…' : 'AI 초안 작성'}
              </button>
              <span className="text-xs text-slate-500">AI가 쓴 초안입니다. 읽어 보고 고쳐 주세요.</span>
            </div>
            {aiError && <p className="text-sm text-rose-600">{aiError}</p>}
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
