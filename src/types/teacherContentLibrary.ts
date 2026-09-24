export const TEACHER_CONTENT_LIBRARY_BUCKET = 'teacher-content-library'
export const TEACHER_CONTENT_LIBRARY_TABLE = 'teacher_content_library_items'
export const TEACHER_CONTENT_LIBRARY_MAX_BYTES = 52_428_800

export const TEACHER_CONTENT_LIBRARY_CATEGORIES = [
  '입시정보',
  '학원운영',
  '공부법',
  '학부모공감',
  'HYPER홍보',
  '블로그후보',
  '릴스/쇼츠 아이디어',
  '기타',
] as const

export const TEACHER_CONTENT_LIBRARY_STATUSES = ['미사용', '콘텐츠 제작중', '사용완료'] as const

export const TEACHER_CONTENT_LIBRARY_KINDS = ['link', 'file', 'mixed'] as const

export type TeacherContentLibraryCategory = (typeof TEACHER_CONTENT_LIBRARY_CATEGORIES)[number]
export type TeacherContentLibraryStatus = (typeof TEACHER_CONTENT_LIBRARY_STATUSES)[number]
export type TeacherContentLibraryKind = (typeof TEACHER_CONTENT_LIBRARY_KINDS)[number]

export const TEACHER_CONTENT_LIBRARY_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const

export const TEACHER_CONTENT_LIBRARY_ACCEPT = TEACHER_CONTENT_LIBRARY_ALLOWED_MIME_TYPES.join(',')

export type TeacherContentLibraryItem = {
  id: string
  title: string
  sourceUrl: string | null
  contentKind: TeacherContentLibraryKind
  category: TeacherContentLibraryCategory
  tags: string[]
  memo: string
  status: TeacherContentLibraryStatus
  filePath: string | null
  fileName: string | null
  fileMime: string | null
  fileSize: number | null
  createdByEmail: string | null
  createdAt: string
  updatedAt: string
}

export type TeacherContentLibraryDraft = {
  title: string
  sourceUrl: string
  category: TeacherContentLibraryCategory
  tagsText: string
  memo: string
  status: TeacherContentLibraryStatus
}

export type TeacherContentLibraryFilters = {
  query: string
  category: TeacherContentLibraryCategory | 'all'
  status: TeacherContentLibraryStatus | 'all'
}
