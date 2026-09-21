/**
 * 실행: npx tsx src/utils/parentSuggestions.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  filterParentQuestions,
  filterParentSuggestions,
  filterQuestionsByKind,
  formatParentSuggestionAuthor,
  isParentSuggestionCategory,
  mergePersistedQuestion,
  PARENT_SUGGESTION_AUTHOR_SUFFIX,
  PARENT_SUGGESTION_CATEGORY,
  parentRecordSaveCopy,
  questionKindBadge,
  toastsForParentQuestionSubmit,
} from './parentSuggestions.ts'
import {
  computeParentSuggestionUpdatedAt,
  computeParentUnreadState,
  hasUnreadParentSuggestions,
} from './parentUnread.ts'
import type { QuestionRecord } from '../types/records.ts'
import type { Student } from '../types/student.ts'
import { QUESTION_CATEGORIES } from './labels.ts'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from './learningDiagnosis.ts'
import { listParentWeeklyWrongVocabWeeks } from './parentWeeklyWrongVocab.ts'

assert.equal(PARENT_SUGGESTION_CATEGORY, '건의사항')
assert.equal(isParentSuggestionCategory('건의사항'), true)
assert.equal(isParentSuggestionCategory('수업질문'), false)
assert.equal((QUESTION_CATEGORIES as readonly string[]).includes('건의사항'), false)

const question: QuestionRecord = {
  id: 'q1',
  studentId: 's1',
  date: '2026-09-21',
  category: '수업질문',
  title: '질문',
  content: '내용',
  answer: '답',
  questionImages: [],
  answerImages: [],
  status: '답변완료',
  source: 'parent',
  createdAt: '2026-09-21T01:00:00.000Z',
  updatedAt: '2026-09-21T02:00:00.000Z',
}

const suggestion: QuestionRecord = {
  ...question,
  id: 'g1',
  category: '건의사항',
  title: '건의',
  content: '시설',
  updatedAt: '2026-09-21T03:00:00.000Z',
}

assert.deepEqual(
  filterParentQuestions([question, suggestion]).map((item) => item.id),
  ['q1'],
)
assert.deepEqual(
  filterParentSuggestions([question, suggestion]).map((item) => item.id),
  ['g1'],
)
assert.equal(filterQuestionsByKind([question, suggestion], 'question')[0]?.id, 'q1')
assert.equal(filterQuestionsByKind([question, suggestion], 'suggestion')[0]?.id, 'g1')
assert.equal(questionKindBadge(suggestion), '학부모 건의')
assert.equal(questionKindBadge(question), '학부모')
assert.equal(questionKindBadge({ category: '수업질문', source: 'student' }), '학생 Hub')

assert.equal(formatParentSuggestionAuthor('김민수'), '김민수 학부모님')
assert.equal(formatParentSuggestionAuthor('박서연'), '박서연 학부모님')
assert.equal(formatParentSuggestionAuthor('  김민수  '), '김민수 학부모님')
assert.equal(formatParentSuggestionAuthor(''), '학부모님')
assert.equal(formatParentSuggestionAuthor('-'), '학부모님')
assert.equal(PARENT_SUGGESTION_AUTHOR_SUFFIX, '학부모님')

assert.deepEqual(parentRecordSaveCopy('건의사항'), {
  success: '건의사항이 등록되었습니다.',
  failure: '건의사항 등록에 실패했습니다.',
})
assert.deepEqual(parentRecordSaveCopy('수업질문'), {
  success: '질문이 저장되었습니다.',
  failure: '질문 저장에 실패했습니다.',
})

assert.deepEqual(
  toastsForParentQuestionSubmit('건의사항', { persist: 'ok', reload: 'ok' }),
  ['건의사항이 등록되었습니다.'],
)
assert.deepEqual(
  toastsForParentQuestionSubmit('건의사항', { persist: 'failed' }),
  ['건의사항 등록에 실패했습니다.'],
)
assert.deepEqual(
  toastsForParentQuestionSubmit('건의사항', { persist: 'ok', reload: 'failed' }),
  ['건의사항이 등록되었습니다.'],
)
assert.deepEqual(toastsForParentQuestionSubmit('건의사항', { persist: 'busy' }), [])
assert.equal(
  toastsForParentQuestionSubmit('건의사항', { persist: 'ok', reload: 'failed' }).includes(
    '건의사항 등록에 실패했습니다.',
  ),
  false,
)
assert.deepEqual(
  toastsForParentQuestionSubmit('수업질문', { persist: 'ok', reload: 'ok' }),
  ['질문이 저장되었습니다.'],
)

const merged = mergePersistedQuestion([{ id: 'g1' }], { id: 'g2' })
assert.deepEqual(merged.map((item) => item.id), ['g1', 'g2'])
assert.deepEqual(
  mergePersistedQuestion([{ id: 'g1' }], { id: 'g1' }).map((item) => item.id),
  ['g1'],
)

const student: Student = {
  id: 's1',
  name: '테스트',
  studentAccessKey: 'key',
  accessKeyActive: true,
  school: '',
  grade: '중2',
  studentPhone: '',
  parentPhone: '',
  className: '',
  subjects: [],
  teacher: '',
  enrollmentDate: '2026-03-02',
  status: '재원',
  memo: '',
  createdAt: '',
  updatedAt: '',
}

const unread = computeParentUnreadState({
  student,
  categoryReads: {},
  attendance: [],
  homework: [],
  homeworkTextbookEntries: [],
  dailyTests: [],
  classNotes: [],
  todayAssignments: [],
  classTodayReportCommon: [],
  progressRecords: [],
  monthlyEvaluations: [],
  makeupPlans: [],
  contentPosts: [],
  classScheduleGrids: [],
  questions: [question, suggestion],
})

assert.equal(unread.questions, true)
const unreadOnlySuggestion = computeParentUnreadState({
  student,
  categoryReads: { questions: '2026-09-21T04:00:00.000Z' },
  attendance: [],
  homework: [],
  homeworkTextbookEntries: [],
  dailyTests: [],
  classNotes: [],
  todayAssignments: [],
  classTodayReportCommon: [],
  progressRecords: [],
  monthlyEvaluations: [],
  makeupPlans: [],
  contentPosts: [],
  classScheduleGrids: [],
  questions: [suggestion],
})
assert.equal(unreadOnlySuggestion.questions, false)
assert.equal(computeParentSuggestionUpdatedAt([suggestion], 's1'), suggestion.updatedAt)
assert.equal(hasUnreadParentSuggestions([suggestion], 's1', undefined), true)
assert.equal(hasUnreadParentSuggestions([suggestion], 's1', '2026-09-21T04:00:00.000Z'), false)
assert.equal(hasUnreadParentSuggestions([question], 's1', undefined), false)

assert.deepEqual(
  listParentWeeklyWrongVocabWeeks({
    studentId: 's1',
    dailyTests: [
      {
        id: 'd1',
        studentId: 's1',
        date: '2026-09-16',
        testName: '',
        subject: '수학',
        score: 80,
        totalScore: 100,
        percentage: 80,
        incorrectCount: 2,
        memo: '',
        sessionResults: [],
        learningDiagnosis: EMPTY_DAILY_LEARNING_DIAGNOSIS,
        createdAt: '',
        updatedAt: '',
      },
    ],
    weeklySummaries: [
      {
        id: 'w1',
        studentId: 's1',
        weekStart: '2026-09-08',
        periodStart: '2026-09-08',
        periodEnd: '2026-09-12',
        asOf: '2026-09-12',
        totalScore: null,
        scores: {
          attendance: { score: null, max: 100, index: null, grade: null, facts: {} },
          material: { score: null, max: 100, index: null, grade: null, facts: {} },
          homework: { score: null, max: 100, index: null, grade: null, facts: {} },
          dailyTest: { score: null, max: 100, index: null, grade: null, facts: {} },
          attitude: { score: null, max: 100, index: null, grade: null, facts: {} },
        },
        grade: null,
        goodText: '',
        checkText: '',
        teacherComment: '',
        createdAt: '',
        updatedAt: '',
      },
    ],
    today: '2026-09-21',
  }),
  ['2026-09-21', '2026-09-14', '2026-09-08'],
)

const sql = readFileSync('supabase/parent-suggestion-category-v1-migration.sql', 'utf8')
assert.match(sql, /수업질문/)
assert.match(sql, /숙제질문/)
assert.match(sql, /시험질문/)
assert.match(sql, /상담요청/)
assert.match(sql, /기타/)
assert.match(sql, /건의사항/)
assert.doesNotMatch(sql, /UPDATE public\.questions/i)
assert.doesNotMatch(sql, /DELETE FROM public\.questions/i)
assert.doesNotMatch(sql, /ALTER TABLE public\.student_hub_inbox/)
assert.doesNotMatch(sql, /CREATE OR REPLACE FUNCTION public\.submit_parent_question/)
assert.doesNotMatch(sql, /_high_recovery_weekly_first_score/)
assert.doesNotMatch(sql, /generate_weekly_learning_summaries/)

const questionsPage = readFileSync('src/pages/parent/ParentStudentQuestionsPage.tsx', 'utf8')
assert.match(questionsPage, /filterParentQuestions/)
assert.doesNotMatch(questionsPage, /PARENT_SUGGESTION_CATEGORY/)
assert.doesNotMatch(questionsPage, /건의사항이 등록되었습니다/)
assert.doesNotMatch(questionsPage, /await saveQuestionRecord/)

const suggestionPage = readFileSync('src/pages/parent/ParentStudentSuggestionsPage.tsx', 'utf8')
assert.match(suggestionPage, /PARENT_SUGGESTION_CATEGORY/)
assert.match(suggestionPage, /filterParentSuggestions/)
assert.match(suggestionPage, /writeParentSuggestionLastRead/)
assert.match(suggestionPage, /formatParentSuggestionAuthor\(student\.name\)/)
assert.match(suggestionPage, /작성자/)
assert.match(suggestionPage, /await saveQuestionRecord/)
assert.match(suggestionPage, /if \(!validate\(\) \|\| submitting \|\| isSaving\) return/)
assert.match(suggestionPage, /disabled=\{busy\}/)
assert.doesNotMatch(suggestionPage, /질문이 저장되었습니다/)
assert.doesNotMatch(suggestionPage, /질문 저장에 실패했습니다/)

const useData = readFileSync('src/hooks/useData.tsx', 'utf8')
assert.match(useData, /isParentSuggestionCategory\(data\.category\)/)
assert.match(useData, /parentRecordSaveCopy/)
assert.match(useData, /showToast\(copy\.success\)/)
assert.match(useData, /showToast\(copy\.failure\)/)
assert.match(useData, /parent suggestion reload failed after persist/)
assert.match(useData, /mergePersistedQuestion\(prev, record\)/)
assert.match(useData, /showToast\('질문이 저장되었습니다\.'\)/)
assert.match(useData, /'질문 저장에 실패했습니다\.'/)
assert.match(useData, /rpcSubmitParentQuestion/)
assert.doesNotMatch(
  useData,
  /void persistWithReload\(\s*\(\) =>\s*rpcSubmitParentQuestion[\s\S]*PARENT_SUGGESTION/,
)

const card = readFileSync('src/components/question/QuestionRecordCard.tsx', 'utf8')
assert.match(card, /formatParentSuggestionAuthor\(studentName\)/)
assert.match(card, /작성자 \$\{formatParentSuggestionAuthor/)

const teacherMobile = readFileSync('src/pages/teacherMobile/TeacherMobileQuestionsPage.tsx', 'utf8')
assert.match(teacherMobile, /작성자 \$\{formatParentSuggestionAuthor/)
assert.match(teacherMobile, /upsertQuestion|saveQuestionRecord/)

const teacherPage = readFileSync('src/pages/QuestionsPage.tsx', 'utf8')
assert.match(teacherPage, /학부모 건의/)
assert.match(teacherPage, /kindFilter/)
assert.match(teacherPage, /saveQuestionRecord/)

const hubQuestions = readFileSync('src/hub/HubQuestionsPage.tsx', 'utf8')
assert.match(hubQuestions, /질문 저장에 실패했습니다/)

const hubSuggestions = readFileSync('src/hub/HubSuggestionsPage.tsx', 'utf8')
assert.match(hubSuggestions, /rpcSubmitHubInbox/)
assert.doesNotMatch(hubSuggestions, /PARENT_SUGGESTION_CATEGORY/)

console.log('parentSuggestions.test.ts passed')
