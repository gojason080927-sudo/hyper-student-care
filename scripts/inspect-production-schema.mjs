import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function parseEnvFile(path) {
  const raw = readFileSync(path, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    env[t.slice(0, i).trim()] = v
  }
  return env
}

function projectRef(url) {
  return url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? 'unknown'
}

async function inspect(label, cred) {
  const sb = createClient(cred.VITE_SUPABASE_URL, cred.VITE_SUPABASE_ANON_KEY)
  const sample = await sb.from('class_today_report_common').select('*').limit(1)
  const cols = sample.data?.[0] ? Object.keys(sample.data[0]) : []

  const withoutTextbook = await sb
    .from('class_today_report_common')
    .upsert(
      {
        grade: '__SCHEMA__',
        class_name: '__SCHEMA__',
        report_date: '2099-12-31',
        subject: '수학',
        slot_number: 1,
        current_progress: 'probe',
        current_page: 1,
        total_page: 10,
        previous_assignment: 'a',
        today_assignment: 'b',
      },
      { onConflict: 'grade,class_name,report_date,subject,slot_number' },
    )

  const withTextbook = await sb
    .from('class_today_report_common')
    .upsert(
      {
        grade: '__SCHEMA2__',
        class_name: '__SCHEMA2__',
        report_date: '2099-12-31',
        subject: '수학',
        slot_number: 1,
        textbook_name: 'probe',
        current_progress: '',
        current_page: 0,
        total_page: 0,
        previous_assignment: '',
        today_assignment: '',
      },
      { onConflict: 'grade,class_name,report_date,subject,slot_number' },
    )

  console.log(
    JSON.stringify(
      {
        label,
        projectRef: projectRef(cred.VITE_SUPABASE_URL),
        columns: cols,
        withoutTextbookError: withoutTextbook.error?.message ?? null,
        withoutTextbookCode: withoutTextbook.error?.code ?? null,
        withTextbookError: withTextbook.error?.message ?? null,
        withTextbookCode: withTextbook.error?.code ?? null,
      },
      null,
      2,
    ),
  )

  await sb
    .from('class_today_report_common')
    .delete()
    .match({
      grade: '__SCHEMA__',
      class_name: '__SCHEMA__',
      report_date: '2099-12-31',
      subject: '수학',
      slot_number: 1,
    })
  if (!withTextbook.error) {
    await sb
      .from('class_today_report_common')
      .delete()
      .match({
        grade: '__SCHEMA2__',
        class_name: '__SCHEMA2__',
        report_date: '2099-12-31',
        subject: '수학',
        slot_number: 1,
      })
  }
}

const local = parseEnvFile('.env.local')
const vercel = parseEnvFile('.env.vercel.production')

console.log('=== PROJECT REF COMPARISON ===')
console.log('local .env.local ref:', projectRef(local.VITE_SUPABASE_URL))
console.log('vercel production ref:', projectRef(vercel.VITE_SUPABASE_URL))
console.log('refs match:', projectRef(local.VITE_SUPABASE_URL) === projectRef(vercel.VITE_SUPABASE_URL))

await inspect('local-env', local)
await inspect('vercel-production-env', vercel)
