/**
 * Reload saved drafts without clobbering in-progress manual/voice edits.
 * Dirty keys keep the local value (ids can be refreshed from the loaded row).
 */
export function overlayLoadedDrafts<T>(
  prev: Record<string, T>,
  loaded: Record<string, T>,
  dirtyKeys: ReadonlySet<string>,
  mergeDirty: (local: T, loaded: T | undefined) => T = (local) => local,
): Record<string, T> {
  const next: Record<string, T> = { ...loaded }
  for (const key of dirtyKeys) {
    const local = prev[key]
    if (local === undefined) continue
    next[key] = mergeDirty(local, loaded[key])
  }
  return next
}

/** Mark keys whose object identity changed after a voice/manual patch. */
export function markChangedDraftKeys<T>(
  prev: Record<string, T>,
  next: Record<string, T>,
  dirtyKeys: Set<string>,
): void {
  for (const key of Object.keys(next)) {
    if (next[key] !== prev[key]) dirtyKeys.add(key)
  }
}
