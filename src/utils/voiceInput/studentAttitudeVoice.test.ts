/**
 * Per-student attitude comment voice
 * 실행: npx tsx src/utils/voiceInput/studentAttitudeVoice.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { attitudeLessonIndex } from '../studentCare/scoring.ts'
import { applyStudentAttitudeDraft } from './applyVoiceDraft.ts'
import { parseStudentAttitudeVoice } from './parseStudentAttitudeVoice.ts'

const 류정현 = { id: 'ryu', name: '류정현' }
const 김도영 = { id: 'doyoung', name: '김도영' }
const roster = [류정현, 김도영]
const DATE = '2026-09-15'

function drafts() {
  return {
    ryu: { issues: [] as Array<'졸음' | '잡담' | '집중 저하' | '수업방해' | '태도 불량'>, note: '기존 의견' },
    doyoung: { issues: ['졸음'] as Array<'졸음'>, note: '도영 기존' },
  }
}

{
  const parsed = parseStudentAttitudeVoice(
    '강사의 의견 오늘 집중력이 좋았다',
    류정현,
    roster,
    false,
  )
  assert.equal(parsed.apply, true)
  assert.equal(parsed.note, '오늘 집중력이 좋았다')
}

{
  const parsed = parseStudentAttitudeVoice('의견 오늘 집중력이 좋았다', 류정현, roster, false)
  assert.equal(parsed.note, '오늘 집중력이 좋았다')
}

{
  const parsed = parseStudentAttitudeVoice('오늘 집중력이 좋았다', 류정현, roster, false)
  assert.equal(parsed.note, '오늘 집중력이 좋았다')
  assert.equal(parsed.issues, undefined)
}

{
  const parsed = parseStudentAttitudeVoice(
    '집중 저하 강사의 의견 오늘 후반부 집중력이 떨어졌다',
    류정현,
    roster,
    false,
  )
  assert.deepEqual(parsed.issues, ['집중 저하'])
  assert.equal(parsed.note, '오늘 후반부 집중력이 떨어졌다')
}

{
  const parsed = parseStudentAttitudeVoice(
    '졸음 잡담 의견 컨디션이 좋지 않아 집중이 어려웠다',
    류정현,
    roster,
    false,
  )
  assert.deepEqual(parsed.issues?.sort(), ['졸음', '잡담'].sort())
  assert.equal(parsed.note, '컨디션이 좋지 않아 집중이 어려웠다')
}

{
  const parsed = parseStudentAttitudeVoice('김도영 강사의 의견 다른 학생', 류정현, roster, false)
  assert.equal(parsed.apply, false)
}

{
  const parsed = parseStudentAttitudeVoice('오늘 집중력이 좋았다', 류정현, roster, true)
  assert.equal(parsed.apply, false)
  assert.equal(parsed.skippedAbsent, true)
}

{
  const applied = applyStudentAttitudeDraft(
    drafts(),
    '강사의 의견 오늘 집중력이 좋았다',
    류정현,
    roster,
    [],
    DATE,
  )
  assert.equal(applied.drafts.ryu?.note, '오늘 집중력이 좋았다')
  assert.deepEqual(applied.drafts.ryu?.issues, [])
  assert.equal(applied.drafts.doyoung?.note, '도영 기존')
}

{
  const applied = applyStudentAttitudeDraft(
    drafts(),
    '집중 저하 강사의 의견 오늘 후반부 집중력이 떨어졌다',
    류정현,
    roster,
    [],
    DATE,
  )
  assert.deepEqual(applied.drafts.ryu?.issues, ['집중 저하'])
  assert.equal(applied.drafts.ryu?.note, '오늘 후반부 집중력이 떨어졌다')
  assert.equal(attitudeLessonIndex(applied.drafts.ryu?.issues ?? []), attitudeLessonIndex(['집중 저하']))
  assert.notEqual(attitudeLessonIndex(['집중 저하']), attitudeLessonIndex([]))
}

{
  const withNote = drafts()
  withNote.ryu.note = '기존 의견'
  const applied = applyStudentAttitudeDraft(
    withNote,
    '졸음',
    류정현,
    roster,
    [],
    DATE,
  )
  assert.deepEqual(applied.drafts.ryu?.issues, ['졸음'])
  assert.equal(applied.drafts.ryu?.note, '기존 의견')
}

{
  const parsed = parseStudentAttitudeVoice(
    '강사의 의견 오늘 집중력이 좋았고 수업 참여도가 높았다',
    류정현,
    roster,
    false,
  )
  assert.equal(parsed.note, '오늘 집중력이 좋았고 수업 참여도가 높았다')
}

{
  assert.equal(attitudeLessonIndex([]), 100)
  assert.equal(attitudeLessonIndex(['졸음']), 80)
  assert.equal(attitudeLessonIndex(['졸음', '잡담']), 60)
  assert.equal(attitudeLessonIndex(['졸음', '잡담', '집중 저하']), 60)
  const excellentWithComment = applyStudentAttitudeDraft(
    drafts(),
    '강사의 의견 오늘 집중력이 좋았다',
    류정현,
    roster,
    [],
    DATE,
  )
  assert.equal(attitudeLessonIndex(excellentWithComment.drafts.ryu?.issues ?? []), 100)
  assert.equal(excellentWithComment.drafts.ryu?.note, '오늘 집중력이 좋았다')
}

{
  const parserSrc = readFileSync('src/utils/voiceInput/parseStudentAttitudeVoice.ts', 'utf8')
  assert.doesNotMatch(parserSrc, /from '@supabase/)
  assert.doesNotMatch(parserSrc, /from '\.\/speechRecognition/)
  const applySrc = readFileSync('src/utils/voiceInput/applyVoiceDraft.ts', 'utf8')
  assert.doesNotMatch(applySrc, /saveStudentDailyCare/)
  const pickerSrc = readFileSync('src/components/studentCare/ClassAttitudePicker.tsx', 'utf8')
  assert.match(pickerSrc, /hideNote/)
}

console.log('studentAttitudeVoice.test.ts passed')
