/**
 * 실행: npx tsx src/hub/hubInstallGuide.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { resolveHubInstallGuide } from './hubInstallEnv.ts'

const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
const ANDROID_KAKAO =
  'Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 KAKAOTALK'
const ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36'
const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
const IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.108 Mobile/15E148 Safari/604.1'
const IOS_KAKAO =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK Safari/604.1'
const DESKTOP_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

assert.equal(
  resolveHubInstallGuide({ userAgent: ANDROID_CHROME, standalone: true, canInstall: true }),
  'hidden',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: ANDROID_CHROME, standalone: false, canInstall: true }),
  'android-install',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: ANDROID_CHROME, standalone: false, canInstall: false }),
  'android-menu',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: ANDROID_KAKAO, standalone: false, canInstall: false }),
  'in-app',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: ANDROID_KAKAO, standalone: false, canInstall: true }),
  'in-app',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: ANDROID_WEBVIEW, standalone: false, canInstall: false }),
  'in-app',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: IOS_SAFARI, standalone: false, canInstall: false }),
  'ios-safari',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: IOS_SAFARI, standalone: true, canInstall: false }),
  'hidden',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: IOS_CHROME, standalone: false, canInstall: false }),
  'ios-safari-needed',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: IOS_KAKAO, standalone: false, canInstall: false }),
  'in-app',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: DESKTOP_CHROME, standalone: false, canInstall: false }),
  'hidden',
)
assert.equal(
  resolveHubInstallGuide({ userAgent: DESKTOP_CHROME, standalone: false, canInstall: true }),
  'android-install',
)

const home = readFileSync('src/hub/HubHomePage.tsx', 'utf8')
const guide = readFileSync('src/components/hub/HubInstallGuide.tsx', 'utf8')
const manifest = readFileSync('public/hub/manifest.webmanifest', 'utf8')
const registrar = readFileSync('src/hub/HubPwaRegistrar.tsx', 'utf8')
const studentPush = readFileSync('src/lib/studentPushClient.ts', 'utf8')
const parentPush = readFileSync('src/lib/parentPushClient.ts', 'utf8')
const teacherPush = readFileSync('src/lib/teacherPushClient.ts', 'utf8')
const optIn = readFileSync('src/components/hub/StudentPushOptIn.tsx', 'utf8')
const teacherPrompt = readFileSync('src/components/teacherMobile/PwaInstallPrompt.tsx', 'utf8')

assert.match(home, /HubInstallGuide/)
assert.match(home, /StudentPushOptIn/)
assert.match(guide, /usePwaInstall/)
assert.match(guide, /학습 허브 설치/)
assert.match(guide, /홈 화면에 추가/)
assert.match(guide, /Chrome 또는 Safari/)
assert.doesNotMatch(guide, /studentAccessKey|accessKey/)
assert.doesNotMatch(guide, /fixed inset/)
assert.doesNotMatch(guide, /prompt\(\)/)
assert.match(manifest, /"start_url": "\/hub\/"/)
assert.match(manifest, /"scope": "\/hub\/"/)
assert.match(registrar, /rememberHubAccessKey/)
assert.match(studentPush, /STUDENT_SW_SCOPE = '\/hub\/'/)
assert.match(parentPush, /PARENT_SW_SCOPE = '\/care\/'/)
assert.match(teacherPush, /TEACHER_SW_SCOPE = '\/teacher\/'/)
assert.match(optIn, /ios-install-required/)
assert.match(teacherPrompt, /HYPER TEACHER 설치/)

console.log('hubInstallGuide.test.ts passed')
