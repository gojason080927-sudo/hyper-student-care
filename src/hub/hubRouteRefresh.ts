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
