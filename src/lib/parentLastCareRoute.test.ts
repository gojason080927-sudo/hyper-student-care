/**
 * 실행: npx tsx src/lib/parentLastCareRoute.test.ts
 */
import assert from 'node:assert/strict'
import {
  parentCareHomePath,
  parentTodayReportPath,
  readLastParentAccessKey,
  rememberParentAccessKey,
} from './parentLastCareRoute'

const memory = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value)
  },
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true })

rememberParentAccessKey('  abc123  ')
assert.equal(readLastParentAccessKey(), 'abc123')
rememberParentAccessKey('')
assert.equal(readLastParentAccessKey(), 'abc123')
assert.equal(parentTodayReportPath('abc123'), '/care/abc123/today-report')
assert.equal(parentCareHomePath('abc123'), '/care/abc123')
assert.equal(parentTodayReportPath(''), '/care')

console.log('parentLastCareRoute OK')
