/**
 * Vercel Edge Middleware — KakaoTalk / SNS crawlers scraping /care/* receive
 * lightweight HTML with correct og:url (must match accessed URL per Kakao spec).
 */
const APP_ORIGIN = 'https://hyper-student-care.vercel.app'
const OG_IMAGE = `${APP_ORIGIN}/hyper-student-care-share-v3.jpg`

const CRAWLER_UA =
  /kakaotalk-scrap|facebookexternalhit|twitterbot|slackbot|discordbot|whatsapp|linkedinbot|telegrambot|yeti|kakaotalkbot|bingbot|googlebot|bot|crawl|spider|preview/i

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
<link rel="canonical" href="${pageUrl}"/>
</head>
<body>
<p>HYPER STUDENT CARE — 하이퍼 학생 관리 시스템</p>
</body>
</html>`
}

export default function middleware(request: Request) {
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/care/')) {
    return
  }

  const ua = request.headers.get('user-agent') ?? ''
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
  matcher: ['/care/:path*'],
}
