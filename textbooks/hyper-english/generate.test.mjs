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

console.log('generate tests passed')
