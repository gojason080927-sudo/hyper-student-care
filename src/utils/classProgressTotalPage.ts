import type {
  ClassTodayReportCommon,
  TextbookSlotNumber,
  TextbookSubject,
} from '../types/records'
import { findClassTodayReportCommon } from './classTodayReportCommon'
import { hasClassCommonProgressContent } from './todayReportDisplayFallback'

/**
 * 오늘의 진도 "전체 페이지"를 반 + 교재 단위로 이어받는다 (화면 표시 전용, DB에 쓰지 않음).
 *
 * - 같은 학년·반·과목·교재명의, 선택한 날짜보다 이전 행 중 "진도가 기록된" 가장 최근 행을 찾는다.
 *   (숙제만 있고 진도가 없는 행은 건너뛴다.)
 * - 그 행의 전체 페이지가 비어 있으면 빈 값(0)을 돌려준다. 강사가 지운 값이 이전 행에서 되살아나지 않는다.
 * - 교재명이 없으면 이어받지 않는다.
 */
export function findCarriedTotalPage(
  records: ClassTodayReportCommon[],
  grade: string,
  className: string,
  reportDate: string,
  subject: TextbookSubject,
  textbookName: string,
): number {
  const book = textbookName.trim()
  if (!book) return 0
  const cls = className.trim()
  let best: ClassTodayReportCommon | undefined
  for (const record of records) {
    if (
      record.grade !== grade ||
      record.className.trim() !== cls ||
      record.subject !== subject ||
      record.textbookName.trim() !== book ||
      record.reportDate >= reportDate ||
      !hasClassCommonProgressContent(record)
    ) {
      continue
    }
    if (!best || record.reportDate > best.reportDate) best = record
  }
  return best && best.totalPage > 0 ? best.totalPage : 0
}

/**
 * 패널에 채울 전체 페이지.
 * 선택한 날짜에 진도가 기록된 행이 있으면 그 값을 그대로 쓰고(비어 있어도 그대로),
 * 없으면 반 + 교재 기준 가장 최근 진도 행의 값을 이어받는다.
 */
export function resolveClassProgressTotalPage(
  records: ClassTodayReportCommon[],
  grade: string,
  className: string,
  reportDate: string,
  subject: TextbookSubject,
  slotNumber: TextbookSlotNumber,
  textbookName: string,
): number {
  const exact = findClassTodayReportCommon(records, grade, className, reportDate, subject, slotNumber)
  if (exact && hasClassCommonProgressContent(exact)) return exact.totalPage
  return findCarriedTotalPage(records, grade, className, reportDate, subject, textbookName)
}
