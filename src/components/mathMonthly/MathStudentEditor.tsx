import { useEffect, useMemo, useState } from 'react'
import { listMathPapers, listMathResultImages, saveMathResultImages, type MathImage, type MathResultRow } from '../../lib/db/mathMonthlyRepo'
import { analyzeMathProblem, generateMathComment, locateMathProblems } from '../../lib/mathMonthlyAi'
import { MATH_IMAGE_MAX_PER_STUDENT, compressMathImage, base64ToBlob, cropMathImage } from '../../lib/mathMonthlyImage'
import {
  MATH_CAUSES,
  MATH_DIFFICULTIES,
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
  const [images, setImages] = useState<Map<number, MathImage>>(new Map())
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [papers, setPapers] = useState<string[]>([])
  const [imagesDirty, setImagesDirty] = useState(false)
  const [busy, setBusy] = useState('')
  const [aiMsg, setAiMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    listMathResultImages(exam.id, studentId)
      .then((list) => {
        if (cancelled) return
        setImages(new Map(list.map((i) => [i.no, i])))
        setImagesLoaded(true)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : '문제 사진을 불러오지 못했습니다.')
      })
    return () => {
      cancelled = true
    }
  }, [exam.id, studentId])

  useEffect(() => {
    let cancelled = false
    listMathPapers(exam.id, studentId)
      .then((list) => { if (!cancelled) setPapers(list) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [exam.id, studentId])

  const total = useMemo(() => totalPoints(exam.items), [exam.items])
  const score = calcScore(exam.items, wrong.map((w) => w.no))
  const wrongByNo = new Map(wrong.map((w) => [w.no, w]))

  const unitFor = (no: number) => exam.units.find((u) => no >= u.from && no <= u.to)?.name ?? ''

  const toggle = (no: number) => {
    const turningOn = !wrong.some((w) => w.no === no)
    setWrong((list) =>
      list.some((w) => w.no === no) ? list.filter((w) => w.no !== no) : [...list, { no, cause: '', unit: unitFor(no) }],
    )
    if (turningOn && papers.length > 0 && !images.has(no)) void cropFromPapers([no], papers.map(base64ToBlob), papers)
  }
  const setCause = (no: number, cause: MathCause | '') => {
    setWrong((list) => list.map((w) => (w.no === no ? { ...w, cause } : w)))
  }
  const setField = (no: number, field: 'unit' | 'type' | 'note', value: string) => {
    setWrong((list) => list.map((w) => (w.no === no ? { ...w, [field]: value } : w)))
  }

  const addImage = async (no: number, file: File | undefined) => {
    if (!file) return
    if (!images.has(no) && images.size >= MATH_IMAGE_MAX_PER_STUDENT) {
      setError(`문제 사진은 학생당 최대 ${MATH_IMAGE_MAX_PER_STUDENT}장까지 올릴 수 있습니다.`)
      return
    }
    setError('')
    try {
      const img = await compressMathImage(file)
      setImages((m) => new Map(m).set(no, { no, ...img }))
      setImagesDirty(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '사진을 처리하지 못했습니다.')
    }
  }
  const removeImage = (no: number) => {
    setImages((m) => {
      const next = new Map(m)
      next.delete(no)
      return next
    })
    setImagesDirty(true)
  }

  /** 시험지 쪽 사진들에서 지정한 번호의 문제를 AI가 찾아 잘라 붙인다 */
  const cropFromPapers = async (nos: number[], blobs: Blob[], b64: string[]) => {
    setBusy('crop')
    setAiMsg('')
    let remaining = [...nos]
    const found = new Map<number, MathImage>()
    try {
      for (let p = 0; p < blobs.length && remaining.length > 0; p++) {
        const result = await locateMathProblems({ kind: 'locate', nos: remaining, imageBase64: b64[p] })
        if (!result.ok) {
          setAiMsg(result.message)
          break
        }
        for (const box of result.value) {
          if (!remaining.includes(box.no)) continue
          found.set(box.no, { no: box.no, ...(await cropMathImage(blobs[p], box)) })
        }
        remaining = remaining.filter((n) => !found.has(n))
      }
    } catch (e) {
      setAiMsg(e instanceof Error ? e.message : '시험지를 처리하지 못했습니다.')
    }
    if (found.size > 0) {
      setImages((m) => {
        const next = new Map(m)
        for (const [no, img] of found) next.set(no, img)
        return next
      })
      setImagesDirty(true)
    }
    setBusy('')
    setAiMsg((prev) =>
      prev || (remaining.length > 0
        ? `${[...found.keys()].join(', ') || '0'}번을 잘라 붙였습니다. 못 찾은 번호: ${remaining.join(', ')}번 — 해당 번호에서 사진을 직접 올려 주세요.`
        : `${[...found.keys()].sort((a, b) => a - b).join(', ')}번 문제를 잘라 붙였습니다. 사진이 맞는지 확인해 주세요.`),
    )
  }

  /** 저장된 시험지로 사진이 없는 틀린 문항을 한꺼번에 다시 자른다 */
  const recropAll = () => {
    if (papers.length === 0) return
    const nos = wrong.filter((w) => !images.has(w.no)).map((w) => w.no)
    if (nos.length === 0) {
      setAiMsg('사진이 없는 틀린 문항이 없습니다.')
      return
    }
    void cropFromPapers(nos, papers.map(base64ToBlob), papers)
  }

  const aiProblem = async (w: MathWrongItem) => {
    const img = images.get(w.no)
    if (!img) return
    const hasText = (w.type ?? '').trim() || (w.note ?? '').trim()
    if (hasText && !window.confirm('작성한 문제 유형·분석을 AI 초안으로 바꿀까요?')) return
    setBusy(`p${w.no}`)
    setAiMsg('')
    const result = await analyzeMathProblem({
      kind: 'problem',
      exam: { title: exam.title, grade: exam.grade },
      no: w.no,
      difficulty: MATH_DIFFICULTY_LABEL[exam.items.find((i) => i.no === w.no)?.difficulty ?? 'middle'],
      unit: w.unit || unitFor(w.no),
      cause: w.cause ? MATH_CAUSE_LABEL[w.cause] : '',
      imageBase64: img.data,
    })
    setBusy('')
    if (!result.ok) {
      setAiMsg(result.message)
      return
    }
    setWrong((list) => list.map((x) => (x.no === w.no ? { ...x, type: result.value.type, note: result.value.note } : x)))
  }

  const canAiComment = wrong.length > 0 || score === total
  const aiComment = async () => {
    if ((strengths.trim() || improvements.trim() || comment.trim()) && !window.confirm('작성한 의견을 AI 초안으로 바꿀까요?')) return
    setBusy('comment')
    setAiMsg('')
    const wrongNos = new Set(wrong.map((w) => w.no))
    const itemByNo = new Map(exam.items.map((i) => [i.no, i]))
    const result = await generateMathComment({
      kind: 'comment',
      exam: { title: exam.title, grade: exam.grade },
      score,
      totalPoints: total,
      itemCount: exam.items.length,
      wrongItems: [...wrong]
        .sort((a, b) => a.no - b.no)
        .map((w) => ({
          no: w.no,
          difficulty: MATH_DIFFICULTY_LABEL[itemByNo.get(w.no)?.difficulty ?? 'middle'],
          unit: w.unit || unitFor(w.no),
          type: w.type ?? '',
          cause: w.cause ? MATH_CAUSE_LABEL[w.cause] : '',
          note: w.note ?? '',
        })),
      correctByDifficulty: MATH_DIFFICULTIES.map((d) => {
        const list = exam.items.filter((i) => i.difficulty === d)
        return { difficulty: MATH_DIFFICULTY_LABEL[d], correct: list.filter((i) => !wrongNos.has(i.no)).length, total: list.length }
      }).filter((d) => d.total > 0),
    })
    setBusy('')
    if (!result.ok) {
      setAiMsg(result.message)
      return
    }
    setStrengths(result.value.strengths)
    setImprovements(result.value.improvements)
    setComment(result.value.comment)
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
        wrongItems: absent
          ? []
          : [...wrong]
              .sort((a, b) => a.no - b.no)
              .map((w) => ({
                no: w.no,
                cause: w.cause,
                unit: (w.unit || unitFor(w.no)).trim(),
                type: (w.type ?? '').trim(),
                note: (w.note ?? '').trim(),
              })),
        score: absent ? 0 : score,
        strengths,
        improvements,
        teacherComment: comment,
        nextPlan: plan.filter((p) => p.content.trim() || p.goal.trim()).slice(0, MATH_PLAN_MAX_LINES),
      })
      if (imagesLoaded && (imagesDirty || absent || wrong.length < images.size)) {
        const keep = absent ? new Set<number>() : new Set(wrong.map((w) => w.no))
        await saveMathResultImages(exam.id, studentId, [...images.values()].filter((i) => keep.has(i.no)))
      }
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
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700">오답 원인 · 문제 사진 · 분석</p>
                {papers.length > 0 && (
                  <button type="button" className={btnSecondary} disabled={busy !== ''} onClick={recropAll}>
                    {busy === 'crop' ? '자르는 중…' : `저장된 시험지(${papers.length}쪽)로 자르기`}
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {papers.length > 0
                  ? `올려 둔 시험지 ${papers.length}쪽이 있습니다. 틀린 번호를 누르면 AI가 그 문제를 찾아 아래 사진 칸에 붙입니다.`
                  : '시험지를 미리 올려 두면(위 "채점된 시험지 올려 두기") 틀린 번호를 누를 때 자동으로 붙습니다. 없으면 사진을 직접 올려 주세요.'}
              </p>
              {[...wrong].sort((a, b) => a.no - b.no).map((w) => {
                const img = images.get(w.no)
                return (
                  <div key={w.no} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center gap-2">
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
                    <div className="flex flex-wrap items-start gap-3">
                      {img && (
                        <img
                          src={`data:image/jpeg;base64,${img.data}`}
                          alt={`${w.no}번 문제 사진`}
                          className="max-h-40 max-w-[11rem] rounded-lg border border-slate-200 object-contain"
                        />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <label className={`${btnSecondary} cursor-pointer`}>
                          {img ? '사진 바꾸기' : '문제 사진 추가'}
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => {
                              void addImage(w.no, e.target.files?.[0])
                              e.target.value = ''
                            }}
                          />
                        </label>
                        <label className={`${btnSecondary} cursor-pointer`}>
                          갤러리에서 선택
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              void addImage(w.no, e.target.files?.[0])
                              e.target.value = ''
                            }}
                          />
                        </label>
                        {img && <button type="button" className={btnSecondary} onClick={() => removeImage(w.no)}>사진 삭제</button>}
                        <button
                          type="button"
                          className={btnSecondary}
                          disabled={!img || busy !== ''}
                          onClick={() => void aiProblem(w)}
                        >
                          {busy === `p${w.no}` ? 'AI 분석 중…' : 'AI 분석'}
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className={inputClass()} placeholder="단원" value={w.unit || unitFor(w.no)} onChange={(e) => setField(w.no, 'unit', e.target.value)} />
                      <input className={inputClass()} placeholder="문제 유형" value={w.type ?? ''} onChange={(e) => setField(w.no, 'type', e.target.value)} />
                    </div>
                    <textarea
                      className={inputClass()}
                      style={{ overflow: 'hidden', resize: 'none' }}
                      rows={2}
                      placeholder="강사 분석"
                      value={w.note ?? ''}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto'
                          el.style.height = `${el.scrollHeight}px`
                        }
                      }}
                      onChange={(e) => setField(w.no, 'note', e.target.value)}
                    />
                  </div>
                )
              })}
              <p className="text-xs text-slate-500">AI가 쓴 초안입니다. 읽어 보고 고쳐 주세요.</p>
            </div>
          )}
        </>
      )}

      {aiMsg && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{aiMsg}</p>}
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
        <div className="mb-1 flex items-center justify-between gap-2">
          <label className="text-sm font-medium text-slate-600">총평</label>
          {!absent && (
            <button type="button" className={btnSecondary} disabled={!canAiComment || busy !== ''} onClick={() => void aiComment()}>
              {busy === 'comment' ? 'AI 작성 중…' : 'AI 초안 작성 (잘한 점·보완할 점·총평)'}
            </button>
          )}
        </div>
        <textarea className={inputClass()} rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
        <p className="mt-1 text-xs text-slate-500">위 AI 초안 작성 버튼으로 의견 3칸을 채울 수 있습니다. AI가 쓴 초안입니다. 읽어 보고 고쳐 주세요.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">다음 달 계획 (최대 {MATH_PLAN_MAX_LINES}줄: 내용 + 목표)</p>
          {!absent && (
            <span className="flex flex-wrap gap-2">
              <button type="button" className={btnSecondary} onClick={recommend}>추천 불러오기</button>
            </span>
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
