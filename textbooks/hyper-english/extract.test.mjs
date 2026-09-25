import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { extractBook } from './extract.mjs'

const text = readFileSync(new URL('./samples/source-grammar.txt', import.meta.url), 'utf8')
const book = extractBook(text, 'grammar')
assert.equal(book.error, undefined)
assert.equal(book.kind, 'grammar')
assert.equal(book.units[0].title, '문장의 기초')
assert.equal(book.units[0].passage[0].includes('Mina'), true)
assert.equal(book.units[0].questions.length, 2)
assert.equal(book.units[0].questions[0].choices.length, 3)
assert.equal(book.units[0].questions[0].answer, '①')
assert.equal(extractBook('   ', 'grammar').error, '텍스트 추출 불가/OCR 필요')

const plain = extractBook(readFileSync(new URL('./samples/plain-grammar.txt', import.meta.url), 'utf8'), 'grammar')
assert.equal(plain.units[0].title, '문장의 기초')
assert.equal(plain.units[0].questions.length, 2)
assert.equal(plain.units[0].questions[0].answer, undefined)
assert.equal(plain.units[0].questions[0].choices.length, 3)
assert.match(plain.units[0].points[0].body, /주어와 동사/)

const words = extractBook('UNIT 01 기본 어휘\nWORD maintain | 유지하다\nWORD reduce | 줄이다\n', 'vocab')
assert.equal(words.units[0].words.length, 2)
assert.equal(words.units[0].words[1].meaning, '줄이다')

console.log('extract tests passed')
