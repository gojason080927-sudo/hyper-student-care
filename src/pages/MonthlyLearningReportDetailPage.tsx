import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { MonthlyLearningReportDocument } from '../components/diagnosis/MonthlyLearningReportDocument'
import { useData } from '../hooks/useData'
import {
  computeLiveMonthlyLearningDiagnosis,
  type DiagnosisSubject,
} from '../utils/monthlyLearningDiagnosis'
import { getSeoulYearMonth } from '../utils/monthlyLearningProgress'
import { getStudentDiagnosisSubjects } from '../utils/studentGradeClass'
import { btnPrimary, btnSecondary, inputClass } from '../utils/labels'
import type { MonthlyLearningReportRecord } from '../types/records'

type MonthlyLearningReportDetailPageProps = {
  backPath?: string
  mode?: 'teacher' | 'parent'
}

type NarrativeDraft = {
  strengths: string
  improvements: string
  teacherOverallComment: string
}

function emptyNarrative(): NarrativeDraft {
  return { strengths: '', improvements: '', teacherOverallComment: '' }
}

function narrativeFromRecord(record: MonthlyLearningReportRecord | null | undefined): NarrativeDraft {
  return {
    strengths: record?.strengths ?? '',
    improvements: record?.improvements ?? '',
    teacherOverallComment: record?.teacherOverallComment ?? '',
  }
}

