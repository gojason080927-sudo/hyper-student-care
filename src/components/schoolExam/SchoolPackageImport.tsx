import { useEffect, useMemo, useState } from 'react'
import { compressCapture, type CompressedCapture } from '../../lib/schoolExamImage'
import { listExamImageNos, savePackage } from '../../lib/db/schoolExamRepo'
import { btnPrimary, btnSecondary, inputClass } from '../../utils/labels'
import {
  SCHOOL_DIFFICULTIES,
  matchImagesToItems,
  parseAnalysisPackage,
  type ParsedPackage,
  type SchoolDifficulty,
  type SchoolExam,
  type SchoolExamItem,
} from '../../utils/schoolExamReport'

type StudentOption = { id: string; name: string; grade: string }

type Props = {
  exam: SchoolExam
  students: StudentOption[]
  onSaved: (exam: SchoolExam) => void
}

type Provenance = '' | 'clean' | 'student'

/** 분석 패키지(analysis-package.json) + 문항 캡처(qNN.jpg) 가져오기 → 미리보기에서 수정 → 저장 */
export function SchoolPackageImport({ exam, students, onSaved }: Props) {
  const [pkg, setPkg] = useState<ParsedPackage | null>(null)
  const [items, setItems] = useState<SchoolExamItem[]>([])
  const [files, setFiles] = useState<Map<number, File>>(new Map())
  const [previews, setPreviews] = useState<Map<number, string>>(new Map())
  const [unmatched, setUnmatched] = useState<string[]>([])
  const [existingNos, setExistingNos] = useState<number[]>([])
  const [provenance, setProvenance] = useState<Provenance>('')
  const [sourceStudentId, setSourceStudentId] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    void listExamImageNos(exam.id).then((nos) => { if (!cancelled) setExistingNos(nos) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [exam.id, exam.packageImportedAt])

  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const readPackage = async (file: File | undefined) => {
    if (!file) return
    setMsg('')
    try {
      const parsed = parseAnalysisPackage(JSON.parse(await file.text()))
      setPkg(parsed)
      setItems(parsed.items.map((i) => ({ ...i })))
      if (parsed.sourceStudentId && students.some((s) => s.id === parsed.sourceStudentId)) {
        setProvenance('student')
        setSourceStudentId(parsed.sourceStudentId)
      } else if (parsed.clean === true) {
        setProvenance('clean')
      }
    } catch (e) {
      setPkg(null)
      setMsg(e instanceof Error ? e.message : '패키지를 읽지 못했습니다.')
    }
  }

  const readImages = (list: FileList | null) => {
    if (!list || !pkg) return
    const match = matchImagesToItems(Array.from(list).map((f) => ({ name: f.name, file: f })), items.map((i) => i.no))
    setFiles((prev) => new Map([...prev, ...match.matched]))
    setPreviews((prev) => {
      const next = new Map(prev)
      for (const [no, f] of match.matched) {
        const old = next.get(no)
        if (old) URL.revokeObjectURL(old)
        next.set(no, URL.createObjectURL(f))
      }
      return next
    })
    setUnmatched(match.unmatchedFiles)
  }

  const patch = (no: number, p: Partial<SchoolExamItem>) =>
    setItems((list) => list.map((i) => (i.no === no ? { ...i, ...p } : i)))

  const totalPoints = useMemo(() => Math.round(items.reduce((s, i) => s + i.points, 0)), [items])
  const missing = items.filter((i) => !files.has(i.no) && !existingNos.includes(i.no)).map((i) => i.no)
  const gradeMatches = students.filter((s) => !exam.grade || s.grade === exam.grade)

  const save = async () => {
    if (!pkg) return
    if (!provenance) {
      setMsg('이미지 공개 범위를 선택해 주세요. (깨끗한 원본인가 / 어느 학생 시험지에서 잘랐는가)')
      return
    }
    if (provenance === 'student' && !sourceStudentId) {
      setMsg('이미지를 자른 학생을 선택해 주세요.')
      return
    }
    if (items.some((i) => i.points <= 0)) {
      setMsg('배점이 0 이하인 문항이 있습니다.')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      const images = new Map<number, CompressedCapture>()
      for (const [no, f] of files) images.set(no, await compressCapture(f))
      const saved = await savePackage({
        examId: exam.id,
        rangeText: pkg.range,
        totalPoints,
        items,
        units: Array.from(new Set(items.map((i) => i.unit).filter(Boolean))),
        topProblems: pkg.topProblems,
        sourceStudentId: provenance === 'student' ? sourceStudentId : null,
        imagesClean: provenance === 'clean',
        images,
      })
      onSaved(saved)
      setMsg(`저장했습니다. 문항 ${items.length}개 · 캡처 ${images.size}장 업로드.`)
      setPkg(null)
      setFiles(new Map())
      setPreviews(new Map())
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const imported = exam.items.length > 0
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-base font-bold text-slate-900">2. 분석 패키지 가져오기</h2>
      {imported && !pkg && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          가져온 패키지: 문항 {exam.items.length}개 · 캡처 {existingNos.length}장 · 이미지 공개 {exam.imagesClean ? '전체(깨끗한 원본)' : exam.sourceStudentId ? '자른 학생 본인만' : '비공개'}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">analysis-package.json</label>
          <input type="file" accept=".json,application/json" className={inputClass()} onChange={(e) => void readPackage(e.target.files?.[0])} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">문항 캡처 이미지 (q01.jpg … 여러 장 선택)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={!pkg} className={inputClass()} onChange={(e) => readImages(e.target.files)} />
        </div>
      </div>

      {pkg && (
        <>
          <p className="text-sm text-slate-600">
            패키지: {pkg.title || '(시험명 없음)'} · {pkg.grade} · 문항 {items.length}개 · 배점 합계 <b>{totalPoints}점</b> · 캡처 {files.size}장 선택
            {missing.length > 0 && <span className="text-amber-700"> · 캡처 없는 문항: {missing.join(', ')}번 (학부모에게 "문제 이미지 준비 중"으로 표시)</span>}
          </p>
          {unmatched.length > 0 && <p className="text-sm text-amber-700">번호를 알 수 없는 파일(무시됨): {unmatched.join(', ')}</p>}

          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.no} className="grid grid-cols-[56px_1fr] gap-3 rounded-xl border border-slate-200 p-2">
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700">{item.no}번</p>
                  {previews.get(item.no) && <img src={previews.get(item.no)} alt="" className="mt-1 h-10 w-full rounded object-cover" />}
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
                  <input className={inputClass()} aria-label={`${item.no}번 정답`} placeholder="정답" value={item.answer} onChange={(e) => patch(item.no, { answer: e.target.value })} />
                  <select className={inputClass()} aria-label={`${item.no}번 난이도`} value={item.difficulty} onChange={(e) => patch(item.no, { difficulty: e.target.value as SchoolDifficulty })}>
                    {SCHOOL_DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <input className={inputClass()} aria-label={`${item.no}번 단원`} placeholder="단원" value={item.unit} onChange={(e) => patch(item.no, { unit: e.target.value })} />
                  <input className={`${inputClass()} col-span-2 md:col-span-2`} aria-label={`${item.no}번 유형`} placeholder="문제 유형" value={item.type} onChange={(e) => patch(item.no, { type: e.target.value })} />
                  <input type="number" step="0.01" min={0} className={inputClass()} aria-label={`${item.no}번 배점`} value={item.points} onChange={(e) => patch(item.no, { points: Number(e.target.value) || 0 })} />
                </div>
              </div>
            ))}
          </div>

          <fieldset className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <legend className="px-1 text-sm font-bold text-amber-900">이미지 공개 범위 (필수)</legend>
            <p className="text-xs text-amber-800">캡처에 시험지를 낸 학생의 필기·채점 흔적이 있으면 다른 학생 학부모에게 보이면 안 됩니다.</p>
            <label className="flex items-start gap-2 text-sm text-slate-800">
              <input type="radio" name="prov" className="mt-1" checked={provenance === 'clean'} onChange={() => setProvenance('clean')} />
              필기·채점 흔적 없는 깨끗한 원본입니다 (모든 학부모에게 공개)
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-800">
              <input type="radio" name="prov" className="mt-1" checked={provenance === 'student'} onChange={() => setProvenance('student')} />
              특정 학생의 시험지에서 잘랐습니다 (그 학생 학부모에게만 공개, 나머지는 "문제 이미지 준비 중")
            </label>
            {provenance === 'student' && (
              <select className={inputClass()} value={sourceStudentId} onChange={(e) => setSourceStudentId(e.target.value)} aria-label="이미지를 자른 학생">
                <option value="">학생 선택</option>
                {gradeMatches.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </fieldset>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={btnPrimary} onClick={save} disabled={saving}>{saving ? '저장 중…' : '패키지 저장'}</button>
            <button type="button" className={btnSecondary} onClick={() => { setPkg(null); setFiles(new Map()); setPreviews(new Map()) }} disabled={saving}>취소</button>
          </div>
        </>
      )}
      {msg && <p className="text-sm text-slate-700">{msg}</p>}
    </section>
  )
}
