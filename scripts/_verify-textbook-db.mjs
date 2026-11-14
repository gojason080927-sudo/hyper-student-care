/**
 * Parent RPC로 교재명 source를 직접 확인 (localStorage 아님)
 * node --env-file=.env.local scripts/_verify-textbook-db.mjs <accessKey> <date>
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const anon = process.env.VITE_SUPABASE_ANON_KEY
const accessKey = process.argv[2]
const date = process.argv[3] || new Date().toISOString().slice(0, 10)

if (!url || !anon || !accessKey) {
  console.error('usage: node --env-file=.env.local scripts/_verify-textbook-db.mjs <accessKey> [date]')
  process.exit(1)
}

const supabase = createClient(url, anon)
const { data, error } = await supabase.rpc('get_parent_today_report', {
  p_access_key: accessKey,
  p_date: date,
})
if (error) {
  console.error('RPC error', error)
  process.exit(1)
}

const slots = data?.student_textbook_slots ?? []
const progress = data?.progress ?? []
const common = data?.class_today_report_common ?? []

console.log('slots', slots.map((s) => ({
  subject: s.subject,
  slot: s.slot_number,
  name: s.textbook_name,
  updated: s.updated_at,
})))
console.log('progress', progress.map((p) => ({
  subject: p.subject,
  slot: p.slot_number,
  name: p.textbook_name,
  date: p.last_study_date,
})))
console.log('common', common.map((c) => ({
  className: c.class_name,
  subject: c.subject,
  slot: c.slot_number,
  name: c.textbook_name,
  date: c.report_date,
})))
