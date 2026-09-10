/** 입시전략 자료 뷰어: 한 번에 한 페이지. 입력 경로를 단일화한다. */

export const VIEWER_EDGE_PREV_RATIO = 0.28
export const VIEWER_EDGE_NEXT_RATIO = 0.72
export const VIEWER_SWIPE_THRESHOLD = 48

export type ViewerNavSource =
  | 'edge-tap'
  | 'swipe'
  | 'control'
  | 'keyboard'
  | 'dot'

export type ViewerNavRecord = {
  source: ViewerNavSource
  eventType?: string
  pointerType?: string
  fromIndex: number
  toIndex: number
  direction: number
  at: number
}

export function clampPageIndex(index: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(total - 1, Math.max(0, index))
}

export function stepPageIndex(current: number, delta: number, total: number): number {
  return clampPageIndex(current + delta, total)
}

export type EdgeTapDirection = -1 | 0 | 1

export function edgeTapDirection(
  clientX: number,
  stage: { left: number; width: number },
  previousRatio = VIEWER_EDGE_PREV_RATIO,
  nextRatio = VIEWER_EDGE_NEXT_RATIO,
): EdgeTapDirection {
  if (stage.width <= 0) return 0
  const ratio = (clientX - stage.left) / stage.width
  if (ratio <= previousRatio) return -1
  if (ratio >= nextRatio) return 1
  return 0
}

export type StagePointerNav = { action: 'swipe' | 'edge'; direction: -1 | 1 } | { action: 'none' }

export function resolveStagePointerNav(params: {
  dx: number
  dy: number
  clientX: number
  stage: { left: number; width: number }
  swipeThreshold?: number
}): StagePointerNav {
  const swipeThreshold = params.swipeThreshold ?? VIEWER_SWIPE_THRESHOLD
  if (Math.abs(params.dx) > swipeThreshold && Math.abs(params.dx) > Math.abs(params.dy) * 1.15) {
    return { action: 'swipe', direction: params.dx < 0 ? 1 : -1 }
  }
  if (Math.hypot(params.dx, params.dy) < 12) {
    const direction = edgeTapDirection(params.clientX, params.stage)
    if (direction !== 0) return { action: 'edge', direction }
  }
  return { action: 'none' }
}

/** 스테이지 제스처가 내부 버튼/컨트롤에서 시작됐으면 페이지 이동을 하지 않는다. */
export function isViewerControlEventTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== 'object' || !('closest' in target)) return false
  const el = target as { closest: (selector: string) => Element | null }
  return Boolean(el.closest('button, a, input, textarea, select, [data-viewer-control]'))
}

/**
 * Pointer Events가 유일한 스테이지 입력이다.
 * 터치 기기에서 따라오는 compatibility mouse pointer는 같은 제스처의 두 번째 입력이므로 무시한다.
 * (시간 cooldown / ghost flag가 아니라 입력 모델 선택)
 */
export function shouldHandleStagePointer(
  pointerType: string,
  env: { coarsePointer: boolean; maxTouchPoints: number },
): boolean {
  if (pointerType === 'mouse' && (env.coarsePointer || env.maxTouchPoints > 0)) return false
  return true
}

export function isCoarsePointerEnvironment(
  media: ((query: string) => { matches: boolean }) | null = typeof window !== 'undefined'
    ? window.matchMedia.bind(window)
    : null,
): boolean {
  if (!media) return false
  try {
    return media('(pointer: coarse)').matches
  } catch {
    return false
  }
}

/** pointer capture 때문에 pointerup이 스테이지로 오더라도, 그 좌표에 컨트롤이 있으면 edge tap은 버튼 click에 맡긴다. */
export function shouldDeferStageEdgeToControl(
  action: StagePointerNav['action'],
  targetAtPoint: EventTarget | null,
): boolean {
  return action === 'edge' && isViewerControlEventTarget(targetAtPoint)
}

/**
 * PR #7 이전 구조: 버튼이 스테이지 자식이면 한 탭이 stage pointerup + button click 둘 다 발생.
 * 현재 구조: 버튼은 스테이지 형제로 분리되어 한 탭은 둘 중 하나만 발생한다.
 */
export function navigationIntentsForTap(params: {
  hitsStage: boolean
  hitsControl: boolean
  controlsAreStageChildren: boolean
}): number {
  if (params.controlsAreStageChildren) {
    return Number(params.hitsStage) + Number(params.hitsControl)
  }
  if (params.hitsControl) return 1
  if (params.hitsStage) return 1
  return 0
}

type ViewerNavSink = (record: ViewerNavRecord) => void

let navigationSink: ViewerNavSink | null = null

/** 테스트 전용. Production에서는 sink를 등록하지 않는다. */
export function setViewerNavigationSink(sink: ViewerNavSink | null): void {
  navigationSink = sink
}

export function emitViewerNavigation(record: ViewerNavRecord): void {
  navigationSink?.(record)
}

export function applyViewerNavigation(params: {
  fromIndex: number
  nextIndex: number
  total: number
  source: ViewerNavSource
  eventType?: string
  pointerType?: string
  at?: number
}): { fromIndex: number; toIndex: number; changed: boolean } {
  const toIndex = clampPageIndex(params.nextIndex, params.total)
  const changed = toIndex !== params.fromIndex
  if (changed) {
    emitViewerNavigation({
      source: params.source,
      eventType: params.eventType,
      pointerType: params.pointerType,
      fromIndex: params.fromIndex,
      toIndex,
      direction: toIndex - params.fromIndex,
      at: params.at ?? 0,
    })
  }
  return { fromIndex: params.fromIndex, toIndex, changed }
}
