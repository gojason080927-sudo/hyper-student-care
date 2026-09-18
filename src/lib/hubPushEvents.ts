export type HubPushAudience = 'student' | 'teacher'

export type HubAssignmentSnapshot = {
  id: string
  published: boolean
  grade: string
  className: string
  subject: string
  textbookName: string
  content: string
  dueDate: string | null
  studentId: string | null
}

export type HubQuestionAnswerSnapshot = {
  id: string
  source?: 'parent' | 'student' | null
  answer: string
  answerImageCount: number
}

export type HubNoticePublishSnapshot = {
  id: string
  published: boolean
}

export type HubInboxReplySnapshot = {
  id: string
  kind: 'material_request' | 'suggestion'
  teacherReply: string
}

export type StudentHubPushKind =
  | 'assignment_published'
  | 'assignment_changed'
  | 'inbox_replied'
  | 'question_answered'
  | 'notice_published'
  | 'material_published'
  | 'video_published'
  | 'weekly_summary'

export type TeacherHubPushKind = 'student_question' | 'material_request' | 'suggestion'

export function assignmentFingerprint(assignment: HubAssignmentSnapshot): string {
  return [
    assignment.grade.trim(),
    assignment.className.trim(),
    assignment.subject.trim(),
    assignment.textbookName.trim(),
    assignment.content.trim(),
    assignment.dueDate ?? '',
    assignment.studentId ?? '',
  ].join('\u001f')
}

export function assignmentPushKind(
  previous: HubAssignmentSnapshot | null,
  next: HubAssignmentSnapshot,
): 'published' | 'changed' | null {
  if (!next.published) return null
  if (!previous || !previous.published) return 'published'
  if (assignmentFingerprint(previous) !== assignmentFingerprint(next)) return 'changed'
  return null
}

export function isFirstTeacherReply(previousReply: string, nextReply: string): boolean {
  return previousReply.trim() === '' && nextReply.trim() !== ''
}

export function isFirstStudentQuestionAnswer(
  previous: HubQuestionAnswerSnapshot | null,
  next: HubQuestionAnswerSnapshot,
): boolean {
  if (next.source !== 'student') return false
  const hadAnswer = Boolean(previous && (previous.answer.trim() || previous.answerImageCount > 0))
  const hasAnswer = Boolean(next.answer.trim() || next.answerImageCount > 0)
  return !hadAnswer && hasAnswer
}

export function isFirstNoticePublish(
  previous: HubNoticePublishSnapshot | null,
  next: HubNoticePublishSnapshot,
): boolean {
  if (!next.published) return false
  return !previous || !previous.published
}

export function hubPushEventKey(kind: string, entityId: string, suffix = ''): string {
  return suffix ? `${kind}:${entityId}:${suffix}` : `${kind}:${entityId}`
}

export function studentAssignmentEventKey(
  assignmentId: string,
  kind: 'published' | 'changed',
  fingerprint = '',
): string {
  return kind === 'published'
    ? hubPushEventKey('student:assignment', assignmentId, 'published')
    : hubPushEventKey('student:assignment', assignmentId, `changed:${fingerprint}`)
}

export function studentInboxReplyEventKey(inboxId: string): string {
  return hubPushEventKey('student:inbox', inboxId, 'first_reply')
}

export function studentQuestionAnswerEventKey(questionId: string): string {
  return hubPushEventKey('student:question', questionId, 'first_answer')
}

export function studentNoticeEventKey(noticeId: string): string {
  return hubPushEventKey('student:notice', noticeId, 'published')
}

export function studentMaterialEventKey(materialId: string): string {
  return hubPushEventKey('student:material', materialId, 'published')
}

export function studentVideoEventKey(videoId: string): string {
  return hubPushEventKey('student:video', videoId, 'published')
}

export function studentWeeklySummaryEventKey(studentId: string, weekStart: string): string {
  return hubPushEventKey('student:weekly', studentId, weekStart)
}

export function teacherQuestionEventKey(questionId: string): string {
  return hubPushEventKey('teacher:question', questionId, 'created')
}

export function teacherInboxEventKey(inboxId: string): string {
  return hubPushEventKey('teacher:inbox', inboxId, 'created')
}

export function studentPushCopy(
  kind: StudentHubPushKind,
): { title: string; body: string; path: string } {
  switch (kind) {
    case 'assignment_published':
      return {
        title: 'HYPER Student Hub',
        body: '오늘의 과제가 등록되었습니다.',
        path: 'assignments',
      }
    case 'assignment_changed':
      return {
        title: 'HYPER Student Hub',
        body: '오늘의 과제가 변경되었습니다.',
        path: 'assignments',
      }
    case 'inbox_replied':
      return {
        title: 'HYPER Student Hub',
        body: '요청한 자료에 선생님 답변이 도착했습니다.',
        path: 'requests',
      }
    case 'question_answered':
      return {
        title: 'HYPER Student Hub',
        body: '질문에 선생님 답변이 도착했습니다.',
        path: 'questions',
      }
    case 'notice_published':
      return {
        title: 'HYPER Student Hub',
        body: '새 공지사항이 등록되었습니다.',
        path: 'notices',
      }
    case 'material_published':
      return {
        title: 'HYPER Student Hub',
        body: '새 문제 자료가 등록되었습니다.',
        path: 'materials',
      }
    case 'video_published':
      return {
        title: 'HYPER Student Hub',
        body: '새 영상이 등록되었습니다.',
        path: 'videos',
      }
    case 'weekly_summary':
      return {
        title: 'HYPER Student Hub',
        body: '이번 주 학습 SUMMARY가 도착했습니다.',
        path: 'weekly',
      }
  }
}

export function studentInboxReplyCopy(
  kind: 'material_request' | 'suggestion',
): { title: string; body: string; path: string } {
  if (kind === 'suggestion') {
    return {
      title: 'HYPER Student Hub',
      body: '건의사항에 답변이 등록되었습니다.',
      path: 'suggestions',
    }
  }
  return studentPushCopy('inbox_replied')
}

export function teacherPushCopy(
  kind: TeacherHubPushKind,
): { title: string; body: string; url: string } {
  if (kind === 'student_question') {
    return {
      title: 'HYPER Teacher',
      body: '새로운 학생 질문이 등록되었습니다.',
      url: '/teacher/mobile/questions',
    }
  }
  if (kind === 'material_request') {
    return {
      title: 'HYPER Teacher',
      body: '새로운 자료 요청이 등록되었습니다.',
      url: '/teacher/mobile/student-hub',
    }
  }
  return {
    title: 'HYPER Teacher',
    body: '새로운 학생 건의사항이 등록되었습니다.',
    url: '/teacher/mobile/student-hub',
  }
}

export function studentNotificationUrl(accessKey: string, path: string): string {
  const key = accessKey.trim()
  return key ? `/hub/${encodeURIComponent(key)}/${path}` : '/hub/'
}

export function payloadContainsSensitiveStudentContent(text: string): boolean {
  return /질문\s*내용|건의\s*내용|상담|점수|전화번호|학번/.test(text)
}
