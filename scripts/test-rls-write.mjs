/**
 * RLS 쓰기 차단 진단 — 12개 테이블 INSERT 테스트
 * 실행: node scripts/test-rls-write.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  const env = {}
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return env
}

const env = loadEnv()
const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const now = new Date().toISOString()
const today = now.slice(0, 10)
const sid = crypto.randomUUID()

const writeTests = [
  {
    table: 'students',
    row: {
      id: sid,
      name: 'RLS테스트',
      student_access_key: `rls-${Date.now()}`,
      school: '테스트',
      grade: '중1',
      student_phone: '',
      parent_phone: '',
      class_name: '',
      subjects: ['수학'],
      teacher: '',
      enrollment_date: today,
      status: '재원',
      memo: '',
      created_at: now,
      updated_at: now,
    },
  },
  {
    table: 'attendance',
    row: {
      id: crypto.randomUUID(),
      student_id: sid,
      date: today,
      status: '출석',
      reason: '',
      memo: '',
      created_at: now,
      updated_at: now,
    },
  },
  {
    table: 'homework',
    row: {
      id: crypto.randomUUID(),
      student_id: sid,
      date: today,
      title: '',
      description: 'test',
      status: '완료',
      teacher_memo: '',
      created_at: now,
      updated_at: now,
    },
  },
  {
    table: 'daily_tests',
    row: {
      id: crypto.randomUUID(),
      student_id: sid,
      date: today,
      test_name: 'test',
      subject: '수학',
      score: 10,
      total_score: 20,
      percentage: 50,
      incorrect_count: 1,
      memo: '',
      session_results: [],
      created_at: now,
      updated_at: now,
    },
  },
  {
    table: 'monthly_evaluations',
    row: {
      id: crypto.randomUUID(),
      student_id: sid,
      evaluation_date: today,
      year: 2026,
      month: 7,
      subject: '수학',
      score: 80,
      total_score: 100,
      percentage: 80,
      difficulty_breakdown: { highest: 0, high: 0, middle: 0, basic: 0 },
      teacher_comment: '',
      strengths: '',
      improvements: '',
      created_at: now,
      updated_at: now,
    },
  },
  {
    table: 'makeup_plans',
    row: {
      id: crypto.randomUUID(),
      student_id: sid,
      scheduled_date: today,
      scheduled_time: '19:00',
      method: '학원 보강',
      subject: '수학',
      reason: '',
      memo: '',
      status: '예정',
      created_at: now,
      updated_at: now,
    },
  },
  {
    table: 'notices',
    row: {
      id: crypto.randomUUID(),
      category: '공지사항',
      title: 'RLS test',
      content: '',
      summary: '',
      source_name: '',
      original_article_title: '',
      author_name: '',
      is_pinned: false,
      is_published: true,
      published_at: today,
      created_at: now,
      updated_at: now,
    },
  },
  {
    table: 'questions',
    row: {
      id: crypto.randomUUID(),
      student_id: sid,
      date: today,
      category: '기타',
      title: 'test',
      content: '',
      answer: '',
      question_images: [],
      answer_images: [],
      status: '답변대기',
      created_at: now,
      updated_at: now,
    },
  },
  {
    table: 'assignment_completions',
    row: {
      id: crypto.randomUUID(),
      student_id: sid,
      date: today,
      assignment_name: 'test',
      total_count: 10,
      completed_count: 8,
      completion_rate: 80,
      status: '완료',
      memo: '',
      created_at: now,
      updated_at: now,
    },
  },
  {
    table: 'progress',
    row: {
      id: crypto.randomUUID(),
      student_id: sid,
      subject: '수학',
      textbook_name: 'test',
      current_progress: '1단원',
      current_page: 1,
      total_page: 100,
      progress_rate: 1,
      last_study_date: today,
      teacher_memo: '',
      created_at: now,
      updated_at: now,
    },
  },
  {
    table: 'today_assignments',
    row: {
      id: crypto.randomUUID(),
      student_id: sid,
      date: today,
      assignment1: 'a1',
      assignment2: 'a2',
      created_at: now,
      updated_at: now,
    },
  },
  {
    table: 'class_notes',
    row: {
      id: crypto.randomUUID(),
      student_id: sid,
      date: today,
      has_class_note: false,
      note: '',
      created_at: now,
      updated_at: now,
    },
  },
]

console.log('RLS Write Test — all tables INSERT via anon key\n')

for (const { table, row } of writeTests) {
  const { error } = await sb.from(table).insert(row)
  const rls = error?.message?.includes('row-level security')
  console.log(
    `${error ? 'FAIL' : 'OK  '} INSERT ${table}${error ? `: ${error.message}` : ''}${rls ? ' [RLS]' : ''}`,
  )
}
