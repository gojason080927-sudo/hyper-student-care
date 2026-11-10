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

/** 고른 칸(어두운 토글) */
export const toggleOn: CSSProperties = {
  border: '1px solid #17161C',
  ...darkTile,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 0 #000000, 0 8px 16px rgba(23,22,28,0.22)',
}

/** 안 고른 칸(흰 토글) */
export const toggleOff: CSSProperties = {
  border: '1px solid #DCD9E6',
  backgroundColor: '#FFFFFF',
  backgroundImage: 'linear-gradient(180deg, #FFFFFF, #EFEEF4)',
  boxShadow: 'inset 0 1px 0 #FFFFFF, 0 2px 0 #D0CDDB, 0 4px 10px rgba(23,22,28,0.06)',
}

/** 연한 하늘색 칩·작은 버튼 */
export const softChip: CSSProperties = {
  border: '1px solid #A9E8F7',
  backgroundColor: '#E3F8FD',
  backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0) 55%, rgba(0,176,214,0.3))',
  boxShadow: 'inset 0 1px 0 #FFFFFF, 0 2px 0 #9EDDEC',
  color: '#006E8A',
}

/** 흰 패널 */
export const panel: CSSProperties = { background: '#FFFFFF', borderRadius: 20, border: '1px solid #ECEAF3', padding: 22 }

/** 깊은 입력 칸 */
export const field: CSSProperties = {
  border: '1px solid #DCD9E6',
  background: '#FFFFFF',
  boxShadow: 'inset 0 2px 5px rgba(23,22,28,0.08)',
  borderRadius: 12,
}

/** 상단 어두운 막대의 단계 표시 */
export const stepOff: CSSProperties = {
  backgroundColor: '#26232F',
  backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0) 50%, rgba(0,209,255,0.28))',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 2px 0 #000000',
}
