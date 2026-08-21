/**
 * 학생 등록 → 링크 복사 → 새 탭 접속 E2E (headed)
 * node scripts/e2e-student-link-ui.mjs
 *
 * 로그인: 브라우저 창에서 수동 완료 (최대 3분 대기) 또는 .env.local TEST_TEACHER_*
 */
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  const env = {}
  for (const name of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(resolve(process.cwd(), name), 'utf8').split('\n')) {
        const t = line.trim()
        if (!t || t.startsWith('#')) continue
        const i = t.indexOf('=')
        if (i === -1) continue
        env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
      }
    } catch {
      // optional
    }
  }
  return env
}

const env = loadEnv()
const BASE = process.env.E2E_BASE_URL || 'http://localhost:5174'
const studentName = `UI링크테스트${Date.now().toString().slice(-6)}`
const results = []

function log(step, ok, detail = '') {
  results.push({ step, ok, detail })
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${step}${detail ? ` — ${detail}` : ''}`)
}

const userDataDir = resolve(process.cwd(), '.playwright-profile')
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  channel: 'chrome',
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = context.pages()[0] ?? (await context.newPage())
await page.setViewportSize({ width: 1280, height: 800 })

try {
  const email = env.TEST_TEACHER_EMAIL
  const password = env.TEST_TEACHER_PASSWORD

  await page.goto(`${BASE}/students`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page
    .getByText('로그인 상태를 확인하는 중')
    .waitFor({ state: 'hidden', timeout: 30000 })
    .catch(() => {})

  const studentsHeading = page.getByRole('heading', { name: '학생관리' })
  const loginHeading = page.getByRole('heading', { name: '강사용 로그인' })

  const onStudents = await studentsHeading.isVisible().catch(() => false)
  if (!onStudents) {
    const onLogin = await loginHeading.isVisible().catch(() => false)
    if (onLogin && email && password) {
      await page.fill('#login-email', email)
      await page.fill('#login-password', password)
      await page.getByRole('button', { name: '로그인' }).click()
    } else if (onLogin) {
      console.log('INFO: Playwright Chrome 창에서 로그인해 주세요 (최대 3분)...')
    }
    await studentsHeading.waitFor({ timeout: 180000 })
  }

  log('1. 학생관리 화면 접근', page.url().includes('/students'), page.url())
  await page
    .locator('button.inline-flex')
    .filter({ hasText: '학생 등록' })
    .click()
  const modal = page.getByRole('dialog')
  await modal.getByPlaceholder('학생 이름').fill(studentName)
  await modal.getByPlaceholder('학교명').fill('UI테스트중')
  await modal.getByRole('button', { name: '학생 등록' }).click()
  await page.waitForTimeout(2500)

  log('2. 학생 등록 UI', true, studentName)

  const row = page.locator('tr', { hasText: studentName }).first()
  await row.waitFor({ timeout: 10000 })
  const linkCell = row.locator('td').nth(7)
  const linkStatus = (await linkCell.innerText()).trim()
  log('3. 링크 상태 표시', linkStatus === '활성', linkStatus)

  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await row.getByRole('button', { name: '학부모 링크 복사' }).click()
  await page.waitForTimeout(1500)

  const toast = page.locator('text=학부모 전용 링크가 복사되었습니다')
  const toastOk = await toast.isVisible().catch(() => false)
  log('4. 링크 복사 토스트', toastOk)

  let careUrl = ''
  try {
    careUrl = await page.evaluate(async () => navigator.clipboard.readText())
  } catch {
    careUrl = ''
  }
  const urlOk = careUrl.startsWith(`${BASE}/care/`) && careUrl.length > 40
  log('5. 클립보드 URL', urlOk, urlOk ? careUrl.replace(/\/care\/.+/, '/care/••••') : '복사 실패')

  const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
  const { data: dbStudent } = await sb
    .from('students')
    .select('student_access_key, access_key_active, name')
    .eq('name', studentName)
    .maybeSingle()

  const keyLen = dbStudent?.student_access_key?.length ?? 0
  log(
    '6. Supabase student_access_key',
    keyLen >= 32 && dbStudent?.access_key_active === true,
    `len=${keyLen}, active=${dbStudent?.access_key_active}`,
  )

  if (urlOk && dbStudent?.student_access_key) {
    const keyInUrl = careUrl.endsWith(dbStudent.student_access_key)
    log('7. URL-키 일치', keyInUrl)
  }

  const parentPage = await context.newPage()
  await parentPage.goto(careUrl || `${BASE}/care/${dbStudent?.student_access_key}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  await parentPage.waitForTimeout(3000)
  const parentText = await parentPage.locator('body').innerText()
  const parentOk =
    parentText.includes(studentName) && !parentText.includes('강사용 로그인') && !parentText.includes('접근할 수 없는')
  log('8. 새 탭 학부모 접속', parentOk, parentPage.url())

  const failed = results.filter((r) => !r.ok)
  console.log('\n--- Summary ---')
  console.log(`Passed: ${results.length - failed.length}/${results.length}`)
  if (failed.length) process.exitCode = 1
} catch (error) {
  console.error('FAIL:', error.message)
  process.exitCode = 1
} finally {
  await context.close()
}
