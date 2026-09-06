/**
 * Production verify: teacher list progress uses actual response counts.
 * Disposable student only — does not modify existing active exam links.
 */
import { createHash, randomBytes } from 'crypto'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

function parseEnvFile(path) {
  const env = {}
  try {
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
  } catch {
    /* optional */
  }
  return env
}

function sqlQuery(sql) {
  writeFileSync('supabase/.temp-career-progress.sql', sql, 'utf8')
  const result = execSync('npx supabase db query --linked --output json -f supabase/.temp-career-progress.sql', {
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

function summaryForStudent(studentId) {
  const rows = sqlQuery(`
    SELECT x
    FROM jsonb_array_elements(public.get_career_assessment_session_summaries()) AS x
    WHERE x->>'student_id' = '${studentId}';
  `)
  const raw = rows[0]?.x
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

const env = { ...parseEnvFile('.env.local'), ...process.env }
const supabaseUrl = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !anonKey) {
  console.error('missing supabase env')
  process.exit(1)
}

const token = randomBytes(32).toString('base64url')
const hash = tokenHash(token)
const accessKey = `career-progress-${randomBytes(8).toString('hex')}`

async function invoke(body, authToken = anonKey) {
  const res = await fetch(`${supabaseUrl}/functions/v1/career-assessment`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  return { status: res.status, json }
}

function assertProgress(label, summary, expectedCount, expectedStatus) {
  if (!summary) throw new Error(`${label}: missing session summary`)
  const count = Number(summary.answered_count)
  if (count !== expectedCount) {
    throw new Error(`${label}: answered_count=${count} expected ${expectedCount}`)
  }
  if (summary.status !== expectedStatus) {
    throw new Error(`${label}: status=${summary.status} expected ${expectedStatus}`)
  }
  console.log(`${label} OK`, { answered_count: count, status: summary.status })
}

const existing = sqlQuery(`
  SELECT s.id, s.student_id, s.status, s.access_token,
    (SELECT count(*)::int FROM public.career_assessment_responses r WHERE r.session_id = s.id) AS answered_count
  FROM public.career_assessment_sessions s
  WHERE s.id = '6401e930-d7d2-4349-9b33-b6a0b1d4d595';
`)
if (existing[0]) {
  const row = existing[0]
  const viaRpc = summaryForStudent(row.student_id)
  if (Number(viaRpc?.answered_count) !== Number(row.answered_count)) {
    throw new Error(
      `existing session RPC mismatch db=${row.answered_count} rpc=${viaRpc?.answered_count}`,
    )
  }
  console.log('EXISTING LINK PRESERVED', {
    status: row.status,
    answered_count: row.answered_count,
    rpc_count: viaRpc.answered_count,
  })
} else {
  console.log('EXISTING LINK not found (ok if already cleaned)')
}

const created = sqlQuery(`
  INSERT INTO public.students (
    name, student_access_key, school, grade, class_name, subjects, teacher, enrollment_date, status
  ) VALUES (
    '__CAREER_PROGRESS_TEST__',
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

  assertProgress('A 0문항', summaryForStudent(studentId), 0, 'not_started')

  const loaded = await invoke({ action: 'load', token })
  if (loaded.status !== 200 || (loaded.json.answers ?? []).length !== 0) {
    throw new Error(`A load failed ${loaded.status} ${JSON.stringify(loaded.json)}`)
  }
  const questions = loaded.json.questions
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)

  const save5 = await invoke({
    action: 'save_answers',
    token,
    answers: questions.slice(0, 5).map((q) => ({ questionId: q.id, answer: 4 })),
  })
  if (save5.status !== 200) throw new Error(`B save5 failed ${JSON.stringify(save5.json)}`)
  if (Number(save5.json.answeredCount) !== 5) {
    throw new Error(`B answeredCount=${save5.json.answeredCount}`)
  }

  const after5 = summaryForStudent(studentId)
  assertProgress('B 5문항', after5, 5, 'in_progress')

  const reload = await invoke({ action: 'load', token })
  if ((reload.json.answers ?? []).length !== 5) {
    throw new Error(`C resume expected 5 got ${reload.json.answers?.length}`)
  }
  console.log('C 재접속 resume OK', { answers: reload.json.answers.length })

  assertProgress('D 강사조회 5문항', summaryForStudent(studentId), 5, 'in_progress')

  const save10 = await invoke({
    action: 'save_answers',
    token,
    answers: questions.slice(5, 10).map((q) => ({ questionId: q.id, answer: 3 })),
  })
  if (save10.status !== 200) throw new Error(`E save10 failed ${JSON.stringify(save10.json)}`)
  assertProgress('E 10문항', summaryForStudent(studentId), 10, 'in_progress')

  const reload10 = await invoke({ action: 'load', token })
  if ((reload10.json.answers ?? []).length !== 10) {
    throw new Error(`F resume expected 10 got ${reload10.json.answers?.length}`)
  }
  console.log('F autosave/resume OK', { answers: reload10.json.answers.length })

  const email = env.TEST_TEACHER_EMAIL
  const password = env.TEST_TEACHER_PASSWORD
  if (email && password) {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const authJson = await authRes.json()
    if (!authJson.access_token) throw new Error('teacher login failed for list action')
    const listed = await invoke({ action: 'list' }, authJson.access_token)
    if (listed.status !== 200) throw new Error(`list failed ${listed.status} ${JSON.stringify(listed.json)}`)
    const sessions = Array.isArray(listed.json.sessions) ? listed.json.sessions : []
    const mine = sessions.find((s) => s.student_id === studentId)
    if (!mine || Number(mine.answered_count) !== 10) {
      throw new Error(`list action missing 10/88 row: ${JSON.stringify(mine)}`)
    }
    console.log('LIST ACTION OK', { answered_count: mine.answered_count, status: mine.status })
  } else {
    console.log('LIST ACTION skipped (no TEST_TEACHER_*) — RPC path already verified')
  }
} finally {
  sqlQuery(`
    DELETE FROM public.students WHERE id = '${studentId}';
  `)
  console.log('test student removed')
}
