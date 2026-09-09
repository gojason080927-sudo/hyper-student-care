import { writeFileSync } from 'fs'
import { execSync } from 'child_process'

const seed = JSON.parse(execSync('npx tsx scripts/_dump-career-seed.ts', { encoding: 'utf8' }))
const lines = [
  '-- Additive V2 question seed. V1 1-88 text/display_order are not updated.',
]

for (const q of seed.questions) {
  const text = q.text.replace(/'/g, "''")
  const domain = q.domain.replace(/'/g, "''")
  const code = q.scoringCode.replace(/'/g, "''")
  const introducedIn = q.questionNumber <= 88 ? 'HYPER_CAREER_V1' : 'HYPER_CAREER_V2'
  const v2Order = q.displayOrderV2 ?? q.displayOrder
  if (q.questionNumber <= 88) {
    lines.push(`INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (${q.questionNumber}, '${text}', '${domain}', '${code}', ${q.displayOrder}, ${v2Order}, '${introducedIn}', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();`)
  } else {
    lines.push(`INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (${q.questionNumber}, '${text}', '${domain}', '${code}', ${q.displayOrder}, ${v2Order}, '${introducedIn}', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();`)
  }
}

writeFileSync('supabase/.temp-career-v2-question-seed.sql', lines.join('\n'), 'utf8')
console.log('wrote', seed.questions.length, 'question statements')
