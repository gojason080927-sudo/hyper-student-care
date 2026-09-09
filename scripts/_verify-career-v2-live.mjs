/**
 * Production MASTER v2 live verify.
 * Does not modify existing V1 completed sessions/results.
 */
import { createHash, randomBytes } from 'crypto'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

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

for (let n = 89; n <= 140; n += 1) ANSWER_BY_NUMBER[n] = 2 + ((n * 3) % 4)

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
  writeFileSync('supabase/.temp-career-v2-live.sql', sql, 'utf8')
  const result = execSync('npx supabase db query --linked --output json -f supabase/.temp-career-v2-live.sql', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  return JSON.parse(result.slice(result.indexOf('{'))).rows ?? []
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

const env = parseEnv('.env.local')
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) throw new Error('missing supabase env')

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

const before = sqlQuery(`
  SELECT
    (SELECT count(*)::int FROM public.career_assessment_results WHERE result_version = 'HYPER_CAREER_V1') AS v1_results,
    (SELECT count(*)::int FROM public.career_assessment_sessions WHERE assessment_version = 'HYPER_CAREER_V1') AS v1_sessions,
    (SELECT count(*)::int FROM public.career_assessment_sessions WHERE status <> 'completed') AS open_sessions
`)[0]
if (before.v1_results < 1) throw new Error('no V1 results to preserve')
if (before.open_sessions !== 0) {
  console.log('note: open sessions exist', before.open_sessions)
}

const v1Session = sqlQuery(`
  SELECT s.access_token, s.expected_question_count, s.assessment_version, s.status
  FROM public.career_assessment_sessions s
  WHERE s.assessment_version = 'HYPER_CAREER_V1'
    AND s.status = 'completed'
  ORDER BY s.created_at DESC
  LIMIT 1
`)[0]
if (!v1Session) throw new Error('missing V1 completed session')
const v1Load = await invoke({ action: 'load', token: v1Session.access_token })
if (v1Load.status !== 200) throw new Error(`V1 load failed ${v1Load.status}`)
if ((v1Load.json.questions ?? []).length !== 88) {
  throw new Error(`V1 completed session must stay 88, got ${(v1Load.json.questions ?? []).length}`)
}
if (v1Load.json.session?.expectedQuestionCount !== 88) {
  throw new Error(`V1 expectedQuestionCount drifted ${JSON.stringify(v1Load.json.session)}`)
}

