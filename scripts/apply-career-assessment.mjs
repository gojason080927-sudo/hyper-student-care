/**
 * Additive career assessment schema + seed.
 *
 *   node scripts/apply-career-assessment.mjs
 */
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import pg from 'pg'

const { Client } = pg

function parseEnvFile(path) {
  const raw = readFileSync(path, 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
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

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim()
  const local = parseEnvFile('.env.local')
  const vercel = (() => {
    try {
      return parseEnvFile('.env.vercel.production')
    } catch {
      return {}
    }
  })()
  const url = local.VITE_SUPABASE_URL || vercel.VITE_SUPABASE_URL || ''
  const ref = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  const password =
    process.env.SUPABASE_DB_PASSWORD?.trim() ||
    local.SUPABASE_DB_PASSWORD?.trim() ||
    vercel.SUPABASE_DB_PASSWORD?.trim()
  if (!ref || !password) return null
  return `postgresql://postgres.${ref}:${encodeURIComponent(password)}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`
}

const databaseUrl = resolveDatabaseUrl()
if (!databaseUrl) {
  console.error('DATABASE_URL 또는 SUPABASE_DB_PASSWORD 가 필요합니다.')
  process.exit(1)
}

const sql = readFileSync('supabase/career-assessment-migration.sql', 'utf8')
const seed = JSON.parse(execSync('npx tsx scripts/_dump-career-seed.ts', { encoding: 'utf8' }))

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  console.log('Connected')
  await client.query(sql)

  for (const q of seed.questions) {
    await client.query(
      `INSERT INTO public.career_assessment_questions
        (question_number, text, domain, scoring_code, display_order, is_active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (question_number) DO UPDATE
         SET text = EXCLUDED.text,
             domain = EXCLUDED.domain,
             scoring_code = EXCLUDED.scoring_code,
             display_order = EXCLUDED.display_order,
             is_active = true,
             updated_at = now()`,
      [q.questionNumber, q.text, q.domain, q.scoringCode, q.displayOrder],
    )
  }

  for (const p of seed.profiles) {
    await client.query(
      `INSERT INTO public.career_major_profiles
        (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7,
         'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
         true)
       ON CONFLICT (id) DO UPDATE
         SET name = EXCLUDED.name,
             riasec_target = EXCLUDED.riasec_target,
             strength_keys = EXCLUDED.strength_keys,
             value_keys = EXCLUDED.value_keys,
             behavior_keys = EXCLUDED.behavior_keys,
             problem_solving_keys = EXCLUDED.problem_solving_keys,
             is_active = true,
             updated_at = now()`,
      [
        p.id,
        p.name,
        JSON.stringify(p.riasecTarget),
        p.strengthKeys,
        p.valueKeys,
        p.behaviorKeys,
        p.problemSolvingKeys,
      ],
    )
  }

  for (const d of seed.dictionary) {
    await client.query(
      `INSERT INTO public.career_major_dictionary
        (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE
         SET major_name = EXCLUDED.major_name,
             major_group_primary = EXCLUDED.major_group_primary,
             major_group_secondary = EXCLUDED.major_group_secondary,
             primary_weight = EXCLUDED.primary_weight,
             secondary_weight = EXCLUDED.secondary_weight,
             is_active = EXCLUDED.is_active`,
      [
        d.id,
        d.majorName,
        d.majorGroupPrimary,
        d.majorGroupSecondary,
        d.primaryWeight,
        d.secondaryWeight,
        d.isActive,
      ],
    )
  }

  const bands = [
    ['very_high', 85, 100, '매우 높은 적합', false, 1],
    ['high', 75, 84.9, '높은 적합', false, 2],
    ['moderate', 65, 74.9, '비교적 적합', false, 3],
    ['explore', 55, 64.9, '탐색 가능', false, 4],
    ['exclude', 0, 54.999, '우선추천 제외', true, 5],
  ]
  for (const [id, min, max, label, exclude, sort] of bands) {
    await client.query(
      `INSERT INTO public.career_fit_bands
        (id, min_score, max_score, label, exclude_from_priority, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE
         SET min_score = EXCLUDED.min_score,
             max_score = EXCLUDED.max_score,
             label = EXCLUDED.label,
             exclude_from_priority = EXCLUDED.exclude_from_priority,
             sort_order = EXCLUDED.sort_order`,
      [id, min, max, label, exclude, sort],
    )
  }

  await client.query(`NOTIFY pgrst, 'reload schema'`)

  const counts = await client.query(`
    SELECT
      (SELECT count(*) FROM public.career_assessment_questions) AS questions,
      (SELECT count(*) FROM public.career_major_profiles) AS profiles,
      (SELECT count(*) FROM public.career_major_dictionary) AS dictionary,
      (SELECT count(*) FROM public.career_fit_bands) AS bands
  `)
  console.log('seed counts', counts.rows[0])
  if (Number(counts.rows[0].questions) !== 88) throw new Error('expected 88 questions')
  if (Number(counts.rows[0].profiles) !== 36) throw new Error('expected 36 profiles')
  console.log('OK')
} finally {
  await client.end()
}
