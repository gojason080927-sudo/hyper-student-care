/**
 * Today Report 과목 모드 판별 테스트 (node scripts/test-subject-mode.mjs)
 */
import assert from 'node:assert/strict'

function getStudentSubjectModeFromClassName(className) {
  const trimmed = className.trim()
  if (!trimmed) return 'both'

  const standard = {
    '중3 수학A': 'math',
    '중3 수학B': 'math',
    '고2 영어': 'english',
    '중1 영수': 'both',
    '고1 수학A': 'math',
    '고1 수학B': 'math',
    '고1 영어': 'english',
    '고1 영수': 'both',
  }
  if (standard[trimmed]) return standard[trimmed]

  const normalized = trimmed.replace(/\s+/g, '')
  if (normalized.includes('영수')) return 'both'
  if (normalized.includes('수학')) return 'math'
  if (normalized.includes('영어')) return 'english'
  return 'both'
}

function getStudentSubjectMode(className, subjects) {
  const subjectHint = subjects?.[0]?.trim()
  if (subjectHint === '영어·수학') return 'both'
  if (subjectHint === '수학') return 'math'
  if (subjectHint === '영어') return 'english'
  return getStudentSubjectModeFromClassName(className)
}

function getVisibleTextbookSubjects(className, subjects) {
  const mode = getStudentSubjectMode(className, subjects)
  if (mode === 'math') return ['수학']
  if (mode === 'english') return ['영어']
  return ['수학', '영어']
}

const cases = [
  { name: 'A 중3 수학A', className: '중3 수학A', expected: ['수학'] },
  { name: 'A2 중3 수학B', className: '중3 수학B', expected: ['수학'] },
  { name: '레거시 중3 수학', className: '중3 수학', expected: ['수학'] },
  { name: 'B 고2 영어', className: '고2 영어', expected: ['영어'] },
  { name: 'C 중1 영수A', className: '중1 영수A', expected: ['수학', '영어'] },
  { name: 'C2 중1 영수B', className: '중1 영수B', expected: ['수학', '영어'] },
  { name: '레거시 중1 영수', className: '중1 영수', expected: ['수학', '영어'] },
  { name: 'D 고1 수학A', className: '고1 수학A', expected: ['수학'] },
  { name: 'E 고1 수학B', className: '고1 수학B', expected: ['수학'] },
  { name: 'F 고1 영수A', className: '고1 영수A', expected: ['수학', '영어'] },
  { name: 'F2 고1 영수B', className: '고1 영수B', expected: ['수학', '영어'] },
  { name: '레거시 고1 영수', className: '고1 영수', expected: ['수학', '영어'] },
  { name: 'G 중3 영수A', className: '중3 영수A', expected: ['수학', '영어'] },
  { name: 'G2 중3 영수B', className: '중3 영수B', expected: ['수학', '영어'] },
  { name: '레거시 중3 영수', className: '중3 영수', expected: ['수학', '영어'] },
  { name: '레거시 고2 영어반', className: '고2 영어반', expected: ['영어'] },
  { name: '레거시 중1 영수반', className: '중1 영수반', expected: ['수학', '영어'] },
  { name: '미지원 값 기본 both', className: '특별반', expected: ['수학', '영어'] },
]

let passed = 0
let failed = 0

for (const { name, className, expected } of cases) {
  try {
    assert.deepEqual(getVisibleTextbookSubjects(className), expected)
    passed++
    console.log(`✓ ${name}`)
  } catch (error) {
    failed++
    console.error(`✗ ${name}`)
    console.error(`  ${error instanceof Error ? error.message : error}`)
  }
}

try {
  assert.equal(getStudentSubjectMode('중3 수학', ['영어']), 'english')
  passed++
  console.log('✓ subjects[0] 우선')
} catch (error) {
  failed++
  console.error('✗ subjects[0] 우선')
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
