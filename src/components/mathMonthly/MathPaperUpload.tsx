import { useEffect, useState } from 'react'
import { countMathPapers, saveMathPapers } from '../../lib/db/mathMonthlyRepo'
import { downscaleForLocate } from '../../lib/mathMonthlyImage'
import { btnPrimary, inputClass } from '../../utils/labels'

type Props = { examId: string; students: { id: string; name: string }[]; onSaved: () => void }

/** 학생별 채점된 시험지를 미리 올려 둔다 — 이후 학생 입력에서 틀린 번호를 누르면 앱이 알아서 잘라 붙인다 */
export function MathPaperUpload({ examId, students, onSaved }: Props) {
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [studentId, setStudentId] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    countMathPapers(examId).then((m) => { if (!cancelled) setCounts(m) }).catch(() => undefined)
    return () => { cancelled = true }
  }, [examId, tick])

  const save = async () => {
    if (!studentId || files.length === 0) {
      setMsg('학생을 고르고 시험지 사진을 선택해 주세요.')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      const pages: string[] = []
      for (const f of files) pages.push(await downscaleForLocate(f))
      await saveMathPapers(examId, studentId, pages)
      setMsg(`${students.find((s) => s.id === studentId)?.name ?? ''} 시험지 ${pages.length}쪽을 저장했습니다.`)
      setFiles([])
      setStudentId('')
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
      <h2 className="text-base font-bold text-slate-900">채점된 시험지 올려 두기 (선택)</h2>
      <p className="text-sm text-slate-500">
        학생별로 채점된 시험지 전체를 쪽마다 찍어 올려 두면, 아래 학생별 입력에서 <b>틀린 번호만 누르면 앱이 그 문제를 찾아 잘라 붙입니다.</b> 발송하면 올려 둔 시험지는 자동으로 지워집니다.
      </p>
      <div className="grid gap-2 md:grid-cols-[200px_1fr_auto]">
        <select className={inputClass()} value={studentId} onChange={(e) => setStudentId(e.target.value)} aria-label="학생 선택">
          <option value="">학생 선택</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.name}{counts.get(s.id) ? ` (${counts.get(s.id)}쪽 저장됨)` : ''}</option>)}
        </select>
        <input
          type="file"
          accept="image/*"
          multiple
          className={inputClass()}
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        <button type="button" className={btnPrimary} onClick={save} disabled={saving}>{saving ? '저장 중…' : '시험지 저장'}</button>
      </div>
      {files.length > 0 && <p className="text-sm text-slate-600">선택한 시험지 {files.length}쪽 (선택한 순서대로 저장됩니다)</p>}
      {counts.size > 0 && (
        <p className="text-sm text-slate-600">올려 둔 학생: {students.filter((s) => counts.get(s.id)).map((s) => `${s.name} ${counts.get(s.id)}쪽`).join(' · ')}</p>
      )}
      {msg && <p className="text-sm text-slate-700">{msg}</p>}
    </section>
  )
}
