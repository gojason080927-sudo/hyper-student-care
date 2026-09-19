/**
 * Vercel Edge Middleware — KakaoTalk / SNS crawlers scraping /care/* receive
 * lightweight HTML with correct og:url (must match accessed URL per Kakao spec).
 *
 * Teacher /teacher/* is intentionally not rewritten. A previous WebAPK HTML stub
 * served a different document than real Chrome for start_url and did not produce
 * a WebAPK on device. WebAPK minting must see the same start_url document.
 *
 * /hub/* HTML must advertise the Hub manifest in the first bytes. iOS Safari
 * Add to Home Screen uses that static <link rel="manifest"> and ignores the
 * later JS rewrite, which would otherwise install Teacher PWA.
 *
 * When the page is /hub/{accessKey}, that first HTML must point at a unique
 * Hub manifest URL whose start_url is /hub/{accessKey}. iOS standalone storage
 * is isolated from Safari, so a shared start_url of /hub/ cannot restore the key.
 *
 * /care/{accessKey} uses the same first-HTML + start_url pattern so Parent PWA
 * install does not mint Teacher PWA and launches the same child HOME.
 */
const APP_ORIGIN = 'https://hyper-student-care.vercel.app'
const OG_IMAGE = `${APP_ORIGIN}/hyper-student-care-share-v3.jpg`

const CRAWLER_UA =
  /kakaotalk-scrap|facebookexternalhit|twitterbot|slackbot|discordbot|whatsapp|linkedinbot|telegrambot|yeti|kakaotalkbot|bingbot|googlebot|bot|crawl|spider|preview/i

const STATIC_ASSET =
  /\.(?:webmanifest|js|mjs|cjs|css|png|ico|svg|webp|json|map|txt|woff2?|ttf|otf|eot|jpg|jpeg|gif|avif)$/i

const TEACHER_MANIFEST_HREF = '/teacher/manifest.webmanifest'
const HUB_MANIFEST_PATH = '/hub/manifest.webmanifest'
const HUB_MANIFEST_HREF = '/hub/manifest.webmanifest?v=20-installable'
const CARE_MANIFEST_PATH = '/care/manifest.webmanifest'
const CARE_MANIFEST_HREF = '/care/manifest.webmanifest?v=20-installable'
const TEACHER_MANIFEST_LINK = `<link rel="manifest" id="app-manifest" href="${TEACHER_MANIFEST_HREF}" />`
const HUB_KEY_RE = /^[A-Za-z0-9_-]{12,128}$/

const HUB_HTML_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'CDN-Cache-Control': 'no-store',
} as const

const HUB_MANIFEST_HEADERS = {
  'Content-Type': 'application/manifest+json; charset=utf-8',
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  'CDN-Cache-Control': 'no-store',
} as const

function isHubPath(pathname: string): boolean {
  return pathname === '/hub' || pathname.startsWith('/hub/')
}

function isCarePath(pathname: string): boolean {
  return pathname === '/care' || pathname.startsWith('/care/')
}

function decodePathSegment(raw: string): string | null {
  try {
    return decodeURIComponent(raw).trim()
  } catch {
    return null
  }
}

/** /hub/{accessKey} launch path only. Subpages normalize to the student home. */
export function hubLaunchPathFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/hub\/([^/]+)(?:\/.*)?$/)
  if (!match) return null
  const key = decodePathSegment(match[1])
  if (!key || !HUB_KEY_RE.test(key)) return null
  return `/hub/${key}`
}

export function parseHubManifestStartParam(raw: string | null): string | null {
  if (!raw) return null
  const value = decodePathSegment(raw)
  if (!value) return null
  return hubLaunchPathFromPathname(value)
}

export function hubManifestHrefForPath(pathname = ''): string {
  const startUrl = hubLaunchPathFromPathname(pathname)
  if (!startUrl) return HUB_MANIFEST_HREF
  return `${HUB_MANIFEST_HREF}&start=${encodeURIComponent(startUrl)}`
}

export function applyHubManifestStartUrl(rawManifest: string, startUrl: string): string {
  const parsed = JSON.parse(rawManifest) as Record<string, unknown>
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('invalid hub manifest')
  }
  return `${JSON.stringify({ ...parsed, start_url: startUrl }, null, 2)}\n`
}

/** /care/{accessKey} launch path only. Subpages normalize to the parent HOME. */
export function careLaunchPathFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/care\/([^/]+)(?:\/.*)?$/)
  if (!match) return null
  const key = decodePathSegment(match[1])
  if (!key || !HUB_KEY_RE.test(key)) return null
  return `/care/${key}`
}

export function parseCareManifestStartParam(raw: string | null): string | null {
  if (!raw) return null
  const value = decodePathSegment(raw)
  if (!value) return null
  return careLaunchPathFromPathname(value)
}

export function careManifestHrefForPath(pathname = ''): string {
  const startUrl = careLaunchPathFromPathname(pathname)
  if (!startUrl) return CARE_MANIFEST_HREF
  return `${CARE_MANIFEST_HREF}&start=${encodeURIComponent(startUrl)}`
}

