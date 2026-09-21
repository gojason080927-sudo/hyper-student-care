export const HUB_INBOX_REPLY_SAVE_SUCCESS = '답변을 저장했습니다.'
export const HUB_INBOX_REPLY_SAVE_FAILURE = '답변 저장에 실패했습니다.'
export const HUB_INBOX_STATUS_SAVE_FAILURE = '상태 변경에 실패했습니다.'

export function hubInboxReplyUpdatePayload(
  reply: string,
  repliedAt = new Date().toISOString(),
): {
  teacher_reply: string
  teacher_replied_at: string | null
} {
  const teacherReply = reply.trim()
  return {
    teacher_reply: teacherReply,
    teacher_replied_at: teacherReply ? repliedAt : null,
  }
}

export function hubInboxStatusUpdatePayload(status: string): { status: string } {
  return { status }
}

export function requireHubInboxUpdatedRow<T extends { id?: unknown }>(
  row: T | null | undefined,
  id: string,
  fallback: string,
): T {
  if (!row || String(row.id) !== id) {
    throw new Error(fallback)
  }
  return row
}

/** 저장 성공과 reload 성공을 분리한다. reload 실패는 저장 실패 토스트를 만들지 않는다. */
export function toastsForHubInboxReplyPersist(result: {
  persist: 'ok' | 'failed'
  reload?: 'ok' | 'failed'
}): string[] {
  if (result.persist === 'failed') return [HUB_INBOX_REPLY_SAVE_FAILURE]
  return [HUB_INBOX_REPLY_SAVE_SUCCESS]
}

export function mergePatchedHubInboxItem<T extends { id: string }>(
  prev: T[],
  id: string,
  patch: Partial<T>,
): T[] {
  return prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
}
