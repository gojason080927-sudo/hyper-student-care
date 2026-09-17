export function parseYoutubeVideoId(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value
  try {
    const url = new URL(value)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] ?? ''
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const v = url.searchParams.get('v')
      if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v
      const parts = url.pathname.split('/').filter(Boolean)
      if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') && parts[1]) {
        return /^[A-Za-z0-9_-]{11}$/.test(parts[1]) ? parts[1] : null
      }
    }
  } catch {
    return null
  }
  return null
}

export function youtubeEmbedUrl(videoId: string, startSeconds = 0): string {
  const base = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
  if (startSeconds > 0) {
    return `${base}?start=${Math.floor(startSeconds)}`
  }
  return base
}

export function parseTimestampLines(raw: string): { label: string; seconds: number }[] {
  return raw.split('\n').flatMap((line) => {
    const match = line.trim().match(/^(\d+):([0-5]\d)(?:\s+(.+))?$/)
    if (!match) return []
    const minutes = Number(match[1])
    const seconds = Number(match[2])
    const label = (match[3] ?? `${minutes}:${String(seconds).padStart(2, '0')}`).trim()
    return [{ label, seconds: minutes * 60 + seconds }]
  })
}
