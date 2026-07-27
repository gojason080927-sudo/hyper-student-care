const ACCESS_KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
export const STUDENT_ACCESS_KEY_MIN_LENGTH = 12

export function generateStudentAccessKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => ACCESS_KEY_CHARS[byte % ACCESS_KEY_CHARS.length]).join('')
}

export function isValidStudentAccessKey(value: unknown): value is string {
  return typeof value === 'string' && value.length >= STUDENT_ACCESS_KEY_MIN_LENGTH
}

export { buildStudentCareUrl, getPublicAppBaseUrl, getPublicAssetUrl, getStudentCareUrl } from './studentCareUrl'
