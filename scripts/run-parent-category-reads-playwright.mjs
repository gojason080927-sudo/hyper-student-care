/**
 * Playwright persistent profile로 Supabase SQL Editor에서 parent_category_reads 마이그레이션 실행
 */
import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const PROJECT_REF = 'pwuswjauzdxewmtgoitf'
const SQL = readFileSync('supabase/parent-category-reads-migration.sql', 'utf8')

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

const editorSelectors = [
  '.monaco-editor textarea',
  'textarea[aria-label="Editor content"]',
  '[role="textbox"][aria-label="Editor content"]',
]

let filled = false
for (const selector of editorSelectors) {
  const loc = page.locator(selector).first()
  if ((await loc.count()) > 0) {
    await loc.click({ timeout: 5000 }).catch(() => {})
    await page.keyboard.press('Control+A').catch(() => {})
    await page.keyboard.insertText(SQL).catch(async () => {
      await loc.fill(SQL).catch(() => {})
    })
    filled = true
    console.log('Filled SQL using selector:', selector)
    break
  }
}

if (!filled) {
  console.error('Could not find SQL editor')
  await browser.close()
  process.exit(1)
}

const runButton = page.getByRole('button', { name: /^Run$/i }).first()
if ((await runButton.count()) === 0) {
  console.error('Run button not found')
  await browser.close()
  process.exit(1)
}

await runButton.click()
await page.waitForTimeout(12000)

const bodyText = await page.locator('body').innerText()
if (/error|failed/i.test(bodyText) && !/success|completed|CREATE TABLE/i.test(bodyText)) {
  console.log('Page text snippet:', bodyText.slice(0, 500))
}

console.log('Migration run attempted — verify RPC with verify-og-unread-production.mjs')
await browser.close()
