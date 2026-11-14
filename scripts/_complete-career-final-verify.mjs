/**
 * Production final verify: one dedicated test student, real save/submit flow.
 * Does NOT modify the existing real in-progress session.
 * Does NOT delete the test student — leave it for teacher review.
 */
import { createHash, randomBytes } from 'crypto'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

const PROTECTED_STUDENT_ID = '79cc314e-d252-4161-8b8b-45a3b066310d'
const PROTECTED_SESSION_ID = '6401e930-d7d2-4349-9b33-b6a0b1d4d595'

const ANSWER_BY_NUMBER = {
  1: 4, 2: 4, 3: 3, 4: 4, 5: 4,
  6: 5, 7: 5, 8: 5, 9: 4, 10: 5,
  11: 2, 12: 3, 13: 2, 14: 3, 15: 2,
  16: 5, 17: 4, 18: 5, 19: 5, 20: 4,
  21: 3, 22: 3, 23: 4, 24: 3, 25: 3,
  26: 3, 27: 4, 28: 3, 29: 3, 30: 4,
  31: 4, 32: 4,
  33: 4, 34: 4,
  35: 5, 36: 5,
  37: 3, 38: 3,
  39: 3, 40: 3,
  41: 5, 42: 4,
  43: 5, 44: 5,
  45: 4, 46: 4,
  47: 3, 48: 3, 49: 4, 50: 5, 51: 3, 52: 5,
  53: 3, 54: 3, 55: 3, 56: 3, 57: 3, 58: 5,
  59: 3, 60: 5, 61: 5, 62: 3, 63: 4, 64: 3,
  65: 3, 66: 3, 67: 5, 68: 4,
  69: 4, 70: 4, 71: 3, 72: 4, 73: 4, 74: 5, 75: 4, 76: 3,
  77: 5, 78: 4, 79: 4, 80: 4, 81: 4, 82: 5, 83: 4, 84: 5,
  85: 4, 86: 3, 87: 4, 88: 3,
}

