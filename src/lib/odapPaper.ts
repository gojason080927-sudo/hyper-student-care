export type OdapStatus = '남음' | '쌍둥이 대기' | '회수 완료'

export type OdapItem = {
  id: string
  no: string
  unit: string
  sub: string
  level: string
  date: string
  status: OdapStatus
}

export type PaperSlot =
  | { kind: '오답'; item: OdapItem }
  | { kind: '쌍둥이'; from: OdapItem; sub: string; level: string }

/**
 * 오답 문제지 구성: 출제 범위 안에서 체크한 문제를 먼저(목록 순서) 넣고,
 * 문제 수가 모자라면 같은 소단원·난이도 쌍둥이로 채운다(체크한 문제부터 돌아가며).
 */
export function buildOdapPaper(
  items: OdapItem[],
  checked: Set<string>,
  count: number,
  includeRecovered: boolean,
): PaperSlot[] {
  const pool = items.filter((x) => includeRecovered || x.status !== '회수 완료')
  const picked = pool.filter((x) => checked.has(x.id))
  const out: PaperSlot[] = picked.slice(0, count).map((item) => ({ kind: '오답', item }))
  const seeds = picked.length ? picked : pool
  for (let i = 0; out.length < count && seeds.length; i++) {
    const from = seeds[i % seeds.length]
    out.push({ kind: '쌍둥이', from, sub: from.sub, level: from.level })
  }
  return out
}
