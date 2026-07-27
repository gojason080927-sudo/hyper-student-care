export const STORAGE_KEYS = {
  students: 'hyper_students',
  attendance: 'hyper_attendance_records',
  homework: 'hyper_homework_records',
  assignmentCompletion: 'hyper_assignment_records',
  dailyTests: 'hyper_daily_test_records',
  monthlyEvaluations: 'hyper_monthly_evaluation_records',
  questions: 'hyper_question_records',
  progress: 'hyper_progress_records',
  makeupPlans: 'hyper_makeup_plan_records',
  contentPosts: 'hyper_learning_notice_posts',
} as const

/** 이전 버전 localStorage key (자동 마이그레이션용) */
export const LEGACY_STORAGE_KEYS = {
  attendance: 'hyper_attendance',
  homework: 'hyper_homework',
  assignmentCompletion: 'hyper_assignment_completion',
  dailyTests: 'hyper_daily_tests',
} as const
