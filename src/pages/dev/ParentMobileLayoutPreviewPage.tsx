import { PriorDayLearningEvaluationRow } from '../../components/studentCare/LearningStatusBadge'
import { ParentStudentInfoCard } from '../../components/parent/ParentStudentComponents'
import {
  ParentHomeworkSlotCard,
  ParentProgressSlotCard,
  ParentSubjectSlotList,
} from '../../components/todayReport/parentTextbookDisplay'
import { StudentSummaryCard } from '../../components/todayReport/TodayReportView'
import { classAttitudeDisplay } from '../../components/studentCare/ClassAttitudePicker'
import { ParentAttitudeTeacherComment } from '../../components/todayReport/ParentAttitudeTeacherComment'
import { materialPrepDisplay } from '../../components/studentCare/MaterialPrepPicker'
import { ParentWeeklyWrongVocabReport } from '../../components/parent/ParentWeeklyWrongVocabReport'
import { WeeklySummaryDetail } from '../parent/ParentStudentWeeklySummaryPage'
import { parentHomeCategoryItems, parentTodayReportHighlights, parentTodayReportItem } from '../../components/parent/parentNavItems'
import type { Student } from '../../types/student'
import type {
  ClassTodayReportCommon,
  DailyTestRecord,
  StudentTextbookSlot,
  WeeklyLearningSummaryRecord,
} from '../../types/records'
import { EMPTY_DAILY_LEARNING_DIAGNOSIS } from '../../utils/learningDiagnosis'
import { applyFixedWrongFormatToDiagnosis } from '../../utils/mathDailyTest'
import { applyHighRecoveryToDiagnosis } from '../../utils/mathHighRecovery'
import { computePriorDayLearningEvaluation } from '../../utils/studentCare'
import '../../styles/parentMobileTheme.css'

const previewStudent: Student = {
  id: 'preview-student',
  name: '김하이퍼',
  studentAccessKey: 'preview-key',
  accessKeyActive: true,
  school: '하이퍼중학교',
  grade: '중2',
  studentPhone: '',
  parentPhone: '',
  className: '중2-수학A',
  subjects: ['수학', '영어'],
  teacher: '박강사',
  enrollmentDate: '2026-03-02',
  status: '재원',
  memo: '',
  createdAt: '',
  updatedAt: '',
}

const previewEvaluation = computePriorDayLearningEvaluation(
  {
    studentId: previewStudent.id,
    attendance: [
      {
        id: 'a1',
        studentId: previewStudent.id,
        date: '2026-09-07',
        status: '지각',
        reason: '',
        memo: '',
        excuseKind: '무단',
        createdAt: '',
        updatedAt: '',
      },
    ],
    homework: [],
    homeworkTextbookEntries: [
      {
        id: 'h1',
        studentId: previewStudent.id,
        date: '2026-09-07',
        subject: '수학',
        slotNumber: 1,
        previousAssignment: 'p. 32~35',
        todayAssignment: 'p. 36~40',
        status: '부분 완료',
        createdAt: '',
        updatedAt: '',
      },
    ],
    dailyTests: [],
    dailyCare: [
      {
        id: 'c1',
        studentId: previewStudent.id,
        date: '2026-09-07',
        materialPrep: '부분 지참',
        attitudeIssues: ['졸음'],
        attitudeNote: '전날 수면 부족으로 보이며 후반부에는 집중도 회복',
        createdAt: '',
        updatedAt: '',
      },
    ],
    progressRecords: [],
    classNotes: [],
  },
  '2026-09-07',
)

