const ACCESS_KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'

/** 신규 생성 키 최소 길이 */
export const STUDENT_ACCESS_KEY_GENERATED_LENGTH = 32
/** 기존·할당된 키로 URL/접근 판별 시 허용 최소 길이 (레거시 24자 키 유지) */
export const STUDENT_ACCESS_KEY_LEGACY_MIN_LENGTH = 12
/** UNIQUE 충돌 시 최대 재시도 */
export const STUDENT_ACCESS_KEY_MAX_RETRIES = 8

export function generateStudentAccessKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(STUDENT_ACCESS_KEY_GENERATED_LENGTH))
  return Array.from(bytes, (byte) => ACCESS_KEY_CHARS[byte % ACCESS_KEY_CHARS.length]).join('')
}

export function hasStudentAccessKey(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length >= STUDENT_ACCESS_KEY_LEGACY_MIN_LENGTH
}

/** @deprecated hasStudentAccessKey 사용 권장 */
export function isValidStudentAccessKey(value: unknown): value is string {
  return hasStudentAccessKey(value)
}

export function generateUniqueStudentAccessKey(
  usedKeys: Iterable<string>,
  maxAttempts = STUDENT_ACCESS_KEY_MAX_RETRIES,
): string {
  const used = new Set(usedKeys)
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateStudentAccessKey()
    if (!used.has(candidate)) return candidate
  }
  throw new Error('고유한 학생 접근 키를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.')
}

export { buildStudentCareUrl, getPublicAppBaseUrl, getPublicAssetUrl, getStudentCareUrl } from './studentCareUrl'
