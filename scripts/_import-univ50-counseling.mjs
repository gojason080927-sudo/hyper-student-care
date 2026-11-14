import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const xlsxPath = path.resolve('scripts/_univ50_source.xlsx')
const wb = XLSX.readFile(xlsxPath)
const rows = XLSX.utils.sheet_to_json(wb.Sheets['대학50'], { defval: null })

function byPartial(row, part) {
  const key = Object.keys(row).find((k) => String(k).includes(part))
  return key != null ? row[key] : null
}

function parseTarget(s) {
  const m = String(s).match(/([0-9.]+)\s*[~～-]\s*([0-9.]+)/)
  if (!m) throw new Error(`bad target: ${s}`)
  return { targetMin: Number(m[1]), targetMax: Number(m[2]) }
}

const records = rows.map((r) => {
  const target = parseTarget(byPartial(r, '적정'))
  const sourceUrl = byPartial(r, '출처')
  return {
    rank: Number(byPartial(r, '순번')),
    universityName: String(byPartial(r, '대학')),
    region: String(byPartial(r, '지역')),
    cutoff9: Number(byPartial(r, '9등급')),
    convertedCutoff5: Number(byPartial(r, '5등급')),
    safeMax: Number(byPartial(r, '안정')),
    targetMin: target.targetMin,
    targetMax: target.targetMax,
    ambitiousMax: Number(byPartial(r, '소신')),
    evidenceType: String(byPartial(r, '근거')),
    counselingNote: String(byPartial(r, '상담') ?? ''),
    sourceUrl: sourceUrl ? String(sourceUrl) : undefined,
  }
})

const outDir = path.resolve('src/features/admissionAnalysis/data/counseling')
fs.mkdirSync(outDir, { recursive: true })

const out = {
  meta: {
    sourceFile: '2025_대입_교과70컷_5등급제_상위50대학_상담표',
    admissionYear: 2025,
    recordCount: records.length,
    judgmentFormula:
      'IF(g<=cut5-0.10,"안정",IF(g<=cut5+0.05,"적정",IF(g<=cut5+0.15,"소신","상향")))',
    note: '스프레드시트 값을 그대로 이식. 숫자는 임의 생성하지 않음.',
    importedAt: new Date().toISOString(),
  },
  records,
}

fs.writeFileSync(
  path.join(outDir, 'universityCounselingTable50.json'),
  JSON.stringify(out, null, 2),
  'utf8',
)

console.log(JSON.stringify(out.meta, null, 2))
console.log('sample', records[0], records[4])

function judge(g, cut5) {
  if (g <= cut5 - 0.1) return '안정'
  if (g <= cut5 + 0.05) return '적정'
  if (g <= cut5 + 0.15) return '소신'
  return '상향'
}

for (const g of [1.2, 1.5, 1.8, 2.0, 2.5, 3.0]) {
  const groups = { 상향: [], 소신: [], 적정: [], 안정: [] }
  for (const r of records) {
    groups[judge(g, r.convertedCutoff5)].push(r.universityName)
  }
  console.log(`\n=== student ${g.toFixed(2)} ===`)
  for (const k of ['소신', '적정', '안정', '상향']) {
    console.log(`${k}(${groups[k].length})`, groups[k].join(', '))
  }
}
