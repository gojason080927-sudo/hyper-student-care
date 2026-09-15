/**
 * 실행: node --experimental-strip-types src/utils/parentAttitudeTeacherComment.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type {
  AttendanceRecord,
  DailyTestRecord,
  HomeworkTextbookEntry,
  StudentDailyCareRecord,
} from '../types/records.ts'
import {
  canShiftParentTodayReportDate,
  getParentTodayReportMinDate,
} from './parentTodayReportHistory.ts'
import {
  PARENT_ATTITUDE_TEACHER_COMMENT_LABEL,
  parentAttitudeNoteForSelectedDate,
  parentAttitudeTeacherCommentDisplay,
  parentAttitudeTeacherCommentText,
} from './parentAttitudeTeacherComment.ts'
import { computeLearningRisk, computePriorDayLearningEvaluation } from './studentCare/risk.ts'
import { attitudeLessonIndex } from './studentCare/scoring.ts'
import { buildWeeklyLearningSummary } from './studentCare/weeklySummary.ts'
import { addDaysInSeoul } from './seoulDate.ts'

function care(
  studentId: string,
  date: string,
  patch: Partial<StudentDailyCareRecord> = {},
): StudentDailyCareRecord {
  return {
    id: `${studentId}-${date}`,
    studentId,
    date,
    materialPrep: null,
    attitudeIssues: [],
    attitudeNote: '',
    createdAt: '',
    updatedAt: '',
    ...patch,
  }
}

function attendance(date: string, status: AttendanceRecord['status'] = '출석'): AttendanceRecord {
  return {
    id: `a-${date}`,
    studentId: 'stu-1',
    date,
    status,
    reason: '',
    memo: '',
    excuseKind: null,
    createdAt: '',
    updatedAt: '',
  }
}

function homework(date: string, status: HomeworkTextbookEntry['status'] = '완료'): HomeworkTextbookEntry {
  return {
    id: `h-${date}`,
    studentId: 'stu-1',
    date,
    subject: '수학',
    slotNumber: 1,
    previousAssignment: 'p',
    todayAssignment: 't',
    status,
    createdAt: '',
    updatedAt: '',
  }
}

function testRecord(date: string, score: number): DailyTestRecord {
  return {
    id: `t-${date}`,
    studentId: 'stu-1',
    date,
    testName: '일일',
    subject: '수학',
    score,
    totalScore: 100,
    percentage: score,
    incorrectCount: 0,
    memo: '',
    sessionResults: [
      { session: 1, status: score >= 85 ? '합격' : '불합격', score, totalScore: 100, incorrectCount: 0 },
      { session: 2, status: '미응시' },
      { session: 3, status: '미응시' },
      { session: 4, status: '미응시' },
    ],
    learningDiagnosis: {
      wrongAnswerItems: [],
      questionTotal: 0,
      conceptLackCount: 0,
      calculationErrorCount: 0,
      applicationLackCount: 0,
      teacherFeedback: '',
      fridayRetestTotal: null,
      fridayRetestWrong: null,
      englishVocabResult: null,
      englishGrammarWrongCount: null,
      englishReadingWrongCount: null,
      englishListeningScore: null,
      englishListeningResult: null,
    },
    createdAt: '',
    updatedAt: '',
  }
}

const today = '2026-09-15'
const yesterday = '2026-09-14'
const dayBefore = '2026-09-13'
const todayNote = '오늘 집중력이 좋았습니다.'
const yesterdayNote = '후반부 집중력이 떨어졌습니다.'

const records: StudentDailyCareRecord[] = [
  care('stu-1', today, { attitudeNote: todayNote }),
  care('stu-1', yesterday, { attitudeIssues: ['집중 저하', '졸음'], attitudeNote: yesterdayNote }),
  care('stu-1', dayBefore, { attitudeIssues: [] }),
  care('stu-2', today, { attitudeNote: '다른 학생 의견' }),
]

// A present
const present = parentAttitudeTeacherCommentDisplay(todayNote)
assert.equal(present.visible, true)
if (present.visible) {
  assert.equal(present.label, '강사의 의견')
  assert.equal(present.text, todayNote)
}

// B null / C empty / D whitespace
assert.equal(parentAttitudeTeacherCommentText(null), null)
assert.equal(parentAttitudeTeacherCommentText(undefined), null)
assert.equal(parentAttitudeTeacherCommentText(''), null)
assert.equal(parentAttitudeTeacherCommentText('   \n\t  '), null)
assert.equal(parentAttitudeTeacherCommentDisplay(null).visible, false)
assert.equal(parentAttitudeTeacherCommentDisplay('').visible, false)
assert.equal(parentAttitudeTeacherCommentDisplay('   ').visible, false)

// E today exact
assert.equal(
  parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-1', selectedDate: today }),
  todayNote,
)
assert.equal(
  parentAttitudeTeacherCommentDisplay(
    parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-1', selectedDate: today }),
  ).visible,
  true,
)

// F yesterday exact
assert.equal(
  parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-1', selectedDate: yesterday }),
  yesterdayNote,
)

// G no date leakage
assert.notEqual(
  parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-1', selectedDate: today }),
  parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-1', selectedDate: yesterday }),
)
assert.equal(
  parentAttitudeTeacherCommentText(
    parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-1', selectedDate: today }),
  ),
  todayNote,
)

// H date with no note
assert.equal(
  parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-1', selectedDate: dayBefore }),
  '',
)
assert.equal(
  parentAttitudeTeacherCommentDisplay(
    parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-1', selectedDate: dayBefore }),
  ).visible,
  false,
)

// I different student
assert.equal(
  parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-2', selectedDate: today }),
  '다른 학생 의견',
)
assert.notEqual(
  parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-1', selectedDate: today }),
  parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-2', selectedDate: today }),
)
assert.equal(
  parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-2', selectedDate: yesterday }),
  '',
)

// Carry-forward contentDate must not be used: today empty, yesterday has note
const todayEmptyRecords = [
  care('stu-1', yesterday, { attitudeNote: yesterdayNote }),
]
assert.equal(
  parentAttitudeNoteForSelectedDate({
    records: todayEmptyRecords,
    studentId: 'stu-1',
    selectedDate: today,
  }),
  '',
)
assert.equal(
  parentAttitudeTeacherCommentDisplay(
    parentAttitudeNoteForSelectedDate({
      records: todayEmptyRecords,
      studentId: 'stu-1',
      selectedDate: today,
    }),
  ).visible,
  false,
)

// J same-day resave newest only
const beforeResave = [care('stu-1', today, { attitudeNote: '집중력이 좋았습니다.' })]
const afterResave = [
  care('stu-1', today, { attitudeNote: '집중력이 매우 좋았고 질문도 적극적이었습니다.' }),
]
assert.equal(
  parentAttitudeNoteForSelectedDate({
    records: afterResave,
    studentId: 'stu-1',
    selectedDate: today,
  }),
  '집중력이 매우 좋았고 질문도 적극적이었습니다.',
)
assert.notEqual(
  parentAttitudeNoteForSelectedDate({ records: afterResave, studentId: 'stu-1', selectedDate: today }),
  parentAttitudeNoteForSelectedDate({ records: beforeResave, studentId: 'stu-1', selectedDate: today }),
)
assert.equal(afterResave.length, 1)

// K issues + comment both available independently
const yesterdayDisplay = parentAttitudeTeacherCommentDisplay(
  parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-1', selectedDate: yesterday }),
)
assert.equal(yesterdayDisplay.visible, true)
if (yesterdayDisplay.visible) {
  assert.equal(yesterdayDisplay.text, yesterdayNote)
}
const yesterdayIssues = records.find((row) => row.studentId === 'stu-1' && row.date === yesterday)
  ?.attitudeIssues
assert.deepEqual(yesterdayIssues, ['집중 저하', '졸음'])

// 우수 + comment (no issues) still visible — this was the parent UI root cause
const excellentWithNote = parentAttitudeTeacherCommentDisplay(
  parentAttitudeNoteForSelectedDate({ records, studentId: 'stu-1', selectedDate: today }),
)
assert.equal(excellentWithNote.visible, true)

// L note does not affect attitude score
assert.equal(attitudeLessonIndex([]), 100)
assert.equal(attitudeLessonIndex(['졸음']), 80)
assert.equal(attitudeLessonIndex(['졸음', '잡담', '수업방해']), 60)
assert.equal(attitudeLessonIndex.length, 1)

const lessonInput = (dailyCare: StudentDailyCareRecord[]) => ({
  studentId: 'stu-1',
  attendance: [attendance(today)],
  homework: [],
  homeworkTextbookEntries: [homework(today)],
  dailyTests: [testRecord(today, 90)],
  dailyCare,
})

const evalWithoutNote = computePriorDayLearningEvaluation(
  lessonInput([care('stu-1', today, { attitudeIssues: ['졸음'] })]),
  today,
)
const evalWithNote = computePriorDayLearningEvaluation(
  lessonInput([
    care('stu-1', today, {
      attitudeIssues: ['졸음'],
      attitudeNote: '오늘 컨디션이 좋지 않아 집중이 어려웠습니다.',
    }),
  ]),
  today,
)
assert.deepEqual(evalWithNote, evalWithoutNote)

const evalExcellentNote = computePriorDayLearningEvaluation(
  lessonInput([care('stu-1', today, { attitudeNote: '매우 좋았습니다.' })]),
  today,
)
const evalExcellentEmpty = computePriorDayLearningEvaluation(
  lessonInput([care('stu-1', today)]),
  today,
)
assert.deepEqual(evalExcellentNote, evalExcellentEmpty)

function weeklyInput(dailyCare: StudentDailyCareRecord[]) {
  return {
    studentId: 'stu-1',
    weekStart: '2026-09-14',
    asOfIso: '2026-09-19T08:00:00.000+09:00',
    asOfDate: '2026-09-19',
    attendance: [attendance(today), attendance(yesterday)],
    homework: [],
    homeworkTextbookEntries: [homework(today), homework(yesterday)],
    dailyTests: [testRecord(today, 90), testRecord(yesterday, 88)],
    dailyCare,
  }
}

const weeklyNoNote = buildWeeklyLearningSummary(
  weeklyInput([
    care('stu-1', today, { attitudeIssues: ['졸음'] }),
    care('stu-1', yesterday, { attitudeIssues: ['집중 저하'] }),
  ]),
)
const weeklyWithNotes = buildWeeklyLearningSummary(
  weeklyInput([
    care('stu-1', today, { attitudeIssues: ['졸음'], attitudeNote: todayNote }),
    care('stu-1', yesterday, { attitudeIssues: ['집중 저하'], attitudeNote: yesterdayNote }),
  ]),
)
assert.deepEqual(weeklyWithNotes.scores, weeklyNoNote.scores)
assert.equal(weeklyWithNotes.totalScore, weeklyNoNote.totalScore)
assert.equal(weeklyWithNotes.grade, weeklyNoNote.grade)
assert.equal(weeklyWithNotes.scores.attendance.max, 20)
assert.equal(weeklyWithNotes.scores.material.max, 10)
assert.equal(weeklyWithNotes.scores.homework.max, 25)
assert.equal(weeklyWithNotes.scores.dailyTest.max, 30)
assert.equal(weeklyWithNotes.scores.attitude.max, 15)

const riskNoNote = computeLearningRisk(
  lessonInput([care('stu-1', today, { attitudeIssues: ['졸음', '잡담'] })]),
  today,
)
const riskWithNote = computeLearningRisk(
  lessonInput([
    care('stu-1', today, {
      attitudeIssues: ['졸음', '잡담'],
      attitudeNote: '부정적인 문장이라도 점수에 넣지 않는다',
    }),
  ]),
  today,
)
assert.equal(riskWithNote.level, riskNoNote.level)
assert.equal(riskWithNote.score, riskNoNote.score)

// O 30-day navigation uses each selected date only
const historyToday = '2026-09-15'
const minDate = getParentTodayReportMinDate(historyToday)
assert.equal(minDate, '2026-08-17')
const historyRecords = [
  care('stu-1', '2026-09-15', { attitudeNote: todayNote }),
  care('stu-1', '2026-09-14', { attitudeNote: yesterdayNote }),
  care('stu-1', '2026-09-01', { attitudeNote: '9월 1일 의견' }),
]
let date = historyToday
const walked = new Set<string>()
while (true) {
  walked.add(date)
  const note = parentAttitudeNoteForSelectedDate({
    records: historyRecords,
    studentId: 'stu-1',
    selectedDate: date,
  })
  if (date === '2026-09-15') assert.equal(note, todayNote)
  else if (date === '2026-09-14') assert.equal(note, yesterdayNote)
  else if (date === '2026-09-13') assert.equal(note, '')
  else if (date === '2026-09-01') assert.equal(note, '9월 1일 의견')
  else assert.equal(note, '')
  if (!canShiftParentTodayReportDate(date, -1, historyToday)) break
  date = addDaysInSeoul(date, -1)
}
assert.equal(walked.has(minDate), true)
assert.equal(walked.size, 30)

// P legacy row without attitude_note → treat as empty, no crash
const legacyMissingNote = care('stu-1', today)
delete (legacyMissingNote as { attitudeNote?: string }).attitudeNote
assert.equal(
  parentAttitudeTeacherCommentDisplay(
    (legacyMissingNote as { attitudeNote?: string }).attitudeNote,
  ).visible,
  false,
)
assert.equal(parentAttitudeTeacherCommentText(undefined), null)
assert.doesNotThrow(() =>
  parentAttitudeTeacherCommentDisplay(
    parentAttitudeNoteForSelectedDate({
      records: [{ ...care('stu-1', today), attitudeNote: undefined as unknown as string }],
      studentId: 'stu-1',
      selectedDate: today,
    }),
  ),
)

// Q parent access / RPC still SECURITY DEFINER + no anon table SELECT
const sql = readFileSync('supabase/weekly-student-care-migration.sql', 'utf8')
assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_parent_today_report/)
assert.match(sql, /v_student_id := public\._parent_active_student_id\(p_access_key\)/)
assert.match(
  sql,
  /'student_daily_care',\s*\(SELECT to_jsonb\(c\)\s*FROM public\.student_daily_care c\s*WHERE c\.student_id = v_student_id AND c\.date = p_date/,
)
assert.match(sql, /CONSTRAINT student_daily_care_student_date_unique UNIQUE \(student_id, date\)/)
assert.match(sql, /REVOKE ALL ON TABLE public\.student_daily_care FROM anon/)
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_parent_today_report\(text, date\) TO anon/)
assert.doesNotMatch(sql, /GRANT SELECT ON TABLE public\.student_daily_care TO anon/)
assert.doesNotMatch(sql, /CREATE POLICY[\s\S]{0,80}student_daily_care[\s\S]{0,80}TO anon/)

const mapper = readFileSync('src/lib/db/mappers.ts', 'utf8')
assert.match(mapper, /attitudeNote: row\.attitude_note \?\? ''/)

const parentRpc = readFileSync('src/lib/db/parentAccessRpc.ts', 'utf8')
assert.match(parentRpc, /studentDailyCareFromRow/)
assert.match(parentRpc, /report\.student_daily_care/)

const parentView = readFileSync('src/components/todayReport/TodayReportView.tsx', 'utf8')
assert.match(parentView, /parentAttitudeNoteForSelectedDate/)
assert.match(parentView, /exactDateAttitudeNote=\{exactDateCareNote\}/)
assert.match(parentView, /ParentAttitudeTeacherComment note=\{exactDateAttitudeNote\}/)
assert.doesNotMatch(parentView, /parentIssues\.length > 0 && parentNote/)

const parentCommentUi = readFileSync(
  'src/components/todayReport/ParentAttitudeTeacherComment.tsx',
  'utf8',
)
assert.match(parentCommentUi, /강사의 의견|PARENT_ATTITUDE_TEACHER_COMMENT_LABEL|display\.label/)
assert.match(parentCommentUi, /break-keep/)
assert.doesNotMatch(parentCommentUi, /textarea|microphone|SectionVoiceInput/i)
assert.equal(PARENT_ATTITUDE_TEACHER_COMMENT_LABEL, '강사의 의견')

const teacherAttitude = readFileSync('src/components/todayReport/ClassAttitudeBulkPanel.tsx', 'utf8')
assert.match(teacherAttitude, /강사의 의견/)
assert.match(teacherAttitude, /attitudeNote/)
assert.match(teacherAttitude, /SectionVoiceInput/)

const sectionVoice = readFileSync('src/components/todayReport/SectionVoiceInput.tsx', 'utf8')
assert.match(sectionVoice, /holdUntilExplicitStop: true/)

const speech = readFileSync('src/utils/voiceInput/speechRecognition.ts', 'utf8')
assert.match(speech, /export function startKoreanSpeechRecognition/)

console.log('parentAttitudeTeacherComment OK')
