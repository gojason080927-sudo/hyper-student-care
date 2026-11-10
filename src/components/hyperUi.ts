import type { CSSProperties } from 'react'

/** 강사앱 PC 새 시안(UI시안/*.dc.html) 공통 색·질감 */
export const HY = {
  accent: '#00D1FF',
  ink: '#17161C',
  sub: '#5F5B6E',
  line: '#E3E1EC',
  bg: '#F4F3F8',
  link: '#006E8A',
  font: "'Noto Sans KR', sans-serif",
  display: "'Space Grotesk', sans-serif",
} as const

const gloss = 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 50%, rgba(0,209,255,0.28))'
const accentGloss = 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0) 45%, rgba(47,107,255,0.6))'

/** 검은 유광 칸(섹션 이름표·아이콘 칸·주 버튼) */
export const darkTile: CSSProperties = {
  backgroundColor: HY.ink,
  backgroundImage: gloss,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 3px 0 #000000',
  color: '#FFFFFF',
}

/** 강조색 유광 칸(NEW 배지·로고·선택 표시) */
export const accentTile: CSSProperties = {
  backgroundColor: HY.accent,
  backgroundImage: accentGloss,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 0 rgba(0,0,0,0.25)',
  color: '#04222B',
}

/** 흰 카드 */
export const card: CSSProperties = {
  border: '1px solid #E4E2EC',
  backgroundColor: '#FFFFFF',
  backgroundImage: 'linear-gradient(180deg, #FFFFFF, #F6F5FA)',
  boxShadow: 'inset 0 1px 0 #FFFFFF, 0 3px 0 #D9D6E3, 0 12px 22px rgba(23,22,28,0.07)',
  borderRadius: 16,
}

/** 흰 버튼(보조) */
export const lightButton: CSSProperties = {
  border: '1px solid #E3E1EC',
  backgroundColor: '#FFFFFF',
  backgroundImage: 'linear-gradient(180deg, #FFFFFF, #F1F0F6)',
  boxShadow: 'inset 0 1px 0 #FFFFFF, 0 2px 0 #D9D6E3',
  color: HY.ink,
}

/** 들어간 입력 칸 */
export const inset: CSSProperties = {
  border: '1px solid #E3E1EC',
  backgroundColor: '#FFFFFF',
  boxShadow: 'inset 0 2px 4px rgba(23,22,28,0.06)',
  borderRadius: 12,
}
