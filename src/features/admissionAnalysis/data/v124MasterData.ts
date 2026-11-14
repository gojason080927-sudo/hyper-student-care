import type { V124RecommendationRecord } from '../types/v124Recommendation'

type V124Bundle = {
  meta: {
    sourceFile: string
    curriculumSheet: string
    comprehensiveSheet: string
    masterDataRows: number
    comprehensiveDataRows: number
    recommendableRecords: number
  }
  records: V124RecommendationRecord[]
}

let cached: V124RecommendationRecord[] | null = null

export async function loadV124RecommendationRecords(): Promise<
  V124RecommendationRecord[]
> {
  if (cached) return cached
  const mod = await import('./master/v124RecommendationRecords.json')
  const data = (mod as { default?: V124Bundle } & V124Bundle).default ?? mod
  cached = (data as V124Bundle).records
  return cached
}
