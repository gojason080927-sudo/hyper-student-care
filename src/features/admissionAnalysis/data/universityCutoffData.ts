/**
 * 대학 단위 70%컷 summary 구성.
 * - 대학50의 cutoff9 (9등급 대표 70%컷) — 5등급 환산 미사용
 * - official 모집단위 record 집계 (최근 2개년)
 * 임의 컷 생성 금지. 출처 없는 값 제외.
 */
import { SPECIAL_ADMISSION_TYPE_KEYWORDS } from '../config/admissionThresholds'
import { listUniversityCounselingTable50 } from '../data/universityCounselingData'
import { listOfficialUniversityAdmissionData } from '../data/universityAdmissionData'
import type { UniversityAdmissionRecord } from '../types'
import type { UniversityCutoffSummary } from '../types/universityCutoff'

function isSpecialAdmissionType(admissionType: string): boolean {
  const t = admissionType.toLowerCase()
  return SPECIAL_ADMISSION_TYPE_KEYWORDS.some((k) =>
    t.includes(k.toLowerCase()),
  )
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid]!
  return Math.round(((sorted[mid - 1]! + sorted[mid]!) / 2) * 100) / 100
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function inferAdmissionType(note: string, evidenceType: string): string {
  if (/지역균형/.test(note)) return '학생부교과(지역균형)'
  if (/학교장추천|고교추천|추천형/.test(note)) return '학생부교과(학교장추천)'
  if (/학교추천/.test(note)) return '학생부교과(학교추천)'
  if (/교과성적우수|학생부우수/.test(note)) return '학생부교과(교과우수)'
  if (/학종|종합/.test(note)) return '학생부종합(참고)'
  if (/상담\s*추정/.test(evidenceType)) return '학생부교과(대표컷·추정)'
  return '학생부교과(대표 70%컷)'
}

/** 서울과학기술대학교 ↔ 서울과학기술대 등 표기 통일용 키 */
function normalizeUniversityKey(name: string): string {
  return name.replace(/대학교$/u, '대').replace(/\s+/g, '').trim()
}

function buildFromCounselingTable(): Map<string, UniversityCutoffSummary> {
  const map = new Map<string, UniversityCutoffSummary>()
  for (const row of listUniversityCounselingTable50()) {
    if (!(row.cutoff9 >= 1 && row.cutoff9 <= 9)) continue
    const id = `counseling9:${row.rank}:${row.universityName}`
    map.set(normalizeUniversityKey(row.universityName), {
      id,
      universityName: row.universityName,
      region: row.region,
      admissionType: inferAdmissionType(row.counselingNote, row.evidenceType),
      latest: { admissionYear: 2025, cutoff70: row.cutoff9 },
      previous: null,
      recentAverageCutoff: null,
      evidenceType: row.evidenceType,
      counselingNote: row.counselingNote,
      sourceUrl: row.sourceUrl,
      sourceName: '대학50 상담표 · 2025 대표 교과 70%컷(9등급)',
      departments: undefined,
    })
  }
  return map
}

type YearAgg = {
  year: number
  cuts: number[]
  types: Map<string, number>
  depts: UniversityCutoffSummary['departments']
}

