import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
const env = {}
for (const line of raw.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const i = t.indexOf('=')
  if (i === -1) continue
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}

const C = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
const key = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => C[b % C.length]).join('')
const id = crypto.randomUUID()
const now = new Date().toISOString()
const today = now.slice(0, 10)
const name = 'E2E링크검증학생'
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const ins = await sb
  .from('students')
  .insert({
    id,
    name,
    student_access_key: key,
    access_key_active: true,
    school: 'E2E중',
    grade: '중2',
    student_phone: '',
    parent_phone: '',
    class_name: 'E2E반',
    subjects: ['수학'],
    teacher: 'E2E강사',
    enrollment_date: today,
    status: '재원',
    memo: 'browser e2e',
    created_at: now,
    updated_at: now,
  })
  .select('id,name,student_access_key')
  .single()

if (ins.error) {
  console.error(ins.error.message)
  process.exit(1)
}

console.log(
  JSON.stringify({
    id: ins.data.id,
    name: ins.data.name,
    key: ins.data.student_access_key,
    url: `http://localhost:5174/care/${ins.data.student_access_key}`,
  }),
)
