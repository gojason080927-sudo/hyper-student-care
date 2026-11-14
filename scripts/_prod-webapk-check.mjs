import sharp from 'sharp'

const origin = 'https://hyper-student-care.vercel.app'
const chromeUa =
  'Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
const webapkUa = `${chromeUa} Chrome-WebAPK Google-Web-APK`

async function probe(ua, path) {
  const res = await fetch(origin + path, {
    headers: { 'User-Agent': ua, Accept: '*/*' },
    cache: 'no-store',
  })
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = res.headers.get('content-type') || ''
  const html = /^\s*<!DOCTYPE html/i.test(buf.subarray(0, 64).toString('utf8'))
  return {
    path,
    status: res.status,
    ct,
    bytes: buf.length,
    html,
    swAllowed: res.headers.get('service-worker-allowed'),
    png: buf[0] === 0x89 && buf[1] === 0x50,
    cache: res.headers.get('x-vercel-cache'),
    body: buf,
  }
}

function urlsFromSw(text) {
  return [...text.matchAll(/url:"([^"]+)"/g)].map((m) => m[1])
}

console.log('=== Chrome UA ===')
for (const p of ['/teacher/mobile', '/teacher/manifest.webmanifest', '/teacher/sw.js']) {
  const r = await probe(chromeUa, p)
  console.log(
    JSON.stringify({
      path: r.path,
      status: r.status,
      ct: r.ct,
      bytes: r.bytes,
      html: r.html,
      swAllowed: r.swAllowed,
      cache: r.cache,
    }),
  )
}

const sw = await probe(chromeUa, '/teacher/sw.js')
const swText = sw.body.toString('utf8')
const precache = urlsFromSw(swText)
const workbox = (swText.match(/workbox-[a-z0-9]+/i) || ['workbox-abeb32eb'])[0] + '.js'
console.log('precache', precache)
const bad = precache.filter(
  (u) =>
    u.startsWith('/teacher/teacher/') ||
    u.startsWith('/teacher/assets/') ||
    u === '/teacher/index.html' ||
    !u.startsWith('/'),
)
console.log(bad.length ? 'FAIL nested ' + bad.join(',') : 'PASS origin-absolute precache')
const wb = await probe(chromeUa, '/teacher/' + workbox)
console.log('workbox', wb.status, wb.ct, wb.bytes, 'html=' + wb.html)

const man = JSON.parse((await probe(chromeUa, '/teacher/manifest.webmanifest')).body.toString('utf8'))
console.log('teacher manifest', {
  id: man.id,
  start_url: man.start_url,
  scope: man.scope,
  display: man.display,
  icons: man.icons,
})

const parentMan = JSON.parse((await probe(chromeUa, '/care/manifest.webmanifest')).body.toString('utf8'))
console.log(
  'parent manifest icons',
  parentMan.icons.map((i) => `${i.src} ${i.purpose}`),
)

console.log('=== WebAPK UA ===')
const stub = await probe(webapkUa, '/teacher/mobile')
const stubText = stub.body.toString('utf8')
console.log(
  JSON.stringify({ path: stub.path, status: stub.status, ct: stub.ct, bytes: stub.bytes, html: stub.html }),
)
console.log('stub has SW register', stubText.includes("serviceWorker.register('/teacher/sw.js'"))
console.log(stubText)

const iconPaths = [
  '/teacher/hyper-teacher-icon-192-v5.png',
  '/teacher/hyper-teacher-icon-512-v5.png',
  '/teacher/hyper-teacher-maskable-192-v5.png',
  '/teacher/hyper-teacher-maskable-512-v5.png',
  '/care/hyper-parent-icon-192-v5.png',
  '/care/hyper-parent-icon-512-v5.png',
  '/care/hyper-parent-maskable-192-v5.png',
  '/care/hyper-parent-maskable-512-v5.png',
]
for (const [uaName, ua] of [
  ['chrome', chromeUa],
  ['webapk', webapkUa],
]) {
  console.log('=== icons', uaName, '===')
  for (const p of [...iconPaths, '/teacher/sw.js', '/teacher/manifest.webmanifest', '/teacher/' + workbox]) {
    const r = await probe(ua, p)
    let px = null
    if (r.png) {
      const meta = await sharp(r.body).metadata()
      px = `${meta.width}x${meta.height}`
    }
    console.log(
      JSON.stringify({
        path: p,
        status: r.status,
        ct: r.ct,
        png: r.png,
        html: r.html,
        bytes: r.bytes,
        px,
        swAllowed: r.swAllowed,
      }),
    )
  }
}
