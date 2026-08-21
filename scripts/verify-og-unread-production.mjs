/** Production OG + RPC smoke test */
import { readFileSync } from 'fs'

function parseEnvFile(path) {
  const raw = readFileSync(path, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    env[t.slice(0, i).trim()] = v
  }
  return env
}

const env = parseEnvFile('.env.local')
const testKey = 'MWs6MkVExVQ8R8ZRaShr6K68KEeyJFnY'

console.log('=== OG image ===')
const ogRes = await fetch('https://hyper-student-care.vercel.app/hyper-care-og-v2.png', {
  method: 'HEAD',
})
console.log('status:', ogRes.status, 'content-type:', ogRes.headers.get('content-type'))

console.log('\n=== OG meta (index.html via /care/*) ===')
const htmlRes = await fetch(`https://hyper-student-care.vercel.app/care/${testKey}`)
const html = await htmlRes.text()
for (const tag of [
  'og:title',
  'og:description',
  'og:image',
  'og:url',
  'og:type',
  'twitter:card',
  'twitter:title',
  'twitter:description',
  'twitter:image',
]) {
  const re = new RegExp(
    tag.startsWith('og:')
      ? `<meta property="${tag}" content="([^"]*)"`
      : `<meta name="${tag}" content="([^"]*)"`,
  )
  const match = html.match(re)
  console.log(`${tag}:`, match?.[1] ?? '(missing)')
}

console.log('\n=== get_parent_category_reads RPC ===')
const rpcUrl = `${env.VITE_SUPABASE_URL}/rest/v1/rpc/get_parent_category_reads`
const rpcRes = await fetch(rpcUrl, {
  method: 'POST',
  headers: {
    apikey: env.VITE_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ p_access_key: testKey }),
})
const rpcBody = await rpcRes.text()
console.log('status:', rpcRes.status)
console.log('body:', rpcBody.slice(0, 300))
