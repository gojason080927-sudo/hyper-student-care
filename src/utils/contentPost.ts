import type {
  ContentPost,
  ContentPostCategory,
  NoticeAudienceType,
} from '../types/records'

export const CONTENT_POST_MAX_LENGTH = 20000
export const CONTENT_POST_CATEGORIES: ContentPostCategory[] = ['학습정보', '공지사항']

/** 학부모 화면 표시용 구분 */
export function getContentPostDisplayCategory(_category: ContentPostCategory): string {
  return '학습 공지사항'
}

export type ContentPostFormData = {
  id?: string
  category: ContentPostCategory | ''
  title: string
  content: string
  summary: string
  sourceName: string
  originalArticleTitle: string
  authorName: string
  isPinned: boolean
  isPublished: boolean
  publishedAt: string
  audienceType: NoticeAudienceType
  targetGrade: string
  targetClassName: string
  targetStudentId: string
  publishStartDate: string
  publishEndDate: string
  isImportant: boolean
}

export function emptyContentPostForm(): ContentPostFormData {
  return {
    category: '공지사항',
    title: '',
    content: '',
    summary: '',
    sourceName: '',
    originalArticleTitle: '',
    authorName: '',
    isPinned: false,
    isPublished: true,
    publishedAt: new Date().toISOString().slice(0, 10),
    audienceType: 'all',
    targetGrade: '',
    targetClassName: '',
    targetStudentId: '',
    publishStartDate: '',
    publishEndDate: '',
    isImportant: false,
  }
}

export function contentPostToForm(post: ContentPost): ContentPostFormData {
  return {
    id: post.id,
    category: post.category,
    title: post.title,
    content: post.content,
    summary: post.summary,
    sourceName: post.sourceName,
    originalArticleTitle: post.originalArticleTitle,
    authorName: post.authorName,
    isPinned: post.isPinned,
    isPublished: post.isPublished,
    publishedAt: post.publishedAt,
    audienceType: post.audienceType ?? 'all',
    targetGrade: post.targetGrade ?? '',
    targetClassName: post.targetClassName ?? '',
    targetStudentId: post.targetStudentId ?? '',
    publishStartDate: post.publishStartDate ?? '',
    publishEndDate: post.publishEndDate ?? '',
    isImportant: post.isImportant ?? false,
  }
}

export function normalizeContentPostRecord(post: ContentPost): ContentPost {
  return {
    ...post,
    audienceType: post.audienceType ?? 'all',
    targetGrade: post.targetGrade?.trim() ?? '',
    targetClassName: post.targetClassName?.trim() ?? '',
    targetStudentId: post.targetStudentId?.trim() ?? '',
    publishStartDate: post.publishStartDate?.trim() ?? '',
    publishEndDate: post.publishEndDate?.trim() ?? '',
    isImportant: post.isImportant ?? false,
    title: post.title.trim(),
    content: post.content.slice(0, CONTENT_POST_MAX_LENGTH),
    summary: post.summary.trim(),
    sourceName: post.sourceName.trim(),
    originalArticleTitle: post.originalArticleTitle.trim(),
    authorName: post.authorName.trim(),
  }
}

export type ContentPostSortOrder = 'desc' | 'asc'

export function sortContentPosts(
  posts: ContentPost[],
  order: ContentPostSortOrder = 'desc',
): ContentPost[] {
  return [...posts].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    if (a.isImportant !== b.isImportant) return a.isImportant ? -1 : 1
    const diff = new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    return order === 'desc' ? -diff : diff
  })
}

export function getContentPostPreview(post: ContentPost, maxLength = 160): string {
  if (post.summary.trim()) return post.summary.trim()
  const text = post.content.replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}…`
}

export function hasContentPostAttachment(post: ContentPost): boolean {
  return /<img[\s>]/i.test(post.content)
}

export function validateContentPostForm(form: ContentPostFormData): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.category) errors.category = '구분을 선택해 주세요.'
  if (!form.title.trim()) errors.title = '제목을 입력해 주세요.'
  if (!form.content.trim()) errors.content = '본문을 입력해 주세요.'
  if (!form.authorName.trim()) errors.authorName = '작성자를 입력해 주세요.'
  if (!form.publishedAt) errors.publishedAt = '게시일을 선택해 주세요.'
  if (form.content.length > CONTENT_POST_MAX_LENGTH) {
    errors.content = `본문은 ${CONTENT_POST_MAX_LENGTH.toLocaleString()}자 이내로 입력해 주세요.`
  }
  if (form.audienceType === 'grade' && !form.targetGrade.trim()) {
    errors.targetGrade = '대상 학년을 선택해 주세요.'
  }
  if (form.audienceType === 'class') {
    if (!form.targetGrade.trim()) errors.targetGrade = '대상 학년을 선택해 주세요.'
    if (!form.targetClassName.trim()) errors.targetClassName = '대상 반/과정을 선택해 주세요.'
  }
  if (form.audienceType === 'student' && !form.targetStudentId.trim()) {
    errors.targetStudentId = '대상 학생을 선택해 주세요.'
  }
  if (
    form.publishStartDate &&
    form.publishEndDate &&
    form.publishStartDate > form.publishEndDate
  ) {
    errors.publishEndDate = '게시 종료일은 시작일 이후여야 합니다.'
  }
  return errors
}

export function getAdjacentPosts(
  posts: ContentPost[],
  currentId: string,
): { prev: ContentPost | null; next: ContentPost | null } {
  const sorted = sortContentPosts(posts)
  const index = sorted.findIndex((post) => post.id === currentId)
  if (index === -1) return { prev: null, next: null }
  return {
    prev: index > 0 ? sorted[index - 1] : null,
    next: index < sorted.length - 1 ? sorted[index + 1] : null,
  }
}