function previewDailyTest(
  date: string,
  sessions: DailyTestRecord['sessionResults'],
  diagnosis: DailyTestRecord['learningDiagnosis'] = applyFixedWrongFormatToDiagnosis({
    ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
    calculationErrorCount: date === '2026-09-07' ? 2 : date === '2026-09-09' ? 1 : 0,
    conceptLackCount: date === '2026-09-09' ? 2 : 0,
    applicationLackCount: 0,
    comprehensionLackCount: date === '2026-09-09' ? 1 : 0,
  }),
  subject = '수학',
): DailyTestRecord {
  return {
    id: `preview-${date}-${subject}`,
    studentId: previewStudent.id,
    date,
    testName: '일일테스트',
    subject,
    score: sessions.find((item) => item.score != null)?.score ?? 0,
    totalScore: 100,
    percentage: sessions.find((item) => item.score != null)?.score ?? 0,
    incorrectCount: sessions.find((item) => item.incorrectCount != null)?.incorrectCount ?? 0,
    memo: '',
    sessionResults: sessions,
    learningDiagnosis: diagnosis,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
  }
}

const previewDailyTests: DailyTestRecord[] = [
  previewDailyTest('2026-09-07', [
    { session: 1, status: '합격', score: 90, totalScore: 100, incorrectCount: 1 },
    { session: 2, status: '미응시' },
    { session: 3, status: '미응시' },
    { session: 4, status: '미응시' },
  ]),
  previewDailyTest('2026-09-09', [
    { session: 1, status: '불합격', score: 70, totalScore: 100, incorrectCount: 3 },
    { session: 2, status: '불합격', score: 80, totalScore: 100, incorrectCount: 1 },
    { session: 3, status: '합격', score: 100, totalScore: 100, incorrectCount: 0 },
    { session: 4, status: '미응시' },
  ]),
  previewDailyTest(
    '2026-09-11',
    [
      { session: 1, status: '미응시' },
      { session: 2, status: '미응시' },
      { session: 3, status: '미응시' },
      { session: 4, status: '미응시' },
    ],
    applyHighRecoveryToDiagnosis(
      {
        ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
        calculationErrorCount: 1,
        conceptLackCount: 1,
        applicationLackCount: 1,
      },
      {
        firstWrong: 4,
        endSession: 4,
        session3Questions: 6,
        session4Questions: 5,
      },
    ),
  ),
  previewDailyTest(
    '2026-09-08',
    [
      { session: 1, status: '미응시' },
      { session: 2, status: '미응시' },
      { session: 3, status: '미응시' },
      { session: 4, status: '미응시' },
    ],
    {
      ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
      englishVocabTestFormat: 'cumulative',
      englishVocabTotalWords: 200,
      englishVocabWrongWords: 20,
    },
    '영어',
  ),
  previewDailyTest(
    '2026-09-09',
    [
      { session: 1, status: '미응시' },
      { session: 2, status: '미응시' },
      { session: 3, status: '미응시' },
      { session: 4, status: '미응시' },
    ],
    {
      ...EMPTY_DAILY_LEARNING_DIAGNOSIS,
      englishVocabTestFormat: 'cumulative',
      englishVocabTotalWords: 300,
      englishVocabWrongWords: 30,
    },
    '영어',
  ),
]

const previewEnglishTextbookSlots: StudentTextbookSlot[] = [
  {
    id: 'preview-en-slot-3',
    studentId: previewStudent.id,
    subject: '영어',
    slotNumber: 3,
    textbookName: '고등 영단어 BASIC',
    createdAt: '',
    updatedAt: '',
  },
]

const previewEnglishClassCommon: ClassTodayReportCommon[] = [
  {
    id: 'preview-en-common-0909',
    grade: previewStudent.grade,
    className: previewStudent.className,
    reportDate: '2026-09-09',
    subject: '영어',
    slotNumber: 3,
    textbookName: '고등 영단어 BASIC',
    currentProgress: '',
    currentPage: 0,
    totalPage: 0,
    previousAssignment: '',
    todayAssignment: '',
    createdAt: '',
    updatedAt: '',
  },
]

