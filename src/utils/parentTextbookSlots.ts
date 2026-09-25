import type { TextbookSlotNumber, TextbookSubject } from '../types/records'
import { normalizeSlotNumber, normalizeTextbookSubject } from './textbookSlots'

/** 학부모 Today Report: 수학은 교재 1·2만, 영어는 교재 1~3 */
export const PARENT_VISIBLE_SLOTS = {
  수학: [1, 2],
  영어: [1, 2, 3],
} as const satisfies Record<TextbookSubject, readonly TextbookSlotNumber[]>

export function isParentVisibleSlot(subject: TextbookSubject, slotNumber: unknown): boolean {
  const slots = PARENT_VISIBLE_SLOTS[subject]
  const normalized = normalizeSlotNumber(slotNumber)
  return (slots as readonly number[]).includes(normalized)
}

export function filterParentVisibleSlotDisplays<
  T extends { subject: TextbookSubject; slotNumber: TextbookSlotNumber },
>(items: T[]): T[] {
  return items.filter((item) => isParentVisibleSlot(item.subject, item.slotNumber))
}

/** raw subject(한글·영문) → 학부모 표시 슬롯 여부 */
export function isParentVisibleSlotByRawSubject(
  rawSubject: unknown,
  slotNumber: unknown,
): boolean {
  const subject = normalizeTextbookSubject(rawSubject)
  if (!subject) return false
  return isParentVisibleSlot(subject, slotNumber)
}
