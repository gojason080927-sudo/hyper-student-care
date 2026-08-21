/** localStorage 백업 키 (Supabase fallback / mirror 전용) */
export const STORAGE_KEYS = {
  students: 'hyper_students',
  attendance: 'hyper_attendance_records',
  homework: 'hyper_homework_records',
  assignmentCompletion: 'hyper_assignment_records',
  dailyTests: 'hyper_daily_test_records',
  monthlyEvaluations: 'hyper_monthly_evaluation_records',
  monthlyLearningReports: 'hyper_monthly_learning_reports',
  questions: 'hyper_question_records',
  progress: 'hyper_progress_records',
  makeupPlans: 'hyper_makeup_plan_records',
  contentPosts: 'hyper_learning_notice_posts',
  classScheduleGrids: 'hyper_class_schedule_grids',
  todayAssignments: 'hyper_today_assignments',
  classNotes: 'hyper_class_notes',
  studentTextbookSlots: 'hyper_student_textbook_slots',
  homeworkTextbookEntries: 'hyper_homework_textbook_entries',
} as const

export const LEGACY_STORAGE_KEYS = {
  attendance: 'hyper_attendance',
  homework: 'hyper_homework',
  assignmentCompletion: 'hyper_assignment_completion',
  dailyTests: 'hyper_daily_tests',
} as const
