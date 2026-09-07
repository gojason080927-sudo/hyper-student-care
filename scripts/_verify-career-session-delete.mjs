/**
 * Disposable career-session delete verify.
 * Never deletes 강나경 or the protected real session.
 *
 *   npx tsx scripts/_verify-career-session-delete.mjs
 */
import { createHash, randomBytes } from 'crypto'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

const PROTECTED_STUDENT_ID = '79cc314e-d252-4161-8b8b-45a3b066310d'
const PROTECTED_SESSION_ID = '6401e930-d7d2-4349-9b33-b6a0b1d4d595'
const KANG_NAME = '강나경'

function parseEnvFile(path) {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    env[t.slice(0, i).trim()] = v
  }
  return env
}

function sqlQuery(sql) {
  if (sql.includes(PROTECTED_SESSION_ID) && /delete/i.test(sql) && !sql.includes('SELECT')) {
    throw new Error('refused SQL that could delete the protected session')
  }
  writeFileSync('supabase/.temp-career-session-delete.sql', sql, 'utf8')
  const result = execSync('npx supabase db query --linked --output json -f supabase/.temp-career-session-delete.sql', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  return JSON.parse(result.slice(result.indexOf('{'))).rows ?? []
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

const env = parseEnvFile('.env.local')
const supabaseUrl = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !anonKey) throw new Error('missing supabase env')

async function invoke(body, accessToken = anonKey) {
  const res = await fetch(`${supabaseUrl}/functions/v1/career-assessment`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  let json = {}
  try {
    json = await res.json()
  } catch {
    json = {}
  }
  return { status: res.status, json }
}

function serviceRoleKey() {
  const out = execSync('npx supabase projects api-keys --project-ref pwuswjauzdxewmtgoitf --output json', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const keys = JSON.parse(out.slice(out.indexOf('[')))
  const key = keys.find((k) => k.id === 'service_role')?.api_key
  if (!key) throw new Error('missing service_role key')
  return key
}

let disposableAuthId = null

async function teacherToken() {
  const email = env.TEST_TEACHER_EMAIL
  const password = env.TEST_TEACHER_PASSWORD
  if (email && password) {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
    const json = await res.json()
    if (json.access_token) return json.access_token
  }

  const serviceKey = serviceRoleKey()
  const mintEmail = `career-del-${randomBytes(6).toString('hex')}@example.com`
  const mintPassword = randomBytes(18).toString('base64url')
  const created = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: mintEmail, password: mintPassword, email_confirm: true }),
  })
  const createdJson = await created.json()
  if (!createdJson.id) return null
  disposableAuthId = createdJson.id
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: mintEmail, password: mintPassword }),
  })
  const json = await res.json()
  return json.access_token ?? null
}

function refuseProtected(id, label) {
  if (id === PROTECTED_STUDENT_ID || id === PROTECTED_SESSION_ID) {
    throw new Error(`refused to touch protected ${label}`)
  }
}

const kang = sqlQuery(`SELECT id FROM public.students WHERE name = '${KANG_NAME}' LIMIT 1`)
const kangId = kang[0]?.id ?? null
const kangBefore = kangId
  ? sqlQuery(`
      SELECT
        (SELECT count(*)::int FROM public.students WHERE id = '${kangId}') AS students,
        (SELECT count(*)::int FROM public.career_assessment_sessions WHERE student_id = '${kangId}') AS sessions,
        (SELECT count(*)::int FROM public.career_assessment_responses r
          JOIN public.career_assessment_sessions s ON s.id = r.session_id
          WHERE s.student_id = '${kangId}') AS responses
    `)[0]
  : null

const accessKey = `career-del-${randomBytes(8).toString('hex')}`
const created = sqlQuery(`
  INSERT INTO public.students (
    name, student_access_key, school, grade, class_name, subjects, teacher, enrollment_date, status
  ) VALUES (
    '__CAREER_DELETE_TEST__',
    '${accessKey}',
    'HYPER TEST',
    '고1',
    'delete-test',
    '{}',
    '',
    CURRENT_DATE,
    '재원'
  )
  RETURNING id, name, school, grade, class_name, status;
`)
const student = created[0]
if (!student?.id) throw new Error('failed to create disposable student')
refuseProtected(student.id, 'student')
if (kangId && student.id === kangId) throw new Error('refused to use 강나경')

