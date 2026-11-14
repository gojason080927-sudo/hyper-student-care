/**
 * 9등급 환산 ↔ 교과 70%컷 추천 밴드 (중앙 설정)
 *
 * 기본 표시 구간: [student - ambitiousOffset, student]
 * 상향: [student - ambitiousOffset, student - targetOffset)
 * 적정: [student - targetOffset, student]
 */
export const admissionBandConfig = {
  experimental: true as const,
  /** 학생등급에서 이만큼 위(낮은 컷)까지 상향 포함 */
  ambitiousOffset: 0.2,
  /** 학생등급에서 이만큼 위까지를 적정 하한으로 사용 */
  targetOffset: 0.1,
} as const

export type AdmissionBandConfig = typeof admissionBandConfig

export const ADMISSION_BAND_CONFIG_NOTE =
  '학생 9등급 환산 평균과 최근 교과전형 최종등록자 70%컷을 비교한 상담용 참고 구간입니다.'
