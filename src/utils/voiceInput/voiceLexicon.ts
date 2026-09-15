import type {
  AttendanceStatus,
  ClassAttitudeIssue,
  HomeworkStatus,
  MaterialPrepStatus,
} from '../../types/records'

export function compactText(text: string): string {
  return text.replace(/\s+/g, '')
}

const SID_PARTICLE = '(?:은|는|이|가|이가|이는|을|를|랑|이랑|하고|도)?'

export const SID_ONLY_RE = new RegExp(`«SID:[^»]+»${SID_PARTICLE}\\s*만`)
export const SID_EXCLUDE_RE = new RegExp(
  `«SID:([^»]+)»${SID_PARTICLE}\\s*(?:제외(?:하고)?|빼고|말고|외에는)`,
  'g',
)
export const SID_TOKEN_RE = /«SID:([^»]+)»/g

function isNameOnlyClause(piece: string): boolean {
  const stripped = piece
    .replace(/«SID:[^»]+»/g, '')
    .replace(/(?:은|는|이|가|이가|이는|을|를|랑|이랑|하고|도|만|\s)/g, '')
  return stripped.length === 0
}

function looksLikeNewAssignment(piece: string): boolean {
  return (
    /«SID:/.test(piece) ||
    /(전원|모두|전부|나머지|다른\s*애들|다른\s*학생들?|전체)/.test(piece)
  )
}

function splitCommaAssignments(text: string): string[] {
  const raw = text.split(/[,，]/).map((item) => item.trim()).filter(Boolean)
  if (raw.length <= 1) return raw
  const merged: string[] = []
  for (const piece of raw) {
    if (merged.length === 0) {
      merged.push(piece)
      continue
    }
    const prev = merged[merged.length - 1]
    if (!prev) {
      merged.push(piece)
      continue
    }
    if (isNameOnlyClause(prev) || isNameOnlyClause(piece) || !looksLikeNewAssignment(piece)) {
      merged[merged.length - 1] = `${prev}, ${piece}`
      continue
    }
    merged.push(piece)
  }
  return merged
}

/** Split assignments without breaking “결석, 인정” style modifiers. */
export function splitVoiceClauses(tokenized: string): string[] {
  const pieces: string[] = []
  const coarse = tokenized
    .split(
      /[\n.。!！?？;；]+|\s*(?:인데|그리고|이고)\s+|(?=\s*나머지는)|(?=\s*나머지\s)|(?=\s*다른\s*애들)|(?=\s*다른\s*학생)|(?<![하말])고\s+(?=«SID:)/,
    )
    .map((part) => part.trim())
    .filter(Boolean)

  for (const part of coarse) {
    pieces.push(...splitCommaAssignments(part))
  }
  return pieces
}

