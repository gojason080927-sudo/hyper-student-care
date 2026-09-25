import { FileText, Loader2, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { convertPdfToDocx, MAX_PDF_BYTES } from '../../lib/pdfToDocxClient'
import { btnPrimary, btnSecondary } from '../../utils/labels'

type Stage = 'idle' | 'uploading' | 'converting' | 'done' | 'error'

type Result = { fileName: string; signedUrl: string }

export function PdfToDocxConverter() {
  const [stage, setStage] = useState<Stage>('idle')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function pickFile(file: File | null) {
    setResult(null)
    setErrorMessage('')
    setStage('idle')
    if (!file) {
      setSelectedFile(null)
      return
    }
    if (file.type !== 'application/pdf') {
      setSelectedFile(null)
      setErrorMessage('PDF 파일만 선택할 수 있습니다.')
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      setSelectedFile(null)
      setErrorMessage('파일이 너무 큽니다 (최대 100MB).')
      return
    }
    setSelectedFile(file)
  }

  async function handleConvert() {
    if (!selectedFile) return
    setErrorMessage('')
    setResult(null)
    const outcome = await convertPdfToDocx(selectedFile, (nextStage) => setStage(nextStage))
    if (!outcome.ok) {
      setStage('error')
      setErrorMessage(outcome.message)
      return
    }
    setStage('done')
    setResult({ fileName: outcome.fileName, signedUrl: outcome.signedUrl })
  }

  const isBusy = stage === 'uploading' || stage === 'converting'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-6 py-10 text-center hover:border-blue-400 hover:bg-blue-50/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <UploadCloud className="h-8 w-8 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">
            {selectedFile ? selectedFile.name : 'PDF 파일을 선택하세요'}
          </span>
          <span className="text-xs text-slate-400">최대 100MB · 150~180페이지 교재도 가능</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
        />

        {errorMessage && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={btnPrimary}
            disabled={!selectedFile || isBusy}
            onClick={handleConvert}
          >
            {isBusy ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {stage === 'uploading' ? '업로드 중…' : '변환 중… (몇 분 걸릴 수 있어요)'}
              </span>
            ) : (
              'DOCX로 변환'
            )}
          </button>
          {selectedFile && !isBusy && (
            <button type="button" className={btnSecondary} onClick={() => pickFile(null)}>
              선택 취소
            </button>
          )}
        </div>

        {result && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-emerald-800">
              <FileText className="h-4 w-4" />
              {result.fileName}
            </div>
            <a
              href={result.signedUrl}
              download={result.fileName}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              다운로드
            </a>
          </div>
        )}
      </div>
      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        표·이미지가 복잡한 PDF는 서식이 완벽히 일치하지 않을 수 있어요. 스캔본(글자 없는 이미지 PDF)은
        변환이 안 될 수 있습니다. 다운로드 링크는 10분간만 유효해요.
      </p>
    </div>
  )
}
