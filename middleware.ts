/**
 * Vercel Edge Middleware — KakaoTalk / SNS crawlers scraping /care/* receive
 * lightweight HTML with correct og:url (must match accessed URL per Kakao spec).
 */
const APP_ORIGIN = 'https://hyper-student-care.vercel.app'
const OG_IMAGE = `${APP_ORIGIN}/hyper-student-care-share-v3.jpg`

const CRAWLER_UA =
  /kakaotalk-scrap|facebookexternalhit|twitterbot|slackbot|discordbot|whatsapp|linkedinbot|telegrambot|yeti|kakaotalkbot|bingbot|googlebot|bot|crawl|spider|preview|webapk|google-web-apk|chrome-lighthouse/i

const TEACHER_WEBAPK_UA = /webapk|google-web-apk|google-webapk/i

const STATIC_ASSET =
  /\.(?:webmanifest|js|mjs|cjs|css|png|ico|svg|webp|json|map|txt|woff2?|ttf|otf|eot|jpg|jpeg|gif|avif)$/i

const NON_DOCUMENT_FETCH_DEST = new Set([
  'script',
  'style',
  'image',
  'manifest',
  'serviceworker',
  'sharedworker',
  'worker',
  'font',
  'audio',
  'video',
  'object',
  'embed',
  'report',
])

function isTeacherWebApkDocumentRequest(request: Request, pathname: string): boolean {
  if (!pathname.startsWith('/teacher/')) return false
  if (STATIC_ASSET.test(pathname)) return false

  const dest = (request.headers.get('sec-fetch-dest') ?? '').toLowerCase()
  if (dest && NON_DOCUMENT_FETCH_DEST.has(dest)) return false

  const accept = request.headers.get('accept') ?? ''
  if (accept && !accept.includes('text/html') && !accept.includes('*/*')) return false

  return true
}

function buildTeacherManifestHtml(): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>HYPER TEACHER</title>
<meta name="theme-color" content="#0B1F4A"/>
<link rel="manifest" href="/teacher/manifest.webmanifest"/>
<link rel="icon" type="image/png" href="/teacher/hyper-teacher-icon-192-v5.png"/>
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/teacher/sw.js', { scope: '/teacher/' }).catch(function () {});
}
</script>
</head>
<body>
<p>HYPER TEACHER</p>
</body>
</html>`
}

function buildCareOgHtml(pageUrl: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>HYPER STUDENT CARE</title>
<meta name="description" content="하이퍼 학생 관리 시스템"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="HYPER STUDENT CARE"/>
<meta property="og:title" content="HYPER STUDENT CARE"/>
<meta property="og:description" content="하이퍼 학생 관리 시스템"/>
<meta property="og:url" content="${pageUrl}"/>
<meta property="og:image" content="${OG_IMAGE}"/>
<meta property="og:image:secure_url" content="${OG_IMAGE}"/>
<meta property="og:image:type" content="image/jpeg"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="HYPER STUDENT CARE"/>
<meta name="twitter:description" content="하이퍼 학생 관리 시스템"/>
<meta name="twitter:image" content="${OG_IMAGE}"/>
<link rel="manifest" href="/care/manifest.webmanifest"/>
<link rel="canonical" href="${pageUrl}"/>
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/care/sw.js', { scope: '/care/' }).catch(function () {});
}
</script>
</head>
<body>
<p>HYPER STUDENT CARE — 하이퍼 학생 관리 시스템</p>
</body>
</html>`
}

export default function middleware(request: Request) {
  const url = new URL(request.url)
  const ua = request.headers.get('user-agent') ?? ''

  if (TEACHER_WEBAPK_UA.test(ua) && isTeacherWebApkDocumentRequest(request, url.pathname)) {
    return new Response(buildTeacherManifestHtml(), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    })
  }

  if (!url.pathname.startsWith('/care/')) {
    return
  }

  // WebAPK / crawler UA must still receive real PNG/JS/manifest bytes.
  if (STATIC_ASSET.test(url.pathname)) {
    return
  }

  if (!CRAWLER_UA.test(ua)) {
    return
  }

  const pageUrl = `${APP_ORIGIN}${url.pathname}`
  return new Response(buildCareOgHtml(pageUrl), {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}

export const config = {
  matcher: ['/care/:path*', '/teacher/:path*'],
}
