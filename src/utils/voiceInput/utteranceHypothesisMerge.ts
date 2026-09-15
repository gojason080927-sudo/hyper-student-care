/**
 * Stable committed prefix + mutable current hypothesis.
 * Compact space-stripping is only a hint; it must not treat
 * "1차 2" / "1차 22" / "22차 5" as equivalent semantic prefixes.
 */

export type ReconcileProtections = {
  staleGenerationGuard: boolean
  slotTruncation: boolean
  suffixOverlap: boolean
  mutableTailReplace: boolean
  debrisAbsorb: boolean
}

export const DEFAULT_RECONCILE_PROTECTIONS: ReconcileProtections = {
  staleGenerationGuard: true,
  slotTruncation: true,
  suffixOverlap: true,
  mutableTailReplace: true,
  debrisAbsorb: true,
}

export function withoutProtection(
  name: keyof ReconcileProtections,
): ReconcileProtections {
  return { ...DEFAULT_RECONCILE_PROTECTIONS, [name]: false }
}

export function normalizeHypothesisText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/(불합격|합격)(?=[1-4])/g, '$1 ')
    .replace(/([1-4]\s*차)(?=\d)/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function compactHypothesisKey(text: string): string {
  return text.replace(/\s+/g, '')
}

const ATTEMPT_HEAD_RE =
  /([1-4]\s*회?\s*차|[1-4]\s*차시|일차|이차|삼차|사차|일\s*차|이\s*차|삼\s*차|사\s*차)/g
const VALID_ATTEMPT_RE =
  /([1-4]\s*회?\s*차|일차|이차|삼차|사차)\s*(\d{1,3})(?:\s*점)?(?:\s*(?:불합격|합격))?/g
const DEBRIS_COMPACT_RE =
  /^(일|이|삼|사|오|나+|차|점|이발|하고|있음|일차|이차|삼차|사차|[1-4]차|[1-4]|나날)$/

export type AttemptSpanLite = {
  round: 1 | 2 | 3 | 4
  score: string
  start: number
  end: number
}

function roundFromHead(head: string): 1 | 2 | 3 | 4 | null {
  const compact = head.replace(/\s+/g, '').replace(/회차시|차시|회차/g, '차')
  if (compact === '1차' || compact === '일차') return 1
  if (compact === '2차' || compact === '이차') return 2
  if (compact === '3차' || compact === '삼차') return 3
  if (compact === '4차' || compact === '사차') return 4
  return null
}

export function collectLiteAttemptSpans(text: string): AttemptSpanLite[] {
  const spans: AttemptSpanLite[] = []
  const re = new RegExp(VALID_ATTEMPT_RE.source, 'g')
  let match: RegExpExecArray | null = re.exec(text)
  while (match) {
    const round = roundFromHead(match[1] ?? '')
    const score = match[2] ?? ''
    if (round && score) {
      spans.push({ round, score, start: match.index, end: match.index + match[0].length })
      re.lastIndex = match.index + match[0].length
    }
    match = re.exec(text)
  }
  return spans
}

export function hypothesisQuality(text: string): number {
  const spans = collectLiteAttemptSpans(text)
  const rounds = new Set(spans.map((span) => span.round))
  const heads = text.match(ATTEMPT_HEAD_RE) ?? []
  const unmatchedHeads = Math.max(0, heads.length - spans.length)
  const residualLen = Math.min(text.length, 120)
  return rounds.size * 1000 + spans.length * 100 + residualLen - unmatchedHeads * 80
}

function hasAttemptHead(text: string): boolean {
  ATTEMPT_HEAD_RE.lastIndex = 0
  return ATTEMPT_HEAD_RE.test(text)
}

function followingIsLexicalProse(after: string): boolean {
  const next = after.trim()
  if (!next) return false
  if (/^(함수|방정식|문제|이해|부분|단원|개념|응용|계산)/.test(next)) return true
  return /[가-힣]{2,}/.test(next) && !/^\d/.test(next) && !/^(점|합격|불합격)/.test(next)
}

export function isTransportDebris(existing: string, incoming: string): boolean {
  const inc = normalizeHypothesisText(incoming)
  if (!inc) return true
  const existingN = normalizeHypothesisText(existing)
  if (!existingN) return false
  const incomingKey = compactHypothesisKey(inc)
  const existingKey = compactHypothesisKey(existingN)
  if (DEBRIS_COMPACT_RE.test(incomingKey)) return true
  if (incomingKey.length <= 3 && existingKey.includes(incomingKey)) return true
  if (incomingKey.length <= 6 && hypothesisQuality(existingN) >= 1000 && hypothesisQuality(inc) < 80) {
    return true
  }
  if (hasAttemptHead(inc) && hypothesisQuality(inc) < 80 && hypothesisQuality(existingN) >= 2000) {
    const afterHead = inc.replace(ATTEMPT_HEAD_RE, '').trim()
    if (!followingIsLexicalProse(afterHead)) return true
  }
  return false
}

function commonCompactPrefixLength(prev: string, next: string): number {
  const prevKey = compactHypothesisKey(prev)
  const nextKey = compactHypothesisKey(next)
  let i = 0
  while (i < prevKey.length && i < nextKey.length && prevKey[i] === nextKey[i]) i += 1
  return i
}

function endsWithDigit(key: string): boolean {
  return /[0-9]$/.test(key)
}

function digitBoundarySafePrefix(prevKey: string, nextKey: string): boolean {
  if (!nextKey.startsWith(prevKey) || nextKey.length <= prevKey.length) return nextKey.startsWith(prevKey)
  const nextCh = nextKey[prevKey.length] ?? ''
  if (endsWithDigit(prevKey) && nextCh === '차') return false
  return true
}

function longestCompactSuffixPrefixOverlap(prevKey: string, nextKey: string, min = 4): number {
  const max = Math.min(prevKey.length, nextKey.length)
  for (let size = max; size >= min; size -= 1) {
    if (prevKey.slice(-size) === nextKey.slice(0, size)) return size
  }
  return 0
}

function incomingRemainderAfterCompactPrefix(incoming: string, compactSkip: number): string {
  let consumed = 0
  let index = 0
  while (index < incoming.length && consumed < compactSkip) {
    if (!/\s/u.test(incoming[index] ?? '')) consumed += 1
    index += 1
  }
  return incoming.slice(index).replace(/\s+/g, ' ').trim()
}

function structuredPrefixEnd(text: string): number {
  let end = 0
  const valid = collectLiteAttemptSpans(text)
  if (valid.length > 0) end = Math.max(...valid.map((span) => span.end))
  const headRe = new RegExp(ATTEMPT_HEAD_RE.source, 'g')
  let match: RegExpExecArray | null = headRe.exec(text)
  while (match) {
    const after = text.slice(match.index + match[0].length)
    if (followingIsLexicalProse(after)) {
      match = headRe.exec(text)
      continue
    }
    const regionEnd = match.index + match[0].length + (after.match(/^\s*(?:\d{1,3}\s*차\s*)?(?:\d{1,3}(?:\s*점)?|[영공일이삼사오육륙칠팔구십백]{1,4}(?:\s*점)?)?(?:\s*(?:불합격|합격))?/)?.[0].length ?? 0)
    if (regionEnd > end && match.index <= Math.max(end, 0) + 12) end = regionEnd
    match = headRe.exec(text)
  }
  return end
}

function splitStructuredProse(text: string): { structured: string; prose: string } {
  const end = structuredPrefixEnd(text)
  if (end <= 0) return { structured: '', prose: text }
  return {
    structured: text.slice(0, end).replace(/\s+/g, ' ').trim(),
    prose: text.slice(end).replace(/\s+/g, ' ').trim(),
  }
}

function mergeProse(prev: string, next: string, protections: ReconcileProtections): string {
  if (!next) return prev
  if (!prev) return next
  if (next === prev) return prev
  const prevKey = compactHypothesisKey(prev)
  const nextKey = compactHypothesisKey(next)
  if (nextKey === prevKey) return next
  if (nextKey.startsWith(prevKey)) return next
  if (prevKey.startsWith(nextKey) && prevKey.length > nextKey.length) return prev
  if (prevKey.includes(nextKey) && nextKey.length >= 2) return prev
  if (nextKey.endsWith(prevKey) && nextKey.length > prevKey.length) {
    const extra = nextKey.slice(0, nextKey.length - prevKey.length)
    if (commonCompactPrefixLength(extra, prevKey) >= 2) return prev
    if (extra.length <= 6) return prev
  }
  if (nextKey.includes(prevKey) && prevKey.length >= 4 && nextKey.startsWith(prevKey.slice(0, 3))) {
    return nextKey.length > prevKey.length * 1.5 ? prev : next
  }

  const shared = commonCompactPrefixLength(prev, next)
  if (protections.mutableTailReplace && shared >= 3) {
    return nextKey.length >= prevKey.length ? next : prev
  }

  if (protections.mutableTailReplace) {
    const first = [...next][0] ?? ''
    const stutter = compactHypothesisKey(prev)
    if (first && /^[가-힣]$/.test(first) && stutter.length > 0 && [...stutter].every((ch) => ch === first)) {
      return next
    }
  }

  if (protections.suffixOverlap) {
    const overlap = longestCompactSuffixPrefixOverlap(prevKey, nextKey, 4)
    if (overlap >= 4) {
      const rest = incomingRemainderAfterCompactPrefix(next, overlap)
      return rest ? `${prev} ${rest}`.replace(/\s+/g, ' ').trim() : prev
    }
  }

  if (protections.debrisAbsorb && isTransportDebris(prev, next)) return prev
  if (protections.debrisAbsorb && isTransportDebris(next, prev)) return next
  return `${prev} ${next}`.replace(/\s+/g, ' ').trim()
}

function mergeStructured(prev: string, next: string, protections: ReconcileProtections): string {
  if (!next) return prev
  if (!prev) return next
  if (compactHypothesisKey(prev) === compactHypothesisKey(next)) return next
  const prevKey = compactHypothesisKey(prev)
  const nextKey = compactHypothesisKey(next)
  const prevQ = hypothesisQuality(prev)
  const nextQ = hypothesisQuality(next)

  if (digitBoundarySafePrefix(prevKey, nextKey)) return next
  if (digitBoundarySafePrefix(nextKey, prevKey)) return prev

  if (protections.debrisAbsorb && isTransportDebris(prev, next) && nextQ <= prevQ) return prev
  if (protections.debrisAbsorb && isTransportDebris(next, prev) && prevQ < nextQ) return next

  if (protections.mutableTailReplace && hasAttemptHead(prev) && hasAttemptHead(next)) {
    const prevRounds = new Set(collectLiteAttemptSpans(prev).map((span) => span.round))
    const nextRounds = new Set(collectLiteAttemptSpans(next).map((span) => span.round))
    const genuinelyNew = [...nextRounds].filter((round) => !prevRounds.has(round))
    const incomingCoversPrev = [...prevRounds].every((round) => nextRounds.has(round))
    if (genuinelyNew.length > 0 && !incomingCoversPrev) {
      return `${prev} ${next}`.replace(/\s+/g, ' ').trim()
    }
    if (incomingCoversPrev && nextQ >= prevQ) return next
    if (nextQ < prevQ || genuinelyNew.length === 0) return prevQ >= nextQ ? prev : next
    return prevQ >= nextQ ? prev : next
  }

  if (nextQ > prevQ) return next
  return prev
}

export function legacyCompactReconcile(existingRaw: string, incomingRaw: string): string {
  const existing = normalizeHypothesisText(existingRaw)
  const incoming = normalizeHypothesisText(incomingRaw)
  if (!incoming) return existing
  if (!existing) return incoming
  const prevKey = compactHypothesisKey(existing)
  const nextKey = compactHypothesisKey(incoming)
  if (nextKey === prevKey) return existing
  if (nextKey.startsWith(prevKey)) return incoming
  if (prevKey.startsWith(nextKey)) return existing
  if (nextKey.length >= 2 && prevKey.endsWith(nextKey)) return existing
  if (prevKey.length >= 2 && nextKey.endsWith(prevKey) && nextKey.length > prevKey.length) {
    return incoming
  }
  if (nextKey.length >= 3 && prevKey.includes(nextKey)) return existing
  if (prevKey.length >= 3 && nextKey.includes(prevKey)) return incoming
  const overlap = longestCompactSuffixPrefixOverlap(prevKey, nextKey, 4)
  if (overlap >= 4) {
    const rest = incomingRemainderAfterCompactPrefix(incoming, overlap)
    return rest ? `${existing} ${rest}`.replace(/\s+/g, ' ').trim() : existing
  }
  const shared = commonCompactPrefixLength(existing, incoming)
  const shorter = Math.min(prevKey.length, nextKey.length)
  if (shared >= 4 && shared >= Math.ceil(shorter / 2)) return incoming
  return `${existing} ${incoming}`.replace(/\s+/g, ' ').trim()
}

export function mergeUtteranceHypotheses(
  existingRaw: string,
  incomingRaw: string,
  protections: ReconcileProtections = DEFAULT_RECONCILE_PROTECTIONS,
): string {
  if (!protections.mutableTailReplace && !protections.debrisAbsorb) {
    return legacyCompactReconcile(existingRaw, incomingRaw)
  }

  const existing = normalizeHypothesisText(existingRaw)
  const incoming = normalizeHypothesisText(incomingRaw)
  if (!incoming) return existing
  if (!existing) return incoming
  if (compactHypothesisKey(existing) === compactHypothesisKey(incoming)) return incoming

  if (protections.debrisAbsorb && isTransportDebris(existing, incoming)) return existing

  const prevKey = compactHypothesisKey(existing)
  const nextKey = compactHypothesisKey(incoming)
  if (digitBoundarySafePrefix(prevKey, nextKey) && hypothesisQuality(incoming) >= hypothesisQuality(existing)) {
    return incoming
  }
  if (digitBoundarySafePrefix(nextKey, prevKey)) return existing

  if (!protections.mutableTailReplace) {
    return legacyCompactReconcile(existing, incoming)
  }

  const prevParts = splitStructuredProse(existing)
  const nextParts = splitStructuredProse(incoming)
  const structured = mergeStructured(prevParts.structured, nextParts.structured, protections)
  const prose = mergeProse(prevParts.prose, nextParts.prose, protections)
  if (!prevParts.structured && !nextParts.structured) {
    return mergeProse(existing, incoming, protections)
  }
  if (!nextParts.structured && nextParts.prose) {
    return [prevParts.structured || structured, mergeProse(prevParts.prose, nextParts.prose, protections)]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
  return [structured, prose].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

export function preferCompleteScore(prev: string | undefined, next: string): string {
  if (!prev) return next
  if (prev === next) return prev
  if (next.startsWith(prev) && next.length > prev.length) return next
  if (prev.startsWith(next) && prev.length > next.length) return prev
  return prev
}
