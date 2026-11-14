import { execSync } from 'node:child_process'

const html = execSync('curl.exe -sL https://hyper-student-care.vercel.app/', {
  encoding: 'utf8',
})
const cssPath = html.match(/\/assets\/[^"]+\.css/)?.[0]
const jsPath = html.match(/\/assets\/[^"]+\.js/)?.[0]
if (!cssPath || !jsPath) {
  console.error('missing assets')
  process.exit(1)
}
const css = execSync(`curl.exe -sL https://hyper-student-care.vercel.app${cssPath}`, {
  encoding: 'utf8',
})
const js = execSync(`curl.exe -sL https://hyper-student-care.vercel.app${jsPath}`, {
  encoding: 'utf8',
})
console.log(
  JSON.stringify(
    {
      cssPath,
      jsPath,
      pmFeatured: css.includes('pm-featured-card'),
      hpMint: css.includes('--hp-mint'),
      pmHeader: css.includes('pm-app-header'),
      bottomNavPadding: css.includes('parent-main--with-bottom-nav'),
      wrongAnalysis: js.includes('오답 분석'),
      feedback: js.includes('강사의 피드백'),
      biweekly: js.includes('격주간 오답 재시험'),
      pmFeaturedInJs: js.includes('pm-featured-card'),
      tmFeaturedInJs: js.includes('tm-featured-card'),
    },
    null,
    2,
  ),
)
