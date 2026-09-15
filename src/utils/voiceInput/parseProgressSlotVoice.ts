import { parseProgressPageValue } from '../classTodayReportCommon.ts'
import { parseKoreanPageToken } from './voiceLexicon.ts'
import type { VoiceReviewItem } from './types.ts'

export type ProgressSlotVoiceParse = {
  currentProgress?: string
  currentPage?: number
  totalPage?: number
  needsReview: VoiceReviewItem[]
}

const CURRENT_PAGE_RE =
  /(?:현재\s*페이지|현재페이지|지금\s*페이지|현재)\s*(\d{1,4})\s*(?:페이지)?/g
const TOTAL_PAGE_RE =
  /(?:전체\s*페이지|전체페이지|총\s*페이지|총)\s*(\d{1,4})\s*(?:페이지)?/g
const PAGE_TOKEN_RE = /(\d{1,4})\s*페이지/g

function replaceKoreanPageTokens(raw: string): string {
  return raw
    .replace(/([영공일이삼사오육륙칠팔구십백]{1,6})\s*페이지/g, (full, token: string) => {
      const n = parseKoreanPageToken(token)
      return n == null ? full : `${n}페이지`
    })
    .replace(
      /(현재\s*페이지|현재페이지|지금\s*페이지|전체\s*페이지|전체페이지|총\s*페이지|총)\s*([영공일이삼사오육륙칠팔구십백]{1,6})(?!\s*페이지)/g,
      (full, label: string, token: string) => {
        const n = parseKoreanPageToken(token)
        return n == null ? full : `${label} ${n}`
      },
    )
}

function takeFirst(
  source: string,
  re: RegExp,
): { value?: number; rest: string } {
  const nextRe = new RegExp(re.source, re.flags)
  const match = nextRe.exec(source)
  if (!match?.[1] || match.index == null) return { rest: source }
  const n = parseProgressPageValue(match[1])
  if (n < 0) return { rest: source }
  const rest = `${source.slice(0, match.index)} ${source.slice(match.index + match[0].length)}`
  return { value: n, rest: rest.replace(/\s+/g, ' ').trim() }
}

/**
 * Slot-scoped progress voice. Pages patch only when labels or an unambiguous
 * current→total pair is present. Range phrases (에서/부터) stay progress text.
 */
export function parseProgressSlotVoice(transcript: string): ProgressSlotVoiceParse {
  const original = transcript.replace(/\s+/g, ' ').trim()
  const needsReview: VoiceReviewItem[] = []
  if (!original) {
    return {
      needsReview: [{ label: '진도', reason: '인식된 내용이 없습니다' }],
    }
  }

  const normalized = replaceKoreanPageTokens(original)
  const isRange = /에서|부터|까지/.test(normalized)

  let working = normalized.replace(/^현재\s*진도\s*/, '')
  const currentLabeled = takeFirst(working, CURRENT_PAGE_RE)
  working = currentLabeled.rest
  const totalLabeled = takeFirst(working, TOTAL_PAGE_RE)
  working = totalLabeled.rest

  let currentPage = currentLabeled.value
  let totalPage = totalLabeled.value

  if (currentPage === undefined && totalPage === undefined && !isRange) {
    const pages = [...working.matchAll(new RegExp(PAGE_TOKEN_RE.source, 'g'))]
      .map((row) => parseProgressPageValue(row[1]))
      .filter((n) => n > 0)
    if (pages.length === 2 && pages[0] !== undefined && pages[1] !== undefined) {
      currentPage = pages[0]
      totalPage = pages[1]
      working = working.replace(PAGE_TOKEN_RE, ' ').replace(/\s+/g, ' ').trim()
    }
  }

  working = working
    .replace(/(?:현재\s*페이지|현재페이지|지금\s*페이지|전체\s*페이지|전체페이지|총\s*페이지)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const currentProgress = working || undefined
  if (
    currentPage === undefined &&
    totalPage === undefined &&
    !currentProgress
  ) {
    return { currentProgress: original, needsReview }
  }
  if (
    currentPage === undefined &&
    totalPage === undefined &&
    currentProgress
  ) {
    return { currentProgress: original, needsReview }
  }

  return {
    currentProgress,
    currentPage,
    totalPage,
    needsReview,
  }
}
