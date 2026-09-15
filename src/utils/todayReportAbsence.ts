import type {
  AttendanceRecord,
  AttendanceStatus,
  ClassAttitudeIssue,
  MaterialPrepStatus,
} from '../types/records'

/** Saved 결석 (인정·무단 모두). 출석으로 바뀌면 false. */
export function isAbsentAttendanceStatus(
  status: AttendanceStatus | '' | null | undefined,
): boolean {
  return status === '결석'
}

export function isAbsentAttendanceRecord(
  record: Pick<AttendanceRecord, 'status'> | null | undefined,
): boolean {
  return isAbsentAttendanceStatus(record?.status)
}

export function findStudentAttendanceOnDate(
  attendance: AttendanceRecord[],
  studentId: string,
  date: string,
): AttendanceRecord | undefined {
  return attendance.find((record) => record.studentId === studentId && record.date === date)
}

export function isStudentAbsentOnDate(
  attendance: AttendanceRecord[],
  studentId: string,
  date: string,
): boolean {
  return isAbsentAttendanceRecord(findStudentAttendanceOnDate(attendance, studentId, date))
}

/** 해당 날짜 출결이 결석으로 저장된 학생은 후속 수업 입력 필수 대상이 아니다. */
export function isFollowOnInputRequired(
  attendance: AttendanceRecord[],
  studentId: string,
  date: string,
): boolean {
  return !isStudentAbsentOnDate(attendance, studentId, date)
}

export function partitionFollowOnStudents<T extends { id: string }>(
  students: T[],
  attendance: AttendanceRecord[],
  date: string,
): { required: T[]; excluded: T[] } {
  const required: T[] = []
  const excluded: T[] = []
  for (const student of students) {
    if (isFollowOnInputRequired(attendance, student.id, date)) required.push(student)
    else excluded.push(student)
  }
  return { required, excluded }
}

export function missingRequiredMaterialPrep<T extends { id: string }>(
  students: T[],
  attendance: AttendanceRecord[],
  date: string,
  drafts: Record<string, { materialPrep?: MaterialPrepStatus | null } | undefined>,
): T[] {
  return partitionFollowOnStudents(students, attendance, date).required.filter(
    (student) => !drafts[student.id]?.materialPrep,
  )
}

export type AttitudeBulkDraft = {
  issues: ClassAttitudeIssue[]
  note: string
}

export type AttitudeBulkSaveTarget<T extends { id: string; name: string }> = {
  student: T
  attitudeIssues: ClassAttitudeIssue[]
  attitudeNote: string
}

/**
 * 출석(지각·조퇴 포함) 학생만 수업태도 일괄 저장.
 * 기본 = 우수(이슈 없음). 결석 학생은 payload에 넣지 않아 가짜 우수를 쓰지 않는다.
 */
export function selectAttitudeBulkSaveTargets<T extends { id: string; name: string }>(
  students: T[],
  attendance: AttendanceRecord[],
  date: string,
  drafts: Record<string, AttitudeBulkDraft | undefined>,
): AttitudeBulkSaveTarget<T>[] {
  return partitionFollowOnStudents(students, attendance, date).required.map((student) => {
    const draft = drafts[student.id]
    const attitudeIssues = draft?.issues ?? []
    return {
      student,
      attitudeIssues,
      attitudeNote: (draft?.note ?? '').trim().slice(0, 500),
    }
  })
}

export const ABSENT_FOLLOW_ON_LABEL = '결석 · 입력 제외'