function buildFromOfficialRecords(): Map<string, UniversityCutoffSummary> {
  const byUni = new Map<string, Map<number, YearAgg>>()
  const displayNameByKey = new Map<string, string>()

  const records = listOfficialUniversityAdmissionData().filter(
    (r) =>
      (r.scoreType ?? 'grade') === 'grade' &&
      r.admissionCategory === '학생부교과' &&
      r.gradeSystem === '9-grade' &&
      r.cutoff70 != null &&
      r.cutoff70 >= 1 &&
      r.cutoff70 <= 9 &&
      !isSpecialAdmissionType(r.admissionType),
  )

  for (const r of records) {
    const key = normalizeUniversityKey(r.universityName)
    if (!displayNameByKey.has(key)) displayNameByKey.set(key, r.universityName)
    let yearMap = byUni.get(key)
    if (!yearMap) {
      yearMap = new Map()
      byUni.set(key, yearMap)
    }
    let agg = yearMap.get(r.admissionYear)
    if (!agg) {
      agg = {
        year: r.admissionYear,
        cuts: [],
        types: new Map(),
        depts: [],
      }
      yearMap.set(r.admissionYear, agg)
    }
    agg.cuts.push(r.cutoff70!)
    agg.types.set(r.admissionType, (agg.types.get(r.admissionType) ?? 0) + 1)
    agg.depts!.push({
      id: r.id,
      departmentName: r.departmentName,
      admissionType: r.admissionType,
      admissionYear: r.admissionYear,
      cutoff70: r.cutoff70!,
    })
  }

  const out = new Map<string, UniversityCutoffSummary>()
  for (const [key, yearMap] of byUni) {
    const years = [...yearMap.keys()].sort((a, b) => b - a)
    if (years.length === 0) continue
    const latestYear = years[0]!
    const prevYear = years[1]
    const latestAgg = yearMap.get(latestYear)!
    const latestCut = median(latestAgg.cuts)
    if (latestCut == null) continue

    let topType = '학생부교과'
    let topCount = 0
    for (const [t, n] of latestAgg.types) {
      if (n > topCount) {
        topCount = n
        topType = t
      }
    }

    let previous: UniversityCutoffSummary['previous'] = null
    if (prevYear != null) {
      const prevCut = median(yearMap.get(prevYear)!.cuts)
      if (prevCut != null) {
        previous = { admissionYear: prevYear, cutoff70: prevCut }
      }
    }

    const recentAverageCutoff =
      previous != null
        ? round2((latestCut + previous.cutoff70) / 2)
        : null

    const displayName = displayNameByKey.get(key) ?? key
    const sample = records.find(
      (r) => normalizeUniversityKey(r.universityName) === key,
    )
    out.set(key, {
      id: `official:${key}`,
      universityName: displayName,
      region: sample?.region ?? '',
      admissionType: topType,
      latest: { admissionYear: latestYear, cutoff70: latestCut },
      previous,
      recentAverageCutoff,
      evidenceType: '공식 모집단위 중앙값',
      counselingNote:
        '어디가 공개 모집단위 70%컷의 대학·연도별 중앙값. 학과 편차 있음.',
      sourceUrl: sample?.sourceUrl,
      sourceName: sample?.sourceName ?? '대입정보포털 어디가',
      departments: [...(latestAgg.depts ?? [])].sort(
        (a, b) => a.cutoff70 - b.cutoff70,
      ),
    })
  }
  return out
}

/**
 * 추천용 대학 summary 목록.
 * official 집계가 있으면 해당 대학은 official 우선(최근 2개년 표시),
 * 나머지는 대학50의 9등급 대표 70%컷 사용.
 * convertedCutoff5(5등급)는 사용하지 않음.
 */
export function listUniversityCutoffSummaries(): UniversityCutoffSummary[] {
  const counseling = buildFromCounselingTable()
  const official = buildFromOfficialRecords()

  const names = new Set([...counseling.keys(), ...official.keys()])
  const out: UniversityCutoffSummary[] = []

  for (const name of names) {
    const off = official.get(name)
    const sheet = counseling.get(name)
    if (off && sheet) {
      // official 최신 + sheet를 전년/보조로 쓰지 않음(출처 혼동 방지).
      // 다만 official에 previous가 없고 sheet 연도가 official보다 이전이면 previous로 참고.
      let previous = off.previous
      let recentAverageCutoff = off.recentAverageCutoff
      if (
        !previous &&
        sheet.latest.admissionYear < off.latest.admissionYear
      ) {
        previous = sheet.latest
        recentAverageCutoff = round2(
          (off.latest.cutoff70 + sheet.latest.cutoff70) / 2,
        )
      }
      out.push({
        ...off,
        universityName: sheet.universityName || off.universityName,
        previous,
        recentAverageCutoff,
        region: off.region || sheet.region,
      })
    } else if (off) {
      out.push(off)
    } else if (sheet) {
      out.push(sheet)
    }
  }

  return out.sort((a, b) => a.latest.cutoff70 - b.latest.cutoff70)
}

/** 테스트/디버그용 — official만 */
export function listOfficialCutoffSummariesOnly(): UniversityCutoffSummary[] {
  return [...buildFromOfficialRecords().values()].sort(
    (a, b) => a.latest.cutoff70 - b.latest.cutoff70,
  )
}

export function findOfficialRecordsForUniversity(
  universityName: string,
): UniversityAdmissionRecord[] {
  return listOfficialUniversityAdmissionData().filter(
    (r) => r.universityName === universityName,
  )
}
