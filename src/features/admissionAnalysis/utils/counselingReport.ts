import type {
  AdmissionStudentProfile,
  AdmissionSupportBand,
  SubjectAdmissionResult,
  UniversityMatchCard,
} from '../types'
import { admissionRecommendationWindow } from '../config/admissionThresholds'

export const ADMISSION_REPORT_COUNTS = admissionRecommendationWindow.maxPerBand

export type CounselingReportSnapshot = {
  createdAt: string
  profile: AdmissionStudentProfile
  subjects: SubjectAdmissionResult[]
  grade5Average: number | null
  grade9Average: number | null
  selected: {
    ambitious: UniversityMatchCard[]
    target: UniversityMatchCard[]
    safe: UniversityMatchCard[]
  }
  counselorName: string
  counselingMemo: string
  counselingDateLabel: string
}

export function formatCounselingDateLabel(date = new Date()): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  return `${y}년 ${m}월 ${d}일`
}

export function buildCounselingReportSnapshot(input: {
  profile: AdmissionStudentProfile
  subjects: SubjectAdmissionResult[]
  grade5Average: number | null
  grade9Average: number | null
  selectedMatches: UniversityMatchCard[]
  counselorName: string
  counselingMemo: string
}): CounselingReportSnapshot {
  const seen = new Set<string>()
  const deduped: UniversityMatchCard[] = []
  for (const m of input.selectedMatches) {
    if (seen.has(m.university.id)) continue
    seen.add(m.university.id)
    deduped.push(m)
  }

  const byBand = (band: AdmissionSupportBand) =>
    deduped.filter((m) => m.band === band)

  return {
    createdAt: new Date().toISOString(),
    profile: { ...input.profile },
    subjects: input.subjects.map((s) => ({ ...s })),
    grade5Average: input.grade5Average,
    grade9Average: input.grade9Average,
    selected: {
      ambitious: byBand('ambitious'),
      target: byBand('target'),
      safe: byBand('safe'),
    },
    counselorName: input.counselorName.trim(),
    counselingMemo: input.counselingMemo.trim(),
    counselingDateLabel: formatCounselingDateLabel(),
  }
}
