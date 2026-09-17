/** HubLayout 첫 bundle 조회 이후, SPA 자식 라우트 변경에서만 다시 읽는다. */
export function hubRouteReloadNeeded(previousPathname: string | null, nextPathname: string): boolean {
  return previousPathname != null && previousPathname !== nextPathname
}

export function hubMaterialPreviewKind(
  material: {
    kind: string
    pages: unknown[]
    sourceFilePath: string | null
  },
): 'pages' | 'source' | 'none' {
  if (material.pages.length > 0) return 'pages'
  if ((material.kind === 'pdf' || material.kind === 'image') && material.sourceFilePath) return 'source'
  return 'none'
}

/**
 * SPA HOME → 자료실 진입은 전체 새로고침과 같이 Outlet을 내린다.
 * in-place setBundle 은 Production 삼성에서 최신 자료를 보여주지 못했다.
 */
export function hubRouteEntryUnmountsOutlet(previousPathname: string | null, nextPathname: string): boolean {
  return hubRouteReloadNeeded(previousPathname, nextPathname)
}

export function hubMaterialPreviewRuntime(material: {
  kind: string
  pages: unknown[]
  sourceFilePath: string | null
}): { kind: 'pages' | 'source' | 'none'; viewer: 'in-app' | 'none'; popupAfterAwait: false } {
  const kind = hubMaterialPreviewKind(material)
  if (kind === 'none') return { kind, viewer: 'none', popupAfterAwait: false }
  return { kind, viewer: 'in-app', popupAfterAwait: false }
}

export type HubSpaRuntime = {
  mode: 'loading' | 'ready'
  pathname: string
  prevPath: string | null
  generation: number
  outletMounted: boolean
  bundleLabel: string
}

export function hubSpaInitial(pathname: string): HubSpaRuntime {
  return {
    mode: 'loading',
    pathname,
    prevPath: null,
    generation: 1,
    outletMounted: false,
    bundleLabel: '',
  }
}

/** 첫 effect: previous=null 이면 추가 fetch 없이 현재 path만 기록한다. */
export function hubSpaRememberPath(state: HubSpaRuntime): HubSpaRuntime {
  return { ...state, prevPath: state.pathname }
}

export function hubSpaCompleteLoad(
  state: HubSpaRuntime,
  generation: number,
  bundleLabel: string,
): HubSpaRuntime {
  if (generation !== state.generation) return state
  return { ...state, mode: 'ready', outletMounted: true, bundleLabel }
}

export function hubSpaNavigate(state: HubSpaRuntime, nextPathname: string): HubSpaRuntime {
  if (!hubRouteEntryUnmountsOutlet(state.prevPath, nextPathname)) {
    return { ...state, pathname: nextPathname, prevPath: nextPathname }
  }
  return {
    mode: 'loading',
    pathname: nextPathname,
    prevPath: nextPathname,
    generation: state.generation + 1,
    outletMounted: false,
    bundleLabel: '',
  }
}

export function hubRenderedPagesToViewerPages(
  rendered: { pageNumber: number; width: number; height: number }[],
  urls: string[],
): { pageNumber: number; assetPath: string; width: number | null; height: number | null }[] {
  return rendered.map((page, index) => ({
    pageNumber: page.pageNumber,
    assetPath: urls[index] ?? '',
    width: page.width,
    height: page.height,
  }))
}
