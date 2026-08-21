import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function parseEnv(path) {
  const env = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
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

const env = parseEnv('.env.local')
const anon = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function count(table) {
  const { count, error } = await anon.from(table).select('id', { count: 'exact', head: true })
  return { count, error: error?.message || null }
}

const before = {
  students: await count('students'),
  daily_tests: await count('daily_tests'),
  questions: await count('questions'),
  entrance_exam_questions: await count('entrance_exam_questions'),
}

const ins = await anon
  .from('entrance_exam_questions')
  .insert({
    subject: '수학',
    target_grade: '중1',
    question_type: 'multiple_choice',
    stem: 'SHOULD_FAIL_ANON',
    choices: ['a', 'b', 'c', 'd', 'e'],
    correct_choice: 1,
    explanation: '',
    difficulty: '중',
    evaluation_areas: ['개념 이해도', '계산 정확도'],
    unit_name: 'x',
  })
  .select('id')
  .single()

const after = {
  students: await count('students'),
  daily_tests: await count('daily_tests'),
  questions: await count('questions'),
  entrance_exam_questions: await count('entrance_exam_questions'),
}

console.log(
  JSON.stringify(
    {
      anonInsertBlocked: Boolean(ins.error) && !ins.data,
      insertCode: ins.error?.code || null,
      insertMsg: ins.error?.message || null,
      before,
      after,
      existingDataUnchanged:
        before.students.count === after.students.count &&
        before.daily_tests.count === after.daily_tests.count &&
        before.questions.count === after.questions.count &&
        before.entrance_exam_questions.count === after.entrance_exam_questions.count,
    },
    null,
    2,
  ),
)