async function runSubject({ kind }) {
  const token = randomBytes(32).toString('base64url')
  const hash = tokenHash(token)
  let studentId = null
  let guestId = null
  let accessKey = null

  if (kind === 'student') {
    accessKey = randomBytes(24).toString('base64url').replace(/[^A-Za-z0-9]/g, 'A').slice(0, 32)
    const student = sqlQuery(`
      INSERT INTO public.students (
        name, student_access_key, school, grade, class_name, subjects, teacher,
        enrollment_date, status, memo, access_key_active
      ) VALUES (
        '진로검사 V2 재원생',
        '${accessKey}',
        'HYPER TEST',
        '고1',
        'CAREER-V2',
        '{}',
        '',
        CURRENT_DATE,
        '재원',
        'MASTER v2 검증용. 실제 학생 아님.',
        true
      )
      RETURNING id;
    `)[0]
    studentId = student.id
    sqlQuery(`
      INSERT INTO public.career_assessment_sessions
        (student_id, access_token, token_hash, status, assessment_version, expected_question_count)
      VALUES ('${studentId}', '${token}', '${hash}', 'not_started', 'HYPER_CAREER_V2', 140);
    `)
  } else {
    const guest = sqlQuery(`
      INSERT INTO public.career_assessment_guests (name, school, grade, consultation_date, memo)
      VALUES ('진로검사 V2 상담생', 'HYPER TEST', '고1', CURRENT_DATE, 'MASTER v2 상담생 검증')
      RETURNING id;
    `)[0]
    guestId = guest.id
    sqlQuery(`
      INSERT INTO public.career_assessment_sessions
        (student_id, guest_id, access_token, token_hash, status, assessment_version, expected_question_count)
      VALUES (NULL, '${guestId}', '${token}', '${hash}', 'not_started', 'HYPER_CAREER_V2', 140);
    `)
  }

  const load0 = await invoke({ action: 'load', token })
  if (load0.status !== 200) throw new Error(`${kind} load0 ${load0.status} ${JSON.stringify(load0.json)}`)
  if ((load0.json.questions ?? []).length !== 140) throw new Error(`${kind} expected 0/140 questions, got ${(load0.json.questions ?? []).length}`)
  if (load0.json.session?.expectedQuestionCount !== 140) throw new Error(`${kind} expectedQuestionCount not 140`)

  const questions = load0.json.questions.slice().sort((a, b) => a.displayOrder - b.displayOrder)
  const firstFive = questions.slice(0, 5).map((q) => ({
    questionId: q.id,
    answer: ANSWER_BY_NUMBER[q.questionNumber],
  }))
  const saved5 = await invoke({ action: 'save_answers', token, answers: firstFive })
  if (saved5.status !== 200) throw new Error(`${kind} save5 ${saved5.status} ${JSON.stringify(saved5.json)}`)
  if (saved5.json.answeredCount !== 5) throw new Error(`${kind} answeredCount after 5 = ${saved5.json.answeredCount}`)

  const load5 = await invoke({ action: 'load', token })
  if ((load5.json.answers ?? []).length !== 5) throw new Error(`${kind} resume lost answers`)
  if ((load5.json.questions ?? []).length !== 140) throw new Error(`${kind} resume question count drifted`)

  const remaining = questions.slice(5).map((q) => ({
    questionId: q.id,
    answer: ANSWER_BY_NUMBER[q.questionNumber],
  }))
  for (let i = 0; i < remaining.length; i += 10) {
    const chunk = remaining.slice(i, i + 10)
    const saved = await invoke({ action: 'save_answers', token, answers: chunk })
    if (saved.status !== 200) throw new Error(`${kind} save chunk ${i} ${saved.status} ${JSON.stringify(saved.json)}`)
  }

  const submit1 = await invoke({ action: 'submit', token })
  if (submit1.status !== 200 || !submit1.json.resultId) {
    throw new Error(`${kind} submit failed ${submit1.status} ${JSON.stringify(submit1.json)}`)
  }
  const submit2 = await invoke({ action: 'submit', token })
  if (submit2.status !== 200 && submit2.status !== 409) {
    throw new Error(`${kind} duplicate submit unexpected ${submit2.status}`)
  }

  const filter = studentId
    ? `s.student_id = '${studentId}'`
    : `s.guest_id = '${guestId}'`
  const counts = sqlQuery(`
    SELECT
      s.id AS session_id,
      s.status,
      s.assessment_version,
      s.expected_question_count,
      (SELECT count(*)::int FROM public.career_assessment_responses r WHERE r.session_id = s.id) AS responses,
      (SELECT count(*)::int FROM public.career_assessment_results res WHERE res.session_id = s.id) AS results,
      (SELECT count(*)::int FROM public.career_assessment_result_notices n WHERE n.session_id = s.id) AS notice_links,
      (SELECT res.result_version FROM public.career_assessment_results res WHERE res.session_id = s.id LIMIT 1) AS result_version,
      (SELECT jsonb_array_length(res.major_group_scores) FROM public.career_assessment_results res WHERE res.session_id = s.id LIMIT 1) AS major_groups
    FROM public.career_assessment_sessions s
    WHERE ${filter}
    ORDER BY s.created_at DESC
    LIMIT 1
  `)[0]

  if (counts.responses !== 140) throw new Error(`${kind} responses=${counts.responses}`)
  if (counts.status !== 'completed') throw new Error(`${kind} status=${counts.status}`)
  if (counts.results !== 1) throw new Error(`${kind} results=${counts.results}`)
  if (counts.expected_question_count !== 140) throw new Error(`${kind} expected ${counts.expected_question_count}`)
  if (counts.result_version !== 'HYPER_CAREER_V2') throw new Error(`${kind} result_version=${counts.result_version}`)
  if (counts.major_groups !== 36) throw new Error(`${kind} major groups=${counts.major_groups}`)

  const studentNotices = studentId
    ? sqlQuery(`
        SELECT count(*)::int AS n
        FROM public.notices
        WHERE target_student_id = '${studentId}'
          AND career_assessment_result_id IS NOT NULL
      `)[0].n
    : sqlQuery(`
        SELECT count(*)::int AS n
        FROM public.career_assessment_result_notices n
        JOIN public.career_assessment_sessions s ON s.id = n.session_id
        WHERE s.guest_id = '${guestId}'
      `)[0].n

  if (kind === 'guest' && (counts.notice_links !== 0 || studentNotices !== 0)) {
    throw new Error(`guest notice created ${counts.notice_links}/${studentNotices}`)
  }
  if (kind === 'student' && (counts.notice_links !== 1 || studentNotices !== 1)) {
    throw new Error(`student notice missing ${counts.notice_links}/${studentNotices}`)
  }

  return {
    kind,
    studentId,
    guestId,
    accessKey,
    token,
    resultId: submit1.json.resultId,
    counts,
  }
}

const guest = await runSubject({ kind: 'guest' })
const student = await runSubject({ kind: 'student' })

const after = sqlQuery(`
  SELECT
    (SELECT count(*)::int FROM public.career_assessment_results WHERE result_version = 'HYPER_CAREER_V1') AS v1_results,
    (SELECT count(*)::int FROM public.career_assessment_sessions WHERE assessment_version = 'HYPER_CAREER_V1') AS v1_sessions,
    (SELECT count(*)::int FROM public.career_assessment_questions) AS questions
`)[0]
if (after.v1_results !== before.v1_results) throw new Error(`V1 results changed ${before.v1_results} -> ${after.v1_results}`)
if (after.v1_sessions !== before.v1_sessions) throw new Error(`V1 sessions changed ${before.v1_sessions} -> ${after.v1_sessions}`)
if (after.questions !== 140) throw new Error(`questions=${after.questions}`)

const report = { before, after, v1LoadQuestions: v1Load.json.questions.length, guest, student }
writeFileSync('supabase/.temp-career-v2-report.json', JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report, null, 2))
console.log('career V2 live verify OK')
