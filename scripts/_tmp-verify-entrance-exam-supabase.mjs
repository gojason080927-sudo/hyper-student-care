import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function parseEnv(path) {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
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

const env = parseEnv('.env.local')
const url = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY
const email = env.TEST_TEACHER_EMAIL
const password = env.TEST_TEACHER_PASSWORD

const results = {
  env: {
    url: Boolean(url),
    anonKey: Boolean(anonKey),
    email: Boolean(email),
    password: Boolean(password),
  },
}

const anon = createClient(url, anonKey)
const marker = `EE_VERIFY_${Date.now()}`
const payload = {
  subject: '수학',
  target_grade: '중1',
  question_type: 'multiple_choice',
  stem: marker,
  choices: ['보기1', '보기2', '보기3', '보기4', '보기5'],
  correct_choice: 3,
  explanation: '검증용',
  difficulty: '중',
  evaluation_areas: ['문제 해석 능력', '응용 능력'],
  unit_name: '검증용단원',
}

const anonSelect = await anon.from('entrance_exam_questions').select('id').limit(1)
const anonInsert = await anon
  .from('entrance_exam_questions')
  .insert(payload)
  .select('id')
  .single()
const anonUpdate = await anon
  .from('entrance_exam_questions')
  .update({ stem: `${marker}_u` })
  .eq('id', '00000000-0000-0000-0000-000000000000')
  .select('id')
const anonDelete = await anon
  .from('entrance_exam_questions')
  .delete()
  .eq('id', '00000000-0000-0000-0000-000000000000')
  .select('id')

results.anonSelectDeniedOrEmpty =
  Boolean(anonSelect.error) || (anonSelect.data || []).length === 0
    ? {
        pass: Boolean(anonSelect.error),
        note: anonSelect.error
          ? `denied: ${anonSelect.error.message}`
          : 'no error but empty (table readable?)',
        error: anonSelect.error?.message || null,
        code: anonSelect.error?.code || null,
      }
    : {
        pass: false,
        note: 'anon SELECT unexpectedly returned rows',
        count: anonSelect.data.length,
      }

results.anonInsertDenied = {
  pass: Boolean(anonInsert.error) && !anonInsert.data?.id,
  error: anonInsert.error?.message || null,
  code: anonInsert.error?.code || null,
  leakedId: anonInsert.data?.id || null,
}

results.anonUpdateDenied = {
  pass: Boolean(anonUpdate.error) || !(anonUpdate.data || []).length,
  error: anonUpdate.error?.message || null,
  code: anonUpdate.error?.code || null,
}

results.anonDeleteDenied = {
  pass: Boolean(anonDelete.error) || !(anonDelete.data || []).length,
  error: anonDelete.error?.message || null,
  code: anonDelete.error?.code || null,
}

if (!password) {
  results.authenticated = {
    pass: false,
    blocked: true,
    reason: 'TEST_TEACHER_PASSWORD missing in .env.local — cannot obtain authenticated JWT',
  }
  console.log(JSON.stringify(results, null, 2))
  process.exit(0)
}

const auth = createClient(url, anonKey)
const login = await auth.auth.signInWithPassword({ email, password })
if (login.error || !login.data.session) {
  results.authenticated = {
    pass: false,
    blocked: true,
    reason: `login failed: ${login.error?.message || 'no session'}`,
  }
  console.log(JSON.stringify(results, null, 2))
  process.exit(0)
}

const sb = auth
const created = await sb.from('entrance_exam_questions').insert(payload).select('*').single()
results.insert = {
  pass: !created.error && Boolean(created.data?.id),
  error: created.error?.message || null,
  id: created.data?.id || null,
  areas: created.data?.evaluation_areas || null,
}

const id = created.data?.id
if (!id) {
  results.authenticated = { pass: false, reason: 'insert failed; aborting remaining checks' }
  console.log(JSON.stringify(results, null, 2))
  process.exit(0)
}

const reloaded = await sb.from('entrance_exam_questions').select('*').eq('id', id).single()
results.reload = {
  pass:
    !reloaded.error &&
    reloaded.data?.stem === marker &&
    Array.isArray(reloaded.data?.evaluation_areas) &&
    reloaded.data.evaluation_areas.includes('문제 해석 능력') &&
    reloaded.data.evaluation_areas.includes('응용 능력'),
  areas: reloaded.data?.evaluation_areas || null,
  error: reloaded.error?.message || null,
}

const updatedStem = `${marker}_UPDATED`
const updated = await sb
  .from('entrance_exam_questions')
  .update({ stem: updatedStem, evaluation_areas: ['개념 이해도', '계산 정확도', '문제 해결력'] })
  .eq('id', id)
  .select('*')
  .single()
results.update = {
  pass:
    !updated.error &&
    updated.data?.stem === updatedStem &&
    (updated.data?.evaluation_areas || []).length === 3,
  areas: updated.data?.evaluation_areas || null,
  error: updated.error?.message || null,
}

const afterUpdate = await sb.from('entrance_exam_questions').select('*').eq('id', id).single()
results.multiAreaPersist = {
  pass:
    (afterUpdate.data?.evaluation_areas || []).includes('개념 이해도') &&
    (afterUpdate.data?.evaluation_areas || []).includes('계산 정확도') &&
    (afterUpdate.data?.evaluation_areas || []).includes('문제 해결력'),
  areas: afterUpdate.data?.evaluation_areas || null,
}

// Filter-oriented queries (Supabase-side)
const bySubject = await sb
  .from('entrance_exam_questions')
  .select('id')
  .eq('subject', '수학')
  .eq('id', id)
const byGrade = await sb
  .from('entrance_exam_questions')
  .select('id')
  .eq('target_grade', '중1')
  .eq('id', id)
const byDifficulty = await sb
  .from('entrance_exam_questions')
  .select('id')
  .eq('difficulty', '중')
  .eq('id', id)
const byArea = await sb
  .from('entrance_exam_questions')
  .select('id')
  .contains('evaluation_areas', ['개념 이해도'])
  .eq('id', id)
const byUnit = await sb
  .from('entrance_exam_questions')
  .select('id')
  .ilike('unit_name', '%검증용%')
  .eq('id', id)

results.filters = {
  pass:
    (bySubject.data || []).length === 1 &&
    (byGrade.data || []).length === 1 &&
    (byDifficulty.data || []).length === 1 &&
    (byArea.data || []).length === 1 &&
    (byUnit.data || []).length === 1,
  subject: (bySubject.data || []).length,
  grade: (byGrade.data || []).length,
  difficulty: (byDifficulty.data || []).length,
  area: (byArea.data || []).length,
  unit: (byUnit.data || []).length,
}

const deleted = await sb.from('entrance_exam_questions').delete().eq('id', id).select('id')
const gone = await sb.from('entrance_exam_questions').select('id').eq('id', id)
results.delete = {
  pass: !deleted.error && (deleted.data || []).length === 1 && (gone.data || []).length === 0,
  error: deleted.error?.message || null,
  remaining: (gone.data || []).length,
}

// Ensure no leftover verify rows with this marker
await sb.from('entrance_exam_questions').delete().like('stem', 'EE_VERIFY_%')

results.authenticated = {
  pass:
    results.insert.pass &&
    results.reload.pass &&
    results.update.pass &&
    results.multiAreaPersist.pass &&
    results.filters.pass &&
    results.delete.pass,
}

await auth.auth.signOut()
console.log(JSON.stringify(results, null, 2))
