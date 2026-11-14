/**
 * v124 통합 MASTER → 추천 JSON + 매칭 리포트
 * 추정값 생성 금지. 엑셀 원본 컬럼만 사용.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const ROOT = path.resolve('C:/Users/관리자/Desktop/hyperstudentcare')
const SRC_XLSX = path.join(
  ROOT,
  'scripts',
  'HYPER_수시교과_학종_MASTER_v124_인천수원아주인하_최종교차검증.xlsx',
)
const OUT_JSON = path.join(
  ROOT,
  'src/features/admissionAnalysis/data/master/v124RecommendationRecords.json',
)
const OUT_REPORT = path.join(ROOT, 'scripts/_v124_match_report.json')

function cellStr(v) {
  if (v == null) return ''
  return String(v).replace(/\u3000/g, ' ').trim()
}

function parseGradeCut(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || v < 1 || v > 9) return null
    return Math.round(v * 100) / 100
  }
  const s = cellStr(v)
  if (!s) return null
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 1 || n > 9) return null
  return Math.round(n * 100) / 100
}

function parseRate(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') {
    return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null
  }
  const s = cellStr(v)
  if (!s) return null
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null
}

function normalizeText(s) {
  return cellStr(s).replace(/\s+/g, ' ')
}

function normalizeUniversity(s) {
  return normalizeText(s)
    .replace(/\(본교\)/g, '')
    .replace(/대학교$/u, '대')
    .replace(/\s+/g, '')
}

function normalizeDepartment(s) {
  return normalizeText(s)
    .replace(/[・･ㆍ]/g, '·')
    .replace(/\s+/g, '')
}

function classifyRegionGroup(campus, universityName) {
  const c = cellStr(campus)
  const u = cellStr(universityName)
  if (/서울/.test(c)) return 'seoul'
  if (/인천|경기|수원|성남|화성|양평/.test(c)) return 'incheon-gyeonggi'
  if (/국립/.test(u)) return 'regional-national'
  return 'other'
}

function classifyCsat(raw) {
  const s = cellStr(raw)
  if (!s) return 'unverified'
  if (s === '적용') return 'applied'
  if (s === '미적용') return 'not_applied'
  if (s === '부분 적용') return 'partial'
  return 'unverified'
}

function sheetRows(wb, name) {
  const sheet = wb.Sheets[name]
  if (!sheet) throw new Error(`시트 없음: ${name}`)
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true })
}

function pairKey(uni, dept) {
  return `${cellStr(uni)}|${cellStr(dept)}`
}

function normKey(uni, dept) {
  return `${normalizeUniversity(uni)}|${normalizeDepartment(dept)}`
}

const wb = XLSX.readFile(SRC_XLSX)
const masterRows = sheetRows(wb, 'MASTER_입결')
const jongRows = sheetRows(wb, '학종_입결')

const masterDepts = new Set()
const masterUnis = new Set()
for (const r of masterRows) {
  masterUnis.add(cellStr(r['대학']))
  if (cellStr(r['대학']) && cellStr(r['모집단위'])) {
    masterDepts.add(pairKey(r['대학'], r['모집단위']))
  }
}

const jongDepts = new Set()
const jongUnis = new Set()
for (const r of jongRows) {
  jongUnis.add(cellStr(r['대학']))
  if (cellStr(r['대학']) && cellStr(r['모집단위'])) {
    jongDepts.add(pairKey(r['대학'], r['모집단위']))
  }
}

const jongByExact = new Map()
const jongByNorm = new Map()
for (const r of jongRows) {
  const uni = cellStr(r['대학'])
  const dept = cellStr(r['모집단위'])
  if (!uni || !dept) continue
  const exact = pairKey(uni, dept)
  const norm = normKey(uni, dept)
  if (!jongByExact.has(exact)) jongByExact.set(exact, [])
  jongByExact.get(exact).push(r)
  if (!jongByNorm.has(norm)) jongByNorm.set(norm, [])
  jongByNorm.get(norm).push(r)
}

function pickJong(list, master) {
  if (!list || list.length === 0) return null
  const masterType = cellStr(master['학종 전형명'])
  const campus = cellStr(master['캠퍼스'])
  const scored = [...list].map((row, idx) => {
    let score = 0
    if (masterType && cellStr(row['전형명']) === masterType) score += 4
    const jc = cellStr(row['캠퍼스'])
    if (campus && jc && campus === jc) score += 2
    if (campus && jc && (campus.includes(jc) || jc.includes(campus.split(' ')[0]))) score += 1
    if (parseGradeCut(row['70%컷']) != null) score += 1
    return { row, score, idx }
  })
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx)
  return scored[0].row
}

const latestByKey = new Map()
for (const r of masterRows) {
  const uni = cellStr(r['대학'])
  const dept = cellStr(r['모집단위'])
  const type = cellStr(r['전형명'])
  const campus = cellStr(r['캠퍼스'])
  const year = Number(r['학년도'])
  if (!uni || !dept || !type || !Number.isFinite(year)) continue
  const key = `${uni}|${campus}|${type}|${dept}`
  const prev = latestByKey.get(key)
  if (!prev || year > Number(prev['학년도'])) latestByKey.set(key, r)
}

const records = []
let exactMatch = 0
let normalizedMatch = 0
let noMatch = 0
const failList = []
const seenFail = new Set()

for (const r of latestByKey.values()) {
  const uni = cellStr(r['대학'])
  const dept = cellStr(r['모집단위'])
  const cutoff70 = parseGradeCut(r['70%컷'])
  if (cutoff70 == null) continue

  const exact = pairKey(uni, dept)
  const norm = normKey(uni, dept)
  let matchType = 'none'
  let jong = null
  if (jongByExact.has(exact)) {
    jong = pickJong(jongByExact.get(exact), r)
    matchType = 'exact'
    exactMatch += 1
  } else if (jongByNorm.has(norm)) {
    jong = pickJong(jongByNorm.get(norm), r)
    matchType = 'normalized'
    normalizedMatch += 1
  } else {
    noMatch += 1
    const failKey = `${uni}|${dept}`
    if (!seenFail.has(failKey)) {
      seenFail.add(failKey)
      failList.push({ universityName: uni, departmentName: dept, campus: cellStr(r['캠퍼스']) })
    }
  }

  const id = [uni, cellStr(r['캠퍼스']), cellStr(r['전형명']), dept, String(r['학년도'])]
    .join('_')
    .replace(/[^\w가-힣]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 160)

  records.push({
    id,
    universityName: uni,
    campus: cellStr(r['캠퍼스']),
    admissionType: cellStr(r['전형명']),
    departmentName: dept,
    curriculumCutoff70: cutoff70,
    curriculumCompetitionRate: parseRate(r['경쟁률']),
    csatStatus: classifyCsat(r['수능최저 적용(2026)']),
    csatNote: cellStr(r['비고(수능최저 조건)']),
    comprehensiveCutoff70: jong ? parseGradeCut(jong['70%컷']) : null,
    comprehensiveCutoff50: jong ? parseGradeCut(jong['50%컷']) : null,
    comprehensiveCompetitionRate: jong ? parseRate(jong['경쟁률']) : null,
  })
}

const jongExactHit = new Set()
const jongNormOnly = []
const jongFail = []
const seenJongFail = new Set()
const masterExact = new Set(masterDepts)
const masterNorm = new Set([...masterDepts].map((k) => {
  const [u, d] = k.split('|')
  return normKey(u, d)
}))

for (const key of jongDepts) {
  const [u, d] = key.split('|')
  if (masterExact.has(key)) {
    jongExactHit.add(key)
  } else if (masterNorm.has(normKey(u, d))) {
    jongNormOnly.push({ universityName: u, departmentName: d })
  } else if (!seenJongFail.has(key)) {
    seenJongFail.add(key)
    jongFail.push({ universityName: u, departmentName: d })
  }
}

const bundle = {
  meta: {
    sourceFile: 'HYPER_수시교과_학종_MASTER_v124_인천수원아주인하_최종교차검증.xlsx',
    curriculumSheet: 'MASTER_입결',
    comprehensiveSheet: '학종_입결',
    generatedAt: new Date().toISOString(),
    masterDataRows: masterRows.length,
    comprehensiveDataRows: jongRows.length,
    masterUniversities: masterUnis.size,
    comprehensiveUniversities: jongUnis.size,
    masterUniversityDepartmentPairs: masterDepts.size,
    comprehensiveUniversityDepartmentPairs: jongDepts.size,
    recommendableRecords: records.length,
    match: {
      curriculumToComprehensive: {
        exact: exactMatch,
        normalized: normalizedMatch,
        failed: noMatch,
        failedUniqueDepartments: failList.length,
      },
      comprehensiveToCurriculum: {
        exact: jongExactHit.size,
        normalizedOnly: jongNormOnly.length,
        failed: jongFail.length,
      },
    },
    note: '공식 MASTER 원본 값만 수록. 컷·경쟁률·수능최저를 추정하지 않음.',
  },
  records,
}

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true })
fs.writeFileSync(OUT_JSON, JSON.stringify(bundle), 'utf8')

const report = {
  sourceFile: bundle.meta.sourceFile,
  sheetsUsed: {
    curriculum: 'MASTER_입결',
    comprehensive: '학종_입결',
    csatOnCurriculumSheet: ['수능최저 적용(2026)', '비고(수능최저 조건)', '수능최저 검증출처'],
    csatClassificationSheet: '수능최저_분류',
  },
  curriculum: {
    dataRows: masterRows.length,
    universities: [...masterUnis].sort((a, b) => a.localeCompare(b, 'ko')),
    universityCount: masterUnis.size,
    universityDepartmentPairs: masterDepts.size,
    recommendableWithCutoff70: records.length,
    columns: [
      '학년도',
      '대학',
      '캠퍼스',
      '전형명',
      '모집단위',
      '모집인원',
      '경쟁률',
      '50%컷',
      '70%컷',
      '수능최저 적용(2026)',
      '비고(수능최저 조건)',
      '수능최저 검증출처',
      '공식출처URL',
    ],
  },
  comprehensive: {
    dataRows: jongRows.length,
    universityCount: jongUnis.size,
    universityDepartmentPairs: jongDepts.size,
    columns: [
      '학년도',
      '대학',
      '캠퍼스',
      '전형명',
      '모집단위',
      '모집인원',
      '경쟁률',
      '50%컷',
      '70%컷',
      '조사범위',
      '지역/핵심계열',
      '출처유형',
      '공식출처URL',
      '면접',
      '수능최저',
      '비고',
    ],
  },
  matching: {
    key: '대학명 + 모집단위',
    exactMatches: exactMatch,
    normalizedMatches: normalizedMatch,
    failedCurriculumRows: noMatch,
    failedUniqueCurriculumDepartments: failList.length,
    failedCurriculumDepartments: failList.sort((a, b) =>
      a.universityName.localeCompare(b.universityName, 'ko') ||
      a.departmentName.localeCompare(b.departmentName, 'ko'),
    ),
    comprehensiveExactToCurriculum: jongExactHit.size,
    comprehensiveNormalizedOnly: jongNormOnly.length,
    comprehensiveFailed: jongFail.length,
    comprehensiveFailedDepartments: jongFail.sort((a, b) =>
      a.universityName.localeCompare(b.universityName, 'ko') ||
      a.departmentName.localeCompare(b.departmentName, 'ko'),
    ),
    normalizationRules: [
      'trim / 중복공백 제거',
      '대학교 → 대',
      '모집단위 전각·중점 기호 통일, 공백 제거',
      '과/부/전공 의미 병합 없음',
    ],
  },
  regionGroups: records.reduce((acc, r) => {
    const g = classifyRegionGroup(r.campus, r.universityName)
    acc[g] = (acc[g] ?? 0) + 1
    return acc
  }, {}),
}

fs.writeFileSync(OUT_REPORT, JSON.stringify(report, null, 2), 'utf8')

console.log(JSON.stringify(bundle.meta, null, 2))
console.log('wrote', OUT_JSON)
console.log('wrote', OUT_REPORT)
console.log('fail unique curriculum depts', failList.length)
console.log('fail unique comprehensive depts', jongFail.length)
