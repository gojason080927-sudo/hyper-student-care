import { useEffect, useMemo, useState } from 'react'
import { getMathExamImageMeta, saveMathExamImages, type MathExamImageMeta, type MathImage } from '../../lib/db/mathMonthlyRepo'
import { compressMathImage } from '../../lib/mathMonthlyImage'
import { imageNoFromFileName } from '../../utils/schoolExamReport'
import { btnPrimary, inputClass } from '../../utils/labels'
import type { MathMonthlyExam } from '../../utils/mathMonthlyReport'

type StudentOption = { id: string; name: string }
type Props = { exam: MathMonthlyExam; students: StudentOption[]; onSaved: () => void }

/** 시험지 문항 캡처(q01.jpg …) 가져오기 — 공개 범위 선택 후 저장 */
export function MathExamImageImport({ exam, students, onSaved }: Props) {
  const [meta, setMeta] = useState<MathExamImageMeta | null>(null)
  const [files, setFiles] = useState<Map<number, File>>(new Map())
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [scope, setScope] = useState<'' | 'clean' | 'student'>('')
  const [sourceStudentId, setSourceStudentId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    getMathExamImageMeta(exam.id).then((m) => { if (!cancelled) setMeta(m) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [exam.id, tick])

  const nos = useMemo(() => new Set(exam.items.map((i) => i.no)), [exam.items])

  const pick = (list: FileList | null) => {
    if (!list) return
    const next = new Map(files)
    const bad: string[] = []
    for (const f of Array.from(list)) {
      const no = imageNoFromFileName(f.name)
      if (no === null || !nos.has(no)) bad.push(f.name)
      else next.set(no, f)
    }
    setFiles(next)
    setUnmatched(bad)
  }

  const save = async () => {
    if (files.size === 0) return
    if (!scope) {
      setMsg('이미지 공개 범위를 선택해 주세요.')
      return
    }
    if (scope === 'student' && !sourceStudentId) {
      setMsg('시험지를 잘라 낸 학생을 선택해 주세요.')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      const images: MathImage[] = []
      for (const [no, f] of files) images.push({ no, ...(await compressMathImage(f)) })
      await saveMathExamImages(exam.id, images, { clean: scope === 'clean', sourceStudentId: scope === 'student' ? sourceStudentId : null })
      setMsg(`저장했습니다. 캡처 ${images.length}장.`)
      setFiles(new Map())
      setTick((t) => t + 1)
      onSaved()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">시험지 문항 캡처 가져오기 (선택)</h2>
      {meta && meta.nos.length > 0 && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          가져온 캡처 {meta.nos.length}장 · 공개 {meta.clean ? '반 전체(깨끗한 원본)' : meta.sourceStudentId ? '잘라 낸 학생 본인만' : '비공개'}
        </p>
      )}
      <p className="text-sm text-slate-500">
        시험지에서 문항별로 잘라 낸 사진(q01.jpg, q02.jpg …)을 한꺼번에 선택하세요. 학생이 직접 올린 사진이 있으면 그 사진이 우선합니다.
      </p>
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple className={inputClass()} onChange={(e) => pick(e.target.files)} />
      {files.size > 0 && <p className="text-sm text-slate-600">선택한 캡처 {files.size}장 ({Array.from(files.keys()).sort((a, b) => a - b).join(', ')}번)</p>}
      {unmatched.length > 0 && <p className="text-sm text-amber-700">번호를 알 수 없는 파일(무시됨): {unmatched.join(', ')}</p>}
      {files.size > 0 && (
        <>
          <fieldset className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <legend className="px-1 text-sm font-bold text-amber-900">이미지 공개 범위 (필수)</legend>
            <label className="flex items-start gap-2 text-sm text-slate-800">
              <input type="radio" name="mm-scope" className="mt-1" checked={scope === 'clean'} onChange={() => setScope('clean')} />
              필기·채점 흔적 없는 깨끗한 원본입니다 (반 전체 학부모에게 공개)
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-800">
              <input type="radio" name="mm-scope" className="mt-1" checked={scope === 'student'} onChange={() => setScope('student')} />
              특정 학생의 시험지에서 잘랐습니다 (그 학생 학부모에게만 공개)
            </label>
            {scope === 'student' && (
              <select className={inputClass()} value={sourceStudentId} onChange={(e) => setSourceStudentId(e.target.value)} aria-label="시험지를 잘라 낸 학생">
                <option value="">학생 선택</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </fieldset>
          <button type="button" className={btnPrimary} onClick={save} disabled={saving}>{saving ? '저장 중…' : '캡처 저장'}</button>
        </>
      )}
      {msg && <p className="text-sm text-slate-700">{msg}</p>}
    </section>
  )
}
