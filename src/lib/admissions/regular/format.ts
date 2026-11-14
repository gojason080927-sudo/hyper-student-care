import type { SupportBand } from './types'

export function formatSigned(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '-'
  const rounded = Number(value.toFixed(digits))
  if (rounded > 0) return `+${rounded.toFixed(digits)}`
  return rounded.toFixed(digits)
}

export function formatScore(value: number | null, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return value.toFixed(digits)
}

export function formatCount(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '-'
  if (Number.isInteger(value)) return String(value)
  return String(value)
}

export function formatGrade(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return `${value}등급`
}

export function regularBandLabel(band: SupportBand): string {
  if (band === 'reach') return '상향'
  if (band === 'ambitious') return '소신'
  return '적정'
}

export function formatCounselingPrintDate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}
