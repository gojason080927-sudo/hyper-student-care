/** Simulate Kakao scraper behavior with og:url redirect issue */
const key = 'MWs6MkVExVQ8R8ZRaShr6K68KEeyJFnY'
const careUrl = `https://hyper-student-care.vercel.app/care/${key}`
const kakaoUa = 'facebookexternalhit/1.1;kakaotalk-scrap/1.0; +https://devtalk.kakao.com/t/scrap/33984'

const res = await fetch(careUrl, { headers: { 'User-Agent': kakaoUa } })
const html = await res.text()
const ogUrl = html.match(/property="og:url" content="([^"]*)"/)?.[1]
const ogImage = html.match(/property="og:image" content="([^"]*)"/)?.[1]
console.log('Care URL:', careUrl)
console.log('og:url in response:', ogUrl)
console.log('og:url MISMATCH:', ogUrl !== careUrl)
console.log('og:image:', ogImage)

if (ogUrl && ogUrl !== careUrl) {
  const redirectRes = await fetch(ogUrl, { headers: { 'User-Agent': kakaoUa } })
  const redirectHtml = await redirectRes.text()
  console.log('\nAfter og:url redirect to:', ogUrl)
  console.log('status:', redirectRes.status)
  console.log('og:title:', redirectHtml.match(/property="og:title" content="([^"]*)"/)?.[1])
  console.log('og:image:', redirectHtml.match(/property="og:image" content="([^"]*)"/)?.[1])
}
