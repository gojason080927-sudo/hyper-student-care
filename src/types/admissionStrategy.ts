export const ADMISSION_STRATEGY_TRACKS = ['고입', '대입'] as const

export type AdmissionStrategyTrack = (typeof ADMISSION_STRATEGY_TRACKS)[number]

export type AdmissionStrategyPost = {
  id: string
  track: AdmissionStrategyTrack
  title: string
  content: string
  publishedAt: string
  isPublished: boolean
  authorName: string
  createdAt: string
  updatedAt: string
}

/** 학부모 RPC 응답 — 공개 글만, is_published 미포함 */
export type ParentAdmissionStrategyPost = {
  id: string
  track: AdmissionStrategyTrack
  title: string
  content: string
  publishedAt: string
  authorName: string
}
