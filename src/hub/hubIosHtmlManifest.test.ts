/**
 * 실행: npx tsx src/hub/hubIosHtmlManifest.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  applyHubManifestStartUrl,
  hubLaunchPathFromPathname,
  hubManifestHrefForPath,
  parseHubManifestStartParam,
  patchIndexHtmlForHub,
  default as runHubMiddleware,
} from '../../middleware.ts'
import { hubPwaManifestHref } from './hubSession.ts'

const indexHtml = readFileSync('index.html', 'utf8')
const middleware = readFileSync('middleware.ts', 'utf8')
const hubManifest = readFileSync('public/hub/manifest.webmanifest', 'utf8')
const teacherManifest = readFileSync('public/teacher/manifest.webmanifest', 'utf8')
const hubSw = readFileSync('public/hub/sw.js', 'utf8')
const hubSession = readFileSync('src/hub/hubSession.ts', 'utf8')
const registrar = readFileSync('src/hub/HubPwaRegistrar.tsx', 'utf8')
const studentPush = readFileSync('src/lib/studentPushClient.ts', 'utf8')
const parentPush = readFileSync('src/lib/parentPushClient.ts', 'utf8')
const teacherPush = readFileSync('src/lib/teacherPushClient.ts', 'utf8')
const careManifest = readFileSync('public/care/manifest.webmanifest', 'utf8')
const teacherSw = readFileSync('public/teacher/sw.js', 'utf8')
const careSw = readFileSync('public/care/sw.js', 'utf8')

const KEY_A = 'hubkeyAAAA1234567890abcd'
const KEY_B = 'hubkeyBBBB1234567890abcd'
const START_A = `/hub/${KEY_A}`
const START_B = `/hub/${KEY_B}`
const HREF_A = `/hub/manifest.webmanifest?v=15-installable&start=${encodeURIComponent(START_A)}`
const HREF_B = `/hub/manifest.webmanifest?v=15-installable&start=${encodeURIComponent(START_B)}`

assert.match(
  indexHtml,
  /<link rel="manifest" id="app-manifest" href="\/teacher\/manifest.webmanifest" \/>/,
)
assert.match(indexHtml, /isHub/)
assert.match(indexHtml, /\/hub\/manifest.webmanifest\?v=15-installable/)
assert.match(indexHtml, /encodeURIComponent\('\/hub\/' \+ hubKey\)/)

const patched = patchIndexHtmlForHub(indexHtml)
assert.match(
  patched,
  /<link rel="manifest" id="app-manifest" href="\/hub\/manifest.webmanifest\?v=15-installable" \/>/,
)
assert.doesNotMatch(
  patched,
  /<link rel="manifest" id="app-manifest" href="[^"]*[?&]start=/,
)
assert.doesNotMatch(
  patched,
  /<link rel="manifest" id="app-manifest" href="\/teacher\/manifest.webmanifest" \/>/,
)
assert.match(patched, /manifest\.href = '\/teacher\/manifest.webmanifest\?v=15-installable'/)
assert.match(patched, /isTeacher/)
assert.notEqual(patched, indexHtml)
assert.equal(patchIndexHtmlForHub(patched), patched)

const patchedA = patchIndexHtmlForHub(indexHtml, START_A)
assert.match(patchedA, new RegExp(`id="app-manifest" href="${HREF_A.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))
assert.doesNotMatch(patchedA, new RegExp(encodeURIComponent(START_B)))
assert.match(patchedA, /manifest\.href = '\/teacher\/manifest.webmanifest\?v=15-installable'/)

const patchedB = patchIndexHtmlForHub(indexHtml, `/hub/${KEY_B}/materials`)
assert.match(patchedB, new RegExp(encodeURIComponent(START_B)))
assert.doesNotMatch(patchedB, new RegExp(encodeURIComponent(START_A)))
assert.notEqual(hubManifestHrefForPath(START_A), hubManifestHrefForPath(START_B))
assert.equal(hubManifestHrefForPath('/hub/'), '/hub/manifest.webmanifest?v=15-installable')
assert.equal(hubLaunchPathFromPathname('/hub/sw.js'), null)
assert.equal(hubLaunchPathFromPathname('/hub/manifest.webmanifest'), null)
assert.equal(parseHubManifestStartParam('https://evil.example/hub/x'), null)
assert.equal(parseHubManifestStartParam('/teacher/mobile'), null)
assert.equal(parseHubManifestStartParam('/care/parentAccessKeyAAA'), null)
assert.equal(parseHubManifestStartParam(START_A), START_A)
assert.equal(hubPwaManifestHref(KEY_A), HREF_A)
assert.equal(hubPwaManifestHref(''), '/hub/manifest.webmanifest?v=15-installable')

assert.match(middleware, /patchIndexHtmlForHub/)
assert.match(middleware, /hubManifestHrefForPath/)
assert.match(middleware, /parseHubManifestStartParam/)
assert.match(middleware, /CDN-Cache-Control/)
assert.match(middleware, /fetch\(new URL\('\/index.html'/)
assert.match(middleware, /matcher: \['\/care\/:path\*', '\/hub\/:path\*']/)
assert.doesNotMatch(middleware, /\/teacher\/mobile/)
assert.doesNotMatch(middleware, /console\.log/)

assert.match(hubManifest, /"id": "\/hub\/"/)
assert.match(hubManifest, /"start_url": "\/hub\/"/)
assert.match(hubManifest, /"scope": "\/hub\/"/)
assert.doesNotMatch(hubManifest, /hubkey/)
assert.match(teacherManifest, /"start_url": "\/teacher\/mobile"/)
assert.match(careManifest, /"start_url": "\/care\/"/)
assert.match(hubSw, /self\.addEventListener\('fetch'/)
assert.match(hubSw, /url: '\/hub\/'/)
assert.match(hubSw, /payload\.url \|\| '\/hub\/'/)
assert.match(teacherSw, /\/teacher\//)
assert.match(careSw, /\/care\//)
assert.match(hubSession, /hyper-hub-last-access-key/)
assert.match(hubSession, /hubPwaManifestHref/)
assert.match(registrar, /hubPwaManifestHref\(key\)/)
assert.match(registrar, /rememberHubAccessKey/)
assert.match(studentPush, /STUDENT_SW_SCOPE = '\/hub\/'/)
assert.match(parentPush, /PARENT_SW_SCOPE = '\/care\/'/)
assert.match(teacherPush, /TEACHER_SW_SCOPE = '\/teacher\/'/)

const manifestA = applyHubManifestStartUrl(hubManifest, START_A)
const manifestB = applyHubManifestStartUrl(hubManifest, START_B)
const jsonA = JSON.parse(manifestA) as { id: string; start_url: string; scope: string; icons: unknown[] }
const jsonB = JSON.parse(manifestB) as { id: string; start_url: string; scope: string; icons: unknown[] }
assert.equal(jsonA.start_url, START_A)
assert.equal(jsonB.start_url, START_B)
assert.equal(jsonA.id, '/hub/')
assert.equal(jsonB.id, '/hub/')
assert.equal(jsonA.scope, '/hub/')
assert.equal(jsonB.scope, '/hub/')
assert.deepEqual(jsonA.icons, jsonB.icons)
assert.notEqual(manifestA, manifestB)
assert.equal(jsonA.id, JSON.parse(hubManifest).id)
assert.equal(jsonA.scope, JSON.parse(hubManifest).scope)

const originalFetch = globalThis.fetch
globalThis.fetch = async (input: RequestInfo | URL) => {
  const href = String(input instanceof Request ? input.url : input)
  const fetched = new URL(href)
  if (fetched.pathname === '/index.html') {
    return new Response(indexHtml, { status: 200, headers: { 'Content-Type': 'text/html' } })
  }
  if (fetched.pathname === '/hub/manifest.webmanifest') {
    assert.equal(fetched.search, '')
    return new Response(hubManifest, {
      status: 200,
      headers: { 'Content-Type': 'application/manifest+json' },
    })
  }
  throw new Error(`unexpected fetch ${href}`)
}
try {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
  const android =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'

  const hubIphone = await runHubMiddleware(
    new Request(`https://hyper-student-care.vercel.app${START_A}`, {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.ok(hubIphone)
  const hubIphoneHtml = await hubIphone.text()
  assert.match(hubIphoneHtml, new RegExp(`id="app-manifest" href="${HREF_A.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))
  assert.doesNotMatch(hubIphoneHtml, new RegExp(encodeURIComponent(START_B)))
  assert.doesNotMatch(
    hubIphoneHtml,
    /<link rel="manifest" id="app-manifest" href="\/teacher\/manifest.webmanifest" \/>/,
  )
  assert.match(hubIphoneHtml, /<div id="root"><\/div>/)
  assert.match(hubIphone.headers.get('cache-control') ?? '', /no-store/)

  const hubIphoneB = await runHubMiddleware(
    new Request(`https://hyper-student-care.vercel.app${START_B}`, {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.ok(hubIphoneB)
  const hubIphoneHtmlB = await hubIphoneB.text()
  assert.match(hubIphoneHtmlB, new RegExp(encodeURIComponent(START_B)))
  assert.doesNotMatch(hubIphoneHtmlB, new RegExp(encodeURIComponent(START_A)))

  const hubAndroid = await runHubMiddleware(
    new Request(`https://hyper-student-care.vercel.app${START_A}`, {
      headers: { 'user-agent': android },
    }),
  )
  assert.ok(hubAndroid)
  assert.match(await hubAndroid.text(), new RegExp(encodeURIComponent(START_A)))

  const hubRoot = await runHubMiddleware(
    new Request('https://hyper-student-care.vercel.app/hub/', {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.ok(hubRoot)
  const hubRootHtml = await hubRoot.text()
  assert.match(
    hubRootHtml,
    /<link rel="manifest" id="app-manifest" href="\/hub\/manifest.webmanifest\?v=15-installable" \/>/,
  )
  assert.doesNotMatch(
    hubRootHtml,
    /<link rel="manifest" id="app-manifest" href="[^"]*[?&]start=/,
  )

  const manifestReqA = await runHubMiddleware(
    new Request(`https://hyper-student-care.vercel.app${HREF_A}`, {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.ok(manifestReqA)
  const manifestBodyA = JSON.parse(await manifestReqA.text()) as { start_url: string; id: string; scope: string }
  assert.equal(manifestBodyA.start_url, START_A)
  assert.equal(manifestBodyA.id, '/hub/')
  assert.equal(manifestBodyA.scope, '/hub/')
  assert.match(manifestReqA.headers.get('content-type') ?? '', /application\/manifest\+json/)
  assert.match(manifestReqA.headers.get('cache-control') ?? '', /no-store/)
  assert.equal(manifestReqA.headers.get('cdn-cache-control'), 'no-store')

  const manifestReqB = await runHubMiddleware(
    new Request(`https://hyper-student-care.vercel.app${HREF_B}`, {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.ok(manifestReqB)
  const manifestBodyB = JSON.parse(await manifestReqB.text()) as { start_url: string }
  assert.equal(manifestBodyB.start_url, START_B)
  assert.notEqual(manifestBodyA.start_url, manifestBodyB.start_url)

  const staticManifest = await runHubMiddleware(
    new Request('https://hyper-student-care.vercel.app/hub/manifest.webmanifest?v=15-installable', {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.equal(staticManifest, undefined)

  const evilManifest = await runHubMiddleware(
    new Request('https://hyper-student-care.vercel.app/hub/manifest.webmanifest?start=https://evil.example/', {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.equal(evilManifest, undefined)

  const teacherStart = await runHubMiddleware(
    new Request('https://hyper-student-care.vercel.app/hub/manifest.webmanifest?start=/teacher/mobile', {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.equal(teacherStart, undefined)

  const careSafari = await runHubMiddleware(
    new Request('https://hyper-student-care.vercel.app/care/parentAccessKeyAAA', {
      headers: { 'user-agent': iphone },
    }),
  )
  assert.ok(careSafari)
  const careHtml = await careSafari.text()
  assert.match(careHtml, /\/care\/manifest\.webmanifest\?v=15-installable&start=/)
  assert.match(careHtml, /start=%2Fcare%2FparentAccessKeyAAA/)
  assert.match(careHtml, /<div id="root"><\/div>/)
  assert.doesNotMatch(
    careHtml,
    /<link rel="manifest" id="app-manifest" href="\/teacher\/manifest.webmanifest" \/>/,
  )

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
    new Request(`https://hyper-student-care.vercel.app${START_A}`, {
      headers: { 'user-agent': 'facebookexternalhit/1.1' },
    }),
  )
  assert.ok(hubCrawler)
  const crawlerHtml = await hubCrawler.text()
  assert.match(crawlerHtml, /\/hub\/manifest.webmanifest/)
  assert.doesNotMatch(crawlerHtml, /<div id="root">/)
  assert.doesNotMatch(crawlerHtml, /[?&]start=/)
} finally {
  globalThis.fetch = originalFetch
}

console.log('hubIosHtmlManifest.test.ts passed')
