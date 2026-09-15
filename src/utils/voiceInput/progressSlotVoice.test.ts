/**
 * Progress slot page voice
 * 실행: npx tsx src/utils/voiceInput/progressSlotVoice.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { applyProgressSlotDraft } from './applyVoiceDraft.ts'
import { parseProgressSlotVoice } from './parseProgressSlotVoice.ts'

{
  const parsed = parseProgressSlotVoice('현재 페이지 35 전체 페이지 180')
  assert.equal(parsed.currentPage, 35)
  assert.equal(parsed.totalPage, 180)
  assert.equal(parsed.currentProgress, undefined)
}

{
  const parsed = parseProgressSlotVoice('현재 페이지 35페이지 전체 페이지 180페이지')
  assert.equal(parsed.currentPage, 35)
  assert.equal(parsed.totalPage, 180)
}

{
  const parsed = parseProgressSlotVoice(
    '현재 진도 이차함수 최대최소 현재 페이지 35 전체 페이지 180',
  )
  assert.equal(parsed.currentProgress, '이차함수 최대최소')
  assert.equal(parsed.currentPage, 35)
  assert.equal(parsed.totalPage, 180)
}

{
  const parsed = parseProgressSlotVoice('현재 페이지 35')
  assert.equal(parsed.currentPage, 35)
  assert.equal(parsed.totalPage, undefined)
}

{
  const parsed = parseProgressSlotVoice('현재 35페이지')
  assert.equal(parsed.currentPage, 35)
  assert.equal(parsed.totalPage, undefined)
}

{
  const parsed = parseProgressSlotVoice('지금 페이지 35')
  assert.equal(parsed.currentPage, 35)
}

{
  const parsed = parseProgressSlotVoice('전체 페이지 180')
  assert.equal(parsed.totalPage, 180)
  assert.equal(parsed.currentPage, undefined)
}

{
  const parsed = parseProgressSlotVoice('총 페이지 180')
  assert.equal(parsed.totalPage, 180)
}

{
  const parsed = parseProgressSlotVoice('총 180페이지')
  assert.equal(parsed.totalPage, 180)
}

{
  const parsed = parseProgressSlotVoice('35페이지 180페이지')
  assert.equal(parsed.currentPage, 35)
  assert.equal(parsed.totalPage, 180)
}

{
  const parsed = parseProgressSlotVoice('72페이지에서 76페이지')
  assert.equal(parsed.currentPage, undefined)
  assert.equal(parsed.totalPage, undefined)
  assert.equal(parsed.currentProgress, '72페이지에서 76페이지')
}

{
  const parsed = parseProgressSlotVoice('관계대명사')
  assert.equal(parsed.currentProgress, '관계대명사')
  assert.equal(parsed.currentPage, undefined)
}

{
  const parsed = parseProgressSlotVoice('현재 페이지 삼십오 전체 페이지 백팔십')
  assert.equal(parsed.currentPage, 35)
  assert.equal(parsed.totalPage, 180)
}

{
  const parsed = parseProgressSlotVoice('페이지가 좀 늘었다')
  assert.equal(parsed.currentPage, undefined)
  assert.equal(parsed.totalPage, undefined)
}

const drafts = {
  '수학:1': { currentProgress: '개념 기존', currentPage: '10', totalPage: '100', textbookName: '' },
  '수학:2': { currentProgress: '유형 기존', currentPage: '20', totalPage: '200', textbookName: '' },
}

{
  const applied = applyProgressSlotDraft(drafts, '현재 페이지 35 전체 페이지 180', '수학', 1)
  assert.equal(applied.drafts['수학:1']?.currentPage, '35')
  assert.equal(applied.drafts['수학:1']?.totalPage, '180')
  assert.equal(applied.drafts['수학:1']?.currentProgress, '개념 기존')
  assert.equal(applied.drafts['수학:2']?.currentPage, '20')
  assert.equal(applied.drafts['수학:2']?.currentProgress, '유형 기존')
}

{
  const applied = applyProgressSlotDraft(drafts, '현재 페이지 40', '수학', 1)
  assert.equal(applied.drafts['수학:1']?.currentPage, '40')
  assert.equal(applied.drafts['수학:1']?.totalPage, '100')
  assert.equal(applied.drafts['수학:2']?.totalPage, '200')
}

{
  const applied = applyProgressSlotDraft(drafts, '전체 페이지 220', '수학', 1)
  assert.equal(applied.drafts['수학:1']?.currentPage, '10')
  assert.equal(applied.drafts['수학:1']?.totalPage, '220')
  assert.equal(applied.drafts['수학:2']?.currentPage, '20')
}

{
  const textOnly = applyProgressSlotDraft(
    { '수학:1': { currentProgress: '개념만' }, '수학:2': { currentProgress: '유형만' } },
    '현재 페이지 35 전체 페이지 180',
    '수학',
    1,
  )
  assert.equal(textOnly.drafts['수학:1']?.currentProgress, '개념만')
  assert.equal('currentPage' in textOnly.drafts['수학:1']!, false)
  assert.equal(textOnly.drafts['수학:2']?.currentProgress, '유형만')
}

{
  const applied = applyProgressSlotDraft(
    drafts,
    '72페이지에서 76페이지',
    '수학',
    1,
  )
  assert.equal(applied.drafts['수학:1']?.currentProgress, '72페이지에서 76페이지')
  assert.equal(applied.drafts['수학:1']?.currentPage, '10')
  assert.equal(applied.drafts['수학:2']?.currentProgress, '유형 기존')
}

{
  const parserSrc = readFileSync('src/utils/voiceInput/parseProgressSlotVoice.ts', 'utf8')
  assert.doesNotMatch(parserSrc, /from '@supabase/)
  assert.doesNotMatch(parserSrc, /from '\.\/speechRecognition/)
  const applySrc = readFileSync('src/utils/voiceInput/applyVoiceDraft.ts', 'utf8')
  assert.doesNotMatch(applySrc, /saveProgressRecord/)
  assert.doesNotMatch(applySrc, /upsertClassCommonProgress/)
}

console.log('progressSlotVoice.test.ts passed')
