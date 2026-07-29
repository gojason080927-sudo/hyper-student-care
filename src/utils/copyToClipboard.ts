/** 클립보드 API 실패 시 textarea fallback */
export async function copyTextToClipboard(
  text: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = text.trim().replace(/^['"`]+|['"`]+$/g, '')
  if (!normalized) {
    return { ok: false, error: '복사할 내용이 없습니다.' }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(normalized)
      return { ok: true }
    } catch {
      // fallback below
    }
  }

  if (typeof document === 'undefined') {
    return { ok: false, error: '클립보드 복사를 지원하지 않는 환경입니다.' }
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = normalized
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    if (copied) return { ok: true }
    return {
      ok: false,
      error: '클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.',
    }
  } catch {
    return { ok: false, error: '클립보드 복사에 실패했습니다.' }
  }
}
