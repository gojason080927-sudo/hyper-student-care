import type {
  MonthlyLearningRecordsSnapshot,
  MonthlyLearningReportScores,
} from '../../types/records'
import type { Student } from '../../types/student'
import {
  SCORE_UNAVAILABLE_LABEL,
  formatDiagnosisScore,
  getAbilityGradeLabel,
  getMetricLabels,
  type DiagnosisSubject,
} from '../../utils/monthlyLearningDiagnosis'
import '../../styles/monthlyLearningReportPrint.css'

type MonthlyLearningReportDocumentProps = {
  student: Student
  subject: DiagnosisSubject
  year: number
  month: number
  scores: MonthlyLearningReportScores
  learningRecords: MonthlyLearningRecordsSnapshot
  strengths: string
  improvements: string
  teacherOverallComment: string
  statusLabel?: string
  /** 강사 편집 화면: 화면에서는 숨기고 A4 인쇄/PDF에만 표시 */
  hideNarrativeOnScreen?: boolean
  /** 수학 학습역량: 월말평가 미반영 안내 (강사 화면) */
  mathMonthlyEvaluationPending?: boolean
}

const RECORD_ROWS: Array<{
  key: Exclude<
    keyof MonthlyLearningRecordsSnapshot,
    'fridayRetestTotalCount' | 'fridayRetestWrongCount'
  >
  label: string
}> = [
  { key: 'lateCount', label: '지각' },
  { key: 'absentCount', label: '결석' },
  { key: 'partialHomeworkCount', label: '과제 부분완료' },
  { key: 'incompleteHomeworkCount', label: '과제 미완료' },
  { key: 'testPass2Count', label: '일일테스트 2차 통과' },
  { key: 'testPass3Count', label: '일일테스트 3차 통과' },
  { key: 'testPass4Count', label: '일일테스트 4차 통과' },
]

