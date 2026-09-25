#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderBook } from './render.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const input = resolve(process.argv[2] ?? join(root, 'samples/grammar-g3.json'))
const book = JSON.parse(readFileSync(input, 'utf8'))
const html = renderBook(book, { css: '../' })
const outDir = join(root, 'out')
mkdirSync(outDir, { recursive: true })
const stem = process.argv[3] ?? 'generated'
const htmlPath = join(outDir, `${stem}.html`)
const pdfPath = join(outDir, `${stem}.pdf`)
writeFileSync(htmlPath, html)

spawnSync('timeout', [
  '25',
  'google-chrome',
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--no-first-run',
  `--user-data-dir=${join(outDir, `.chrome-${process.pid}`)}`,
  `--print-to-pdf=${pdfPath}`,
  '--no-pdf-header-footer',
  `file://${htmlPath}`,
], { stdio: 'inherit' })

if (!existsSync(pdfPath) || statSync(pdfPath).size < 1000) {
  console.error('PDF was not written')
  process.exit(1)
}
console.log(htmlPath)
console.log(pdfPath)
