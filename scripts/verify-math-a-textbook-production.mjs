/**
 * 고1 수학A 실제 Production 데이터 slot 1·2·3 교재명 검증
 * node scripts/verify-math-a-textbook-production.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function parseEnv(path) {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

const env = parseEnv('.env.local')
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const ref = env.VITE_SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1] ?? '?'
const date = '2026-08-01'
const grade = '고1'
const classNames = ['고1 수학A', '고1 영수A']
const mathBClasses = ['고1 수학B', '고1 영수B']

console.log(`\n=== 고1 수학A textbook production check (ref: ${ref}) ===\n`)

// Students in 고1 수학A
const students = await sb
  .from('students')
  .select('id,name,class_name')
  .eq('grade', grade)
  .eq('class_name', '고1 수학A')
console.log('고1 수학A students:', students.data?.map((s) => s.name).join(', ') ?? students.error?.message)

// Common rows for all 3 slots
for (const className of classNames) {
  console.log(`\n--- ${className} common (${date}) ---`)
  const rows = await sb
    .from('class_today_report_common')
    .select('slot_number,textbook_name,previous_assignment,today_assignment')
    .match({ grade, class_name: className, report_date: date, subject: '수학' })
    .order('slot_number')
  if (rows.error) {
    console.log('ERROR:', rows.error.message)
    continue
  }
  for (const row of rows.data ?? []) {
    const tb = row.textbook_name?.trim() || '(empty)'
    console.log(
      `slot ${row.slot_number}: textbook="${tb}" prev="${row.previous_assignment?.trim() ?? ''}"`,
    )
  }
}

// Legacy student_textbook_slots for math A peers
const peerIds = students.data?.map((s) => s.id) ?? []
if (peerIds.length > 0) {
  console.log('\n--- student_textbook_slots (고1 수학A) ---')
  const slots = await sb
    .from('student_textbook_slots')
    .select('student_id,slot_number,textbook_name,subject')
    .in('student_id', peerIds)
    .eq('subject', '수학')
    .order('slot_number')
  for (const row of slots.data ?? []) {
    const student = students.data?.find((s) => s.id === row.student_id)
    console.log(
      `${student?.name ?? row.student_id} slot ${row.slot_number}: "${row.textbook_name?.trim() ?? ''}"`,
    )
  }
}

// Math B should NOT have math A textbook names
console.log('\n--- Math B isolation check ---')
for (const className of mathBClasses) {
  const rows = await sb
    .from('class_today_report_common')
    .select('slot_number,textbook_name')
    .match({ grade, class_name: className, report_date: date, subject: '수학' })
  const names = (rows.data ?? [])
    .map((r) => r.textbook_name?.trim())
    .filter(Boolean)
  console.log(`${className}: ${names.length ? names.join(', ') : '(no textbook names)'}`)
}

console.log('\nDone')