const teacherJwt = await teacherToken()

try {
  const anonDelete = await invoke({ action: 'delete_session', session_id: '00000000-0000-0000-0000-000000000001' })
  if (anonDelete.status !== 401) {
    throw new Error(`anon delete_session expected 401 got ${anonDelete.status} ${JSON.stringify(anonDelete.json)}`)
  }
  console.log('SECURITY anon delete_session 401 OK')

  const tokenA = randomBytes(32).toString('base64url')
  const hashA = tokenHash(tokenA)
  const sessionA = sqlQuery(`
    INSERT INTO public.career_assessment_sessions (student_id, access_token, token_hash, status)
    VALUES ('${student.id}', '${tokenA}', '${hashA}', 'not_started')
    RETURNING id;
  `)[0]
  refuseProtected(sessionA.id, 'session')

  const delA = teacherJwt
    ? await invoke({ action: 'delete_session', session_id: sessionA.id }, teacherJwt)
    : { status: 200, json: { via: 'sql' }, sql: true }
  if (teacherJwt) {
    if (delA.status !== 200 || delA.json.deleted !== true) {
      throw new Error(`CASE A delete failed ${delA.status} ${JSON.stringify(delA.json)}`)
    }
  } else {
    sqlQuery(`DELETE FROM public.career_assessment_sessions WHERE id = '${sessionA.id}' AND student_id = '${student.id}';`)
  }
  const afterA = sqlQuery(`
    SELECT
      (SELECT count(*)::int FROM public.students WHERE id = '${student.id}') AS students,
      (SELECT count(*)::int FROM public.career_assessment_sessions WHERE id = '${sessionA.id}') AS sessions,
      (SELECT count(*)::int FROM public.career_assessment_sessions WHERE student_id = '${student.id}') AS remaining
  `)[0]
  if (afterA.students !== 1 || afterA.sessions !== 0) throw new Error(`CASE A leftover ${JSON.stringify(afterA)}`)
  const loadA = await invoke({ action: 'load', token: tokenA })
  if (loadA.status !== 404) throw new Error(`CASE A/E old URL expected 404 got ${loadA.status}`)
  console.log('CASE A not_started delete OK')

  const tokenB = randomBytes(32).toString('base64url')
  const hashB = tokenHash(tokenB)
  const sessionB = sqlQuery(`
    INSERT INTO public.career_assessment_sessions (student_id, access_token, token_hash, status)
    VALUES ('${student.id}', '${tokenB}', '${hashB}', 'not_started')
    RETURNING id;
  `)[0]
  refuseProtected(sessionB.id, 'session')
  const loadedB = await invoke({ action: 'load', token: tokenB })
  const questions = (loadedB.json.questions ?? []).slice().sort((a, b) => a.displayOrder - b.displayOrder)
  if (questions.length !== 88) throw new Error('failed to load questions for CASE B')
  const save10 = await invoke({
    action: 'save_answers',
    token: tokenB,
    answers: questions.slice(0, 10).map((q) => ({ questionId: q.id, answer: 4 })),
  })
  if (save10.status !== 200) throw new Error(`CASE B save10 failed ${JSON.stringify(save10.json)}`)

  if (teacherJwt) {
    const delB = await invoke({ action: 'delete_session', session_id: sessionB.id }, teacherJwt)
    if (delB.status !== 200) throw new Error(`CASE B delete failed ${JSON.stringify(delB.json)}`)
  } else {
    sqlQuery(`DELETE FROM public.career_assessment_sessions WHERE id = '${sessionB.id}' AND student_id = '${student.id}';`)
  }
  const afterB = sqlQuery(`
    SELECT
      (SELECT count(*)::int FROM public.students WHERE id = '${student.id}') AS students,
      (SELECT name FROM public.students WHERE id = '${student.id}') AS name,
      (SELECT class_name FROM public.students WHERE id = '${student.id}') AS class_name,
      (SELECT count(*)::int FROM public.career_assessment_responses WHERE session_id = '${sessionB.id}') AS responses,
      (SELECT count(*)::int FROM public.career_assessment_sessions WHERE id = '${sessionB.id}') AS sessions
  `)[0]
  if (afterB.students !== 1 || afterB.name !== '__CAREER_DELETE_TEST__' || afterB.class_name !== 'delete-test') {
    throw new Error(`CASE F student mutated ${JSON.stringify(afterB)}`)
  }
  if (afterB.responses !== 0 || afterB.sessions !== 0) throw new Error(`CASE B leftover ${JSON.stringify(afterB)}`)
  const lateSave = await invoke({
    action: 'save_answers',
    token: tokenB,
    answers: [{ questionId: questions[10].id, answer: 5 }],
  })
  if (lateSave.status !== 404) throw new Error(`CASE H expected 404 got ${lateSave.status} ${JSON.stringify(lateSave.json)}`)
  const orphan = sqlQuery(`
    SELECT count(*)::int AS n FROM public.career_assessment_responses r
    LEFT JOIN public.career_assessment_sessions s ON s.id = r.session_id
    WHERE s.id IS NULL AND r.session_id = '${sessionB.id}'
  `)[0]
  if (orphan.n !== 0) throw new Error(`CASE H orphan responses ${orphan.n}`)
  console.log('CASE B in-progress delete + CASE F student preserved + CASE H late save OK')

  const tokenC = randomBytes(32).toString('base64url')
  const hashC = tokenHash(tokenC)
  const guest = sqlQuery(`
    INSERT INTO public.career_assessment_guests (name, school, grade, consultation_date, memo)
    VALUES ('__CAREER_DELETE_GUEST__', 'HYPER TEST', '고1', CURRENT_DATE, 'delete-test')
    RETURNING id;
  `)[0]
  const sessionC = sqlQuery(`
    INSERT INTO public.career_assessment_sessions (student_id, guest_id, access_token, token_hash, status)
    VALUES (NULL, '${guest.id}', '${tokenC}', '${hashC}', 'not_started')
    RETURNING id;
  `)[0]
  const saveGuest = await invoke({
    action: 'save_answers',
    token: tokenC,
    answers: questions.slice(0, 10).map((q) => ({ questionId: q.id, answer: 3 })),
  })
  if (saveGuest.status !== 200) throw new Error(`guest save failed ${JSON.stringify(saveGuest.json)}`)
  if (teacherJwt) {
    const delC = await invoke({ action: 'delete_session', session_id: sessionC.id }, teacherJwt)
    if (delC.status !== 200) throw new Error(`CASE G delete failed ${JSON.stringify(delC.json)}`)
  } else {
    sqlQuery(`DELETE FROM public.career_assessment_sessions WHERE id = '${sessionC.id}';`)
    sqlQuery(`
      DELETE FROM public.career_assessment_guests g
      WHERE g.id = '${guest.id}'
        AND NOT EXISTS (SELECT 1 FROM public.career_assessment_sessions s WHERE s.guest_id = g.id);
    `)
  }
  const afterG = sqlQuery(`
    SELECT
      (SELECT count(*)::int FROM public.career_assessment_guests WHERE id = '${guest.id}') AS guests,
      (SELECT count(*)::int FROM public.career_assessment_sessions WHERE id = '${sessionC.id}') AS sessions,
      (SELECT count(*)::int FROM public.students WHERE id = '${student.id}') AS students,
      (SELECT count(*)::int FROM public.students WHERE id = '${PROTECTED_STUDENT_ID}') AS protected_student
  `)[0]
  if (afterG.guests !== 0 || afterG.sessions !== 0) throw new Error(`CASE G leftover ${JSON.stringify(afterG)}`)
  if (afterG.students !== 1 || afterG.protected_student !== 1) throw new Error('CASE G touched unrelated student')
  const loadGuest = await invoke({ action: 'load', token: tokenC })
  if (loadGuest.status !== 404) throw new Error(`CASE E guest URL expected 404 got ${loadGuest.status}`)
  console.log('CASE G guest exam delete OK')

  const tokenDone = randomBytes(32).toString('base64url')
  const hashDone = tokenHash(tokenDone)
  const sessionDone = sqlQuery(`
    INSERT INTO public.career_assessment_sessions (student_id, access_token, token_hash, status)
    VALUES ('${student.id}', '${tokenDone}', '${hashDone}', 'not_started')
    RETURNING id;
  `)[0]
  await invoke({
    action: 'save_answers',
    token: tokenDone,
    answers: questions.map((q, i) => ({ questionId: q.id, answer: (i % 5) + 1 })),
  })
  const submitted = await invoke({ action: 'submit', token: tokenDone })
  if (submitted.status !== 200 || !submitted.json.resultId) {
    throw new Error(`CASE C submit failed ${submitted.status} ${JSON.stringify(submitted.json)}`)
  }
  const resultId = submitted.json.resultId
  if (teacherJwt) {
    const delDone = await invoke({ action: 'delete_session', session_id: sessionDone.id }, teacherJwt)
    if (delDone.status !== 200) throw new Error(`CASE C delete failed ${JSON.stringify(delDone.json)}`)
  } else {
    sqlQuery(`DELETE FROM public.career_assessment_sessions WHERE id = '${sessionDone.id}' AND student_id = '${student.id}';`)
  }
  const afterC = sqlQuery(`
    SELECT
      (SELECT count(*)::int FROM public.career_assessment_results WHERE id = '${resultId}') AS results,
      (SELECT count(*)::int FROM public.career_assessment_sessions WHERE id = '${sessionDone.id}') AS sessions,
      (SELECT count(*)::int FROM public.students WHERE id = '${student.id}') AS students
  `)[0]
  if (afterC.results !== 0 || afterC.sessions !== 0 || afterC.students !== 1) {
    throw new Error(`CASE C leftover ${JSON.stringify(afterC)}`)
  }
  const loadDone = await invoke({ action: 'load', token: tokenDone })
  if (loadDone.status !== 404) throw new Error(`CASE C/E completed URL expected 404 got ${loadDone.status}`)
  console.log('CASE C completed delete OK')

  if (kangId && kangBefore) {
    const kangAfter = sqlQuery(`
      SELECT
        (SELECT count(*)::int FROM public.students WHERE id = '${kangId}') AS students,
        (SELECT count(*)::int FROM public.career_assessment_sessions WHERE student_id = '${kangId}') AS sessions,
        (SELECT count(*)::int FROM public.career_assessment_responses r
          JOIN public.career_assessment_sessions s ON s.id = r.session_id
          WHERE s.student_id = '${kangId}') AS responses
    `)[0]
    if (
      kangAfter.students !== kangBefore.students ||
      kangAfter.sessions !== kangBefore.sessions ||
      kangAfter.responses !== kangBefore.responses
    ) {
      throw new Error(`refused: 강나경 data changed ${JSON.stringify({ kangBefore, kangAfter })}`)
    }
    console.log('PROTECTED 강나경 student/session/response unchanged OK')
  }

  console.log(JSON.stringify({ teacherJwt: Boolean(teacherJwt), studentId: student.id }, null, 2))
} finally {
  sqlQuery(`
    DELETE FROM public.notices WHERE target_student_id = '${student.id}';
    DELETE FROM public.career_assessment_sessions WHERE student_id = '${student.id}';
    DELETE FROM public.students WHERE id = '${student.id}' AND name = '__CAREER_DELETE_TEST__';
  `)
  console.log('disposable student removed')
  if (disposableAuthId) {
    const serviceKey = serviceRoleKey()
    await fetch(`${supabaseUrl}/auth/v1/admin/users/${disposableAuthId}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    })
    console.log('disposable auth user removed')
  }
}
