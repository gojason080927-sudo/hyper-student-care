/**
 * 입결 검증·공식 데이터 로드 스모크 테스트
 * npx tsx src/features/admissionAnalysis/utils/admissionRecordValidator.test.ts
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { importAdmissionRecordsFromJsonArray } from './admissionDataImporter'
import { validateUniversityAdmissionRecord } from './admissionRecordValidator'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
const jsonPath = path.join(
  root,
  'src/features/admissionAnalysis/data/official/officialAdmissionResults.json',
)

const bundle = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as {
  records: unknown[]
  meta: { recordCount: number; universities: string[] }
}

console.log('\n=== official JSON load ===')
const imported = importAdmissionRecordsFromJsonArray(bundle.records)
assert.equal(imported.rejected.length, 0, `rejected: ${JSON.stringify(imported.rejected.slice(0, 3))}`)
assert.ok(imported.accepted.length >= 50)
assert.ok(imported.accepted.every((r) => r.officialData === true))
assert.ok(imported.accepted.every((r) => Boolean(r.sourceName)))
assert.ok(imported.accepted.every((r) => r.sourceName !== 'TEST DATA'))
console.log(
  `accepted=${imported.accepted.length} universities=${[
    ...new Set(imported.accepted.map((r) => r.universityName)),
  ].join(', ')}`,
)

console.log('\n=== reject unofficial ===')
const bad = validateUniversityAdmissionRecord({
  universityName: '서울대학교',
  departmentName: '경영학과',
  admissionYear: 2025,
  admissionType: '학생부교과',
  cutoff70: 1.5,
  sourceName: 'TEST DATA',
  sourceYear: 2025,
  officialData: false,
  gradeSystem: '9-grade',
})
assert.equal(bad.ok, false)

console.log('\n=== reject out of range grade ===')
const range = validateUniversityAdmissionRecord({
  universityName: '테스트대학교',
  departmentName: '테스트학과',
  admissionYear: 2025,
  admissionType: '학생부교과',
  cutoff70: 9.5,
  sourceName: '대입정보포털 어디가',
  sourceYear: 2025,
  officialData: true,
  gradeSystem: '9-grade',
  scoreType: 'grade',
})
assert.equal(range.ok, false)

console.log('\nAll admissionRecordValidator tests passed.')
