import type { HubMaterial } from './types'

export function isOwnedHubMaterialStoragePath(materialId: string, path: string): boolean {
  const id = materialId.trim()
  const normalized = path.trim()
  if (!id || !normalized) return false
  return normalized === id || normalized.startsWith(`${id}/`)
}

export function collectHubMaterialStoragePaths(
  material: Pick<HubMaterial, 'id' | 'sourceFilePath' | 'pages'>,
): string[] {
  const paths = new Set<string>()
  if (
    material.sourceFilePath &&
    isOwnedHubMaterialStoragePath(material.id, material.sourceFilePath)
  ) {
    paths.add(material.sourceFilePath)
  }
  for (const page of material.pages) {
    if (page.assetPath && isOwnedHubMaterialStoragePath(material.id, page.assetPath)) {
      paths.add(page.assetPath)
    }
  }
  return [...paths]
}

export function mergeOwnedHubMaterialStoragePaths(
  materialId: string,
  knownPaths: string[],
  listedPaths: string[],
): string[] {
  const paths = new Set<string>()
  for (const path of [...knownPaths, ...listedPaths]) {
    if (isOwnedHubMaterialStoragePath(materialId, path)) paths.add(path)
  }
  return [...paths]
}