export function stripVoiceFillers(tokenized: string): string {
  return tokenized
    .replace(/«SID:[^»]+»\s*학생/g, (match) => match.replace(/\s*학생$/, ''))
    .replace(/\s+(?:그다음|근데|자)\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseAttendanceStatusPhrase(clause: string): AttendanceStatus | null {
  const compact = compactText(clause)
  if (/수업안왔|안왔|안옴|못왔|오늘결석|병결/.test(compact) || compact.includes('결석')) return '결석'
  if (/늦게왔|늦게옴|늦었|지각했/.test(compact) || compact.includes('지각')) return '지각'
  if (compact.includes('조퇴')) return '조퇴'
  if (
    /정상출석|등원했|수업왔어|수업참여|다왔어|왔음|왔어/.test(compact) ||
    compact.includes('출석') ||
    compact.includes('등원')
  ) {
    return '출석'
  }
  return null
}

export function parseHomeworkStatusPhrase(
  clause: string,
): HomeworkStatus | 'ambiguous' | 'blocked' | null {
  const compact = compactText(clause)
  if (/애매|별로야|별로임|좀그랬/.test(compact)) return 'ambiguous'
  if (/미완료|안함|미제출/.test(compact)) return 'blocked'
  if (
    /부분완료|일부완료|일부만했|일부했|조금했|조금덜|덜했|다못했|반만했|미완성|거의다했/.test(compact)
  ) {
    return '부분 완료'
  }
  if (/완료|다했어|다함|전부했어|모두했어|다끝냈|100프로|100%|백프로/.test(compact)) {
    return '완료'
  }
  return null
}

export function parseMaterialStatusPhrase(clause: string): {
  status: MaterialPrepStatus | null
  mappedFromUncertain: boolean
  ambiguous: boolean
} {
  const compact = compactText(clause)
  if (/좀부족|애매|별로/.test(compact) && !/지참|가져/.test(compact)) {
    return { status: null, mappedFromUncertain: false, ambiguous: true }
  }
  if (/미지참|안가져왔|안가져옴|책안가져옴|교재없음|깜빡했|안가지고/.test(compact)) {
    return { status: '부분 지참', mappedFromUncertain: true, ambiguous: false }
  }
  if (/부분지참|일부지참|일부만가져왔|하나빠졌|덜가져왔/.test(compact)) {
    return { status: '부분 지참', mappedFromUncertain: false, ambiguous: false }
  }
  if (/지참|가져왔|교재가져옴|책가져왔|준비했|교재준비|책있음/.test(compact)) {
    return { status: '지참', mappedFromUncertain: false, ambiguous: false }
  }
  return { status: null, mappedFromUncertain: false, ambiguous: false }
}

function stripNegatedAttitude(compact: string): string {
  return compact
    .replace(/안졸았(?:어|음|다)?/g, '')
    .replace(/졸지않(?:았(?:어|음|다)?|아)?/g, '')
    .replace(/잡담안했(?:어|음|다)?/g, '')
    .replace(/떠들지않(?:았(?:어|음|다)?|아)?/g, '')
}

export function parseAttitudeIssuePhrases(clause: string): ClassAttitudeIssue[] {
  const compact = stripNegatedAttitude(compactText(clause))
  const issues: ClassAttitudeIssue[] = []
  if (/집중저하|집중못|집중력이떨어|집중안함|집중안했|집중도안좋|집중안좋|산만/.test(compact)) {
    issues.push('집중 저하')
  }
  if (/졸음|졸았|계속졸|수업중졸음/.test(compact)) issues.push('졸음')
  if (/잡담|떠들었|말이많|친구랑떠들|수업중잡담/.test(compact)) issues.push('잡담')
  if (/수업방해|수업흐름방해|수업을방해/.test(compact)) issues.push('수업방해')
  if (/태도불량|태도가안좋|수업태도나쁨|불량/.test(compact)) issues.push('태도 불량')
  return issues
}

export function isExcellentAttitudePhrase(clause: string): boolean {
  const compact = compactText(clause)
  if (/집중안|집중못|산만|졸|잡담|방해|불량/.test(compact)) return false
  return /우수|좋았|좋음|태도좋아|수업태도좋|집중잘했|문제없음|문제없|이상없음/.test(compact)
}

export function parseWrongCausePhrases(clause: string): {
  conceptLackDelta: number
  calculationErrorDelta: number
  applicationLackDelta: number
} {
  const compact = compactText(clause)
  return {
    conceptLackDelta: /개념부족|개념이부족|개념이해부족|개념문제/.test(compact) ? 1 : 0,
    calculationErrorDelta: /계산실수|계산틀림|계산에서틀림|계산에서틀렸|연산실수/.test(compact) ? 1 : 0,
    applicationLackDelta: /응용능력부족|응용부족|응용이약|응용못함|응용문제|응용도부족/.test(
      compact,
    )
      ? 1
      : 0,
  }
}

const KO_ONES: Record<string, number> = {
  영: 0,
  공: 0,
  일: 1,
  이: 2,
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
  륙: 6,
  칠: 7,
  팔: 8,
  구: 9,
}

/** Safe 0–100 Korean numerals used in classroom STT. Unknown patterns return null. */
export function parseKoreanScoreToken(token: string): number | null {
  const compact = compactText(token)
  if (!compact || compact.length > 4) return null
  if (compact === '백' || compact === '일백') return 100
  if (compact === '십') return 10
  if (compact.startsWith('백')) return compact.length === 1 ? 100 : null
  const tenIdx = compact.indexOf('십')
  if (tenIdx >= 0) {
    const left = compact.slice(0, tenIdx)
    const right = compact.slice(tenIdx + 1)
    const tens = left === '' ? 1 : KO_ONES[left]
    if (tens === undefined || tens < 1) return null
    const ones = right === '' ? 0 : KO_ONES[right]
    if (ones === undefined) return null
    const n = tens * 10 + ones
    return n >= 0 && n <= 100 ? n : null
  }
  if (compact.length === 1 && KO_ONES[compact] !== undefined) return KO_ONES[compact]
  return null
}

/** Safe classroom page numerals. Unknown patterns return null; does not invent values. */
export function parseKoreanPageToken(token: string): number | null {
  const compact = compactText(token)
  if (!compact) return null
  const score = parseKoreanScoreToken(compact)
  if (score != null) return score
  const idx = compact.indexOf('백')
  if (idx < 0) return null
  const left = compact.slice(0, idx)
  const right = compact.slice(idx + 1)
  const hundreds = left === '' ? 1 : parseKoreanScoreToken(left)
  if (hundreds == null || hundreds < 1 || hundreds > 9) return null
  let rest = 0
  if (right) {
    const parsed = parseKoreanScoreToken(right)
    if (parsed == null) return null
    rest = parsed
  }
  const n = hundreds * 100 + rest
  return n >= 1 && n <= 2000 ? n : null
}

export function replaceKoreanScores(clause: string): string {
  return clause.replace(/([영공일이삼사오육륙칠팔구십백]{1,4})\s*점/g, (full, token: string) => {
    const n = parseKoreanScoreToken(token)
    return n == null ? full : `${n}점`
  })
}

export function extractScoreValue(clause: string): { score: string; invalid: boolean } | null {
  const withKo = replaceKoreanScores(clause)
  const withPoint = withKo.match(/(\d{1,3})\s*점/)
  if (withPoint?.[1]) {
    const numeric = Number(withPoint[1])
    if (!Number.isInteger(numeric) || numeric < 0 || numeric > 100) {
      return { score: withPoint[1], invalid: true }
    }
    return { score: String(numeric), invalid: false }
  }
  const afterSid = withKo.match(/«SID:[^»]+»[^0-9]{0,16}(\d{1,3})(?!\s*차)/)
  if (afterSid?.[1]) {
    const numeric = Number(afterSid[1])
    if (!Number.isInteger(numeric) || numeric < 0 || numeric > 100) {
      return { score: afterSid[1], invalid: true }
    }
    return { score: String(numeric), invalid: false }
  }
  const scoreWord = withKo.match(/점수(?:는|가)?\s*(\d{1,3})/)
  if (scoreWord?.[1]) {
    const numeric = Number(scoreWord[1])
    if (!Number.isInteger(numeric) || numeric < 0 || numeric > 100) {
      return { score: scoreWord[1], invalid: true }
    }
    return { score: String(numeric), invalid: false }
  }
  return null
}

export function statedOnlyCount(clause: string): number | null {
  const compact = compactText(clause)
  if (/둘만|두명만|2명만/.test(compact)) return 2
  if (/셋만|세명만|3명만/.test(compact)) return 3
  return null
}

export function clauseHasContinuation(clause: string): boolean {
  return /«SID:[^»]+»도(?:\s|$)/.test(clause) || /«SID:[^»]+»도$/.test(clause)
}
