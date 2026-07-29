import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ParentLayout } from './components/layout/ParentLayout'
import { ParentStudentLayout } from './components/layout/ParentStudentLayout'
import { AppLayout } from './components/AppLayout'
import { AttendancePage } from './pages/AttendancePage'
import { DailyTestPage } from './pages/DailyTestPage'
import { DashboardPage } from './pages/DashboardPage'
import { HomeworkPage } from './pages/HomeworkPage'
import { MakeupPlanPage } from './pages/MakeupPlanPage'
import { MonthlyEvaluationPage } from './pages/MonthlyEvaluationPage'
import { MonthlyEvaluationSelectPage } from './pages/MonthlyEvaluationSelectPage'
import { ProgressPage } from './pages/ProgressPage'
import { QuestionsPage } from './pages/QuestionsPage'
import { StudentDetailPage } from './pages/StudentDetailPage'
import { LearningNoticeDetailPage } from './pages/LearningNoticeDetailPage'
import { LearningNoticesPage } from './pages/LearningNoticesPage'
import { StudentMonthlyEvaluationPage } from './pages/StudentMonthlyEvaluationPage'
import { StudentsPage } from './pages/StudentsPage'
import { RedirectToTodayReportBulk } from './pages/RedirectToTodayReportBulk'
import { TeacherTodayReportBulkPage } from './pages/TeacherTodayReportBulkPage'
import { TeacherLearningNoticeDetailPage } from './pages/TeacherLearningNoticeDetailPage'
import { TeacherLearningNoticesPage } from './pages/TeacherLearningNoticesPage'
import { ParentStudentAttendancePage } from './pages/parent/ParentStudentAttendancePage'
import { ParentStudentDailyTestPage } from './pages/parent/ParentStudentDailyTestPage'
import { ParentStudentHomePage } from './pages/parent/ParentStudentHomePage'
import { ParentStudentHomeworkPage } from './pages/parent/ParentStudentHomeworkPage'
import { ParentStudentMakeupPlanPage } from './pages/parent/ParentStudentMakeupPlanPage'
import { ParentStudentMonthlyEvaluationPage } from './pages/parent/ParentStudentMonthlyEvaluationPage'
import { ParentStudentProgressPage } from './pages/parent/ParentStudentProgressPage'
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
