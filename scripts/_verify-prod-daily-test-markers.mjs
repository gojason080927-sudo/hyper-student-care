const { execSync } = require('child_process')
const html = execSync('curl.exe -sL https://hyper-student-care.vercel.app/', {
  encoding: 'utf8',
})
const m = html.match(/\/assets\/[^"]+\.js/)
if (!m) {
  console.log('NO_ASSET')
  process.exit(1)
}
console.log('asset', m[0])
const js = execSync('curl.exe -sL https://hyper-student-care.vercel.app' + m[0], {
  encoding: 'utf8',
})
const checks = [
  '오답 분석',
  '강사의 피드백',
  '격주간 오답 재시험',
  '개념 부족',
  'teacherFeedback',
  'conceptLackCount',
]
for (const c of checks) console.log(c + '=' + js.includes(c))
console.log('bytes', js.length)