function ScoreBar({
  label,
  score,
  gradeLabel,
}: {
  label: string
  score: number | null
  gradeLabel?: string | null
}) {
  if (score === null) {
    return (
      <div className="mlr-score-row">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[12px] font-semibold text-[#163A70]">{label}</span>
          <span className="text-[12px] font-semibold text-slate-400">{SCORE_UNAVAILABLE_LABEL}</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#E8EEF5]">
          <div className="h-full w-0 rounded-full bg-slate-300" />
        </div>
        <p className="mt-0.5 text-[10px] text-slate-400">데이터 없음</p>
      </div>
    )
  }

  const width = Math.max(0, Math.min(100, score))
  return (
    <div className="mlr-score-row">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-[#163A70]">{label}</span>
        <span className="text-[13px] font-bold text-[#163A70]">{formatDiagnosisScore(score)}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#E8EEF5]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#163A70] to-[#28C7B7]"
          style={{ width: `${width}%` }}
        />
      </div>
      {gradeLabel ? (
        <p className="mt-0.5 text-[10px] font-medium text-slate-500">{gradeLabel}</p>
      ) : null}
    </div>
  )
}

export function MonthlyLearningReportDocument({
  student,
  subject,
  year,
  month,
  scores,
  learningRecords,
  strengths,
  improvements,
  teacherOverallComment,
  statusLabel,
  hideNarrativeOnScreen = false,
  mathMonthlyEvaluationPending = false,
}: MonthlyLearningReportDocumentProps) {
  const labels = getMetricLabels(subject)
  const abilityMetrics: Array<{ key: 'metric1' | 'metric2' | 'metric3'; label: string }> = [
    { key: 'metric1', label: labels.metric1 },
    { key: 'metric2', label: labels.metric2 },
    { key: 'metric3', label: labels.metric3 },
  ]
  const managementMetrics: Array<{
    key: 'homeworkHabit' | 'wrongAnswerManagement' | 'learningSincerity'
    label: string
  }> = [
    { key: 'homeworkHabit', label: labels.homeworkHabit },
    { key: 'wrongAnswerManagement', label: labels.wrongAnswerManagement },
    { key: 'learningSincerity', label: labels.learningSincerity },
  ]
  const hasFridayRetestEvidence =
    learningRecords.fridayRetestTotalCount !== null ||
    learningRecords.fridayRetestWrongCount !== null
  const narrativeSections = (
    <>
      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[#F7FBFA] p-3">
          <h3 className="text-xs font-bold text-[#0F766E]">강점</h3>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700">
            {strengths.trim() || '작성된 내용이 없습니다.'}
          </p>
        </div>
        <div className="rounded-xl bg-[#F8F5F2] p-3">
          <h3 className="text-xs font-bold text-[#9A3412]">보완 필요 항목</h3>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700">
            {improvements.trim() || '작성된 내용이 없습니다.'}
          </p>
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-[rgba(22,58,112,0.12)] p-3">
        <h3 className="text-xs font-bold text-[#163A70]">강사 종합 평가</h3>
        <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700">
          {teacherOverallComment.trim() || '작성된 내용이 없습니다.'}
        </p>
      </section>
    </>
  )

  return (
    <article className="mlr-report-shell mlr-report-page mx-auto max-w-[210mm] rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-5 shadow-sm sm:p-6">
      <header className="border-b border-[rgba(22,58,112,0.12)] pb-3">
        <p className="bg-gradient-to-r from-[#163A70] to-[#28C7B7] bg-clip-text text-lg font-extrabold tracking-wide text-transparent">
          HYPER STUDENT CARE
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <h1 className="text-xl font-bold text-[#163A70]">월간 학습진단 REPORT</h1>
          <span className="rounded-full bg-[rgba(40,199,183,0.14)] px-3 py-1 text-xs font-bold text-[#0F766E]">
            {subject}
          </span>
        </div>
        {statusLabel ? (
          <p className="mt-1 text-xs font-medium text-slate-500">{statusLabel}</p>
        ) : null}
      </header>

      <section className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-slate-700 sm:grid-cols-3">
        <p>
          <span className="text-slate-500">학생명</span> · {student.name}
        </p>
        <p>
          <span className="text-slate-500">학교</span> · {student.school || '-'}
        </p>
        <p>
          <span className="text-slate-500">학년</span> · {student.grade}
        </p>
        <p>
          <span className="text-slate-500">수강반</span> · {student.className || '-'}
        </p>
        <p>
          <span className="text-slate-500">담당강사</span> · {student.teacher || '-'}
        </p>
        <p>
          <span className="text-slate-500">평가월</span> · {year}년 {month}월
        </p>
      </section>

      <section className="mt-4">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-sm font-bold text-[#163A70]">학습 역량</h2>
          {mathMonthlyEvaluationPending ? (
            <p className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
              월말평가 미반영 (일일테스트만 반영)
            </p>
          ) : null}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {abilityMetrics.map((metric) => (
            <ScoreBar
              key={metric.key}
              label={metric.label}
              score={scores[metric.key]}
              gradeLabel={getAbilityGradeLabel(scores[metric.key])}
            />
          ))}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-bold text-[#163A70]">학습 관리</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {managementMetrics.map((metric) => (
            <ScoreBar key={metric.key} label={metric.label} score={scores[metric.key]} />
          ))}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-bold text-[#163A70]">월간 학습 기록</h2>
        <div className="overflow-hidden rounded-xl border border-[rgba(22,58,112,0.12)]">
          <table className="w-full text-center text-[11px]">
            <thead className="bg-[#F3F7FB] text-slate-600">
              <tr>
                {RECORD_ROWS.map((row) => (
                  <th key={row.key} className="px-1 py-2 font-semibold">
                    {row.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {RECORD_ROWS.map((row) => (
                  <td key={row.key} className="px-1 py-2 text-sm font-bold text-[#163A70]">
                    {learningRecords[row.key]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        {hasFridayRetestEvidence ? (
          <p className="mt-2 text-[11px] text-slate-600">
            오답 재시험 근거 · 응시{' '}
            <span className="font-bold text-[#163A70]">
              {learningRecords.fridayRetestTotalCount ?? 0}문제
            </span>
            {' / '}
            재오답{' '}
            <span className="font-bold text-[#163A70]">
              {learningRecords.fridayRetestWrongCount ?? 0}문제
            </span>
          </p>
        ) : null}
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-bold text-[#163A70]">강사 평가</h2>
        {hideNarrativeOnScreen ? (
          <div className="mlr-narrative-print-only">{narrativeSections}</div>
        ) : (
          narrativeSections
        )}
      </section>
    </article>
  )
}