function patchIndexHtmlManifestHref(html: string, href: string): string {
  const nextLink = `<link rel="manifest" id="app-manifest" href="${href}" />`
  if (html.includes(TEACHER_MANIFEST_LINK)) {
    return html.replace(TEACHER_MANIFEST_LINK, nextLink)
  }
  const marker = `href="${TEACHER_MANIFEST_HREF}"`
  const first = html.indexOf(marker)
  if (first === -1) return html
  return `${html.slice(0, first)}href="${href}"${html.slice(first + marker.length)}`
}

/** Swap only the first Teacher manifest link so iOS does not install Teacher PWA from Hub URLs. */
export function patchIndexHtmlForHub(html: string, pathname = ''): string {
  return patchIndexHtmlManifestHref(html, hubManifestHrefForPath(pathname))
}

/** Swap the first Teacher manifest link so iOS A2HS installs Parent PWA from /care URLs. */
export function patchIndexHtmlForCare(html: string, pathname = ''): string {
  return patchIndexHtmlManifestHref(html, careManifestHrefForPath(pathname))
}

function buildCareOgHtml(pageUrl: string, title = 'HYPER STUDENT CARE', description = '하이퍼 학생 관리 시스템'): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${title}</title>
<meta name="description" content="${description}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="${title}"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${description}"/>
<meta property="og:url" content="${pageUrl}"/>
<meta property="og:image" content="${OG_IMAGE}"/>
<meta property="og:image:secure_url" content="${OG_IMAGE}"/>
<meta property="og:image:type" content="image/jpeg"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${title}"/>
<meta name="twitter:description" content="${description}"/>
<meta name="twitter:image" content="${OG_IMAGE}"/>
<link rel="manifest" href="${pageUrl.includes('/hub/') ? '/hub/manifest.webmanifest' : '/care/manifest.webmanifest'}"/>
<link rel="canonical" href="${pageUrl}"/>
</head>
<body>
<p>${title}</p>
</body>
</html>`
}

async function serveStartManifest(
  request: Request,
  manifestPath: string,
  startUrl: string,
): Promise<Response | undefined> {
  try {
    const manifestResponse = await fetch(new URL(manifestPath, request.url))
    if (!manifestResponse.ok) return
    const raw = await manifestResponse.text()
    const body = applyHubManifestStartUrl(raw, startUrl)
    return new Response(request.method === 'HEAD' ? null : body, {
      status: 200,
      headers: HUB_MANIFEST_HEADERS,
    })
  } catch {
    return
  }
}

export default async function middleware(request: Request) {
  const url = new URL(request.url)
  const ua = request.headers.get('user-agent') ?? ''
  const pathname = url.pathname
  const isHub = isHubPath(pathname)
  const isCare = isCarePath(pathname)

  if (!isCare && !isHub) {
    return
  }

  const isSafeMethod = request.method === 'GET' || request.method === 'HEAD'

  if (isHub && pathname === HUB_MANIFEST_PATH && isSafeMethod) {
    const startUrl = parseHubManifestStartParam(url.searchParams.get('start'))
    if (startUrl) {
      const dynamicManifest = await serveStartManifest(request, HUB_MANIFEST_PATH, startUrl)
      if (dynamicManifest) return dynamicManifest
    }
    return
  }

  if (isCare && pathname === CARE_MANIFEST_PATH && isSafeMethod) {
    const startUrl = parseCareManifestStartParam(url.searchParams.get('start'))
    if (startUrl) {
      const dynamicManifest = await serveStartManifest(request, CARE_MANIFEST_PATH, startUrl)
      if (dynamicManifest) return dynamicManifest
    }
    return
  }

  // Social crawlers must not receive HTML in place of PNG/JS/manifest.
  if (STATIC_ASSET.test(pathname)) {
    return
  }

  if (CRAWLER_UA.test(ua)) {
    const pageUrl = `${APP_ORIGIN}${pathname}`
    return new Response(
      buildCareOgHtml(
        pageUrl,
        isHub ? 'HYPER STUDENT HUB' : 'HYPER STUDENT CARE',
        isHub ? '하이퍼 학생 전용 학습 허브' : '하이퍼 학생 관리 시스템',
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
      },
    )
  }

  if (!isSafeMethod || (!isHub && !isCare)) {
    return
  }

  try {
    const indexResponse = await fetch(new URL('/index.html', request.url))
    if (!indexResponse.ok) return
    const html = await indexResponse.text()
    const patched = isHub
      ? patchIndexHtmlForHub(html, pathname)
      : patchIndexHtmlForCare(html, pathname)
    return new Response(request.method === 'HEAD' ? null : patched, {
      status: 200,
      headers: HUB_HTML_HEADERS,
    })
  } catch {
    return
  }
}

export const config = {
  matcher: ['/care/:path*', '/hub/:path*'],
}
