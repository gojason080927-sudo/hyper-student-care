/**
 * Entrance exam auth + CRUD verification against local Vite (5175).
 * If TEST_TEACHER_PASSWORD is missing, waits for manual login in the open browser.
 */
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'
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
const BASE = process.env.EE_BASE || 'http://127.0.0.1:5175'
const email = env.TEST_TEACHER_EMAIL
const password = env.TEST_TEACHER_PASSWORD
const results = {}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

async function bodyText() {
  return page.evaluate(() => document.body.innerText)
}

// 1) logged-out redirect
await page.goto(BASE + '/entrance-exam', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(500)
results.redirectToLogin = {
  pass: page.url().includes('/login'),
  url: page.url(),
}

// existing routes still open without auth
const existing = {}
for (const [name, path, needles] of [
  ['students', '/students', ['학생관리']],
  ['today', '/teacher/today-report-bulk', ['Today Report']],
  ['monthly', '/monthly-learning-reports', ['월간 학습진단']],
  ['qa', '/questions', ['질문하기']],
]) {
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(400)
  const text = await bodyText()
  existing[name] = needles.every((n) => text.includes(n)) && !page.url().includes('/login')
}
results.existingRoutesUnauthed = {
  pass: Object.values(existing).every(Boolean),
  existing,
}

// Login
await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 })
if (email && password) {
  await page.fill('#login-email', email)
  await page.fill('#login-password', password)
  await page.click('button[type="submit"]')
  await page.waitForTimeout(1500)
} else {
  console.log(
    'WAITING_FOR_MANUAL_LOGIN: set TEST_TEACHER_PASSWORD or login in browser; polling 180s',
  )
  // Prefer programmatic login via supabase if password appears later — else poll page session
}

let sessionOk = false
for (let i = 0; i < 90; i++) {
  const info = await page.evaluate(async () => {
    try {
      const mod = await import('/src/lib/supabase.ts')
      const sb = mod.getSupabase()
      const { data } = await sb.auth.getSession()
      return {
        hasSession: !!data.session,
        email: data.session?.user?.email || null,
        role: data.session?.user?.role || null,
      }
    } catch (e) {
      return { hasSession: false, error: String(e) }
    }
  })
  if (info.hasSession) {
    sessionOk = true
    results.login = { pass: true, ...info }
    break
  }
  if (email && password && i === 0) {
    // already tried form
  } else if (!password && i === 0) {
    // try sign-in via API if password env injected mid-run — skip
  }
  await page.waitForTimeout(2000)
}

if (!sessionOk && email && password) {
  // fallback API login then inject session into page
  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
  const login = await sb.auth.signInWithPassword({ email, password })
  if (login.data.session) {
    await page.evaluate(async (session) => {
      const mod = await import('/src/lib/supabase.ts')
      const client = mod.getSupabase()
      await client.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
    }, login.data.session)
    sessionOk = true
    results.login = {
      pass: true,
      email: login.data.session.user.email,
      via: 'setSession',
    }
  } else {
    results.login = { pass: false, error: login.error?.message || 'login failed' }
  }
}

if (!sessionOk) {
  results.login = results.login || { pass: false, error: 'no session after wait' }
  console.log(JSON.stringify(results, null, 2))
  await browser.close()
  process.exit(1)
}

// After login go to questions
await page.goto(BASE + '/entrance-exam/questions', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(800)
const qText = await bodyText()
results.questionsPage = {
  pass: page.url().includes('/entrance-exam/questions') && qText.includes('문제은행'),
  url: page.url(),
}

const marker = `EE_AUTH_CRUD_${Date.now()}`
const areas = ['문제 해석 능력', '응용 능력']

// INSERT via app supabase client (authenticated)
const crud = await page.evaluate(
  async ({ marker, areas }) => {
    const mod = await import('/src/lib/supabase.ts')
    const sb = mod.getSupabase()
    const { data: sessionData } = await sb.auth.getSession()
    const token = sessionData.session?.access_token
    let jwtRole = null
    if (token) {
      try {
        jwtRole = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role
      } catch {
        jwtRole = null
      }
    }

    const inserted = await sb
      .from('entrance_exam_questions')
      .insert({
        subject: '수학',
        target_grade: '중1',
        question_type: 'multiple_choice',
        stem: marker,
        choices: ['2', '3', '4', '5', '6'],
        correct_choice: 1,
        explanation: 'auth crud verify',
        difficulty: '중',
        evaluation_areas: areas,
        unit_name: '검증단원',
      })
      .select('*')
      .single()

    if (inserted.error || !inserted.data?.id) {
      return {
        jwtRole,
        insert: { pass: false, error: inserted.error?.message || 'no id' },
      }
    }
    const id = inserted.data.id

    const reload = await sb.from('entrance_exam_questions').select('*').eq('id', id).single()
    const updatedStem = marker + '_UPDATED'
    const updated = await sb
      .from('entrance_exam_questions')
      .update({
        stem: updatedStem,
        evaluation_areas: ['개념 이해도', '계산 정확도', '문제 해결력'],
      })
      .eq('id', id)
      .select('*')
      .single()

    const afterUpdate = await sb.from('entrance_exam_questions').select('*').eq('id', id).single()
    const deleted = await sb.from('entrance_exam_questions').delete().eq('id', id).select('id')
    const gone = await sb.from('entrance_exam_questions').select('id').eq('id', id)

    // cleanup any leftover markers
    await sb.from('entrance_exam_questions').delete().like('stem', 'EE_AUTH_CRUD_%')

    return {
      jwtRole,
      insert: {
        pass: true,
        id,
        areas: inserted.data.evaluation_areas,
      },
      reload: {
        pass:
          reload.data?.stem === marker &&
          Array.isArray(reload.data?.evaluation_areas) &&
          areas.every((a) => reload.data.evaluation_areas.includes(a)),
        areas: reload.data?.evaluation_areas || null,
      },
      update: {
        pass:
          updated.data?.stem === updatedStem &&
          (updated.data?.evaluation_areas || []).length === 3,
        areas: updated.data?.evaluation_areas || null,
        error: updated.error?.message || null,
      },
      multiArea: {
        pass:
          (afterUpdate.data?.evaluation_areas || []).includes('개념 이해도') &&
          (afterUpdate.data?.evaluation_areas || []).includes('계산 정확도') &&
          (afterUpdate.data?.evaluation_areas || []).includes('문제 해결력'),
        areas: afterUpdate.data?.evaluation_areas || null,
      },
      delete: {
        pass: (deleted.data || []).length === 1 && (gone.data || []).length === 0,
        remaining: (gone.data || []).length,
        error: deleted.error?.message || null,
      },
    }
  },
  { marker, areas },
)

results.authJwtRole = crud.jwtRole
results.insert = crud.insert
results.reload = crud.reload
results.update = crud.update
results.multiArea = crud.multiArea
results.delete = crud.delete

// Header shows logout when session present
await page.goto(BASE + '/students', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(400)
const headerText = await bodyText()
results.headerSessionUi = {
  pass: headerText.includes('로그아웃') && !page.url().includes('/login'),
}

await browser.close()
console.log(JSON.stringify(results, null, 2))
const ok =
  results.redirectToLogin.pass &&
  results.existingRoutesUnauthed.pass &&
  results.login?.pass &&
  results.questionsPage?.pass &&
  results.insert?.pass &&
  results.reload?.pass &&
  results.update?.pass &&
  results.multiArea?.pass &&
  results.delete?.pass
process.exit(ok ? 0 : 1)
