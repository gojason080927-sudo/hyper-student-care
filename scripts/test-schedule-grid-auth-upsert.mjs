/**
 * authenticated teacher JWT로 class_schedule_grids upsert 테스트
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function parseEnv(path) {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[t.slice(0, i).trim()] = v
  }
  return env
}

const env = parseEnv('.env.local')
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const email = env.TEST_TEACHER_EMAIL
const password = env.TEST_TEACHER_PASSWORD

if (!email || !password) {
  console.error('TEST_TEACHER_EMAIL / TEST_TEACHER_PASSWORD required in .env.local')
  process.exit(1)
}

const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email, password })
if (authErr) {
  console.error('auth failed:', authErr.message)
  process.exit(1)
}
console.log('auth ok role=', auth.session?.user?.role ?? 'unknown')

const row = {
  grade: '고1',
  class_name: '고1 수학A',
  template_type: 'mon-wed-fri-sat',
  time_labels: ['14:00 ~ 16:00'],
  cells: { '0:월': '공수2 개념', '0:수': '공수2 유형', '0:금': 'Daily Test & Clinic\n미완료 과제 수행' },
  is_active: true,
  updated_at: new Date().toISOString(),
}

const { data, error } = await sb
  .from('class_schedule_grids')
  .upsert(row, { onConflict: 'grade,class_name' })
  .select('id,grade,class_name,template_type')

if (error) {
  console.error('upsert FAIL:', error.code, error.message)
  process.exit(1)
}

console.log('upsert OK:', data)

const { data: rows, error: selErr } = await sb
  .from('class_schedule_grids')
  .select('grade,class_name,template_type,time_labels,cells,updated_at')
  .eq('grade', '고1')
  .eq('class_name', '고1 수학A')

if (selErr) console.error('select FAIL:', selErr.message)
else console.log('select OK:', JSON.stringify(rows, null, 2))

await sb.auth.signOut()