export function MonthlyLearningReportDetailPage({
  backPath = '/monthly-learning-reports',
  mode = 'teacher',
}: MonthlyLearningReportDetailPageProps) {
  const { studentId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const {
    students,
    attendance,
    homework,
    homeworkTextbookEntries,
    dailyTests,
    monthlyEvaluations,
    monthlyLearningReports,
    publishMonthlyLearningReport,
    saveMonthlyLearningReportRecord,
  } = useData()

  const current = getSeoulYearMonth()
  const year = Number(searchParams.get('year') || current.year)
  const month = Number(searchParams.get('month') || current.month)

  const student = students.find((item) => item.id === studentId)

  const reportSubjects = useMemo((): DiagnosisSubject[] => {
    if (!student) return []
    return getStudentDiagnosisSubjects(student.className, student.subjects)
  }, [student])

  const subjectBundles = useMemo(() => {
    if (!student) return []
    return reportSubjects.map((subject) => {
      const live = computeLiveMonthlyLearningDiagnosis({
        studentId: student.id,
        year,
        month,
        subject,
        attendance,
        homework,
        homeworkTextbookEntries,
        dailyTests,
        monthlyEvaluations,
      })
      const existing =
        monthlyLearningReports.find(
          (report) =>
            report.studentId === studentId &&
            report.year === year &&
            report.month === month &&
            report.subject === subject,
        ) ?? null
      return { subject, live, existing }
    })
  }, [
    attendance,
    dailyTests,
    homework,
    homeworkTextbookEntries,
    month,
    monthlyEvaluations,
    monthlyLearningReports,
    reportSubjects,
    student,
    studentId,
    year,
  ])

  const [drafts, setDrafts] = useState<Partial<Record<DiagnosisSubject, NarrativeDraft>>>({})
  const [savingSubject, setSavingSubject] = useState<DiagnosisSubject | null>(null)

  const narrativeSyncKey = subjectBundles
    .map(
      ({ subject, existing }) =>
        `${subject}:${existing?.id ?? ''}:${existing?.strengths ?? ''}:${existing?.improvements ?? ''}:${existing?.teacherOverallComment ?? ''}`,
    )
    .join('|')

  useEffect(() => {
    const next: Partial<Record<DiagnosisSubject, NarrativeDraft>> = {}
    for (const subject of reportSubjects) {
      const existing =
        monthlyLearningReports.find(
          (report) =>
            report.studentId === studentId &&
            report.year === year &&
            report.month === month &&
            report.subject === subject,
        ) ?? null
      next[subject] = narrativeFromRecord(existing)
    }
    setDrafts(next)
    // narrativeSyncKey: existing record narrative fields per enrolled subject
  }, [narrativeSyncKey, monthlyLearningReports, month, reportSubjects, studentId, year])

  if (!student || subjectBundles.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-sm text-slate-600">학생 정보를 찾을 수 없습니다.</p>
        <Link to={backPath} className="text-sm font-semibold text-[#163A70]">
          목록으로
        </Link>
      </div>
    )
  }

  const visibleBundles =
    mode === 'parent'
      ? subjectBundles.filter(({ existing }) => existing?.status === 'published')
      : subjectBundles

  if (mode === 'parent' && visibleBundles.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-sm text-slate-600">
          아직 확정·공개된 월간 학습진단 REPORT가 없습니다. 월중 예상점수는 표시되지 않습니다.
        </p>
        <Link to={backPath} className="text-sm font-semibold text-[#163A70]">
          목록으로
        </Link>
      </div>
    )
  }

  const subjectLabel = reportSubjects.join(' · ')
  const anyPublished = visibleBundles.some(({ existing }) => existing?.status === 'published')
  const allPublished =
    mode === 'teacher' &&
    subjectBundles.every(({ existing }) => existing?.status === 'published')

  const handlePrint = () => {
    window.print()
  }

  const updateDraft = (subject: DiagnosisSubject, partial: Partial<NarrativeDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [subject]: { ...(prev[subject] ?? emptyNarrative()), ...partial },
    }))
  }

  const handleSaveDraft = async (subject: DiagnosisSubject) => {
    if (mode !== 'teacher') return
    const bundle = subjectBundles.find((item) => item.subject === subject)
    if (!bundle || bundle.existing?.status === 'published') return
    const draft = drafts[subject] ?? emptyNarrative()
    setSavingSubject(subject)
    await saveMonthlyLearningReportRecord({
      id: bundle.existing?.id,
      studentId: student.id,
      year,
      month,
      subject,
      status: 'draft',
      publishedAt: null,
      scores: bundle.live.scores,
      learningRecords: bundle.live.learningRecords,
      strengths: draft.strengths,
      improvements: draft.improvements,
      teacherOverallComment: draft.teacherOverallComment,
    })
    setSavingSubject(null)
  }

  const handlePublish = async (subject: DiagnosisSubject) => {
    if (mode !== 'teacher') return
    const bundle = subjectBundles.find((item) => item.subject === subject)
    if (!bundle || bundle.existing?.status === 'published') return
    if (
      !window.confirm(
        `${year}년 ${month}월 ${subject} REPORT를 확정·공개할까요? 확정 후에는 snapshot이 고정되어 수정할 수 없습니다.`,
      )
    ) {
      return
    }
    const draft = drafts[subject] ?? emptyNarrative()
    setSavingSubject(subject)
    await publishMonthlyLearningReport({
      studentId: student.id,
      year,
      month,
      subject,
      strengths: draft.strengths,
      improvements: draft.improvements,
      teacherOverallComment: draft.teacherOverallComment,
      scores: bundle.live.scores,
      learningRecords: bundle.live.learningRecords,
    })
    setSavingSubject(null)
  }

  return (
    <div className="mlr-print-root space-y-4 pb-8">
      <div className="mlr-no-print flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <Link to={backPath} className="text-sm font-medium text-slate-500 hover:text-[#163A70]">
            ← 목록
          </Link>
          <h1 className="mt-1 text-xl font-bold text-[#163A70]">
            {student.name} · {subjectLabel} 월간 학습진단
          </h1>
          <p className="text-sm text-slate-500">
            {year}년 {month}월
            {mode === 'teacher'
              ? allPublished
                ? ' · 확정·공개됨 (snapshot 고정 · 수정 불가)'
                : anyPublished
                  ? ' · 과목별 확정 상태 상이'
                  : ' · 현재 예상점수 (실시간 누적)'
              : ' · 확정 REPORT'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handlePrint} className={btnSecondary}>
            <Printer className="mr-1 inline h-4 w-4" aria-hidden />
            인쇄 / PDF 저장
          </button>
        </div>
      </div>

      {visibleBundles.map(({ subject, live, existing }) => {
        const isPublished = existing?.status === 'published'
        const scores = isPublished && existing ? existing.scores : live.scores
        const learningRecords =
          isPublished && existing ? existing.learningRecords : live.learningRecords
        const draft = drafts[subject] ?? narrativeFromRecord(existing)
        const mathMonthlyEvaluationPending =
          mode === 'teacher' &&
          !isPublished &&
          subject === '수학' &&
          !live.mathMonthlyEvaluationIncluded
        const statusLabel =
          mode === 'teacher'
            ? isPublished
              ? '확정·공개됨 (snapshot 고정 · 수정 불가)'
              : mathMonthlyEvaluationPending
                ? '현재 예상점수 (실시간 누적 · 월말평가 미반영)'
                : '현재 예상점수 (실시간 누적)'
            : isPublished
              ? '확정 REPORT'
              : ''

        return (
          <div key={subject} className="space-y-3">
            <MonthlyLearningReportDocument
              student={student}
              subject={subject}
              year={year}
              month={month}
              scores={scores}
              learningRecords={learningRecords}
              strengths={
                mode === 'parent' && isPublished
                  ? existing.strengths
                  : draft.strengths || existing?.strengths || ''
              }
              improvements={
                mode === 'parent' && isPublished
                  ? existing.improvements
                  : draft.improvements || existing?.improvements || ''
              }
              teacherOverallComment={
                mode === 'parent' && isPublished
                  ? existing.teacherOverallComment
                  : draft.teacherOverallComment || existing?.teacherOverallComment || ''
              }
              statusLabel={statusLabel}
              mathMonthlyEvaluationPending={mathMonthlyEvaluationPending}
              hideNarrativeOnScreen={mode === 'teacher' && !isPublished}
              dailyTests={dailyTests}
              monthlyEvaluations={monthlyEvaluations}
            />

            {mode === 'teacher' ? (
              <div className="mlr-no-print space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-700">
                    {subject} 강사 입력 (점수 산출 제외)
                  </p>
                  {isPublished ? (
                    <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                      확정된 REPORT는 수정할 수 없습니다 (snapshot 보호)
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={savingSubject === subject}
                        onClick={() => void handleSaveDraft(subject)}
                        className={btnSecondary}
                      >
                        {subject} 저장
                      </button>
                      <button
                        type="button"
                        disabled={savingSubject === subject}
                        onClick={() => void handlePublish(subject)}
                        className={btnPrimary}
                      >
                        {subject} 확정 / 공개
                      </button>
                    </div>
                  )}
                </div>
                {isPublished ? null : (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">강점</span>
                      <textarea
                        value={draft.strengths}
                        onChange={(e) => updateDraft(subject, { strengths: e.target.value })}
                        rows={3}
                        className={inputClass()}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">
                        보완 필요 항목
                      </span>
                      <textarea
                        value={draft.improvements}
                        onChange={(e) => updateDraft(subject, { improvements: e.target.value })}
                        rows={3}
                        className={inputClass()}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-slate-600">
                        강사 종합 평가
                      </span>
                      <textarea
                        value={draft.teacherOverallComment}
                        onChange={(e) =>
                          updateDraft(subject, { teacherOverallComment: e.target.value })
                        }
                        rows={4}
                        className={inputClass()}
                        placeholder="서술형 종합 평가를 입력하세요. 점수에는 반영되지 않습니다."
                      />
                    </label>
                  </>
                )}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
