/** Post-deploy OG verification for /care/* and Kakao scraper */
const key = 'MWs6MkVExVQ8R8ZRaShr6K68KEeyJFnY'
const careUrl = `https://hyper-student-care.vercel.app/care/${key}`
const kakaoUa = 'facebookexternalhit/1.1;kakaotalk-scrap/1.0; +https://devtalk.kakao.com/t/scrap/33984'
const browserUa =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function extractTags(html) {
  const tags = {}
  for (const tag of [
    'og:title',
    'og:description',
    'og:image',
    'og:url',
    'og:type',
    'twitter:card',
    'twitter:title',
    'twitter:description',
    'twitter:image',
  ]) {
    const prop = tag.startsWith('og:')
    const re = prop
      ? new RegExp(`property="${tag}" content="([^"]*)"`)
      : new RegExp(`name="${tag}" content="([^"]*)"`)
    const m = html.match(re)
    tags[tag] = m ? m[1] : null
  }
  return tags
}

console.log('=== Image ===')
for (const path of ['/hyper-student-care-share-v3.jpg']) {
  const res = await fetch(`https://hyper-student-care.vercel.app${path}`, { method: 'HEAD' })
  console.log(path, res.status, res.headers.get('content-type'))
}

console.log('\n=== Browser UA (SPA index.html) ===')
const browserRes = await fetch(careUrl, { headers: { 'User-Agent': browserUa } })
const browserHtml = await browserRes.text()
console.log('status:', browserRes.status, 'length:', browserHtml.length)
const browserTags = extractTags(browserHtml)
for (const [k, v] of Object.entries(browserTags)) {
  console.log(` ${k}: ${v ?? 'ABSENT'}`)
}
console.log(' has React bundle:', browserHtml.includes('/assets/index-'))

console.log('\n=== Kakao scraper UA ===')
const kakaoRes = await fetch(careUrl, { headers: { 'User-Agent': kakaoUa } })
const kakaoHtml = await kakaoRes.text()
console.log('status:', kakaoRes.status, 'length:', kakaoHtml.length)
const kakaoTags = extractTags(kakaoHtml)
for (const [k, v] of Object.entries(kakaoTags)) {
  console.log(` ${k}: ${v ?? 'ABSENT'}`)
}
console.log(' og:url matches care URL:', kakaoTags['og:url'] === careUrl)
console.log(' lightweight HTML (no React bundle):', !kakaoHtml.includes('/assets/index-'))

if (kakaoTags['og:image']) {
  const img = await fetch(kakaoTags['og:image'], { method: 'HEAD' })
  console.log(' og:image fetch:', img.status, img.headers.get('content-type'))
}

console.log('\n=== Care URL HTTP 200 ===')
console.log(careUrl, browserRes.status === 200 ? 'OK' : 'FAIL')
