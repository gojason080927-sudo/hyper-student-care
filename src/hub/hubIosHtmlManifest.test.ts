/**
 * 실행: npx tsx src/hub/hubIosHtmlManifest.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { patchIndexHtmlForHub, default as runHubMiddleware } from '../../middleware.ts'

const indexHtml = readFileSync('index.html', 'utf8')
const middleware = readFileSync('middleware.ts', 'utf8')
const hubManifest = readFileSync('public/hub/manifest.webmanifest', 'utf8')
const teacherManifest = readFileSync('public/teacher/manifest.webmanifest', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')
const hubSession = readFileSync('src/hub/hubSession.ts', 'utf8')
const studentPush = readFileSync('src/lib/studentPushClient.ts', 'utf8')
const parentPush = readFileSync('src/lib/parentPushClient.ts', 'utf8')
const teacherPush = readFileSync('src/lib/teacherPushClient.ts', 'utf8')
const careManifest = readFileSync('public/care/manifest.webmanifest', 'utf8')

assert.match(
  indexHtml,
  /<link rel="manifest" id="app-manifest" href="\/teacher\/manifest.webmanifest" \/>/,
)
assert.match(indexHtml, /isHub/)
assert.match(indexHtml, /\/hub\/manifest.webmanifest\?v=1-installable/)

const patched = patchIndexHtmlForHub(indexHtml)
assert.match(patched, /id="app-manifest" href="\/hub\/manifest.webmanifest\?v=1-installable"/)
assert.doesNotMatch(
  patched,
  /<link rel="manifest" id="app-manifest" href="\/teacher\/manifest.webmanifest" \/>/,
)
assert.match(patched, /manifest\.href = '\/teacher\/manifest.webmanifest\?v=10-installable'/)
assert.match(patched, /isTeacher/)
assert.notEqual(patched, indexHtml)
assert.equal(patchIndexHtmlForHub(patched), patched)

assert.match(middleware, /patchIndexHtmlForHub/)
assert.match(middleware, /if \(!isHub \|\| \(request\.method !== 'GET'/)
assert.match(middleware, /fetch\(new URL\('\/index.html'/)
assert.match(middleware, /matcher: \['\/care\/:path\*', '\/hub\/:path\*']/)
assert.doesNotMatch(middleware, /\/teacher\/mobile/)
assert.match(middleware, /if \(!isHub \|\|/)

assert.match(hubManifest, /"start_url": "\/hub\/"/)
assert.match(hubManifest, /"scope": "\/hub\/"/)
assert.match(teacherManifest, /"start_url": "\/teacher\/mobile"/)
assert.match(careManifest, /"start_url": "\/care\/"/)
assert.match(hubSw, /self\.addEventListener\('fetch'/)
assert.match(hubSession, /hyper-hub-last-access-key/)
assert.match(studentPush, /STUDENT_SW_SCOPE = '\/hub\/'/)
assert.match(parentPush, /PARENT_SW_SCOPE = '\/care\/'/)
assert.match(teacherPush, /TEACHER_SW_SCOPE = '\/teacher\/'/)

const originalFetch = globalThis.fetch
globalThis.fetch = async (input: RequestInfo | URL) => {
  const href = String(input instanceof Request ? input.url : input)
  assert.match(href, /\/index\.html$/)
  return new Response(indexHtml, { status: 200, headers: { 'Content-Type': 'text/html' } })
}
try {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  const android =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'

  const hubIphone = await runHubMiddleware(
    new Request('https://hyper-student-care.vercel.app/hub/studentAccessKeyAAA', {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.ok(hubIphone)
  const hubIphoneHtml = await hubIphone.text()
  assert.match(hubIphoneHtml, /id="app-manifest" href="\/hub\/manifest.webmanifest\?v=1-installable"/)
  assert.doesNotMatch(
    hubIphoneHtml,
    /<link rel="manifest" id="app-manifest" href="\/teacher\/manifest.webmanifest" \/>/,
  )
  assert.match(hubIphoneHtml, /<div id="root"><\/div>/)

  const hubAndroid = await runHubMiddleware(
    new Request('https://hyper-student-care.vercel.app/hub/studentAccessKeyAAA', {
      headers: { 'user-agent': android },
    }),
  )
  assert.ok(hubAndroid)
  assert.match(await hubAndroid.text(), /\/hub\/manifest.webmanifest\?v=1-installable/)

  const careSafari = await runHubMiddleware(
    new Request('https://hyper-student-care.vercel.app/care/parentAccessKeyAAA', {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.equal(careSafari, undefined)

  const teacherSafari = await runHubMiddleware(
    new Request('https://hyper-student-care.vercel.app/teacher/mobile', {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.equal(teacherSafari, undefined)

  const hubAsset = await runHubMiddleware(
    new Request('https://hyper-student-care.vercel.app/hub/sw.js', {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.equal(hubAsset, undefined)

  const hubCrawler = await runHubMiddleware(
    new Request('https://hyper-student-care.vercel.app/hub/studentAccessKeyAAA', {
      headers: { 'user-agent': 'facebookexternalhit/1.1' },
    }),
  )
  assert.ok(hubCrawler)
  const crawlerHtml = await hubCrawler.text()
  assert.match(crawlerHtml, /\/hub\/manifest.webmanifest/)
  assert.doesNotMatch(crawlerHtml, /<div id="root">/)
} finally {
  globalThis.fetch = originalFetch
}

console.log('hubIosHtmlManifest.test.ts passed')
