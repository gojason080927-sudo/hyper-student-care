import type { HubMaterial } from './types'

export type HubMaterialListEntry =
  | { type: 'single'; material: HubMaterial }
  | { type: 'folder'; folderId: string; folderName: string; items: HubMaterial[] }

/** 같은 folderId 자료를 첫 등장 위치에서 폴더 1개로 묶는다. folderId가 없으면 낱개 그대로 둔다. */
export function groupHubMaterialsByFolder(materials: HubMaterial[]): HubMaterialListEntry[] {
  const entries: HubMaterialListEntry[] = []
  const folders = new Map<string, Extract<HubMaterialListEntry, { type: 'folder' }>>()
  for (const material of materials) {
    if (!material.folderId) {
      entries.push({ type: 'single', material })
      continue
    }
    const existing = folders.get(material.folderId)
    if (existing) {
      existing.items.push(material)
      continue
    }
    const folder = {
      type: 'folder' as const,
      folderId: material.folderId,
      folderName: material.folderName || '폴더',
      items: [material],
    }
    folders.set(material.folderId, folder)
    entries.push(folder)
  }
  return entries
}
