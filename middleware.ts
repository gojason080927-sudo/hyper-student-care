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
 */
const APP_ORIGIN = 'https://hyper-student-care.vercel.app'
const OG_IMAGE = `${APP_ORIGIN}/hyper-student-care-share-v3.jpg`

const CRAWLER_UA =
  /kakaotalk-scrap|facebookexternalhit|twitterbot|slackbot|discordbot|whatsapp|linkedinbot|telegrambot|yeti|kakaotalkbot|bingbot|googlebot|bot|crawl|spider|preview/i

const STATIC_ASSET =
  /\.(?:webmanifest|js|mjs|cjs|css|png|ico|svg|webp|json|map|txt|woff2?|ttf|otf|eot|jpg|jpeg|gif|avif)$/i

const TEACHER_MANIFEST_HREF = '/teacher/manifest.webmanifest'
const HUB_MANIFEST_HREF = '/hub/manifest.webmanifest?v=1-installable'
const TEACHER_MANIFEST_LINK = `<link rel="manifest" id="app-manifest" href="${TEACHER_MANIFEST_HREF}" />`
const HUB_MANIFEST_LINK = `<link rel="manifest" id="app-manifest" href="${HUB_MANIFEST_HREF}" />`

function isHubPath(pathname: string): boolean {
  return pathname === '/hub' || pathname.startsWith('/hub/')
}

function isCarePath(pathname: string): boolean {
  return pathname === '/care' || pathname.startsWith('/care/')
}

/** Swap only the first Teacher manifest link so iOS does not install Teacher PWA from Hub URLs. */
export function patchIndexHtmlForHub(html: string): string {
  if (html.includes(TEACHER_MANIFEST_LINK)) {
    return html.replace(TEACHER_MANIFEST_LINK, HUB_MANIFEST_LINK)
  }
  const marker = `href="${TEACHER_MANIFEST_HREF}"`
  const first = html.indexOf(marker)
  if (first === -1) return html
  return `${html.slice(0, first)}href="${HUB_MANIFEST_HREF}"${html.slice(first + marker.length)}`
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

export default async function middleware(request: Request) {
  const url = new URL(request.url)
  const ua = request.headers.get('user-agent') ?? ''
  const pathname = url.pathname
  const isHub = isHubPath(pathname)
  const isCare = isCarePath(pathname)

  if (!isCare && !isHub) {
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

  if (!isHub || (request.method !== 'GET' && request.method !== 'HEAD')) {
    return
  }

  try {
    const indexResponse = await fetch(new URL('/index.html', request.url))
    if (!indexResponse.ok) return
    const html = await indexResponse.text()
    const patched = patchIndexHtmlForHub(html)
    return new Response(request.method === 'HEAD' ? null : patched, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch {
    return
  }
}

export const config = {
  matcher: ['/care/:path*', '/hub/:path*'],
}
