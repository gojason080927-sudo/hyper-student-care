import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/auth/ProtectedRoute'

import { ParentLayout } from './components/layout/ParentLayout'

import { ParentStudentLayout } from './components/layout/ParentStudentLayout'

import { AppLayout } from './components/AppLayout'

import { TeacherMobileLayout } from './components/teacherMobile/TeacherMobileLayout'

import { TeacherMobilePageShell } from './components/teacherMobile/TeacherMobilePageShell'

import { AttendancePage } from './pages/AttendancePage'

import { DailyTestPage } from './pages/DailyTestPage'

import { DashboardPage } from './pages/DashboardPage'

import { HomeworkPage } from './pages/HomeworkPage'

import { LoginPage } from './pages/LoginPage'

import { MakeupPlanPage } from './pages/MakeupPlanPage'

import { MonthlyEvaluationPage } from './pages/MonthlyEvaluationPage'

import { MonthlyEvaluationSelectPage } from './pages/MonthlyEvaluationSelectPage'

import { ProgressPage } from './pages/ProgressPage'

import { QuestionsPage } from './pages/QuestionsPage'

import { TeacherMobileQuestionsPage } from './pages/teacherMobile/TeacherMobileQuestionsPage'

import { StudentDetailPage } from './pages/StudentDetailPage'

import { LearningNoticeDetailPage } from './pages/LearningNoticeDetailPage'

import { LearningNoticesPage } from './pages/LearningNoticesPage'

import { StudentMonthlyEvaluationPage } from './pages/StudentMonthlyEvaluationPage'

import { StudentsPage } from './pages/StudentsPage'

import { RedirectToTodayReportBulk } from './pages/RedirectToTodayReportBulk'

import { TeacherTodayReportBulkPage } from './pages/TeacherTodayReportBulkPage'

import { TeacherLearningNoticeDetailPage } from './pages/TeacherLearningNoticeDetailPage'

import { TeacherLearningNoticesPage } from './pages/TeacherLearningNoticesPage'

import { TeacherMobileDashboardPage } from './pages/teacherMobile/TeacherMobileDashboardPage'

import { TeacherMobileMorePage } from './pages/teacherMobile/TeacherMobileMorePage'

import { TeacherMobileTodayReportPage } from './pages/teacherMobile/TeacherMobileTodayReportPage'

import { ParentStudentAttendancePage } from './pages/parent/ParentStudentAttendancePage'

import { ParentStudentDailyTestPage } from './pages/parent/ParentStudentDailyTestPage'

import { ParentStudentHomePage } from './pages/parent/ParentStudentHomePage'

import { ParentStudentHomeworkPage } from './pages/parent/ParentStudentHomeworkPage'

import { ParentStudentMakeupPlanPage } from './pages/parent/ParentStudentMakeupPlanPage'

import { ParentStudentMonthlyEvaluationPage } from './pages/parent/ParentStudentMonthlyEvaluationPage'

import { ParentStudentMonthlyLearningReportPage } from './pages/parent/ParentStudentMonthlyLearningReportPage'

import { ParentStudentProgressPage } from './pages/parent/ParentStudentProgressPage'

import { MonthlyLearningReportSelectPage } from './pages/MonthlyLearningReportSelectPage'

import { MonthlyLearningReportDetailPage } from './pages/MonthlyLearningReportDetailPage'

import { ParentStudentQuestionsPage } from './pages/parent/ParentStudentQuestionsPage'

import { ParentStudentTodayReportPage } from './pages/parent/ParentStudentTodayReportPage'



