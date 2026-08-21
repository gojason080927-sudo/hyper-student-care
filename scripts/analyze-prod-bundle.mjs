import { writeFileSync } from 'fs'

const res = await fetch('https://hyperstudentcare.vercel.app/assets/index-B8Z-093E.js')
const js = await res.text()
writeFileSync('scripts/.prod-bundle-snippet.txt', js)

const patterns = [
  /class_today_report_common[\s\S]{0,500}/g,
  /textbook_name[\s\S]{0,120}/g,
  /function [a-zA-Z_$][\w$]*\([^)]*\)\{return\{[^}]*textbook_name[^}]*current_progress[^}]*\}/g,
]

for (const [i, p] of patterns.entries()) {
  const matches = [...js.matchAll(p)].slice(0, 5).map((m) => m[0].slice(0, 300))
  console.log('\n=== pattern', i, 'matches', matches.length, '===')
  for (const m of matches) console.log(m.replace(/\n/g, ' '))
}

// find mapper-like object with textbook_name and class_name together
const idx = js.indexOf('textbook_name')
let found = 0
let pos = 0
while (found < 5) {
  const i = js.indexOf('textbook_name', pos)
  if (i === -1) break
  console.log('\n--- context', found, '---')
  console.log(js.slice(Math.max(0, i - 120), i + 180).replace(/\n/g, ' '))
  pos = i + 12
  found++
}

console.log('\nTotal textbook_name:', (js.match(/textbook_name/g) || []).length)
