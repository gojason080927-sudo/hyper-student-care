/**
 * 실행: node --experimental-strip-types src/lib/admissionStrategy/viewerNavigation.test.ts
 */
import assert from 'node:assert/strict'
import {
  applyViewerNavigation,
  clampPageIndex,
  edgeTapDirection,
  isViewerControlEventTarget,
  navigationIntentsForTap,
  resolveStagePointerNav,
  setViewerNavigationSink,
  shouldDeferStageEdgeToControl,
  shouldHandleStagePointer,
  stepPageIndex,
  type ViewerNavRecord,
} from './viewerNavigation.ts'

assert.equal(clampPageIndex(0, 20), 0)
assert.equal(clampPageIndex(19, 20), 19)
assert.equal(clampPageIndex(-1, 20), 0)
assert.equal(clampPageIndex(20, 20), 19)

assert.equal(stepPageIndex(0, 1, 20), 1)
assert.equal(stepPageIndex(1, 1, 20), 2)
assert.equal(stepPageIndex(18, 1, 20), 19)
assert.equal(stepPageIndex(19, 1, 20), 19)
assert.equal(stepPageIndex(1, -1, 20), 0)

const landscape = { left: 0, width: 844 }
assert.equal(edgeTapDirection(40, landscape), -1)
assert.equal(edgeTapDirection(422, landscape), 0)
assert.equal(edgeTapDirection(800, landscape), 1)

assert.deepEqual(
  resolveStagePointerNav({ dx: -80, dy: 4, clientX: 400, stage: landscape }),
  { action: 'swipe', direction: 1 },
)
assert.deepEqual(
  resolveStagePointerNav({ dx: 80, dy: 4, clientX: 400, stage: landscape }),
  { action: 'swipe', direction: -1 },
)
assert.deepEqual(
  resolveStagePointerNav({ dx: 2, dy: 1, clientX: 800, stage: landscape }),
  { action: 'edge', direction: 1 },
)
assert.deepEqual(
  resolveStagePointerNav({ dx: 2, dy: 1, clientX: 422, stage: landscape }),
  { action: 'none' },
)

assert.equal(
  shouldHandleStagePointer('touch', { coarsePointer: true, maxTouchPoints: 5 }),
  true,
)
assert.equal(
  shouldHandleStagePointer('pen', { coarsePointer: true, maxTouchPoints: 5 }),
  true,
)
assert.equal(
  shouldHandleStagePointer('mouse', { coarsePointer: true, maxTouchPoints: 5 }),
  false,
)
assert.equal(
  shouldHandleStagePointer('mouse', { coarsePointer: false, maxTouchPoints: 5 }),
  false,
)
assert.equal(
  shouldHandleStagePointer('mouse', { coarsePointer: false, maxTouchPoints: 0 }),
  true,
)

{
  const button = { closest: (selector: string) => (selector.includes('button') ? {} : null) }
  assert.equal(shouldDeferStageEdgeToControl('edge', button), true)
  assert.equal(shouldDeferStageEdgeToControl('swipe', button), false)
  assert.equal(shouldDeferStageEdgeToControl('none', button), false)
  assert.equal(shouldDeferStageEdgeToControl('edge', null), false)
}

assert.equal(
  navigationIntentsForTap({ hitsStage: true, hitsControl: true, controlsAreStageChildren: true }),
  2,
)
assert.equal(
  navigationIntentsForTap({ hitsStage: true, hitsControl: true, controlsAreStageChildren: false }),
  1,
)
assert.equal(
  navigationIntentsForTap({ hitsStage: true, hitsControl: false, controlsAreStageChildren: false }),
  1,
)
assert.equal(
  navigationIntentsForTap({ hitsStage: false, hitsControl: true, controlsAreStageChildren: false }),
  1,
)

const records: ViewerNavRecord[] = []
setViewerNavigationSink((record) => records.push(record))

function stepLogged(fromIndex: number, delta: number, source: ViewerNavRecord['source'], at: number) {
  return applyViewerNavigation({
    fromIndex,
    nextIndex: fromIndex + delta,
    total: 20,
    source,
    eventType: source === 'control' ? 'click' : 'pointerup',
    pointerType: source === 'control' ? undefined : 'touch',
    at,
  })
}

let index = 0
const forward: number[] = [index]
for (let i = 0; i < 19; i++) {
  const result = stepLogged(index, 1, 'edge-tap', i + 1)
  assert.equal(result.changed, true)
  assert.equal(result.toIndex - result.fromIndex, 1)
  index = result.toIndex
  forward.push(index)
}
assert.deepEqual(
  forward,
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
)

const backward: number[] = [index]
for (let i = 0; i < 19; i++) {
  const result = stepLogged(index, -1, 'edge-tap', 100 + i)
  assert.equal(result.toIndex - result.fromIndex, -1)
  index = result.toIndex
  backward.push(index)
}
assert.deepEqual(
  backward,
  [19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
)

assert.equal(
  records.every((item) => Math.abs(item.direction) === 1),
  true,
)

const kept = applyViewerNavigation({
  fromIndex: 6,
  nextIndex: 6,
  total: 20,
  source: 'edge-tap',
  at: 0,
})
assert.equal(kept.changed, false)
assert.equal(kept.toIndex, 6)

const kept19 = applyViewerNavigation({
  fromIndex: 18,
  nextIndex: 18,
  total: 20,
  source: 'edge-tap',
  at: 0,
})
assert.equal(kept19.toIndex, 18)

setViewerNavigationSink(null)

assert.equal(isViewerControlEventTarget(null), false)
{
  const button = { closest: (selector: string) => (selector.includes('button') ? {} : null) }
  assert.equal(isViewerControlEventTarget(button), true)
}
{
  const img = { closest: () => null }
  assert.equal(isViewerControlEventTarget(img), false)
}

console.log('viewerNavigation OK')