function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* 학부모·학생: 로그인 없이 student_access_key 링크로 접근 */}

        <Route path="/care/:studentAccessKey" element={<ParentStudentLayout />}>

          <Route index element={<ParentStudentHomePage />} />

          <Route path="today-report" element={<ParentStudentTodayReportPage />} />

          <Route path="attendance" element={<ParentStudentAttendancePage />} />

          <Route path="progress" element={<ParentStudentProgressPage />} />

          <Route path="homework" element={<ParentStudentHomeworkPage />} />

          <Route path="daily-tests" element={<ParentStudentDailyTestPage />} />

          <Route path="monthly-evaluation" element={<ParentStudentMonthlyEvaluationPage />} />

          <Route
            path="monthly-learning-report"
            element={<ParentStudentMonthlyLearningReportPage />}
          />

          <Route path="makeup-plans" element={<ParentStudentMakeupPlanPage />} />

          <Route path="learning-notices" element={<LearningNoticesPage />} />

          <Route path="learning-notices/:postId" element={<LearningNoticeDetailPage />} />

          <Route path="questions" element={<ParentStudentQuestionsPage />} />

        </Route>

        <Route path="students/:studentId/monthly-evaluation" element={<ParentLayout />}>

          <Route index element={<StudentMonthlyEvaluationPage />} />

        </Route>

        <Route path="learning-notices" element={<ParentLayout />}>

          <Route index element={<LearningNoticesPage />} />

          <Route path=":postId" element={<LearningNoticeDetailPage />} />

        </Route>



        <Route path="/login" element={<LoginPage />} />

        <Route path="/teacher/mobile/login" element={<LoginPage />} />

        {/* 강사용 모바일 PWA — 별도 레이아웃, 로그인 필수 */}

        <Route element={<ProtectedRoute />}>

          <Route path="/teacher/mobile" element={<TeacherMobileLayout />}>

            <Route index element={<TeacherMobileDashboardPage />} />

            <Route path="today-report" element={<TeacherMobileTodayReportPage />} />

            <Route

              path="students"

              element={

                <TeacherMobilePageShell title="학생관리">

                  <StudentsPage />

                </TeacherMobilePageShell>

              }

            />

            <Route

              path="students/:id"

              element={

                <TeacherMobilePageShell title="학생 상세">

                  <StudentDetailPage />

                </TeacherMobilePageShell>

              }

            />

            <Route

              path="evaluation"

              element={

                <TeacherMobilePageShell title="월말평가">

                  <MonthlyEvaluationSelectPage />

                </TeacherMobilePageShell>

              }

            />

            <Route

              path="monthly-learning-reports"

              element={

                <TeacherMobilePageShell title="월간 학습진단 REPORT">

                  <MonthlyLearningReportSelectPage detailBasePath="/teacher/mobile/monthly-learning-reports" />

                </TeacherMobilePageShell>

              }

            />

            <Route

              path="monthly-learning-reports/:studentId"

              element={

                <TeacherMobilePageShell title="월간 학습진단 REPORT">

                  <MonthlyLearningReportDetailPage
                    backPath="/teacher/mobile/monthly-learning-reports"
                    mode="teacher"
                  />

                </TeacherMobilePageShell>

              }

            />

            <Route

              path="monthly-evaluation"

              element={

                <TeacherMobilePageShell title="월말평가 관리">

                  <MonthlyEvaluationPage />

                </TeacherMobilePageShell>

              }

            />

            <Route

              path="progress"

              element={

                <TeacherMobilePageShell title="학습진행 상황">

                  <ProgressPage />

                </TeacherMobilePageShell>

              }

            />

            <Route

              path="makeup"

              element={

                <TeacherMobilePageShell title="보강계획">

                  <MakeupPlanPage />

                </TeacherMobilePageShell>

              }

            />

            <Route

              path="notices"

              element={

                <TeacherMobilePageShell title="수업 시간표 & 학습 공지사항">

                  <TeacherLearningNoticesPage />

                </TeacherMobilePageShell>

              }

            />

            <Route

              path="notices/:postId"

              element={

                <TeacherMobilePageShell title="공지 상세">

                  <TeacherLearningNoticeDetailPage />

                </TeacherMobilePageShell>

              }

            />

            <Route

              path="questions"

              element={

                <TeacherMobilePageShell title="질문하기">

                  <TeacherMobileQuestionsPage />

                </TeacherMobilePageShell>

              }

            />

            <Route path="more" element={<TeacherMobileMorePage />} />

          </Route>

        </Route>



        <Route element={<AppLayout />}>

          <Route index element={<DashboardPage />} />

          <Route path="students" element={<StudentsPage />} />

          <Route path="students/:id" element={<StudentDetailPage />} />

          <Route path="attendance" element={<AttendancePage />} />

          <Route path="progress" element={<ProgressPage />} />

          <Route path="homework" element={<HomeworkPage />} />

          <Route path="daily-tests" element={<DailyTestPage />} />

          <Route path="monthly-evaluations" element={<MonthlyEvaluationSelectPage />} />

          <Route path="teacher/monthly-evaluation" element={<MonthlyEvaluationPage />} />

          <Route path="monthly-learning-reports" element={<MonthlyLearningReportSelectPage />} />

          <Route
            path="monthly-learning-reports/:studentId"
            element={<MonthlyLearningReportDetailPage mode="teacher" />}
          />

          <Route path="makeup-plans" element={<MakeupPlanPage />} />

          <Route path="teacher/today-report-bulk" element={<TeacherTodayReportBulkPage />} />

          <Route path="teacher/today-report" element={<RedirectToTodayReportBulk />} />

          <Route path="teacher/class-bulk-input" element={<RedirectToTodayReportBulk />} />

          <Route path="teacher/learning-notices" element={<TeacherLearningNoticesPage />} />

          <Route

            path="teacher/learning-notices/:postId"

            element={<TeacherLearningNoticeDetailPage />}

          />

          <Route path="questions" element={<QuestionsPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />

        </Route>

      </Routes>

    </BrowserRouter>

  )

}



export default App

