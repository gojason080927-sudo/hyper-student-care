/**
 * Anon client: table SELECT blocked, RPC callable.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function parseEnvFile(path) {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    let v = t.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    env[t.slice(0, i).trim()] = v
  }
  return env
}

const env = parseEnvFile('.env.local')
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const table = await sb.from('admission_strategy_posts').select('id').limit(1)
if (!table.error) {
  console.error('FAIL: anon was able to select admission_strategy_posts')
  process.exit(1)
}
const rpc = await sb.rpc('get_parent_admission_strategy_posts', {
  p_access_key: 'not-a-real-key',
})
if (rpc.error) {
  console.error('FAIL: rpc error', rpc.error.message)
  process.exit(1)
}
if (rpc.data != null) {
  console.error('FAIL: invalid key should return null')
  process.exit(1)
}
console.log('anon table blocked, invalid-key RPC null OK')
