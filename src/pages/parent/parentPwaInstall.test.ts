/**
 * 실행: npx tsx src/pages/parent/parentPwaInstall.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  applyHubManifestStartUrl,
  careLaunchPathFromPathname,
  careManifestHrefForPath,
  parseCareManifestStartParam,
  parseHubManifestStartParam,
  patchIndexHtmlForCare,
  patchIndexHtmlForHub,
  default as runMiddleware,
} from '../../../middleware.ts'
import { resolveHubInstallGuide } from '../../hub/hubInstallEnv.ts'
import {
  kakaoOpenExternalHref,
  parentAndroidChromeIntentHref,
  parentCareHomeAbsoluteUrl,
  resolveParentInstallGuide,
} from '../../lib/parentInstallGuide.ts'
import {
  parentCareHomePath,
  parentPwaManifestHref,
} from '../../lib/parentLastCareRoute.ts'

const indexHtml = readFileSync('index.html', 'utf8')
const middleware = readFileSync('middleware.ts', 'utf8')
const careManifest = readFileSync('public/care/manifest.webmanifest', 'utf8')
const hubManifest = readFileSync('public/hub/manifest.webmanifest', 'utf8')
const teacherManifest = readFileSync('public/teacher/manifest.webmanifest', 'utf8')
const guide = readFileSync('src/components/parent/ParentInstallGuide.tsx', 'utf8')
const registrar = readFileSync('src/components/parent/ParentPwaRegistrar.tsx', 'utf8')
const launch = readFileSync('src/pages/parent/ParentLaunchPage.tsx', 'utf8')
const home = readFileSync('src/pages/parent/ParentStudentHomePage.tsx', 'utf8')
const layout = readFileSync('src/components/layout/ParentStudentLayout.tsx', 'utf8')
const app = readFileSync('src/App.tsx', 'utf8')
const pushOptIn = readFileSync('src/components/parent/ParentPushOptIn.tsx', 'utf8')
const pushClient = readFileSync('src/lib/parentPushClient.ts', 'utf8')
const hubHome = readFileSync('src/hub/HubHomePage.tsx', 'utf8')
const teacherHome = readFileSync('src/pages/teacherMobile/TeacherMobileDashboardPage.tsx', 'utf8')
const dashboard = readFileSync('src/pages/DashboardPage.tsx', 'utf8')

const KEY_A = 'parentKeyAAA1234567890ab'
const KEY_B = 'parentKeyBBBB1234567890ab'
const START_A = `/care/${KEY_A}`
const START_B = `/care/${KEY_B}`
const ORIGIN = 'https://hyper-student-care.vercel.app'
const CARE_A = `${ORIGIN}${START_A}`
const HREF_A = `/care/manifest.webmanifest?v=17-installable&start=${encodeURIComponent(START_A)}`
const HREF_B = `/care/manifest.webmanifest?v=17-installable&start=${encodeURIComponent(START_B)}`
const ANDROID_KAKAO =
  'Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 KAKAOTALK'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const ANDROID_INSTAGRAM =
  'Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 Instagram'
const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IOS_KAKAO =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK Safari/604.1'
const hubGuide = readFileSync('src/components/hub/HubInstallGuide.tsx', 'utf8')
const installLib = readFileSync('src/lib/parentInstallGuide.ts', 'utf8')

assert.equal(
  resolveHubInstallGuide({ userAgent: ANDROID_KAKAO, standalone: false, canInstall: false }),
  'in-app',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: ANDROID_CHROME, standalone: false, canInstall: true }),
  'android-install',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: ANDROID_CHROME, standalone: true, canInstall: false }),
  'hidden',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: IOS_SAFARI, standalone: false, canInstall: false }),
  'ios-safari',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: IOS_KAKAO, standalone: false, canInstall: false }),
  'in-app',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: IOS_SAFARI, standalone: true, canInstall: false }),
  'hidden',
)

assert.equal(
  resolveParentInstallGuide({ userAgent: ANDROID_KAKAO, standalone: false, canInstall: false }),
  'kakao-android',
)
assert.equal(
  resolveParentInstallGuide({ userAgent: ANDROID_KAKAO, standalone: false, canInstall: true }),
  'android-install',
)
assert.equal(
  resolveParentInstallGuide({ userAgent: ANDROID_CHROME, standalone: false, canInstall: true }),
  'android-install',
)
assert.equal(
  resolveParentInstallGuide({ userAgent: ANDROID_CHROME, standalone: true, canInstall: true }),
  'hidden',
)
assert.equal(
  resolveParentInstallGuide({ userAgent: IOS_KAKAO, standalone: false, canInstall: false }),
  'kakao-ios',
)
assert.equal(
  resolveParentInstallGuide({ userAgent: IOS_SAFARI, standalone: false, canInstall: false }),
  'ios-safari',
)
assert.equal(
  resolveParentInstallGuide({ userAgent: ANDROID_INSTAGRAM, standalone: false, canInstall: false }),
  'in-app',
)

assert.equal(parentCareHomeAbsoluteUrl(ORIGIN, KEY_A), CARE_A)
assert.equal(parentCareHomeAbsoluteUrl(ORIGIN, 'short'), null)
assert.equal(parentCareHomeAbsoluteUrl('not-a-url', KEY_A), null)
assert.equal(
  kakaoOpenExternalHref(CARE_A, ORIGIN),
  `kakaotalk://web/openExternal?url=${encodeURIComponent(CARE_A)}`,
)
assert.doesNotMatch(kakaoOpenExternalHref(CARE_A, ORIGIN) ?? '', /intent:\/\//)
assert.equal(kakaoOpenExternalHref(`${ORIGIN}/hub/${KEY_A}`, ORIGIN), null)
assert.equal(kakaoOpenExternalHref(`${ORIGIN}/teacher/mobile`, ORIGIN), null)
assert.equal(kakaoOpenExternalHref(`${ORIGIN}/care/${KEY_A}?x=1`, ORIGIN), null)
assert.equal(kakaoOpenExternalHref('https://evil.example/care/' + KEY_A, ORIGIN), null)
assert.equal(kakaoOpenExternalHref('javascript:alert(1)', ORIGIN), null)
assert.match(kakaoOpenExternalHref(CARE_A, ORIGIN) ?? '', new RegExp(encodeURIComponent(START_A)))
assert.doesNotMatch(kakaoOpenExternalHref(CARE_A, ORIGIN) ?? '', new RegExp(encodeURIComponent(START_B)))

const CHROME_INTENT_A = `intent://hyper-student-care.vercel.app${START_A}#Intent;scheme=https;package=com.android.chrome;end`
assert.equal(parentAndroidChromeIntentHref(ORIGIN, KEY_A), CHROME_INTENT_A)
assert.equal(parentAndroidChromeIntentHref(ORIGIN, KEY_B)?.includes(KEY_B), true)
assert.equal(parentAndroidChromeIntentHref(ORIGIN, KEY_A)?.includes(KEY_A), true)
assert.doesNotMatch(parentAndroidChromeIntentHref(ORIGIN, KEY_A) ?? '', new RegExp(KEY_B))
assert.match(parentAndroidChromeIntentHref(ORIGIN, KEY_A) ?? '', new RegExp(START_A.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
assert.doesNotMatch(parentAndroidChromeIntentHref(ORIGIN, KEY_A) ?? '', /browser_fallback_url/)
assert.doesNotMatch(parentAndroidChromeIntentHref(ORIGIN, KEY_A) ?? '', /market:/)
assert.doesNotMatch(parentAndroidChromeIntentHref(ORIGIN, KEY_A) ?? '', /com\.android\.vending/)
assert.doesNotMatch(parentAndroidChromeIntentHref(ORIGIN, KEY_A) ?? '', /component=/)
assert.doesNotMatch(parentAndroidChromeIntentHref(ORIGIN, KEY_A) ?? '', /googlechrome/)
assert.doesNotMatch(parentAndroidChromeIntentHref(ORIGIN, KEY_A) ?? '', /kakaotalk:/)
assert.equal(parentAndroidChromeIntentHref(ORIGIN, 'short'), null)
assert.equal(parentAndroidChromeIntentHref('https://evil.example', KEY_A), null)
assert.equal(parentAndroidChromeIntentHref('https://hyper-student-care.vercel.app.evil.example', KEY_A), null)
assert.equal(parentAndroidChromeIntentHref('http://hyper-student-care.vercel.app', KEY_A), null)
assert.equal(parentAndroidChromeIntentHref('https://hyper-student-care-git-preview.vercel.app', KEY_A), null)
assert.equal(parentAndroidChromeIntentHref(`https://user:pass@hyper-student-care.vercel.app`, KEY_A), null)
assert.equal(parentAndroidChromeIntentHref('javascript:alert(1)', KEY_A), null)
assert.equal(parentAndroidChromeIntentHref(ORIGIN, `${KEY_A}/today-report`), null)
assert.equal(parentAndroidChromeIntentHref(ORIGIN, `../hub/${KEY_A}`), null)

const parsedIntent = /^intent:\/\/([^#]+)#Intent;scheme=https;package=com\.android\.chrome;end$/.exec(
  parentAndroidChromeIntentHref(ORIGIN, KEY_A) ?? '',
)
assert.ok(parsedIntent)
assert.equal(`https://${parsedIntent[1]}`, CARE_A)

assert.match(guide, /Chrome에서 HYPER 학부모 앱 설치/)
assert.match(guide, /HYPER 학부모 앱 설치/)
assert.match(guide, /다른 브라우저로 열기/)
assert.match(guide, /화면 아래쪽/)
assert.match(guide, /Chrome이 없거나/)
assert.match(guide, /parentAndroidChromeIntentHref/)
assert.match(guide, /kakaoOpenExternalHref/)
assert.match(guide, /parentCareHomeAbsoluteUrl/)
assert.match(guide, /kind === 'kakao-android'/)
assert.match(guide, /kind !== 'kakao-ios'/)
assert.match(installLib, /kakaotalk:\/\/web\/openExternal/)
assert.match(installLib, /package=com\.android\.chrome/)
assert.match(installLib, /PARENT_PWA_PRODUCTION_ORIGIN/)
assert.doesNotMatch(installLib, /S\.browser_fallback_url/)
assert.doesNotMatch(installLib, /market:\/\//)
assert.doesNotMatch(installLib, /googlechrome:/)
assert.match(guide, /홈 화면에 추가/)
assert.match(guide, /usePwaInstall/)
assert.match(guide, /Safari로 열기/)
assert.doesNotMatch(guide, /오른쪽 위 메뉴에서 Chrome/)
assert.doesNotMatch(guide, /intent:\/\//)
assert.doesNotMatch(guide, /package=com\.android\.chrome/)
assert.doesNotMatch(guide, /googlechrome:/)
assert.doesNotMatch(guide, /location\.href/)
assert.doesNotMatch(guide, /location\.replace/)

assert.match(hubGuide, /오른쪽 위 메뉴에서 Chrome 또는 Safari로 연 다음/)
assert.doesNotMatch(hubGuide, /kakaoOpenExternalHref/)
assert.doesNotMatch(hubGuide, /parentAndroidChromeIntentHref/)
assert.doesNotMatch(hubGuide, /Chrome에서 HYPER 학부모 앱 설치/)
assert.doesNotMatch(hubGuide, /intent:\/\//)
assert.doesNotMatch(hubGuide, /package=com\.android\.chrome/)

assert.match(home, /ParentInstallGuide studentAccessKey=\{student\.studentAccessKey\}/)
assert.match(home, /ParentPushOptIn/)
assert.match(layout, /ParentPwaRegistrar/)
assert.match(registrar, /parentPwaManifestHref\(key\)/)
assert.match(registrar, /rememberParentAccessKey/)
assert.match(launch, /readLastParentAccessKey/)
assert.match(launch, /학원에서 받은 학부모 전용 링크로 들어와 주세요/)
assert.match(app, /path="\/care" element=\{<ParentLaunchPage \/>\}/)
assert.match(pushClient, /PARENT_SW_SCOPE = '\/care\/'/)
assert.match(pushOptIn, /알림 받기/)

assert.equal(parentPwaManifestHref(KEY_A), HREF_A)
assert.equal(parentPwaManifestHref(''), '/care/manifest.webmanifest?v=17-installable')
assert.equal(parentPwaManifestHref('short'), '/care/manifest.webmanifest?v=17-installable')
assert.equal(parentCareHomePath(KEY_A), START_A)
assert.equal(careLaunchPathFromPathname(START_A), START_A)
assert.equal(careLaunchPathFromPathname(`${START_A}/today-report`), START_A)
assert.equal(careLaunchPathFromPathname('/care/sw.js'), null)
assert.equal(careLaunchPathFromPathname('/hub/' + KEY_A), null)
assert.equal(parseCareManifestStartParam('https://evil.example/care/x'), null)
assert.equal(parseCareManifestStartParam('/teacher/mobile'), null)
assert.equal(parseCareManifestStartParam('/hub/' + KEY_A), null)
assert.equal(parseCareManifestStartParam('javascript:alert(1)'), null)
assert.equal(parseCareManifestStartParam(START_A), START_A)
assert.equal(parseHubManifestStartParam(START_A), null)
assert.equal(careManifestHrefForPath(START_A), HREF_A)
assert.equal(careManifestHrefForPath('/care/'), '/care/manifest.webmanifest?v=17-installable')

assert.match(indexHtml, /encodeURIComponent\('\/care\/' \+ careKey\)/)
assert.match(indexHtml, /\/care\/manifest\.webmanifest\?v=17-installable/)
assert.match(middleware, /patchIndexHtmlForCare/)
assert.match(middleware, /parseCareManifestStartParam/)
assert.match(middleware, /CARE_MANIFEST_PATH/)
assert.match(middleware, /const APP_ORIGIN = 'https:\/\/hyper-student-care\.vercel\.app'/)
assert.match(installLib, /export const PARENT_PWA_PRODUCTION_ORIGIN = 'https:\/\/hyper-student-care\.vercel\.app'/)
assert.doesNotMatch(middleware, /intent:\/\//)

const patched = patchIndexHtmlForCare(indexHtml, START_A)
assert.match(patched, new RegExp(`id="app-manifest" href="${HREF_A.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))
assert.doesNotMatch(patched, /href="\/teacher\/manifest.webmanifest"/)
assert.doesNotMatch(patched, new RegExp(encodeURIComponent(START_B)))
assert.equal(patchIndexHtmlForCare(patched, START_A), patched)

const hubPatched = patchIndexHtmlForHub(indexHtml, `/hub/${KEY_A}`)
assert.match(hubPatched, /\/hub\/manifest\.webmanifest\?v=17-installable&start=/)
assert.doesNotMatch(
  hubPatched,
  /<link rel="manifest" id="app-manifest" href="\/care\/manifest\.webmanifest/,
)

const careJson = JSON.parse(applyHubManifestStartUrl(careManifest, START_A)) as {
  id: string
  start_url: string
  scope: string
}
assert.equal(careJson.start_url, START_A)
assert.equal(careJson.id, '/care/')
assert.equal(careJson.scope, '/care/')
assert.equal(JSON.parse(careManifest).start_url, '/care/')
assert.match(teacherManifest, /"start_url": "\/teacher\/mobile"/)
assert.match(hubManifest, /"start_url": "\/hub\/"/)

assert.match(hubHome, /HubInstallGuide/)
assert.doesNotMatch(hubHome, /ParentInstallGuide/)
assert.doesNotMatch(teacherHome, /ParentInstallGuide/)
assert.doesNotMatch(dashboard, /ParentInstallGuide/)

const originalFetch = globalThis.fetch
globalThis.fetch = async (input: RequestInfo | URL) => {
  const href = String(input instanceof Request ? input.url : input)
  const fetched = new URL(href)
  if (fetched.pathname === '/index.html') {
    return new Response(indexHtml, { status: 200, headers: { 'Content-Type': 'text/html' } })
  }
  if (fetched.pathname === '/care/manifest.webmanifest') {
    assert.equal(fetched.search, '')
    return new Response(careManifest, {
      status: 200,
      headers: { 'Content-Type': 'application/manifest+json' },
    })
  }
  if (fetched.pathname === '/hub/manifest.webmanifest') {
    return new Response(hubManifest, {
      status: 200,
      headers: { 'Content-Type': 'application/manifest+json' },
    })
  }
  throw new Error(`unexpected fetch ${href}`)
}

try {
  const careHtmlRes = await runMiddleware(
    new Request(`https://hyper-student-care.vercel.app${START_A}`, {
      headers: { 'user-agent': IOS_SAFARI },
    }),
  )
  assert.ok(careHtmlRes)
  const careHtml = await careHtmlRes.text()
  assert.match(careHtml, new RegExp(`id="app-manifest" href="${HREF_A.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))
  assert.match(careHtml, /<div id="root"><\/div>/)
  assert.match(careHtmlRes.headers.get('cache-control') ?? '', /no-store/)

  const careHtmlB = await runMiddleware(
    new Request(`https://hyper-student-care.vercel.app${START_B}/today-report`, {
      headers: { 'user-agent': ANDROID_CHROME },
    }),
  )
  assert.ok(careHtmlB)
  const careHtmlBText = await careHtmlB.text()
  assert.match(careHtmlBText, new RegExp(encodeURIComponent(START_B).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.doesNotMatch(careHtmlBText, new RegExp(encodeURIComponent(START_A).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))

  const manifestA = await runMiddleware(
    new Request(`https://hyper-student-care.vercel.app${HREF_A}`, {
      headers: { 'user-agent': IOS_SAFARI },
    }),
  )
  assert.ok(manifestA)
  const bodyA = JSON.parse(await manifestA.text()) as { start_url: string; id: string; scope: string }
  assert.equal(bodyA.start_url, START_A)
  assert.equal(bodyA.id, '/care/')
  assert.equal(bodyA.scope, '/care/')
  assert.match(manifestA.headers.get('content-type') ?? '', /application\/manifest\+json/)
  assert.match(manifestA.headers.get('cache-control') ?? '', /no-store/)
  assert.equal(manifestA.headers.get('cdn-cache-control'), 'no-store')

  const manifestB = await runMiddleware(
    new Request(`https://hyper-student-care.vercel.app${HREF_B}`, {
      headers: { 'user-agent': ANDROID_CHROME },
    }),
  )
  assert.ok(manifestB)
  assert.equal((JSON.parse(await manifestB.text()) as { start_url: string }).start_url, START_B)

  const staticCare = await runMiddleware(
    new Request('https://hyper-student-care.vercel.app/care/manifest.webmanifest?v=17-installable', {
      headers: { 'user-agent': IOS_SAFARI },
    }),
  )
  assert.equal(staticCare, undefined)

  const evil = await runMiddleware(
    new Request('https://hyper-student-care.vercel.app/care/manifest.webmanifest?start=https://evil.example/', {
      headers: { 'user-agent': IOS_SAFARI },
    }),
  )
  assert.equal(evil, undefined)

  const hubStartOnCare = await runMiddleware(
    new Request(`https://hyper-student-care.vercel.app/care/manifest.webmanifest?start=/hub/${KEY_A}`, {
      headers: { 'user-agent': IOS_SAFARI },
    }),
  )
  assert.equal(hubStartOnCare, undefined)

  const teacherStartOnCare = await runMiddleware(
    new Request('https://hyper-student-care.vercel.app/care/manifest.webmanifest?start=/teacher/mobile', {
      headers: { 'user-agent': IOS_SAFARI },
    }),
  )
  assert.equal(teacherStartOnCare, undefined)

  const careRoot = await runMiddleware(
    new Request('https://hyper-student-care.vercel.app/care/', {
      headers: { 'user-agent': IOS_SAFARI },
    }),
  )
  assert.ok(careRoot)
  const careRootHtml = await careRoot.text()
  assert.match(
    careRootHtml,
    /<link rel="manifest" id="app-manifest" href="\/care\/manifest.webmanifest\?v=17-installable" \/>/,
  )
  assert.doesNotMatch(
    careRootHtml,
    /<link rel="manifest" id="app-manifest" href="[^"]*[?&]start=/,
  )

  const hubStillWorks = await runMiddleware(
    new Request(`https://hyper-student-care.vercel.app/hub/${KEY_A}`, {
      headers: { 'user-agent': IOS_SAFARI },
    }),
  )
  assert.ok(hubStillWorks)
  const hubHtml = await hubStillWorks.text()
  assert.match(hubHtml, /\/hub\/manifest\.webmanifest\?v=17-installable&start=/)
  assert.doesNotMatch(
    hubHtml,
    /<link rel="manifest" id="app-manifest" href="\/care\/manifest\.webmanifest/,
  )

  const crawler = await runMiddleware(
    new Request(`https://hyper-student-care.vercel.app${START_A}`, {
      headers: { 'user-agent': 'facebookexternalhit/1.1' },
    }),
  )
  assert.ok(crawler)
  const crawlerHtml = await crawler.text()
  assert.match(crawlerHtml, /\/care\/manifest\.webmanifest/)
  assert.doesNotMatch(crawlerHtml, /<div id="root">/)
  assert.doesNotMatch(crawlerHtml, /[?&]start=/)
} finally {
  globalThis.fetch = originalFetch
}

console.log('parentPwaInstall.test.ts passed')
