/**
 * Held daily-test listening (explicit stop + Android auto-end)
 * 실행: npx tsx src/utils/voiceInput/heldSpeech.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  accumulateHeldFragments,
  createHeldSpeechState,
  isFatalHeldSpeechError,
  reduceHeldSpeech,
  shouldRestartHeldSpeech,
} from './speechRecognition.ts'

function run(events: Parameters<typeof reduceHeldSpeech>[1][]) {
  let state = createHeldSpeechState()
  let lastApply: string | null = null
  let restartCountSeen = 0
  let showedError = false
  for (const event of events) {
    const next = reduceHeldSpeech(state, event)
    state = next.state
    if (next.apply != null) lastApply = next.apply
    if (next.restart) restartCountSeen += 1
    if (next.showError) showedError = true
  }
  return { state, lastApply, restartCountSeen, showedError }
}

// A/B tap mic is UI; reducer starts idle then committed
{
  const idle = createHeldSpeechState()
  assert.equal(idle.userStopped, false)
  assert.equal(shouldRestartHeldSpeech(idle), true)
}

// B tap stop → apply once on browser-end
{
  const result = run([
    { type: 'committed', text: '1차 80점 불합격, 2차 90점 합격' },
    { type: 'user-stop' },
    { type: 'browser-end' },
  ])
  assert.equal(result.lastApply, '1차 80점 불합격, 2차 90점 합격')
  assert.equal(result.state.applied, true)
  assert.equal(result.state.restartCount, 0)
  const again = reduceHeldSpeech(result.state, { type: 'browser-end' })
  assert.equal(again.apply, null)
  assert.equal(again.restart, false)
}

// C unexpected onend while listening → restart
{
  const result = run([
    { type: 'committed', text: '1차 80점' },
    { type: 'browser-end' },
  ])
  assert.equal(result.lastApply, null)
  assert.equal(result.restartCountSeen, 1)
  assert.equal(result.state.accumulated, '1차 80점')
}

// D/E fragments preserved and accumulated
{
  const result = run([
    { type: 'committed', text: '1차 80점 불합격 2차 90점 합격' },
    { type: 'browser-end' },
    { type: 'committed', text: '피드백 계산 실수가 많이 줄었고' },
    { type: 'browser-end' },
    { type: 'committed', text: '응용 문제를 더 연습할 것' },
    { type: 'user-stop' },
    { type: 'browser-end' },
  ])
  assert.equal(
    result.lastApply,
    '1차 80점 불합격 2차 90점 합격 피드백 계산 실수가 많이 줄었고 응용 문제를 더 연습할 것',
  )
}

// F explicit stop prevents restart
{
  const result = run([
    { type: 'committed', text: '1차 80점' },
    { type: 'user-stop' },
    { type: 'browser-end' },
  ])
  assert.equal(result.restartCountSeen, 0)
  assert.equal(shouldRestartHeldSpeech(result.state), false)
}

// G/H fatal errors prevent restart
for (const code of ['not-allowed', 'service-not-allowed', 'audio-capture']) {
  assert.equal(isFatalHeldSpeechError(code), true)
  const result = run([
    { type: 'committed', text: '1차 80점' },
    { type: 'error', code },
    { type: 'browser-end' },
  ])
  assert.equal(result.restartCountSeen, 0)
  assert.equal(result.lastApply, null)
  assert.equal(result.showedError, true)
}

assert.equal(isFatalHeldSpeechError('no-speech'), false)
{
  const result = run([
    { type: 'committed', text: '1차 80점' },
    { type: 'error', code: 'no-speech' },
    { type: 'browser-end' },
  ])
  assert.equal(result.showedError, false)
  assert.equal(result.restartCountSeen, 1)
}

{
  const result = run([
    { type: 'committed', text: '2차 함수에 대한 이해가 늦는 거 같다' },
    { type: 'browser-end' },
    { type: 'restart-blocked' },
    { type: 'browser-end' },
  ])
  assert.equal(result.lastApply, null)
  assert.equal(result.restartCountSeen, 1)
  assert.equal(result.state.restartDisabled, true)
  assert.equal(result.state.applied, false)
  const stopped = run([
    { type: 'committed', text: '2차 함수에 대한 이해가 늦는 거 같다' },
    { type: 'browser-end' },
    { type: 'restart-blocked' },
    { type: 'user-stop' },
    { type: 'browser-end' },
  ])
  assert.equal(stopped.lastApply, '2차 함수에 대한 이해가 늦는 거 같다')
  assert.equal(stopped.state.applied, true)
}

// I unmount prevents restart and does not apply
{
  const result = run([
    { type: 'committed', text: '1차 80점' },
    { type: 'unmount' },
    { type: 'browser-end' },
  ])
  assert.equal(result.restartCountSeen, 0)
  assert.equal(result.lastApply, null)
}

// J duplicate finals not duplicated
assert.equal(
  accumulateHeldFragments('1차 80점 불합격', '1차 80점 불합격'),
  '1차 80점 불합격',
)
assert.equal(
  accumulateHeldFragments('1차 80점', '1차 80점 불합격 2차 90점 합격'),
  '1차 80점 불합격 2차 90점 합격',
)

// K interim is not in reducer apply path — committed only
{
  const result = run([
    { type: 'committed', text: '1차 80점 불합격, 2차 90점 합격' },
    { type: 'user-stop' },
    { type: 'browser-end' },
  ])
  assert.doesNotMatch(result.lastApply ?? '', /듣는 중/)
}

// L long feedback across sessions → one parser input
{
  const result = run([
    { type: 'committed', text: '1차 80점 불합격, 2차 90점 합격,' },
    { type: 'browser-end' },
    { type: 'committed', text: '피드백 계산 실수가 많이 줄었고 응용 문제를 더 연습할 것' },
    { type: 'user-stop' },
    { type: 'browser-end' },
  ])
  assert.match(result.lastApply ?? '', /1차 80점/)
  assert.match(result.lastApply ?? '', /피드백 계산 실수가/)
}

// M short score phrase + stop → apply
{
  const result = run([
    { type: 'committed', text: '1차 80점 불합격, 2차 90점 합격' },
    { type: 'user-stop' },
    { type: 'browser-end' },
  ])
  assert.equal(result.lastApply, '1차 80점 불합격, 2차 90점 합격')
}

const voiceUi = readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8')
assert.match(voiceUi, /explicitStop/)
assert.match(voiceUi, /holdUntilExplicitStop/)
assert.match(voiceUi, /onHeldTrace/)
assert.match(voiceUi, /듣는 중 · 종료/)
assert.match(voiceUi, /다 말한 뒤 종료를 누르세요/)

const dailyPanel = readFileSync('src/components/todayReport/ClassDailyTestBulkPanel.tsx', 'utf8')
assert.match(dailyPanel, /explicitStop/)
assert.match(
  readFileSync('src/components/todayReport/ClassAttendanceBulkPanel.tsx', 'utf8'),
  /SectionVoiceInput/,
)
assert.doesNotMatch(
  readFileSync('src/components/todayReport/ClassAttendanceBulkPanel.tsx', 'utf8'),
  /explicitStop/,
)

console.log('heldSpeech.test.ts passed')
