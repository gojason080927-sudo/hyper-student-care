import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { planBook, renderBook } from './render.mjs'

const css = readFileSync(new URL('./master.css', import.meta.url), 'utf8')
assert.match(css, /padding: 6mm 21mm 5mm 15mm/)

const grammar = JSON.parse(readFileSync(new URL('./samples/grammar-g3.json', import.meta.url), 'utf8'))
const html = renderBook(grammar)
assert.match(html, /차례/)
assert.match(html, /문장의 기초/)
assert.match(html, /class="q-num">1</)
assert.match(html, /class="q-num">6</)
assert.match(html, /data-grade="g3"/)
assert.match(html, /정답과 해설/)
assert.equal(planBook(grammar).filter((page) => page.kind === 'questions').length, 1)

const math = JSON.parse(readFileSync(new URL('./samples/math-g1.json', import.meta.url), 'utf8'))
const mathHtml = renderBook(math)
assert.match(mathHtml, /data-grade="g1"/)
assert.match(mathHtml, /이차방정식/)
assert.match(mathHtml, /근의 공식/)
assert.doesNotMatch(mathHtml, /data-grade="g3"/)

for (const name of ['reading-g3.json', 'vocab-g3.json', 'writing-g3.json']) {
  const book = JSON.parse(readFileSync(new URL(`./samples/${name}`, import.meta.url), 'utf8'))
  const page = renderBook(book)
  assert.match(page, /차례/)
  assert.match(page, new RegExp(book.units[0].title))
}

const reading = JSON.parse(readFileSync(new URL('./samples/reading-g3.json', import.meta.url), 'utf8'))
reading.school = 'middle'
reading.grade = 'g1'
reading.series = '중1 영어 독해'
const readingHtml = renderBook(reading)
assert.match(readingHtml, /data-grade="g1"/)
assert.match(readingHtml, /중학교 · 중1 영어 독해/)
assert.match(readingHtml, /class="passage passage-frame"/)
assert.match(readingHtml, /class="cols"/)
const readingPages = readingHtml.split('<section class="page')
assert.doesNotMatch(readingPages[1], /class="cols"/)
assert.match(readingPages[2], /class="unit-no"/)
assert.doesNotMatch(readingPages[2], /passage-frame/)
assert.match(readingPages[3], /passage-frame/)
assert.match(readingPages[3], /class="cols"/)

console.log('generate tests passed')
