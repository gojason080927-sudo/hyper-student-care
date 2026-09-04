import type {
  AdmissionStrategyPost,
  AdmissionStrategyTrack,
  ParentAdmissionStrategyPost,
} from '../../types/admissionStrategy.ts'
import { ADMISSION_STRATEGY_TRACKS } from '../../types/admissionStrategy.ts'

export type AdmissionStrategyRow = {
  id: string
  track: string
  title: string
  content: string
  published_at: string
  is_published: boolean
  author_name: string | null
  created_at: string
  updated_at: string
}

function isTrack(value: string): value is AdmissionStrategyTrack {
  return (ADMISSION_STRATEGY_TRACKS as readonly string[]).includes(value)
}

export function admissionStrategyFromRow(row: AdmissionStrategyRow): AdmissionStrategyPost {
  return {
    id: row.id,
    track: isTrack(row.track) ? row.track : '고입',
    title: row.title,
    content: row.content,
    publishedAt: row.published_at,
    isPublished: Boolean(row.is_published),
    authorName: row.author_name ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function admissionStrategyToRow(record: AdmissionStrategyPost): AdmissionStrategyRow {
  return {
    id: record.id,
    track: record.track,
    title: record.title,
    content: record.content,
    published_at: record.publishedAt,
    is_published: record.isPublished,
    author_name: record.authorName,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  }
}

export function filterPublishedAdmissionStrategyPosts<
  T extends { isPublished: boolean },
>(posts: T[]): T[] {
  return posts.filter((post) => post.isPublished)
}

export function filterAdmissionStrategyByTrack<T extends { track: AdmissionStrategyTrack }>(
  posts: T[],
  track: AdmissionStrategyTrack,
): T[] {
  return posts.filter((post) => post.track === track)
}

export function parseParentAdmissionStrategyPosts(value: unknown): ParentAdmissionStrategyPost[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const track = typeof row.track === 'string' && isTrack(row.track) ? row.track : null
    const id = typeof row.id === 'string' ? row.id : ''
    const title = typeof row.title === 'string' ? row.title : ''
    if (!track || !id || !title) return []
    return [
      {
        id,
        track,
        title,
        content: typeof row.content === 'string' ? row.content : '',
        publishedAt:
          typeof row.published_at === 'string'
            ? row.published_at
            : typeof row.publishedAt === 'string'
              ? row.publishedAt
              : '',
        authorName: typeof row.author_name === 'string' ? row.author_name : '',
      },
    ]
  })
}
