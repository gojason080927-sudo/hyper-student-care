/**
 * 일반 저장 경로가 입력 완료/푸시를 호출하지 않는지 확인
 * 실행: npx tsx src/lib/todayReportCompletion.isolation.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repo = readFileSync(resolve('src/lib/db/repository.ts'), 'utf8')
const useData = readFileSync(resolve('src/hooks/useData.tsx'), 'utf8')
const merge = readFileSync(resolve('src/lib/db/mergeTodayReport.ts'), 'utf8')

for (const [name, source] of [
  ['repository.ts', repo],
  ['useData.tsx', useData],
  ['mergeTodayReport.ts', merge],
] as const) {
  assert.equal(source.includes('completeTodayReportAndNotify'), false, name)
  assert.equal(source.includes('send-parent-report-notification'), false, name)
  assert.equal(source.includes('mark_today_report_completed'), false, name)
  assert.equal(source.includes('get_today_report_completion'), false, name)
  assert.equal(source.includes('today_report_completion_events'), false, name)
}

console.log('todayReportCompletion isolation OK')