const previewSummary: WeeklyLearningSummaryRecord = {
  id: 'sum-preview',
  studentId: previewStudent.id,
  weekStart: '2026-09-07',
  periodStart: '2026-09-07',
  periodEnd: '2026-09-11',
  asOf: '2026-09-12T00:00:00+09:00',
  totalScore: 88,
  grade: '양호',
  scores: {
    attendance: {
      score: 20,
      max: 20,
      index: 100,
      grade: '우수',
      facts: { presentCount: 3, unexcusedLateCount: 0, unexcusedAbsentCount: 0 },
    },
    material: {
      score: 9,
      max: 10,
      index: 90,
      grade: '우수',
      facts: { broughtCount: 2, partialCount: 1 },
    },
    homework: {
      score: 20,
      max: 25,
      index: 80,
      grade: '양호',
      facts: { completeCount: 2, partialCount: 1, incompleteCount: 0 },
    },
    dailyTest: {
      score: 24,
      max: 30,
      index: 80,
      grade: '양호',
      facts: { averageScore: 82, passCount: 2, attemptCount: 3 },
    },
    attitude: {
      score: 15,
      max: 15,
      index: 100,
      grade: '우수',
      facts: { issueCount: 0 },
    },
  },
  goodText: '출석과 수업태도가 안정적이었습니다.',
  checkText: '숙제 부분완료가 1회 있어 다음 주 마감 습관을 확인합니다.',
  teacherComment: '개념 정리는 잘 되고 있습니다. 계산 실수만 줄이면 됩니다.',
  createdAt: '',
  updatedAt: '',
}

