#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractBook } from './extract.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const file = resolve(process.argv[2] ?? '')
const kind = process.argv[3] ?? 'grammar'
const stem = process.argv[4] ?? 'imported'
if (!process.argv[2]) {
  console.error('사용: node import-file.mjs <file.pdf|file.txt> <reading|grammar|vocab|writing|math>')
  process.exit(1)
}

let text = ''
if (file.toLowerCase().endsWith('.pdf')) {
  const result = spawnSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' })
  text = result.stdout ?? ''
} else {
  text = readFileSync(file, 'utf8')
}

const book = extractBook(text, kind)
if (book.error) {
  console.error(book.error)
  process.exit(2)
}

const outDir = join(root, 'out')
mkdirSync(outDir, { recursive: true })
const jsonPath = join(outDir, `${stem}.json`)
writeFileSync(jsonPath, JSON.stringify(book, null, 2))
const run = spawnSync(process.execPath, [join(root, 'generate.mjs'), jsonPath, stem], { stdio: 'inherit' })
process.exit(run.status ?? 1)
