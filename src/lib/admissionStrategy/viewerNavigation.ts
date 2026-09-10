/** 입시전략 자료 뷰어: 한 번에 한 페이지. 제스처가 두 번 들어와 index가 2씩 건너뛰지 않게 한다. */

export const VIEWER_POINTER_NAV_COOLDOWN_MS = 320
export const VIEWER_GHOST_MOUSE_MS = 700
export const VIEWER_ORIENTATION_LOCK_MS = 500
export const VIEWER_EDGE_PREV_RATIO = 0.28
export const VIEWER_EDGE_NEXT_RATIO = 0.72

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

export function shouldAcceptViewerNavigation(params: {
  now: number
  lastAcceptedAt: number
  cooldownMs?: number
  pointerType?: string
  lastTouchAt?: number
  ghostMouseMs?: number
}): boolean {
  const cooldownMs = params.cooldownMs ?? VIEWER_POINTER_NAV_COOLDOWN_MS
  if (params.now - params.lastAcceptedAt < cooldownMs) return false
  if (
    params.pointerType === 'mouse' &&
    params.lastTouchAt != null &&
    params.now - params.lastTouchAt < (params.ghostMouseMs ?? VIEWER_GHOST_MOUSE_MS)
  ) {
    return false
  }
  return true
}
