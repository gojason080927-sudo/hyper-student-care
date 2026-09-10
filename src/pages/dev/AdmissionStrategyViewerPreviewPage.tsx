import { useMemo, useState } from 'react'
import { AdmissionStrategyMaterialViewer } from '../../components/admissionStrategy/AdmissionStrategyMaterialViewer'

function pageSrc(pageNumber: number, total: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1272">
    <rect width="100%" height="100%" fill="#eef4ff"/>
    <text x="48" y="96" font-size="42" font-family="sans-serif" fill="#163A70">페이지 ${pageNumber}</text>
    <text x="48" y="150" font-size="28" font-family="sans-serif" fill="#334155">${pageNumber} / ${total}</text>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

/** 개발 전용: 전체화면 자료 뷰어 제스처 확인 (기본 20페이지) */
export function AdmissionStrategyViewerPreviewPage() {
  const [open, setOpen] = useState(true)
  const total = 20
  const pages = useMemo(
    () =>
      Array.from({ length: total }, (_, index) => ({
        pageNumber: index + 1,
        src: pageSrc(index + 1, total),
        width: 900,
        height: 1272,
      })),
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
