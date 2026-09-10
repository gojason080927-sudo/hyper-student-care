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
import {
  applyViewerNavigation,
  clampPageIndex,
  isCoarsePointerEnvironment,
  isViewerControlEventTarget,
  resolveStagePointerNav,
  setViewerNavigationSink,
  shouldDeferStageEdgeToControl,
  shouldHandleStagePointer,
  stepPageIndex,
  type ViewerNavRecord,
  type ViewerNavSource,
} from '../../lib/admissionStrategy/viewerNavigation'

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
  const [pageIndex, setPageIndex] = useState(() =>
    clampPageIndex((initialPage || 1) - 1, Math.max(total, 0)),
  )
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [gestureActive, setGestureActive] = useState(false)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null)
  const panStartRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null)
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null)
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const pageIndexRef = useRef(pageIndex)
  pageIndexRef.current = pageIndex

  useViewerScrollLock(open)

  useEffect(() => {
    if (!open || !import.meta.env.DEV) return
    const records: ViewerNavRecord[] = []
    const devWindow = window as Window & { __admissionViewerNav?: ViewerNavRecord[] }
    devWindow.__admissionViewerNav = records
    setViewerNavigationSink((record) => {
      records.push(record)
    })
    return () => {
      setViewerNavigationSink(null)
    }
  }, [open])

  const pointerEnv = () => ({
    coarsePointer: isCoarsePointerEnvironment(),
    maxTouchPoints: typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
  })

  const navigate = useCallback(
    (
      nextIndex: number,
      source: ViewerNavSource,
      meta?: { eventType?: string; pointerType?: string },
    ) => {
      if (total === 0) return
      const result = applyViewerNavigation({
        fromIndex: pageIndexRef.current,
        nextIndex,
        total,
        source,
        eventType: meta?.eventType,
        pointerType: meta?.pointerType,
        at: Date.now(),
      })
      if (!result.changed) return
      pageIndexRef.current = result.toIndex
      setPageIndex(result.toIndex)
      setScale(1)
      setTranslate({ x: 0, y: 0 })
    },
    [total],
  )

  const step = useCallback(
    (delta: number, source: ViewerNavSource, meta?: { eventType?: string; pointerType?: string }) => {
      navigate(stepPageIndex(pageIndexRef.current, delta, total), source, meta)
    },
    [navigate, total],
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
        step(-1, 'keyboard', { eventType: 'keydown' })
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        step(1, 'keyboard', { eventType: 'keydown' })
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, open, step])

  const current = pages[pageIndex]
  const pageLabel = total > 0 ? `${pageIndex + 1} / ${total}` : '0 / 0'

  const resetZoom = () => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (isViewerControlEventTarget(event.target)) return
    if (!shouldHandleStagePointer(event.pointerType, pointerEnv())) return
    event.preventDefault()
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* untrusted test events cannot capture */
    }
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

  const resetGesturePointers = (pointerId: number) => {
    pointersRef.current.delete(pointerId)
    pinchStartRef.current = null
    panStartRef.current = null
    if (pointersRef.current.size === 0) setGestureActive(false)
  }

  const onPointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    resetGesturePointers(event.pointerId)
    swipeStartRef.current = null
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current
    const pointerCount = pointersRef.current.size
    resetGesturePointers(event.pointerId)

    if (!shouldHandleStagePointer(event.pointerType, pointerEnv())) {
      swipeStartRef.current = null
      return
    }

    if (isViewerControlEventTarget(event.target)) {
      swipeStartRef.current = null
      return
    }

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
      const rect = stageRef.current?.getBoundingClientRect()
      const nav = resolveStagePointerNav({
        dx,
        dy,
        clientX: event.clientX,
        stage: { left: rect?.left ?? 0, width: rect?.width ?? window.innerWidth },
      })
      const targetAtPoint =
        typeof document !== 'undefined' ? document.elementFromPoint(event.clientX, event.clientY) : null
      if (shouldDeferStageEdgeToControl(nav.action, targetAtPoint)) {
        swipeStartRef.current = null
        return
      }
      if (nav.action !== 'none') {
        step(nav.direction, nav.action === 'swipe' ? 'swipe' : 'edge-tap', {
          eventType: event.type,
          pointerType: event.pointerType,
        })
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

  const stopControlPointer = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  const dots = useMemo(() => (total > 0 && total <= 12 ? pages.map((page) => page.pageNumber) : []), [pages, total])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="admission-strategy-viewer fixed inset-0 z-[80] flex h-[100dvh] w-full max-w-full flex-col overflow-hidden bg-[#070f1c] text-white"
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
          data-viewer-control="close"
          onClick={onClose}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white hover:bg-white/10"
          aria-label="닫기"
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{title}</h2>
        <p
          data-testid="viewer-page-label"
          data-page={pageIndex + 1}
          className="shrink-0 px-2 text-sm tabular-nums text-white/80"
        >
          {pageLabel}
        </p>
      </header>

      <div className="relative min-h-0 min-w-0 flex-1">
        <div
          ref={stageRef}
          data-testid="viewer-stage"
          className="absolute inset-0 touch-none overflow-hidden"
          style={{
            paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
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
          ) : current.error ? (
            <p className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
              이 페이지를 불러오지 못했습니다.
            </p>
          ) : current.src ? (
            <div className="flex h-full w-full items-center justify-center overflow-hidden">
              <img
                src={current.src}
                alt={`${title} ${current.pageNumber}페이지`}
                draggable={false}
                className="pointer-events-none max-h-full max-w-full min-h-0 min-w-0 select-none object-contain"
                style={{
                  width: 'auto',
                  height: 'auto',
                  transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: gestureActive ? 'none' : 'transform 120ms ease-out',
                }}
              />
            </div>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-white/70">
              {current.loading === false ? '페이지가 없습니다.' : '불러오는 중...'}
            </p>
          )}
        </div>

        <button
          type="button"
          data-viewer-control="prev"
          aria-label="이전 페이지"
          disabled={pageIndex <= 0}
          className="admission-strategy-viewer-nav absolute left-1 top-1/2 z-10 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/50"
          onPointerDown={stopControlPointer}
          onPointerUp={stopControlPointer}
          onClick={(event) => {
            event.stopPropagation()
            step(-1, 'control', { eventType: 'click' })
          }}
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          data-viewer-control="next"
          aria-label="다음 페이지"
          disabled={pageIndex >= total - 1}
          className="admission-strategy-viewer-nav absolute right-1 top-1/2 z-10 h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white hover:bg-black/50"
          onPointerDown={stopControlPointer}
          onPointerUp={stopControlPointer}
          onClick={(event) => {
            event.stopPropagation()
            step(1, 'control', { eventType: 'click' })
          }}
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {dots.length > 1 && (
        <div className="flex shrink-0 justify-center gap-1.5 pb-3">
          {dots.map((pageNumber, index) => (
            <button
              key={pageNumber}
              type="button"
              data-viewer-control="dot"
              aria-label={`${pageNumber}페이지`}
              onClick={() => navigate(index, 'dot', { eventType: 'click' })}
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
