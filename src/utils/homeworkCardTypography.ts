/**
 * Today Report 「숙제 수행 결과」 카드 — 통일 타이포그래피
 * mobile 우선, sm=PC (약 640px+)
 *
 * 위계: 교재명(最大) → 필드 제목 → 본문/미입력
 *
 * 색상 규칙 (라벨 ≠ 값):
 * - 지난 과제 라벨만 #16A34A
 * - 지난 과제 값(미입력·완료·부분 완료·미완료)은 #1E293B (slate-800)
 * - 오늘 과제 라벨만 #DC2626
 * - 오늘 과제 값(입력 내용·미입력)은 #0F766E 유지
 */

/** 교재명 (학부모: "개념교재 · 개념 쎈" 한 줄) — mobile 21px, PC 20px */
export const HOMEWORK_CARD_TITLE_CLASS =
  'break-words text-[21px] font-bold leading-snug text-navy-900 sm:text-[20px]'

/** 강사 카드: 슬롯 유형 (개념교재·문법교재 등) — 필드 제목과 동일 단계 */
export const HOMEWORK_CARD_SLOT_TYPE_CLASS =
  'mb-0.5 text-[19px] font-semibold leading-snug text-slate-500 sm:text-[18px]'

/** 강사 카드: 교재명 본문 — mobile 21px, PC 20px */
export const HOMEWORK_CARD_TEXTBOOK_NAME_CLASS =
  'truncate text-[21px] font-bold leading-snug text-navy-900 sm:text-[20px]'

/** 필드 제목 (지난 과제, 오늘 과제, 현재 진도) — mobile 19px, PC 18px */
export const HOMEWORK_CARD_FIELD_LABEL_CLASS =
  'text-[19px] font-semibold leading-snug text-slate-600 sm:text-[18px]'

/** 지난 과제 라벨 전용 — 초록 (#16A34A). 값에 사용 금지 */
export const HOMEWORK_PAST_LABEL_CLASS =
  'text-[19px] font-bold leading-snug text-[#16A34A] sm:text-[18px]'

/** 오늘 과제 라벨 전용 — 빨강 (#DC2626). 값에 사용 금지 */
export const HOMEWORK_TODAY_LABEL_CLASS =
  'text-[19px] font-bold leading-snug text-[#DC2626] sm:text-[18px]'

/** 지난 과제 값 전용 — 검정 (slate-800). 라벨에 사용 금지 */
export const HOMEWORK_PAST_VALUE_CLASS =
  'break-words text-[19px] font-medium leading-snug text-[#1E293B] sm:text-[18px]'

/** 필드 본문 (일반 보조 텍스트) — mobile 19px, PC 18px */
export const HOMEWORK_CARD_FIELD_VALUE_CLASS =
  'break-words text-[19px] font-medium leading-snug text-[#1E293B] sm:text-[18px]'

/** 실제 입력 내용 강조 — 오늘 과제·현재 진도 (read-only) */
export const TODAY_REPORT_CONTENT_EMPHASIS_CLASS =
  'break-words text-[19px] font-semibold leading-snug text-[#0F766E] sm:text-[18px]'

/** 강사 입력란 본문 크기 */
export const HOMEWORK_CARD_INPUT_TEXT_CLASS = 'text-[19px] font-medium sm:text-[18px]'

/** 실제 입력 내용 강조 — 입력란 텍스트 */
export const TODAY_REPORT_CONTENT_INPUT_EMPHASIS_CLASS =
  'text-[19px] font-semibold text-[#0F766E] sm:text-[18px]'
