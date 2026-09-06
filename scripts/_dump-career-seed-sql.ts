import { writeFileSync } from 'fs'
import { CAREER_MAJOR_DICTIONARY } from '../src/features/careerAssessment/data/majorDictionary.ts'
import { CAREER_MAJOR_PROFILES } from '../src/features/careerAssessment/data/majorProfiles.ts'
import { CAREER_QUESTIONS } from '../src/features/careerAssessment/data/questions.ts'

function sqlStr(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

function sqlArray(values: string[]): string {
  return `ARRAY[${values.map(sqlStr).join(', ')}]::text[]`
}

const statements: string[] = []

for (const q of CAREER_QUESTIONS) {
  statements.push(`INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (${q.questionNumber}, ${sqlStr(q.text)}, ${sqlStr(q.domain)}, ${sqlStr(q.scoringCode)}, ${q.displayOrder}, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();`)
}

for (const p of CAREER_MAJOR_PROFILES) {
  statements.push(`INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      ${sqlStr(p.id)},
      ${sqlStr(p.name)},
      $json$${JSON.stringify(p.riasecTarget)}$json$::jsonb,
      ${sqlArray(p.strengthKeys)},
      ${sqlArray(p.valueKeys)},
      ${sqlArray(p.behaviorKeys)},
      ${sqlArray(p.problemSolvingKeys)},
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();`)
}

for (const d of CAREER_MAJOR_DICTIONARY) {
  statements.push(`INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      ${sqlStr(d.id)},
      ${sqlStr(d.majorName)},
      ${sqlStr(d.majorGroupPrimary)},
      ${d.majorGroupSecondary ? sqlStr(d.majorGroupSecondary) : 'NULL'},
      ${d.primaryWeight},
      ${d.secondaryWeight},
      ${d.isActive}
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;`)
}

const bands = [
  ['very_high', 85, 100, '매우 높은 적합', false, 1],
  ['high', 75, 84.9, '높은 적합', false, 2],
  ['moderate', 65, 74.9, '비교적 적합', false, 3],
  ['explore', 55, 64.9, '탐색 가능', false, 4],
  ['exclude', 0, 54.999, '우선추천 제외', true, 5],
] as const

for (const [id, min, max, label, exclude, sort] of bands) {
  statements.push(`INSERT INTO public.career_fit_bands
    (id, min_score, max_score, label, exclude_from_priority, sort_order)
    VALUES (${sqlStr(id)}, ${min}, ${max}, ${sqlStr(label)}, ${exclude}, ${sort})
    ON CONFLICT (id) DO UPDATE
      SET min_score = EXCLUDED.min_score,
          max_score = EXCLUDED.max_score,
          label = EXCLUDED.label,
          exclude_from_priority = EXCLUDED.exclude_from_priority,
          sort_order = EXCLUDED.sort_order;`)
}

statements.push(`NOTIFY pgrst, 'reload schema';`)
writeFileSync('supabase/career-assessment-seed.sql', statements.join('\n'), 'utf8')
