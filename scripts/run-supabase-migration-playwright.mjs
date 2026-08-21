/**
 * Playwright persistent profile로 Supabase SQL Editor에서 마이그레이션 실행 시도
 */
import { chromium } from 'playwright'
import { resolve } from 'path'

const PROJECT_REF = 'pwuswjauzdxewmtgoitf'
const SQL = `alter table public.class_today_report_common
  add column if not exists textbook_name text not null default '';

notify pgrst, 'reload schema';

select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'class_today_report_common'
order by ordinal_position;`

const profileDir = resolve('.playwright-profile')

const browser = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  channel: 'chrome',
})

const page = browser.pages()[0] ?? (await browser.newPage())
await page.goto(
  `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`,
  { waitUntil: 'domcontentloaded', timeout: 60000 },
)

const url = page.url()
console.log('Current URL:', url)

if (url.includes('sign-in')) {
  console.error('BLOCKED: Supabase login required — SQL Editor에 직접 로그인 후 마이그레이션을 실행해야 합니다.')
  await browser.close()
  process.exit(2)
}

await page.waitForTimeout(8000)

const editorSelectors = [
  '.monaco-editor textarea',
  'textarea[aria-label="Editor content"]',
  '[role="textbox"][aria-label="Editor content"]',
  '.view-lines',
]

let filled = false
for (const selector of editorSelectors) {
  const loc = page.locator(selector).first()
  if ((await loc.count()) > 0) {
    await loc.click({ timeout: 5000 }).catch(() => {})
    await page.keyboard.press('Control+A').catch(() => {})
    await page.keyboard.type(SQL, { delay: 0 }).catch(async () => {
      await loc.fill(SQL).catch(() => {})
    })
    filled = true
    console.log('Filled SQL using selector:', selector)
    break
  }
}

if (!filled) {
  filled = await page.evaluate((sqlText) => {
    const monacoGlobal = window.monaco
    if (!monacoGlobal?.editor) return false
    const models = monacoGlobal.editor.getModels?.() ?? []
    if (models.length === 0) return false
    models[0].setValue(sqlText)
    return true
  }, SQL)
  if (filled) console.log('Filled SQL via monaco API')
}
if (!filled) {
  const html = await page.content()
  console.error('BLOCKED: SQL editor not found')
  console.error('Page title:', await page.title())
  console.error('Has monaco:', html.includes('monaco'))
  await page.screenshot({ path: 'scripts/.supabase-sql-debug.png', fullPage: true })
  await browser.close()
  process.exit(3)
}

await page.getByRole('button', { name: 'Run' }).click({ timeout: 10000 })
await page.waitForTimeout(8000)

const bodyText = await page.locator('body').innerText()
const hasTextbookColumn = /textbook_name/.test(bodyText)
console.log('textbook_name visible in page:', hasTextbookColumn)
console.log('Results snippet:', bodyText.slice(0, 2500))

await browser.close()
console.log('Done')
