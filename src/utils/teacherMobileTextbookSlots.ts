import type { TextbookSlotNumber, TextbookSubject } from '../types/records'
import { TEXTBOOK_SLOT_NUMBERS } from '../types/records'

/** 강사용 모바일 PWA: 과목별 입력 슬롯 (수학 1~2, 영어 1~3) */
export const TEACHER_MOBILE_VISIBLE_SLOTS = {
  수학: [1, 2],
  영어: [1, 2, 3],
} as const satisfies Record<TextbookSubject, readonly TextbookSlotNumber[]>

export type SubjectVisibleSlots = Record<TextbookSubject, readonly TextbookSlotNumber[]>

export function filterVisibleSlotDisplays<
  T extends { subject: TextbookSubject; slotNumber: TextbookSlotNumber },
>(items: T[], visibleSlots: SubjectVisibleSlots): T[] {
  return items.filter((item) =>
    (visibleSlots[item.subject] as readonly number[]).includes(item.slotNumber),
  )
}

export function getVisibleSlotNumbers(
  subject: TextbookSubject,
  visibleSlots?: SubjectVisibleSlots,
): TextbookSlotNumber[] {
  if (!visibleSlots) return [...TEXTBOOK_SLOT_NUMBERS]
  return [...visibleSlots[subject]]
}
