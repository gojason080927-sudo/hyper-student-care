import { PriorDayLearningEvaluationRow, PriorDayLearningGradeBadge } from '../../components/studentCare/LearningStatusBadge'
import { ParentStudentInfoCard } from '../../components/parent/ParentStudentComponents'
import {
  ParentHomeworkSlotCard,
  ParentProgressSlotCard,
  ParentSubjectSlotList,
} from '../../components/todayReport/parentTextbookDisplay'
import { StudentSummaryCard } from '../../components/todayReport/TodayReportView'
import { classAttitudeDisplay } from '../../components/studentCare/ClassAttitudePicker'
import { materialPrepDisplay } from '../../components/studentCare/MaterialPrepPicker'
import { WeeklySummaryDetail } from '../parent/ParentStudentWeeklySummaryPage'
import { parentHomeCategoryItems, parentTodayReportHighlights, parentTodayReportItem } from '../../components/parent/parentNavItems'
import type { Student } from '../../types/student'
import type { WeeklyLearningSummaryRecord } from '../../types/records'
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
            <WeeklySummaryDetail summary={previewSummary} />
          </section>

          <section data-preview-section="today-report" className="parent-page space-y-3 pb-4">
            <StudentSummaryCard
              student={previewStudent}
              compact
              evaluation={<PriorDayLearningEvaluationRow result={previewEvaluation} />}
            />
            <div data-preview-grades="" className="flex flex-wrap gap-1.5">
              {(['우수', '양호', '주의', '위험'] as const).map((grade) => (
                <PriorDayLearningGradeBadge key={grade} grade={grade} />
              ))}
            </div>
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
            <section className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
              <h2 className="text-base font-bold text-navy-900">수업태도</h2>
              <p className="mt-2 text-sm font-semibold text-slate-800">
                {classAttitudeDisplay(['졸음'])}
              </p>
              <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-slate-600">강사 메모</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  전날 수면 부족으로 보이며 후반부에는 집중도 회복
                </p>
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  )
}
