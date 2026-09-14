/**
 * 실행: npx tsx src/utils/studentCare/weeklyStudentCareRls.test.ts
 *
 * 신규 3테이블 RLS가 구 코어 개발용 anon USING(true)를 복사하지 않는지 정적 검증.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const sql = readFileSync('supabase/weekly-student-care-migration.sql', 'utf8')
const edge = readFileSync('supabase/functions/generate-weekly-summaries/index.ts', 'utf8')

const tables = [
  'student_daily_care',
  'weekly_learning_summaries',
  'weekly_summary_reads',
] as const

assert.doesNotMatch(sql, /TRUNCATE TABLE/i)
assert.doesNotMatch(
  sql,
  /DELETE FROM public\.(attendance|homework|daily_tests|monthly_learning_reports|student_daily_care|weekly_learning_summaries|weekly_summary_reads)/,
)
assert.doesNotMatch(sql, /DROP TABLE/i)

for (const table of tables) {
  assert.match(sql, new RegExp(`DROP POLICY IF EXISTS %I ON public.%I', 'dev_anon_select_' \\|\\| t`))
  assert.match(
    sql,
    new RegExp(`REVOKE ALL ON TABLE public.${table} FROM PUBLIC`),
  )
  assert.match(
    sql,
    new RegExp(`REVOKE ALL ON TABLE public.${table} FROM anon`),
  )
}

assert.doesNotMatch(
  sql,
  /CREATE POLICY[\s\S]{0,120}FOR INSERT\s+TO anon/,
)
assert.doesNotMatch(
  sql,
  /CREATE POLICY[\s\S]{0,120}FOR UPDATE\s+TO anon/,
)
assert.doesNotMatch(
  sql,
  /CREATE POLICY[\s\S]{0,120}FOR DELETE\s+TO anon/,
)
assert.doesNotMatch(
  sql,
  /CREATE POLICY[\s\S]{0,160}FOR SELECT\s+TO anon/,
)
assert.doesNotMatch(
  sql,
  /FOR INSERT TO anon WITH CHECK \(true\)/,
)
assert.doesNotMatch(
  sql,
  /FOR UPDATE TO anon USING \(true\) WITH CHECK \(true\)/,
)
assert.doesNotMatch(
  sql,
  /FOR DELETE TO anon USING \(true\)/,
)
assert.doesNotMatch(
  sql,
  /FOR SELECT TO anon USING \(true\)/,
)

assert.match(
  sql,
  /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_daily_care TO authenticated/,
)
assert.match(
  sql,
  /CREATE POLICY student_daily_care_authenticated_crud[\s\S]*FOR ALL[\s\S]*TO authenticated[\s\S]*USING \(true\)[\s\S]*WITH CHECK \(true\)/,
)

assert.match(
  sql,
  /GRANT SELECT ON TABLE public.weekly_learning_summaries TO authenticated/,
)
assert.doesNotMatch(
  sql,
  /GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.weekly_learning_summaries TO authenticated/,
)
assert.match(
  sql,
  /CREATE POLICY weekly_learning_summaries_authenticated_select[\s\S]*FOR SELECT[\s\S]*TO authenticated[\s\S]*USING \(true\)/,
)
assert.doesNotMatch(
  sql,
  /weekly_learning_summaries_authenticated_crud/,
)

assert.match(sql, /REVOKE ALL ON TABLE public.weekly_summary_reads FROM authenticated/)
assert.doesNotMatch(sql, /CREATE POLICY \S+ ON public.weekly_summary_reads/)

assert.match(sql, /GRANT EXECUTE ON FUNCTION public.get_parent_care_bundle\(text\) TO anon/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public.get_parent_today_report\(text, date\) TO anon/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public.mark_weekly_summary_read\(text\) TO anon/)

assert.match(
  sql,
  /GRANT EXECUTE ON FUNCTION public.ensure_weekly_learning_summaries\(\) TO anon/,
)
assert.match(
  sql,
  /GRANT EXECUTE ON FUNCTION public.ensure_weekly_learning_summaries\(\) TO authenticated/,
)

assert.match(
  sql,
  /REVOKE ALL ON FUNCTION public.generate_weekly_learning_summaries\(timestamptz\) FROM anon/,
)
assert.match(
  sql,
  /REVOKE ALL ON FUNCTION public.generate_weekly_learning_summaries\(timestamptz\) FROM authenticated/,
)
assert.match(
  sql,
  /GRANT EXECUTE ON FUNCTION public.generate_weekly_learning_summaries\(timestamptz\) TO service_role/,
)
assert.doesNotMatch(
  sql,
  /GRANT EXECUTE ON FUNCTION public.generate_weekly_learning_summaries\(timestamptz\) TO anon/,
)
assert.doesNotMatch(
  sql,
  /GRANT EXECUTE ON FUNCTION public.generate_weekly_learning_summaries\(timestamptz\) TO authenticated/,
)

assert.match(
  sql,
  /AND NOT EXISTS \(\s*SELECT 1\s*FROM public.weekly_learning_summaries w/,
)

assert.doesNotMatch(edge, /SUPABASE_ANON_KEY/)
assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/)

const repo = readFileSync('src/lib/db/repository.ts', 'utf8')
assert.match(repo, /function isPermissionDeniedError/)
assert.match(repo, /isSafeSelectSkipError/)

const dataHook = readFileSync('src/hooks/useData.tsx', 'utf8')
assert.match(dataHook, /sessionUserId/)
assert.match(dataHook, /\[load, sessionUserId\]/)
