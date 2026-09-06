/**
 * Production guest flow. Does not modify the protected 5/88 real session
 * or the enrolled test student records except optional link TO that test student.
 */
import { createHash, randomBytes } from 'crypto'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

const PROTECTED_SESSION = '6401e930-d7d2-4349-9b33-b6a0b1d4d595'
const LINK_STUDENT = '3fcd2905-075a-4a5c-8035-4a44f89a1e93'

const ANSWER_BY_NUMBER = {
  1: 4, 2: 4, 3: 3, 4: 4, 5: 4, 6: 5, 7: 5, 8: 5, 9: 4, 10: 5,
  11: 2, 12: 3, 13: 2, 14: 3, 15: 2, 16: 5, 17: 4, 18: 5, 19: 5, 20: 4,
  21: 3, 22: 3, 23: 4, 24: 3, 25: 3, 26: 3, 27: 4, 28: 3, 29: 3, 30: 4,
  31: 4, 32: 4, 33: 4, 34: 4, 35: 5, 36: 5, 37: 3, 38: 3, 39: 3, 40: 3,
  41: 5, 42: 4, 43: 5, 44: 5, 45: 4, 46: 4, 47: 3, 48: 3, 49: 4, 50: 5,
  51: 3, 52: 5, 53: 3, 54: 3, 55: 3, 56: 3, 57: 3, 58: 5, 59: 3, 60: 5,
  61: 5, 62: 3, 63: 4, 64: 3, 65: 3, 66: 3, 67: 5, 68: 4, 69: 4, 70: 4,
  71: 3, 72: 4, 73: 4, 74: 5, 75: 4, 76: 3, 77: 5, 78: 4, 79: 4, 80: 4,
  81: 4, 82: 5, 83: 4, 84: 5, 85: 4, 86: 3, 87: 4, 88: 3,
}

