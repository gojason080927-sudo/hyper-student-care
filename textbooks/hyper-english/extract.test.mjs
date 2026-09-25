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
assert.equal(plain.units.length, 1)

const chapters = extractBook(`Chapter 1 문장의 형식
영어 문장은 주어와 동사로 이루어진다.
She is a student.
1. 주어는?
① She
② is
Chapter 2 시제
현재시제는 지금을 나타낸다.
He walks to school.
1. 동사는?
① walks
② walked
정답 ①
`, 'grammar')
assert.equal(chapters.units.length, 2)
assert.equal(chapters.units[0].title, '문장의 형식')
assert.equal(chapters.units[1].title, '시제')
assert.match(chapters.units[0].points[0].body, /주어와 동사/)
assert.equal(chapters.units[0].example, 'She is a student.')
assert.equal(chapters.units[0].questions.length, 1)
assert.equal(chapters.units[0].questions[0].choices.length, 2)
assert.equal(chapters.units[1].questions[0].answer, '①')
assert.equal(chapters.units[0].questions[0].answer, undefined)

const words = extractBook('UNIT 01 기본 어휘\nWORD maintain | 유지하다\nWORD reduce | 줄이다\n', 'vocab')
assert.equal(words.units[0].words.length, 2)
assert.equal(words.units[0].words[1].meaning, '줄이다')

console.log('extract tests passed')