function parseEnvFile(path) {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
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
  if (sql.includes(PROTECTED_STUDENT_ID) || sql.includes(PROTECTED_SESSION_ID)) {
    throw new Error('refused SQL that mentions the protected real student/session')
  }
  writeFileSync('supabase/.temp-career-final.sql', sql, 'utf8')
  const result = execSync('npx supabase db query --linked --output json -f supabase/.temp-career-final.sql', {
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

function assertDistinctAnswers() {
  const values = Object.values(ANSWER_BY_NUMBER)
  if (values.length !== 88) throw new Error(`expected 88 mapped answers, got ${values.length}`)
  const unique = new Set(values)
  if (unique.size < 3) throw new Error('answers are not diverse enough')
  if (values.every((v) => v === 5)) throw new Error('all-5 answers forbidden')
}

assertDistinctAnswers()

const env = parseEnvFile('.env.local')
const supabaseUrl = env.VITE_SUPABASE_URL
const anonKey = env.VITE_SUPABASE_ANON_KEY
if (!supabaseUrl || !anonKey) throw new Error('missing supabase env')

const accessKey = randomBytes(24).toString('base64url').replace(/[^A-Za-z0-9]/g, 'A').slice(0, 32)
const token = randomBytes(32).toString('base64url')
const hash = tokenHash(token)

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
    name, student_access_key, school, grade, class_name, subjects, teacher,
    enrollment_date, status, memo, access_key_active
  ) VALUES (
    '진로검사 테스트학생',
    '${accessKey}',
    'HYPER TEST',
    '고1',
    'CAREER-TEST',
    '{}',
    '',
    CURRENT_DATE,
    '재원',
    '진로검사 최종 실사용 검증용. 실제 학생 아님.',
    true
  )
  RETURNING id, name, student_access_key;
`)
const student = created[0]
if (!student?.id) throw new Error('failed to create test student')
if (student.id === PROTECTED_STUDENT_ID) throw new Error('created id collided with protected student')

const sessionRow = sqlQuery(`
  INSERT INTO public.career_assessment_sessions (student_id, access_token, token_hash, status)
  VALUES ('${student.id}', '${token}', '${hash}', 'not_started')
  RETURNING id, student_id, status;
`)
const session = sessionRow[0]
if (!session?.id) throw new Error('failed to create test session')
if (session.id === PROTECTED_SESSION_ID) throw new Error('created session collided with protected session')
if (session.student_id !== student.id) throw new Error('session student mismatch')

const loaded = await invoke({ action: 'load', token })
if (loaded.status !== 200 || (loaded.json.questions ?? []).length !== 88) {
  throw new Error(`load failed ${loaded.status} ${JSON.stringify(loaded.json)}`)
}

const questions = loaded.json.questions.slice().sort((a, b) => a.questionNumber - b.questionNumber)
const answers = questions.map((q) => {
  const answer = ANSWER_BY_NUMBER[q.questionNumber]
  if (!answer) throw new Error(`missing answer for Q${q.questionNumber}`)
  return { questionId: q.id, answer }
})

for (let i = 0; i < answers.length; i += 8) {
  const chunk = answers.slice(i, i + 8)
  const saved = await invoke({ action: 'save_answers', token, answers: chunk })
  if (saved.status !== 200) {
    throw new Error(`save chunk ${i} failed ${saved.status} ${JSON.stringify(saved.json)}`)
  }
}

const submit1 = await invoke({ action: 'submit', token })
if (submit1.status !== 200 || !submit1.json.resultId) {
  throw new Error(`submit failed ${submit1.status} ${JSON.stringify(submit1.json)}`)
}
const resultId = submit1.json.resultId

const submit2 = await invoke({ action: 'submit', token })
if (submit2.status !== 200 && submit2.status !== 409) {
  throw new Error(`duplicate submit unexpected ${submit2.status} ${JSON.stringify(submit2.json)}`)
}

const counts = sqlQuery(`
  SELECT
    (SELECT count(*)::int FROM public.career_assessment_responses WHERE session_id = '${session.id}') AS responses,
    (SELECT status FROM public.career_assessment_sessions WHERE id = '${session.id}') AS session_status,
    (SELECT count(*)::int FROM public.career_assessment_results WHERE student_id = '${student.id}') AS results,
    (SELECT count(*)::int FROM public.notices WHERE target_student_id = '${student.id}' AND career_assessment_result_id IS NOT NULL) AS notices,
    (SELECT count(*)::int FROM public.career_assessment_result_notices WHERE session_id = '${session.id}') AS notice_links,
    (SELECT career_assessment_result_id FROM public.notices WHERE target_student_id = '${student.id}' AND career_assessment_result_id IS NOT NULL LIMIT 1) AS notice_result_id,
    (SELECT title FROM public.notices WHERE target_student_id = '${student.id}' AND career_assessment_result_id IS NOT NULL LIMIT 1) AS notice_title,
    (SELECT length(content) FROM public.notices WHERE target_student_id = '${student.id}' AND career_assessment_result_id IS NOT NULL LIMIT 1) AS notice_content_len
`)

const summary = sqlQuery(`
  SELECT x
  FROM jsonb_array_elements(public.get_career_assessment_session_summaries()) AS x
  WHERE x->>'student_id' = '${student.id}';
`)
const listRow = typeof summary[0]?.x === 'string' ? JSON.parse(summary[0].x) : summary[0]?.x

const resultRow = sqlQuery(`
  SELECT id, result_version, career_efficacy, career_readiness,
         riasec_scores, result_payload
  FROM public.career_assessment_results
  WHERE id = '${resultId}';
`)
const result = resultRow[0]
const payload = typeof result.result_payload === 'string' ? JSON.parse(result.result_payload) : result.result_payload
const parentOk = sqlQuery(`
  SELECT public.get_parent_career_assessment_result('${accessKey}', '${resultId}') IS NOT NULL AS ok;
`)
const parentBlocked = sqlQuery(`
  SELECT public.get_parent_career_assessment_result('wrong-key-not-real', '${resultId}') IS NULL AS ok;
`)

if (counts[0].responses !== 88) throw new Error(`responses=${counts[0].responses}`)
if (counts[0].session_status !== 'completed') throw new Error(`status=${counts[0].session_status}`)
if (counts[0].results !== 1) throw new Error(`results=${counts[0].results}`)
if (counts[0].notices !== 1) throw new Error(`notices=${counts[0].notices}`)
if (counts[0].notice_links !== 1) throw new Error(`notice_links=${counts[0].notice_links}`)
if (counts[0].notice_result_id !== resultId) throw new Error('notice is not result-id reference')
if (Number(listRow?.answered_count) !== 88 || listRow?.status !== 'completed') {
  throw new Error(`teacher list summary wrong ${JSON.stringify(listRow)}`)
}
if (!parentOk[0]?.ok) throw new Error('parent RPC missed own result')
if (!parentBlocked[0]?.ok) throw new Error('parent RPC did not block other key')

const protectedCheck = sqlQuery(`
  SELECT
    (SELECT count(*)::int FROM public.career_assessment_responses r
      JOIN public.career_assessment_sessions s ON s.id = r.session_id
      WHERE s.student_id = '${student.id}') AS test_responses,
    1 AS ok;
`)
if (protectedCheck[0].test_responses !== 88) throw new Error('test response count drifted')

const report = {
  studentId: student.id,
  studentName: student.name,
  studentAccessKey: accessKey,
  sessionId: session.id,
  resultId,
  token,
  counts: counts[0],
  teacherList: {
    status: listRow.status,
    answered_count: listRow.answered_count,
  },
  riasecTop2: payload.riasecTop2,
  riasecCodeLabel: payload.riasecCodeLabel,
  majorTop5: (payload.majorGroupScores ?? []).slice(0, 5).map((m) => ({
    name: m.name,
    score: m.score,
    label: m.label,
  })),
  detailedTop5: (payload.detailedMajorScores ?? []).slice(0, 5).map((m) => ({
    name: m.name,
    score: m.score,
  })),
  careerEfficacy: result.career_efficacy,
  careerReadiness: result.career_readiness,
  noticeTitle: counts[0].notice_title,
  noticeContentLen: counts[0].notice_content_len,
  parentOwn: true,
  parentOtherBlocked: true,
  teacherPath: '/career-assessment',
  teacherResultPath: `/career-assessment/${student.id}?result=${resultId}`,
  teacherPrintPath: `/career-assessment/${student.id}?result=${resultId}&print=1`,
  parentNoticePath: `/care/${accessKey}/notices-makeup`,
  parentResultPath: `/care/${accessKey}/career-result/${resultId}`,
  parentBlockedPath: `/care/wrong-key-not-real/career-result/${resultId}`,
}

writeFileSync('supabase/.temp-career-final-report.json', JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report, null, 2))