function parseEnv(path) {
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
  if (sql.includes('DELETE') && sql.includes(PROTECTED_SESSION)) {
    throw new Error('refused SQL that deletes the protected session')
  }
  writeFileSync('supabase/.temp-career-guest.sql', sql, 'utf8')
  const result = execSync('npx supabase db query --linked --output json -f supabase/.temp-career-guest.sql', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  return JSON.parse(result.slice(result.indexOf('{'))).rows ?? []
}

const env = parseEnv('.env.local')
const token = randomBytes(32).toString('base64url')
const hash = createHash('sha256').update(token).digest('hex')

async function invoke(body) {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/career-assessment`, {
    method: 'POST',
    headers: {
      apikey: env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  return { status: res.status, json: await res.json() }
}

const protectedCount = sqlQuery(`
  SELECT count(*)::int AS n
  FROM public.career_assessment_responses
  WHERE session_id = '${PROTECTED_SESSION}';
`)
if (protectedCount[0].n !== 5) throw new Error(`protected session drifted to ${protectedCount[0].n}`)

const guest = sqlQuery(`
  INSERT INTO public.career_assessment_guests (name, school, grade, consultation_date, memo)
  VALUES ('상담생 테스트', 'HYPER TEST', '고1', CURRENT_DATE, '상담생 기능 검증')
  RETURNING id, name;
`)[0]

sqlQuery(`
  INSERT INTO public.career_assessment_sessions (student_id, guest_id, access_token, token_hash, status)
  VALUES (NULL, '${guest.id}', '${token}', '${hash}', 'not_started');
`)

const loaded = await invoke({ action: 'load', token })
if (loaded.status !== 200 || loaded.json.student?.name !== '상담생 테스트') {
  throw new Error(`guest load failed ${loaded.status} ${JSON.stringify(loaded.json)}`)
}
const questions = loaded.json.questions.slice().sort((a, b) => a.questionNumber - b.questionNumber)
const first5 = await invoke({
  action: 'save_answers',
  token,
  answers: questions.slice(0, 5).map((q) => ({ questionId: q.id, answer: ANSWER_BY_NUMBER[q.questionNumber] })),
})
if (first5.status !== 200) throw new Error(`save5 failed ${JSON.stringify(first5.json)}`)
const resume = await invoke({ action: 'load', token })
if ((resume.json.answers ?? []).length !== 5) throw new Error('guest resume lost answers')

for (let i = 5; i < 88; i += 8) {
  const chunk = questions.slice(i, i + 8).map((q) => ({
    questionId: q.id,
    answer: ANSWER_BY_NUMBER[q.questionNumber],
  }))
  const saved = await invoke({ action: 'save_answers', token, answers: chunk })
  if (saved.status !== 200) throw new Error(`save chunk failed ${JSON.stringify(saved.json)}`)
}

const submit1 = await invoke({ action: 'submit', token })
if (submit1.status !== 200 || !submit1.json.resultId) {
  throw new Error(`guest submit failed ${submit1.status} ${JSON.stringify(submit1.json)}`)
}
const submit2 = await invoke({ action: 'submit', token })
if (submit2.status !== 200 && submit2.status !== 409) {
  throw new Error(`guest duplicate submit ${submit2.status}`)
}

const counts = sqlQuery(`
  SELECT
    (SELECT count(*)::int FROM public.career_assessment_responses r
      JOIN public.career_assessment_sessions s ON s.id = r.session_id
     WHERE s.guest_id = '${guest.id}') AS responses,
    (SELECT status FROM public.career_assessment_sessions WHERE guest_id = '${guest.id}') AS status,
    (SELECT count(*)::int FROM public.career_assessment_results WHERE guest_id = '${guest.id}') AS results,
    (SELECT count(*)::int FROM public.notices n
      JOIN public.career_assessment_results res ON res.id = n.career_assessment_result_id
     WHERE res.guest_id = '${guest.id}') AS notices,
    (SELECT count(*)::int FROM public.career_assessment_responses WHERE session_id = '${PROTECTED_SESSION}') AS protected_n
`)

sqlQuery(`
  UPDATE public.career_assessment_guests
  SET linked_student_id = '${LINK_STUDENT}'
  WHERE id = '${guest.id}';
`)
const linked = sqlQuery(`
  SELECT linked_student_id FROM public.career_assessment_guests WHERE id = '${guest.id}';
`)

const list = sqlQuery(`
  SELECT x
  FROM jsonb_array_elements(public.get_career_assessment_session_summaries()) AS x
  WHERE x->>'guest_id' = '${guest.id}';
`)
const row = typeof list[0]?.x === 'string' ? JSON.parse(list[0].x) : list[0]?.x

if (counts[0].responses !== 88) throw new Error(`responses=${counts[0].responses}`)
if (counts[0].status !== 'completed') throw new Error(`status=${counts[0].status}`)
if (counts[0].results !== 1) throw new Error(`results=${counts[0].results}`)
if (counts[0].notices !== 0) throw new Error(`guest notices=${counts[0].notices}`)
if (counts[0].protected_n !== 5) throw new Error('protected session changed')
if (linked[0].linked_student_id !== LINK_STUDENT) throw new Error('link failed')
if (Number(row?.answered_count) !== 88 || row?.status !== 'completed') {
  throw new Error(`list row wrong ${JSON.stringify(row)}`)
}

const otherToken = await invoke({ action: 'load', token: 'not-a-real-token' })
if (otherToken.status !== 404) throw new Error('other token not blocked')

writeFileSync(
  'supabase/.temp-career-guest-report.json',
  JSON.stringify(
    {
      guestId: guest.id,
      resultId: submit1.json.resultId,
      counts: counts[0],
      linkedStudentId: linked[0].linked_student_id,
      listStatus: row.status,
    },
    null,
    2,
  ),
  'utf8',
)
console.log(JSON.stringify({
  guestId: guest.id,
  resultId: submit1.json.resultId,
  counts: counts[0],
  linked: linked[0].linked_student_id,
  list: { status: row.status, answered_count: row.answered_count },
}, null, 2))
