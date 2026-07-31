import { copyTextToClipboard } from './copyToClipboard'
import { buildStudentCareShareMessage, normalizeStudentCareUrl } from './studentCareUrl'

export type ShareStudentCareLinkResult =
  | { ok: true; message?: string }
  | { ok: false; message: string }

/** Kakao SDK 없이 Web Share API 또는 클립보드로 공유 (완전한 https URL 포함) */
export async function shareStudentCareLinkFallback(
  careUrl: string,
): Promise<ShareStudentCareLinkResult> {
  const url = normalizeStudentCareUrl(careUrl)
  const text = buildStudentCareShareMessage(url)

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: '[Hyper Student Care]', text, url })
      return { ok: true }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { ok: false, message: '공유가 취소되었습니다.' }
      }
    }
  }

  const copied = await copyTextToClipboard(text)
  if (copied.ok) {
    return {
      ok: true,
      message:
        '공유 문구가 클립보드에 복사되었습니다. 카카오톡 채팅에 붙여넣기하면 링크로 인식됩니다.',
    }
  }

  return {
    ok: false,
    message: copied.error,
  }
}
