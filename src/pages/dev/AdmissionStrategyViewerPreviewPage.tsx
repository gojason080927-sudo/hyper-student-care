import { useMemo, useState } from 'react'
import { AdmissionStrategyMaterialViewer } from '../../components/admissionStrategy/AdmissionStrategyMaterialViewer'

function makePage(pageNumber: number, label: string, fill: string): string {
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 1272
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#163A70'
  ctx.font = 'bold 42px sans-serif'
  ctx.fillText(label, 48, 96)
  ctx.font = '28px sans-serif'
  ctx.fillStyle = '#334155'
  ctx.fillText(`${pageNumber} / 3`, 48, 150)
  ctx.fillText('스와이프 · 좌우 터치 · 키보드로 이동', 48, 200)
  return canvas.toDataURL('image/png')
}

/** 개발 전용: 전체화면 자료 뷰어 제스처 확인 */
export function AdmissionStrategyViewerPreviewPage() {
  const [open, setOpen] = useState(true)
  const pages = useMemo(
    () => [
      { pageNumber: 1, src: makePage(1, '2028 대입 완전정리', '#eef4ff'), width: 900, height: 1272 },
      { pageNumber: 2, src: makePage(2, '고교학점제 안내', '#f4fffb'), width: 900, height: 1272 },
      { pageNumber: 3, src: makePage(3, '정시 지원 전략', '#fff7ed'), width: 900, height: 1272 },
    ],
    [],
  )

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <h1 className="text-xl font-bold text-navy-900">입시전략 뷰어 미리보기</h1>
      <p className="mt-2 text-sm text-slate-600">개발 환경에서만 열리는 제스처 확인 화면입니다.</p>
      <button
        type="button"
        className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        onClick={() => setOpen(true)}
      >
        뷰어 열기
      </button>
      <AdmissionStrategyMaterialViewer
        key={open ? 'open' : 'closed'}
        open={open}
        title="2028 대입 완전정리"
        pages={pages}
        onClose={() => setOpen(false)}
      />
    </div>
  )
}
