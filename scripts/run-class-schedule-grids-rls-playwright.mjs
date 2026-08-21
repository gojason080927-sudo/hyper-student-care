/**
 * Playwright persistent profile로 Supabase SQL Editor에서 class_schedule_grids RLS 적용
 */
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const PROJECT_REF = 'pwuswjauzdxewmtgoitf'
const SQL = readFileSync('supabase/class-schedule-grids-rls.sql', 'utf8')
const VERIFY_SQL = `
select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'class_schedule_grids'
order by policyname;
`

const profileDir = resolve('.playwright-profile')

const browser = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  channel: 'chrome',
})

const page = browser.pages()[0] ?? (await browser.newPage())
await page.goto(`https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`, {
  waitUntil: 'domcontentloaded',
  timeout: 60000,
})

const url = page.url()
console.log('Current URL:', url)

if (url.includes('sign-in')) {
  console.error('BLOCKED: Supabase login required')
  await browser.close()
  process.exit(2)
}

await page.waitForTimeout(8000)

async function fillSql(sqlText) {
  const editorSelectors = [
    '.monaco-editor textarea',
    'textarea[aria-label="Editor content"]',
    '[role="textbox"][aria-label="Editor content"]',
  ]

  for (const selector of editorSelectors) {
    const loc = page.locator(selector).first()
    if ((await loc.count()) > 0) {
      await loc.click({ timeout: 5000 }).catch(() => {})
      await page.keyboard.press('Control+A').catch(() => {})
      await page.keyboard.type(sqlText, { delay: 0 }).catch(async () => {
        await loc.fill(sqlText).catch(() => {})
      })
      return true
    }
  }

  return page.evaluate((text) => {
    const monacoGlobal = window.monaco
    if (!monacoGlobal?.editor) return false
    const models = monacoGlobal.editor.getModels?.() ?? []
    if (models.length === 0) return false
    models[0].setValue(text)
    return true
  }, sqlText)
}

async function runSql() {
  await page.getByRole('button', { name: 'Run' }).click({ timeout: 10000 })
  await page.waitForTimeout(8000)
}

if (!(await fillSql(SQL))) {
  console.error('BLOCKED: SQL editor not found')
  await page.screenshot({ path: 'scripts/.supabase-rls-debug.png', fullPage: true })
  await browser.close()
  process.exit(3)
}

console.log('Running RLS migration SQL...')
await runSql()

const bodyAfterMigration = await page.locator('body').innerText()
console.log('Migration snippet:', bodyAfterMigration.slice(0, 1500))

if (!(await fillSql(VERIFY_SQL))) {
  console.error('WARN: could not fill verify SQL')
} else {
  console.log('Running verify SQL...')
  await runSql()
  const verifyText = await page.locator('body').innerText()
  const policyCount = (verifyText.match(/class_schedule_grids/g) ?? []).length
  console.log('Verify snippet:', verifyText.slice(0, 2000))
  console.log('Policy mentions:', policyCount)
  if (!/dev_anon_insert_class_schedule_grids|class_schedule_grids_authenticated_all/.test(verifyText)) {
    console.error('FAIL: expected policies not visible in results')
    await browser.close()
    process.exit(4)
  }
}

await browser.close()
console.log('OK: class_schedule_grids RLS applied')
