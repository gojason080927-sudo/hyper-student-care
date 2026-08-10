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
import { btnPrimary, btnSecondary, inputClass } from '../utils/labels'

type MonthlyLearningReportDetailPageProps = {
  backPath?: string
  mode?: 'teacher' | 'parent'
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
  const subjectParam = searchParams.get('subject')
  const subject: DiagnosisSubject = subjectParam === '영어' ? '영어' : '수학'

  const student = students.find((item) => item.id === studentId)

  const live = useMemo(() => {
    if (!student) return null
    return computeLiveMonthlyLearningDiagnosis({
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
  }, [
    attendance,
    dailyTests,
    homework,
    homeworkTextbookEntries,
    month,
    monthlyEvaluations,
    student,
    subject,
    year,
  ])

  const existing = useMemo(
    () =>
      monthlyLearningReports.find(
        (report) =>
          report.studentId === studentId &&
          report.year === year &&
          report.month === month &&
          report.subject === subject,
      ) ?? null,
    [month, monthlyLearningReports, studentId, subject, year],
  )

  const [strengths, setStrengths] = useState(existing?.strengths ?? '')
  const [improvements, setImprovements] = useState(existing?.improvements ?? '')
  const [teacherOverallComment, setTeacherOverallComment] = useState(
    existing?.teacherOverallComment ?? '',
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStrengths(existing?.strengths ?? '')
    setImprovements(existing?.improvements ?? '')
    setTeacherOverallComment(existing?.teacherOverallComment ?? '')
  }, [existing?.id, existing?.strengths, existing?.improvements, existing?.teacherOverallComment])

  if (!student || !live) {
    return (
      <div className="space-y-4 p-4">
        <p className="text-sm text-slate-600">학생 정보를 찾을 수 없습니다.</p>
        <Link to={backPath} className="text-sm font-semibold text-[#163A70]">
          목록으로
        </Link>
      </div>
    )
  }

  const isPublished = existing?.status === 'published'
  const scores = isPublished && existing ? existing.scores : live.scores
  const learningRecords =
    isPublished && existing ? existing.learningRecords : live.learningRecords
  const statusLabel =
    mode === 'teacher'
      ? isPublished
        ? '확정·공개됨 (snapshot 고정 · 수정 불가)'
        : '현재 예상점수 (실시간 누적)'
      : isPublished
        ? '확정 REPORT'
        : ''

  const handlePrint = () => {
    window.print()
  }

  const handleSaveDraft = async () => {
    if (mode !== 'teacher' || !live || isPublished) return
    setSaving(true)
    await saveMonthlyLearningReportRecord({
      id: existing?.id,
      studentId: student.id,
      year,
      month,
      subject,
      status: 'draft',
      publishedAt: null,
      scores: live.scores,
      learningRecords: live.learningRecords,
      strengths,
      improvements,
      teacherOverallComment,
    })
    setSaving(false)
  }

  const handlePublish = async () => {
    if (mode !== 'teacher' || !live || isPublished) return
    if (!window.confirm(`${year}년 ${month}월 ${subject} REPORT를 확정·공개할까요? 확정 후에는 snapshot이 고정되어 수정할 수 없습니다.`)) {
      return
    }
    setSaving(true)
    await publishMonthlyLearningReport({
      studentId: student.id,
      year,
      month,
      subject,
      strengths,
      improvements,
      teacherOverallComment,
      scores: live.scores,
      learningRecords: live.learningRecords,
    })
    setSaving(false)
  }

  return (
    <div className="mlr-print-root space-y-4 pb-8">
      <div className="mlr-no-print flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <Link to={backPath} className="text-sm font-medium text-slate-500 hover:text-[#163A70]">
            ← 목록
          </Link>
          <h1 className="mt-1 text-xl font-bold text-[#163A70]">
            {student.name} · {subject} 월간 학습진단
          </h1>
          <p className="text-sm text-slate-500">
            {year}년 {month}월 · {statusLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handlePrint} className={btnSecondary}>
            <Printer className="mr-1 inline h-4 w-4" aria-hidden />
            인쇄 / PDF 저장
          </button>
          {mode === 'teacher' ? (
            isPublished ? (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                확정된 REPORT는 수정할 수 없습니다 (snapshot 보호)
              </p>
            ) : (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveDraft()}
                  className={btnSecondary}
                >
                  저장
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handlePublish()}
                  className={btnPrimary}
                >
                  확정 / 공개
                </button>
              </>
            )
          ) : null}
        </div>
      </div>

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
            : strengths || existing?.strengths || ''
        }
        improvements={
          mode === 'parent' && isPublished
            ? existing.improvements
            : improvements || existing?.improvements || ''
        }
        teacherOverallComment={
          mode === 'parent' && isPublished
            ? existing.teacherOverallComment
            : teacherOverallComment || existing?.teacherOverallComment || ''
        }
        statusLabel={statusLabel}
      />

      {mode === 'teacher' && !isPublished ? (
        <div className="mlr-no-print space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-700">강사 입력 (점수 산출 제외)</p>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">강점</span>
            <textarea
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={3}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">보완 필요 항목</span>
            <textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              rows={3}
              className={inputClass()}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">강사 종합 평가</span>
            <textarea
              value={teacherOverallComment}
              onChange={(e) => setTeacherOverallComment(e.target.value)}
              rows={4}
              className={inputClass()}
              placeholder="서술형 종합 평가를 입력하세요. 점수에는 반영되지 않습니다."
            />
          </label>
        </div>
      ) : null}
    </div>
  )
}
