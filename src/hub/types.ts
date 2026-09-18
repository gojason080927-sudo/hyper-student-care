export type HubAudienceType = 'all' | 'grade' | 'class' | 'student'

export type HubIdentity = {
  id: string
  name: string
  school: string
  grade: string
  className: string
  accessKeyActive: boolean
}

export type HubAssignment = {
  id: string
  grade: string
  className: string
  subject: string
  textbookName: string
  content: string
  dueDate: string | null
  studentId: string | null
  published: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export type HubMaterialKind = 'pdf' | 'image' | 'hwp' | 'hwpx' | 'docx' | 'pptx' | 'file'

export type HubMaterialPage = {
  pageNumber: number
  assetPath: string
  width: number | null
  height: number | null
}

export type HubMaterial = {
  id: string
  title: string
  description: string
  kind: HubMaterialKind
  originalFileName: string
  sourceFilePath: string | null
  mime: string
  pageCount: number
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN'
  audienceType: HubAudienceType
  targetGrade: string | null
  targetClassName: string | null
  targetStudentId: string | null
  publishedAt: string | null
  createdAt: string
  pages: HubMaterialPage[]
}

export type HubVideoTimestamp = {
  label: string
  seconds: number
}

export type HubVideo = {
  id: string
  title: string
  description: string
  videoUrl: string
  videoId: string
  audienceType: HubAudienceType
  targetGrade: string | null
  targetClassName: string | null
  targetStudentId: string | null
  published: boolean
  publishedAt: string | null
  timestamps: HubVideoTimestamp[]
  createdAt: string
}

export type HubAttachmentKind = 'image' | 'pdf' | 'file' | 'video'

export type HubQuestionAttachment = {
  id: string
  kind: HubAttachmentKind
  storagePath: string
  mime: string
  byteSize: number
  durationMs: number | null
  originalName: string
  ready: boolean
}

export type HubQuestion = {
  id: string
  date: string
  category: string
  title: string
  content: string
  answer: string
  status: string
  source: 'student'
  createdAt: string
  updatedAt: string
  attachments: HubQuestionAttachment[]
}

export type HubInboxKind = 'material_request' | 'suggestion'

export type HubInboxAttachment = {
  id: string
  storagePath: string
  mime: string
  byteSize: number
  originalName: string
  ready: boolean
}

export type HubInboxItem = {
  id: string
  kind: HubInboxKind
  title: string
  content: string
  status: string
  teacherReply: string
  teacherRepliedAt: string | null
  createdAt: string
  studentId?: string
  studentName?: string
  attachments: HubInboxAttachment[]
}

export const HUB_LEARNING_MATERIALS_BUCKET = 'hub-learning-materials'
export const HUB_QUESTION_ATTACHMENTS_BUCKET = 'hub-question-attachments'

export const HUB_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const HUB_FILE_MAX_BYTES = 10 * 1024 * 1024
export const HUB_VIDEO_MAX_BYTES = 40 * 1024 * 1024
export const HUB_VIDEO_MAX_DURATION_MS = 60_000
export const HUB_MAX_ATTACHMENTS = 5

export const HUB_VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm'] as const
export const HUB_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

export const STUDENT_QUESTION_CATEGORIES = ['수업질문', '숙제질문', '시험질문', '기타'] as const

export const HUB_ACADEMY_LOGO_WEBP = '/hub/hyper-academy-logo-v1.webp'
export const HUB_ACADEMY_LOGO_PNG = '/hub/hyper-academy-logo-v1.png'

export const STUDY_PLAN_SUBJECT_PRESETS = ['수학', '영어'] as const

export const STUDY_PLAN_RESULTS = ['pending', 'completed', 'failed'] as const
export type StudyPlanResult = (typeof STUDY_PLAN_RESULTS)[number]

export type StudentStudyPlan = {
  id: string
  planDate: string
  subject: string
  content: string
  startTime: string
  endTime: string
  completed: boolean
  result: StudyPlanResult
  createdAt: string
  updatedAt: string
}
