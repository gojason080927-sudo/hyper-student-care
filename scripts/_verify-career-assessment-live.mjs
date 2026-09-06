/**
 * Live TEST A–E against production edge function + DB.
 * Creates a disposable student and removes it afterwards.
 */
import { createHash, randomBytes } from 'crypto'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

function parseEnvFile(path) {
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

function sqlQuery(sql) {
  writeFileSync('supabase/.temp-career-test.sql', sql, 'utf8')
  const result = execSync('npx supabase db query --linked --output json -f supabase/.temp-career-test.sql', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const start = result.indexOf('{')
  const parsed = JSON.parse(result.slice(start))
  return parsed.rows ?? []
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

const env = parseEnvFile('.env.local')
const supabaseUrl = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !anonKey) {
  console.error('missing supabase env')
  process.exit(1)
}

const token = randomBytes(32).toString('base64url')
const hash = tokenHash(token)
const accessKey = `career-test-${randomBytes(8).toString('hex')}`

async function invoke(body) {
  const res = await fetch(`${supabaseUrl}/functions/v1/career-assessment`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  return { status: res.status, json }
}

const created = sqlQuery(`
  INSERT INTO public.students (
    name, student_access_key, school, grade, class_name, subjects, teacher, enrollment_date, status
  ) VALUES (
    '__CAREER_TEST_DO_NOT_USE__',
    '${accessKey}',
    'HYPER TEST',
    '고1',
    '',
    '{}',
    '',
    CURRENT_DATE,
    '재원'
  )
  RETURNING id;
`)
const studentId = created[0]?.id
if (!studentId) throw new Error('failed to create test student')

try {
  sqlQuery(`
    INSERT INTO public.career_assessment_sessions (student_id, access_token, token_hash, status)
    VALUES ('${studentId}', '${token}', '${hash}', 'not_started');
  `)

  const invalid = await invoke({ action: 'load', token: 'not-a-real-token' })
  if (invalid.status !== 404) throw new Error(`TEST A invalid token expected 404 got ${invalid.status}`)

  const loaded = await invoke({ action: 'load', token })
  if (loaded.status !== 200 || !loaded.json.questions || loaded.json.questions.length !== 88) {
    throw new Error(`TEST A load failed ${loaded.status} ${JSON.stringify(loaded.json)}`)
  }
  console.log('TEST A OK')

  const questions = loaded.json.questions
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)

  const save10 = await invoke({
    action: 'save_answers',
    token,
    answers: questions.slice(0, 10).map((q) => ({ questionId: q.id, answer: 4 })),
  })
  if (save10.status !== 200) throw new Error(`save10 failed ${JSON.stringify(save10.json)}`)

  const reload = await invoke({ action: 'load', token })
  if ((reload.json.answers ?? []).length !== 10) {
    throw new Error(`TEST B expected 10 answers got ${reload.json.answers?.length}`)
  }
  console.log('TEST B OK')

  const save87 = await invoke({
    action: 'save_answers',
    token,
    answers: questions.slice(10, 87).map((q) => ({ questionId: q.id, answer: 3 })),
  })
  if (save87.status !== 200) throw new Error(`save87 failed`)

  const submit87 = await invoke({ action: 'submit', token })
  if (submit87.status !== 400 || submit87.json.error !== 'incomplete_answers') {
    throw new Error(`TEST C expected incomplete, got ${submit87.status} ${JSON.stringify(submit87.json)}`)
  }
  console.log('TEST C OK')

  const save88 = await invoke({
    action: 'save_answers',
    token,
    answers: [{ questionId: questions[87].id, answer: 5 }],
  })
  if (save88.status !== 200) throw new Error(`save88 failed`)

  const submit1 = await invoke({ action: 'submit', token })
  if (submit1.status !== 200 || !submit1.json.resultId) {
    throw new Error(`TEST D submit failed ${submit1.status} ${JSON.stringify(submit1.json)}`)
  }
  const resultId = submit1.json.resultId

  const submit2 = await invoke({ action: 'submit', token })
  const secondId = submit2.json.resultId ?? submit2.json.error
  if (submit2.status !== 200 && submit2.status !== 409) {
    throw new Error(`TEST E unexpected ${submit2.status} ${JSON.stringify(submit2.json)}`)
  }

  const counts = sqlQuery(`
    SELECT
      (SELECT count(*)::int FROM public.career_assessment_results WHERE student_id = '${studentId}') AS results,
      (SELECT count(*)::int FROM public.notices WHERE career_assessment_result_id = '${resultId}') AS notices,
      (SELECT count(*)::int FROM public.career_assessment_result_notices n
         JOIN public.career_assessment_sessions s ON s.id = n.session_id
        WHERE s.student_id = '${studentId}') AS links;
  `)
  if (counts[0].results !== 1) throw new Error(`TEST D/E results=${counts[0].results}`)
  if (counts[0].notices !== 1) throw new Error(`TEST E notices=${counts[0].notices}`)
  if (counts[0].links !== 1) throw new Error(`TEST E links=${counts[0].links}`)
  if (submit2.status === 200 && submit2.json.resultId && submit2.json.resultId !== resultId) {
    throw new Error('TEST E created a different result')
  }
  console.log('TEST D OK')
  console.log('TEST E OK', { resultId, second: secondId, counts: counts[0] })

  const parentHit = sqlQuery(`
    SELECT public.get_parent_career_assessment_result('${accessKey}', '${resultId}') IS NOT NULL AS ok;
  `)
  if (!parentHit[0]?.ok) throw new Error('TEST F/G parent RPC missed own result')
  console.log('TEST F/G OK')

  const parentMiss = sqlQuery(`
    SELECT public.get_parent_career_assessment_result('wrong-key-not-real', '${resultId}') IS NULL AS ok;
  `)
  if (!parentMiss[0]?.ok) throw new Error('TEST H parent RPC did not block other key')
  console.log('TEST H OK')
} finally {
  sqlQuery(`
    DELETE FROM public.notices WHERE target_student_id = '${studentId}';
    DELETE FROM public.students WHERE id = '${studentId}';
  `)
  console.log('test student removed')
}