/** 개발 전용: 학부모 HOME / Today Report / 주간 SUMMARY 모바일 레이아웃 확인 */
export function ParentMobileLayoutPreviewPage() {
  const TodayIcon = parentTodayReportItem.icon

  return (
    <div className="parent-mobile-app min-h-svh overflow-x-hidden bg-[#F5F7FB]">
      <header className="pm-app-header sticky top-0 z-30 px-3 py-3 sm:px-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="pm-app-header-kicker">Hyper Student Care</p>
            <p className="pm-app-header-name truncate">{previewStudent.name}</p>
          </div>
        </div>
      </header>
      <main className="parent-main px-3 py-4 sm:px-5">
        <div className="mx-auto max-w-3xl space-y-8">
          <section data-preview-section="home" className="parent-page parent-home pb-2">
            <ParentStudentInfoCard student={previewStudent} compact />
            <section aria-label="학습 기록 메뉴" className="mt-3">
              <div className="parent-home-menu space-y-3">
                <div className="pm-featured-card">
                  <div className="flex items-start gap-3.5">
                    <span className="pm-featured-icon">
                      <TodayIcon className="h-7 w-7" strokeWidth={2} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <span className="block text-lg font-bold leading-tight">
                        {parentTodayReportItem.label}
                      </span>
                      <span className="mt-1 block text-[15px] leading-snug text-white/90">
                        {previewStudent.name} · 2026년 9월 14일
                      </span>
                      <span className="mt-1 block text-sm leading-snug text-white/80">
                        {parentTodayReportItem.description}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {parentTodayReportHighlights.map((tag) => (
                      <span key={tag.id} className="pm-featured-tag">
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid auto-rows-fr grid-cols-2 gap-2.5">
                  {parentHomeCategoryItems.map(({ segment, label, description, icon: Icon }) => {
                    return (
                      <div key={segment} className="pm-menu-card relative">
                        {segment === 'weekly-learning-summary' ? (
                          <span className="absolute right-2.5 top-2.5 h-2 w-2 shrink-0 rounded-full bg-[#FF8A3D]" />
                        ) : null}
                        <span className="pm-menu-icon">
                          <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
                        </span>
                        <span className="mt-2 min-w-0">
                          <span className="pm-menu-title whitespace-pre-line break-keep">{label}</span>
                          {description ? (
                            <span className="pm-menu-desc line-clamp-2 break-anywhere">
                              {description}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          </section>

          <section data-preview-section="weekly-summary" className="parent-page space-y-4 pb-6">
            <WeeklySummaryDetail
              summary={previewSummary}
              dailyTests={previewDailyTests}
              studentId={previewStudent.id}
            />
          </section>

          <section data-preview-section="weekly-wrong-vocab" className="parent-page space-y-4 pb-6">
            <p className="text-base font-bold text-navy-900">주간 수학 오답 · 영어 단어 누적 현황</p>
            <p className="text-sm text-slate-600">이번 주 수학 오답 추적과 영어 누적 단어 학습을 확인합니다.</p>
            <ParentWeeklyWrongVocabReport
              studentId={previewStudent.id}
              weekStart={previewSummary.weekStart}
              dailyTests={previewDailyTests}
              studentTextbookSlots={previewEnglishTextbookSlots}
              classTodayReportCommon={previewEnglishClassCommon}
              grade={previewStudent.grade}
              className={previewStudent.className}
            />
            <p className="text-sm text-slate-500">기록 없는 주</p>
            <ParentWeeklyWrongVocabReport
              studentId={previewStudent.id}
              weekStart="2026-09-21"
              dailyTests={previewDailyTests}
              studentTextbookSlots={previewEnglishTextbookSlots}
              classTodayReportCommon={previewEnglishClassCommon}
              grade={previewStudent.grade}
              className={previewStudent.className}
            />
          </section>

          <section data-preview-section="today-report" className="parent-page space-y-3 pb-4">
            <StudentSummaryCard
              student={previewStudent}
              compact
              evaluation={<PriorDayLearningEvaluationRow result={previewEvaluation} />}
            />
            <section className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
              <h2 className="text-base font-bold text-navy-900">숙제 수행 결과</h2>
              <div className="mt-2">
                <ParentSubjectSlotList subject="수학">
                  <ParentHomeworkSlotCard
                    item={{
                      subject: '수학',
                      slotNumber: 1,
                      textbookName: '개념원리 RPM 중2-1',
                      previousAssignment: 'p. 32~35 전체',
                      todayAssignment: 'p. 36~40 홀수번',
                      status: '부분 완료',
                    }}
                  />
                </ParentSubjectSlotList>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
              <h2 className="text-base font-bold text-navy-900">교재 준비</h2>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {materialPrepDisplay('지참')}
              </p>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
              <h2 className="text-base font-bold text-navy-900">오늘의 진도</h2>
              <div className="mt-2">
                <ParentSubjectSlotList subject="수학">
                  <ParentProgressSlotCard
                    item={{
                      subject: '수학',
                      slotNumber: 1,
                      textbookName: '개념원리 RPM 중2-1',
                      progressContent: '이차방정식 활용',
                      currentProgress: '이차방정식 활용',
                      currentPage: 40,
                      totalPage: 120,
                      progressRate: 33,
                      teacherMemo: '',
                    }}
                  />
                </ParentSubjectSlotList>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
              <h2 className="text-base font-bold text-navy-900">일일테스트</h2>
              <p className="mt-2 text-sm text-slate-700">수학 · 이차방정식 · 88점</p>
            </section>
            <section
              className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm"
              data-preview-attitude="with-comment"
            >
              <h2 className="text-base font-bold text-navy-900">수업태도</h2>
              <div className="mt-2 space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  {classAttitudeDisplay(['졸음'])}
                </p>
                <ParentAttitudeTeacherComment note="오늘 수업에서는 이차함수 개념에 대한 이해가 좋아졌고 질문에도 적극적으로 대답했습니다. 후반부에도 집중력을 잘 유지했습니다." />
              </div>
            </section>
            <section
              className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm"
              data-preview-attitude="no-comment"
            >
              <h2 className="text-base font-bold text-navy-900">수업태도</h2>
              <div className="mt-2 space-y-2">
                <p className="text-sm font-semibold text-slate-800">
                  {classAttitudeDisplay([])}
                </p>
                <ParentAttitudeTeacherComment note="" />
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  )
}
