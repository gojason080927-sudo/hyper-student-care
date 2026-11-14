/**
 * 학생 9등급 환산 평균 ↔ 대학 교과 70%컷 추천 engine.
 * 기본: [student - ambitiousOffset, student] 구간만, 상향/적정만 표시.
 */
import {
  admissionBandConfig,
  type AdmissionBandConfig,
} from '../config/admissionBandConfig'
import { listUniversityCutoffSummaries } from '../data/universityCutoffData'
import type {
  Grade9SupportBand,
  UniversityCutoffMatch,
  UniversityCutoffSummary,
} from '../types/universityCutoff'

export type Grade9CutoffAnalysis = {
  ready: boolean
  message: string
  studentGrade9: number | null
  windowMin: number | null
  windowMax: number | null
  ambitious: UniversityCutoffMatch[]
  target: UniversityCutoffMatch[]
  /** 기본 표시 = 상향+적정, 컷 낮은 순 */
  displayed: UniversityCutoffMatch[]
  config: AdmissionBandConfig
}

export function calcRecommendationWindow(
  studentGrade9: number,
  config: AdmissionBandConfig = admissionBandConfig,
): { min: number; max: number; targetMin: number } {
  const min =
    Math.round((studentGrade9 - config.ambitiousOffset) * 100) / 100
  const targetMin =
    Math.round((studentGrade9 - config.targetOffset) * 100) / 100
  const max = Math.round(studentGrade9 * 100) / 100
  return { min, max, targetMin }
}

export function classifyGrade9Band(
  cutoff70: number,
  studentGrade9: number,
  config: AdmissionBandConfig = admissionBandConfig,
): Grade9SupportBand | null {
  const { min, max, targetMin } = calcRecommendationWindow(
    studentGrade9,
    config,
  )
  const cut = Math.round(cutoff70 * 100) / 100
  if (cut < min || cut > max) return null
  if (cut < targetMin) return 'ambitious'
  return 'target'
}

export function grade9BandLabel(band: Grade9SupportBand): string {
  return band === 'ambitious' ? '상향' : '적정'
}

export function analyzeGrade9CutoffRecommendations(input: {
  studentGrade9: number | null
  summaries?: UniversityCutoffSummary[]
  config?: AdmissionBandConfig
}): Grade9CutoffAnalysis {
  const config = input.config ?? admissionBandConfig

  if (input.studentGrade9 === null) {
    return {
      ready: false,
      message: '9등급제 환산 평균이 계산된 뒤 대학 지원 분석을 이용할 수 있습니다.',
      studentGrade9: null,
      windowMin: null,
      windowMax: null,
      ambitious: [],
      target: [],
      displayed: [],
      config,
    }
  }

  const summaries = input.summaries ?? listUniversityCutoffSummaries()
  if (summaries.length === 0) {
    return {
      ready: false,
      message: '비교 가능한 교과 70%컷 데이터가 없습니다.',
      studentGrade9: input.studentGrade9,
      windowMin: null,
      windowMax: null,
      ambitious: [],
      target: [],
      displayed: [],
      config,
    }
  }

  const window = calcRecommendationWindow(input.studentGrade9, config)
  const ambitious: UniversityCutoffMatch[] = []
  const target: UniversityCutoffMatch[] = []

  for (const summary of summaries) {
    const cutoffUsed = summary.latest.cutoff70
    const band = classifyGrade9Band(cutoffUsed, input.studentGrade9, config)
    if (!band) continue
    const match: UniversityCutoffMatch = {
      summary,
      studentGrade9: input.studentGrade9,
      cutoffUsed,
      band,
    }
    if (band === 'ambitious') ambitious.push(match)
    else target.push(match)
  }

  const byCutoffAsc = (a: UniversityCutoffMatch, b: UniversityCutoffMatch) =>
    a.cutoffUsed - b.cutoffUsed ||
    a.summary.universityName.localeCompare(b.summary.universityName, 'ko')

  ambitious.sort(byCutoffAsc)
  target.sort(byCutoffAsc)

  return {
    ready: true,
    message: '',
    studentGrade9: input.studentGrade9,
    windowMin: window.min,
    windowMax: window.max,
    ambitious,
    target,
    displayed: [...ambitious, ...target].sort(byCutoffAsc),
    config,
  }
}

export function pickGrade9ReportIds(
  analysis: Grade9CutoffAnalysis,
  maxAmbitious = 5,
  maxTarget = 7,
): string[] {
  return [
    ...analysis.ambitious.slice(0, maxAmbitious).map((m) => m.summary.id),
    ...analysis.target.slice(0, maxTarget).map((m) => m.summary.id),
  ]
}
