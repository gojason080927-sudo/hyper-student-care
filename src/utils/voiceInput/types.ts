import type {
  AttendanceExcuseKind,
  AttendanceStatus,
  ClassAttitudeIssue,
  HomeworkStatus,
  MaterialPrepStatus,
  TextbookSlotNumber,
  TextbookSubject,
} from '../../types/records'

export type VoiceStudentRef = {
  id: string
  name: string
}

export type VoiceReviewItem = {
  label: string
  reason: string
}

export type VoiceApplySummary = {
  appliedCount: number
  excludedAbsentCount: number
  needsReviewCount: number
  needsReview: VoiceReviewItem[]
}

export type VoiceSection =
  | 'attendance'
  | 'homework'
  | 'materialPrep'
  | 'progress'
  | 'todayAssignment'
  | 'dailyTest'
  | 'attitude'

export type VoiceSectionContext =
  | { section: 'attendance' }
  | {
      section: 'homework'
      subject: TextbookSubject
      slotNumber: TextbookSlotNumber
    }
  | { section: 'materialPrep' }
  | {
      section: 'progress'
      subject: TextbookSubject
      slotNumber: TextbookSlotNumber
    }
  | {
      section: 'todayAssignment'
      subject: TextbookSubject
      slotNumber: TextbookSlotNumber
    }
  | { section: 'dailyTest'; round: 1 | 2 | 3 | 4 }
  | { section: 'attitude' }

export type AttendanceVoiceAssignment = {
  studentId: string
  status: AttendanceStatus
  excuseKind: AttendanceExcuseKind | null
}

export type HomeworkVoiceAssignment = {
  studentId: string
  status: HomeworkStatus
}

export type MaterialVoiceAssignment = {
  studentId: string
  status: MaterialPrepStatus
  mappedFromUncertain: boolean
}

export type AttitudeVoiceAssignment = {
  studentId: string
  issues: ClassAttitudeIssue[]
  note: string
}

export type DailyTestVoiceAssignment = {
  studentId: string
  round: 1 | 2 | 3 | 4
  score: string
  conceptLackDelta: number
  calculationErrorDelta: number
  applicationLackDelta: number
  comprehensionLackDelta: number
  teacherFeedback: string
}

export type VoiceParseResult<T> = {
  assignments: T[]
  skippedAbsentIds: string[]
  needsReview: VoiceReviewItem[]
}
