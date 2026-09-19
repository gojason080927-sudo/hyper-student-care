/**
 * Chrome WebAPK + Android Adaptive Icon geometry.
 *
 * Evidence (not guessed percentages):
 *
 * Chromium WebappsIconUtils (ShortcutHelper adaptive path):
 *   MASKABLE_SAFE_ZONE_RATIO = 4/5          // W3C maskable safe circle
 *   ADAPTIVE_SAFE_ZONE_RATIO = 66/108       // Android guaranteed safe dp
 *   MASKABLE_ICON_PADDING_RATIO =
 *     ((4/5) / (66/108) - 1) / 2            // ≈ 0.1545454545
 *   createHomeScreenIconFromWebIcon(maskable=true):
 *     padding = Math.round(MASKABLE_ICON_PADDING_RATIO * innerSize)
 *     new ARGB_8888 canvas, icon drawn inset by padding (pad is transparent)
 *
 * AOSP AdaptiveIconDrawable:
 *   EXTRA_INSET_PERCENTAGE = 1/4
 *   DEFAULT_VIEW_PORT_SCALE = 1 / (1 + 2 * 1/4) = 2/3
 *   getIntrinsicWidth() = (int)(layerWidth * DEFAULT_VIEW_PORT_SCALE)
 *
 * Chrome then wraps the padded bitmap with Icon.createWithAdaptiveBitmap.
 * Galaxy One UI / Settings mask that viewport (squircle), not the raw 512 PNG.
 *
 * For a 512 maskable source the integer path is:
 *   padding = 79, padded = 670, viewport = 446, origin on source = 33
 * Visible fraction of the source = 446/512 = 0.87109375
 * The outer 33px of the 512 PNG is not on the Galaxy home tile.
 */
export const MASKABLE_SAFE_ZONE_RATIO = 4 / 5
export const ADAPTIVE_SAFE_ZONE_RATIO = 66 / 108
export const MASKABLE_ICON_PADDING_RATIO =
  (MASKABLE_SAFE_ZONE_RATIO / ADAPTIVE_SAFE_ZONE_RATIO - 1) / 2
export const EXTRA_INSET_PERCENTAGE = 1 / 4
export const VIEW_PORT_SCALE = 1 / (1 + 2 * EXTRA_INSET_PERCENTAGE)

export function chromeAdaptiveViewport(innerSize) {
  const padding = Math.round(MASKABLE_ICON_PADDING_RATIO * innerSize)
  const padded = innerSize + 2 * padding
  const viewport = (padded * VIEW_PORT_SCALE) | 0
  const paddedOrigin = ((padded - viewport) / 2) | 0
  const origin = paddedOrigin - padding
  return { padding, padded, paddedOrigin, viewport, origin }
}
