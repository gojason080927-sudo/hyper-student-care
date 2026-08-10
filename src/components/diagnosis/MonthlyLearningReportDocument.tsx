import type {
  MonthlyLearningRecordsSnapshot,
  MonthlyLearningReportScores,
} from '../../types/records'
import type { Student } from '../../types/student'
import type { DiagnosisSubject } from '../../utils/monthlyLearningDiagnosis'
import {
  buildMonthlyDetailCards,
  buildReportRadarPoints,
  buildReportScoreTableRows,
  getReportTheme,
  type ReportDetailCard,
} from '../../utils/monthlyLearningReportDisplay'
import type { DailyTestRecord, MonthlyEvaluationRecord } from '../../types/records'
import { MonthlyLearningReportRadarChart } from './MonthlyLearningReportRadarChart'
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
  /** 수학 학습역량: 월말평가 미반영 안내 (강사 화면) */
  mathMonthlyEvaluationPending?: boolean
  /** 월간 세부 현황 카드용 원본 (표시 집계만, 점수 산식과 무관) */
  dailyTests?: DailyTestRecord[]
  monthlyEvaluations?: MonthlyEvaluationRecord[]
  /** 미리 계산된 세부 현황 카드. 있으면 그대로 사용 */
  detailCards?: ReportDetailCard[]
}

function DetailStatusCards({ cards, accent }: { cards: ReportDetailCard[]; accent: string }) {
  return (
    <div className="mlr-detail-cards grid gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-xl border border-[rgba(22,58,112,0.10)] bg-[#FBFCFE] p-3"
        >
          <h3
            className="border-b pb-1.5 text-[12px] font-bold"
            style={{ color: accent, borderColor: 'rgba(22,58,112,0.10)' }}
          >
            {card.title}
          </h3>
          <dl className="mt-2 space-y-1.5">
            {card.items.map((item) => (
              <div key={item.label} className="flex items-baseline justify-between gap-2">
                <dt className="text-[11px] text-slate-500">{item.label}</dt>
                <dd className="text-right text-[12px] font-semibold text-[#163A70]">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
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
  mathMonthlyEvaluationPending = false,
  dailyTests = [],
  monthlyEvaluations = [],
  detailCards: detailCardsProp,
}: MonthlyLearningReportDocumentProps) {
  const theme = getReportTheme(subject)
  const radarPoints = buildReportRadarPoints(subject, scores)
  const scoreRows = buildReportScoreTableRows(subject, scores)
  const detailCards =
    detailCardsProp ??
    buildMonthlyDetailCards({
      subject,
      studentId: student.id,
      year,
      month,
      dailyTests,
      monthlyEvaluations,
      learningRecords,
    })

  return (
    <article className="mlr-report-shell mlr-report-page mx-auto max-w-[210mm] overflow-hidden rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-4 shadow-sm sm:p-6">
      <header className="border-b border-[rgba(22,58,112,0.12)] pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="bg-gradient-to-r from-[#163A70] to-[#28C7B7] bg-clip-text text-lg font-extrabold tracking-wide text-transparent">
              HYPER STUDENT CARE
            </p>
            <h1 className="mt-0.5 text-xl font-bold text-[#163A70]">월간 학습진단 REPORT</h1>
          </div>
          <div className="text-right">
            <span
              className="inline-flex rounded-full px-3 py-1 text-xs font-bold"
              style={{ backgroundColor: theme.badgeBg, color: theme.badgeText }}
            >
              {subject}
            </span>
            <p className="mt-1 text-xs font-semibold text-slate-600">
              {year}년 {month}월
            </p>
          </div>
        </div>
        {statusLabel ? (
          <p className="mt-1 text-xs font-medium text-slate-500">{statusLabel}</p>
        ) : null}
        {mathMonthlyEvaluationPending ? (
          <p className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
            월말평가 미반영 (일일테스트만 반영)
          </p>
        ) : null}
      </header>

      <section className="mlr-meta mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-slate-700 sm:grid-cols-3">
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

      <section className="mlr-radar-score mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-[rgba(22,58,112,0.10)] bg-[#F8FBFD] p-2 sm:p-3">
          <h2 className="mb-1 px-1 text-sm font-bold text-[#163A70]">학습 역량 · 학습 관리</h2>
          <MonthlyLearningReportRadarChart subject={subject} points={radarPoints} />
        </div>

        <div className="rounded-xl border border-[rgba(22,58,112,0.10)] p-3">
          <h2 className="mb-2 text-sm font-bold text-[#163A70]">세부 점수표</h2>
          <div className="overflow-hidden rounded-lg border border-[rgba(22,58,112,0.10)]">
            <table className="mlr-score-table w-full text-left text-[11px]">
              <thead className="bg-[#F3F7FB] text-slate-600">
                <tr>
                  <th className="px-2 py-2 font-semibold">영역</th>
                  <th className="px-2 py-2 text-right font-semibold">점수</th>
                  <th className="px-2 py-2 text-right font-semibold">등급</th>
                </tr>
              </thead>
              <tbody>
                {scoreRows.map((row) => (
                  <tr key={row.key} className="border-t border-[rgba(22,58,112,0.08)]">
                    <td className="px-2 py-1.5">
                      <span className="font-semibold text-[#163A70]">{row.area}</span>
                      <span className="ml-1 text-[10px] text-slate-400">{row.group}</span>
                    </td>
                    <td className="px-2 py-1.5 text-right font-bold text-[#163A70]">
                      {row.scoreLabel}
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-600">
                      {row.gradeLabel || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-2 text-sm font-bold text-[#163A70]">월간 세부 현황</h2>
        <DetailStatusCards cards={detailCards} accent={theme.chartStroke} />
      </section>

      <section className="mlr-narrative mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl p-3" style={{ backgroundColor: theme.strengthBg }}>
          <h3 className="text-xs font-bold" style={{ color: theme.strengthTitle }}>
            강점
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700">
            {strengths.trim() || '작성된 내용이 없습니다.'}
          </p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: theme.improveBg }}>
          <h3 className="text-xs font-bold" style={{ color: theme.improveTitle }}>
            보완 필요 항목
          </h3>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700">
            {improvements.trim() || '작성된 내용이 없습니다.'}
          </p>
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-[rgba(22,58,112,0.12)] bg-[#FBFCFE] p-3 sm:p-4">
        <h3 className="text-xs font-bold text-[#163A70]">강사 종합 평가</h3>
        <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700">
          {teacherOverallComment.trim() || '작성된 내용이 없습니다.'}
        </p>
      </section>
    </article>
  )
}
