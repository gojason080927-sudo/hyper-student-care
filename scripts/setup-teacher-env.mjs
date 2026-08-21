/**
 * .env.local 에 TEST_TEACHER_EMAIL / TEST_TEACHER_PASSWORD 를 추가·갱신합니다.
 * 로그인 검증 후 저장합니다.
 *
 * 사용:
 *   node scripts/setup-teacher-env.mjs --email you@example.com --password 'your-password'
 *   TEST_TEACHER_EMAIL=... TEST_TEACHER_PASSWORD=... node scripts/setup-teacher-env.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

function parseEnv(text) {
  const env = {}
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

function upsertEnvLines(text, entries) {
  const lines = text.split('\n')
  const keys = Object.keys(entries)
  for (const key of keys) {
    const value = entries[key]
    const line = `${key}=${value}`
    const idx = lines.findIndex((l) => l.trim().startsWith(`${key}=`))
    if (idx >= 0) lines[idx] = line
    else lines.push(line)
  }
  return lines.join('\n').replace(/\n?$/, '\n')
}

function readArg(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1 || idx + 1 >= process.argv.length) return ''
  return process.argv[idx + 1]
}

const root = process.cwd()
const envPath = resolve(root, '.env.local')
const fileEnv = parseEnv(loadEnvFile(envPath))
const email = (process.env.TEST_TEACHER_EMAIL || readArg('--email') || fileEnv.TEST_TEACHER_EMAIL || '').trim()
const password = (process.env.TEST_TEACHER_PASSWORD || readArg('--password') || fileEnv.TEST_TEACHER_PASSWORD || '').trim()
const url = fileEnv.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const anonKey = fileEnv.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!email || !password) {
  console.error('FAIL: TEST_TEACHER_EMAIL / TEST_TEACHER_PASSWORD 가 필요합니다.')
  console.error('예: node scripts/setup-teacher-env.mjs --email you@example.com --password secret')
  process.exit(1)
}

if (!url || !anonKey) {
  console.error('FAIL: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 .env.local에 필요합니다.')
  process.exit(1)
}

const sb = createClient(url, anonKey)
const { data, error } = await sb.auth.signInWithPassword({ email, password })

if (error) {
  console.error('FAIL: 로그인 검증 실패 —', error.message)
  process.exit(1)
}

await sb.auth.signOut({ scope: 'local' })

const current = loadEnvFile(envPath)
const next = upsertEnvLines(current, {
  TEST_TEACHER_EMAIL: email,
  TEST_TEACHER_PASSWORD: password,
})
writeFileSync(envPath, next, 'utf8')
console.log('OK  .env.local 에 TEST_TEACHER_* 저장 완료 (로그인 검증 통과)')
