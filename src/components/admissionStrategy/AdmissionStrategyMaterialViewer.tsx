import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useViewerScrollLock } from '../../hooks/useViewerScrollLock'

export type AdmissionStrategyViewerPage = {
  pageNumber: number
  src: string | null
  width: number | null
  height: number | null
  loading?: boolean
  error?: boolean
}

type AdmissionStrategyMaterialViewerProps = {
  open: boolean
  title: string
  pages: AdmissionStrategyViewerPage[]
  initialPage?: number
  errorMessage?: string | null
  onClose: () => void
  onNeedPages?: (pageNumbers: number[]) => void
}

const MIN_SCALE = 1
const MAX_SCALE = 3.2
const DOUBLE_TAP_MS = 280
const SWIPE_THRESHOLD = 48

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function AdmissionStrategyMaterialViewer({
  open,
  title,
  pages,
  initialPage = 1,
  errorMessage,
  onClose,
  onNeedPages,
}: AdmissionStrategyMaterialViewerProps) {
  const total = pages.length
  const [pageIndex, setPageIndex] = useState(() => clamp((initialPage || 1) - 1, 0, Math.max(total - 1, 0)))
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [gestureActive, setGestureActive] = useState(false)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null)
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)

  useViewerScrollLock(open)

  const goTo = useCallback(
    (nextIndex: number) => {
      if (total === 0) return
      const clamped = clamp(nextIndex, 0, total - 1)
      setPageIndex(clamped)
      setScale(1)
      setTranslate({ x: 0, y: 0 })
    },
    [total],
  )

  useEffect(() => {
    if (!open || !onNeedPages || total === 0) return
    const needed = [pageIndex - 1, pageIndex, pageIndex + 1]
      .filter((index) => index >= 0 && index < total)
      .map((index) => pages[index]?.pageNumber)
      .filter((value): value is number => typeof value === 'number')
    onNeedPages(needed)
  }, [open, onNeedPages, pageIndex, pages, total])

  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goTo(pageIndex - 1)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goTo(pageIndex + 1)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goTo, onClose, open, pageIndex])

  const current = pages[pageIndex]
  const pageLabel = total > 0 ? `${pageIndex + 1} / ${total}` : '0 / 0'

  const resetZoom = () => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }

  const handleEdgeTap = (clientX: number) => {
    const width = stageRef.current?.clientWidth ?? window.innerWidth
    if (width <= 0) return
    const ratio = clientX / width
    if (ratio <= 0.28) goTo(pageIndex - 1)
    else if (ratio >= 0.72) goTo(pageIndex + 1)
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    setGestureActive(true)
    if (pointersRef.current.size === 1) {
      if (scale > 1) {
        panStartRef.current = { x: event.clientX, y: event.clientY, tx: translate.x, ty: translate.y }
        swipeStartRef.current = null
      } else {
        swipeStartRef.current = { x: event.clientX, y: event.clientY }
        panStartRef.current = null
      }
    }
    if (pointersRef.current.size === 2) {
      const points = [...pointersRef.current.values()]
      const dx = points[0].x - points[1].x
      const dy = points[0].y - points[1].y
      pinchStartRef.current = { distance: Math.hypot(dx, dy) || 1, scale }
      swipeStartRef.current = null
    }
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const points = [...pointersRef.current.values()]
      const dx = points[0].x - points[1].x
      const dy = points[0].y - points[1].y
      const distance = Math.hypot(dx, dy) || 1
      const nextScale = clamp(
        (pinchStartRef.current.scale * distance) / pinchStartRef.current.distance,
        MIN_SCALE,
        MAX_SCALE,
      )
      setScale(nextScale)
      if (nextScale === 1) setTranslate({ x: 0, y: 0 })
      return
    }
    if (scale > 1 && panStartRef.current && pointersRef.current.size === 1) {
      setTranslate({
        x: panStartRef.current.tx + event.clientX - panStartRef.current.x,
        y: panStartRef.current.ty + event.clientY - panStartRef.current.y,
      })
    }
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current
    const pointerCount = pointersRef.current.size
    pointersRef.current.delete(event.pointerId)
    pinchStartRef.current = null
    panStartRef.current = null
    if (pointersRef.current.size === 0) setGestureActive(false)

    if (pointerCount === 1 && scale === 1 && start) {
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      const now = Date.now()
      const lastTap = lastTapRef.current
      const isDoubleTap =
        lastTap &&
        now - lastTap.time < DOUBLE_TAP_MS &&
        Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 28

      if (isDoubleTap) {
        setScale(2.2)
        lastTapRef.current = null
        swipeStartRef.current = null
        return
      }

      lastTapRef.current = { time: now, x: event.clientX, y: event.clientY }

      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.15) {
        if (dx < 0) goTo(pageIndex + 1)
        else goTo(pageIndex - 1)
      } else if (Math.hypot(dx, dy) < 12) {
        handleEdgeTap(event.clientX)
      }
    }

    if (scale > 1.01) {
      const now = Date.now()
      const lastTap = lastTapRef.current
      const isDoubleTap =
        lastTap &&
        now - lastTap.time < DOUBLE_TAP_MS &&
        Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) < 28
      if (isDoubleTap) {
        resetZoom()
        lastTapRef.current = null
      } else {
        lastTapRef.current = { time: now, x: event.clientX, y: event.clientY }
      }
    }

    swipeStartRef.current = null
  }

  const onWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && Math.abs(event.deltaY) < 40) return
    event.preventDefault()
    const next = clamp(scale + (event.deltaY < 0 ? 0.18 : -0.18), MIN_SCALE, MAX_SCALE)
    setScale(next)
    if (next === 1) setTranslate({ x: 0, y: 0 })
  }

  const dots = useMemo(() => (total > 0 && total <= 12 ? pages.map((page) => page.pageNumber) : []), [pages, total])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="admission-strategy-viewer fixed inset-0 z-[80] flex h-[100dvh] w-screen flex-col bg-[#070f1c] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header
        className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#070f1c]/95 px-2"
        style={{
          paddingTop: 'max(0.4rem, env(safe-area-inset-top))',
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10"
          aria-label="닫기"
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{title}</h2>
        <p className="shrink-0 px-2 text-sm tabular-nums text-white/80">{pageLabel}</p>
      </header>

      <div
        ref={stageRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden"
        style={{
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {errorMessage ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
            {errorMessage}
          </div>
        ) : !current ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
            표시할 페이지가 없습니다.
          </div>
        ) : (
          <>
            <div className="flex h-full w-full items-center justify-center">
              {current.error ? (
                <p className="px-6 text-center text-sm text-white/80">이 페이지를 불러오지 못했습니다.</p>
              ) : current.src ? (
                <img
                  src={current.src}
                  alt={`${title} ${current.pageNumber}페이지`}
                  draggable={false}
                  className="max-h-full max-w-full select-none object-contain"
                  style={{
                    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                    transformOrigin: 'center center',
                    transition: gestureActive ? 'none' : 'transform 120ms ease-out',
                  }}
                />
              ) : (
                <p className="text-sm text-white/70">{current.loading === false ? '페이지가 없습니다.' : '불러오는 중...'}</p>
              )}
            </div>

            <button
              type="button"
              className="absolute left-1 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/50 sm:inline-flex"
              aria-label="이전 페이지"
              disabled={pageIndex <= 0}
              onClick={() => goTo(pageIndex - 1)}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              className="absolute right-1 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/50 sm:inline-flex"
              aria-label="다음 페이지"
              disabled={pageIndex >= total - 1}
              onClick={() => goTo(pageIndex + 1)}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {dots.length > 1 && (
        <div className="flex shrink-0 justify-center gap-1.5 pb-3">
          {dots.map((pageNumber, index) => (
            <button
              key={pageNumber}
              type="button"
              aria-label={`${pageNumber}페이지`}
              onClick={() => goTo(index)}
              className={`h-1.5 rounded-full transition ${
                index === pageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/35'
              }`}
            />
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
