import type { EntranceExamIntegratedDiagnosis } from '../buildEntranceExamIntegratedDiagnosis'
import type { EntranceExamDiagnosticReport } from '../buildEntranceExamReport'
import type { EntranceExamIntegratedReport } from '../buildEntranceExamIntegratedReport'
import { EntranceExamRadarChart } from './EntranceExamRadarChart'

/** PRINT용 Radar — 과목(수학/영어). A4 폭을 쓰는 세로 배치용 */
export const INTEGRATED_PRINT_SUBJECT_RADAR_SIZE = { width: 460, height: 390 } as const

/** PRINT용 Radar — 학습성향 (페이지 중앙 대형) */
export const INTEGRATED_PRINT_SURVEY_RADAR_SIZE = { width: 520, height: 440 } as const

/** @deprecated 호환용 alias — 과목 크기와 동일 */
export const INTEGRATED_PRINT_RADAR_SIZE = INTEGRATED_PRINT_SUBJECT_RADAR_SIZE

export function EntranceExamIntegratedReportDocument(props: {
  report: EntranceExamIntegratedReport
  diagnosis: EntranceExamIntegratedDiagnosis
}) {
  const { report, diagnosis } = props
  const { studentInfo } = report

  return (
    <article className="ee-report-document ee-report-document--integrated space-y-5 rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-5 shadow-sm sm:p-7">
      {/* PAGE 1 — 헤더 + 수학만. break-before 없음(빈 첫 페이지 방지). 종료 후 page break */}
      <div className="ee-report-print-page ee-report-print-page--math space-y-5">
        <header className="ee-report-integrated-header border-b border-slate-200 pb-4 text-center">
          <p className="ee-report-brand text-sm font-semibold tracking-wide text-[#0F766E]">
            HYPER 영수 전문학원
          </p>
          <h2 className="ee-report-title mt-1 text-xl font-bold text-[#163A70] sm:text-2xl">
            신입생 통합 종합진단 REPORT
          </h2>
          <dl className="ee-report-student-meta mx-auto mt-3 grid max-w-xl grid-cols-2 gap-x-4 gap-y-1.5 text-left text-sm sm:grid-cols-4">
            <div>
              <dt className="ee-report-info-label text-xs font-medium text-slate-600">학생</dt>
              <dd className="ee-report-info-value font-semibold text-slate-900">
                {studentInfo.studentName || '-'}
              </dd>
            </div>
            <div>
              <dt className="ee-report-info-label text-xs font-medium text-slate-600">학교</dt>
              <dd className="ee-report-info-value font-semibold text-slate-900">
                {studentInfo.school || '-'}
              </dd>
            </div>
            <div>
              <dt className="ee-report-info-label text-xs font-medium text-slate-600">학년</dt>
              <dd className="ee-report-info-value font-semibold text-slate-900">
                {studentInfo.grade || '-'}
              </dd>
            </div>
            <div>
              <dt className="ee-report-info-label text-xs font-medium text-slate-600">평가일</dt>
              <dd className="ee-report-info-value font-semibold text-slate-900">
                {studentInfo.evaluationDate || '-'}
              </dd>
            </div>
          </dl>
        </header>

        <SubjectResultSection
          title="수학 입학테스트 결과"
          emptyText="수학 평가 없음"
          subjectReport={report.math}
          tone="navy"
          sectionClassName="ee-report-subject-section--math"
        />
      </div>

      {/* PAGE 2 — 영어만 */}
      <div className="ee-report-print-page ee-report-print-page--english space-y-5">
        <SubjectResultSection
          title="영어 입학테스트 결과"
          emptyText="영어 평가 없음"
          subjectReport={report.english}
          tone="mint"
          sectionClassName="ee-report-subject-section--english"
        />
      </div>

      {/* PAGE 3 — 학습성향만 */}
      <div className="ee-report-print-page ee-report-print-page--survey space-y-5">
        <LearningSurveySection report={report} />
      </div>

      {/* PAGE 4+ — 종합 학습진단 (내용이 길면 자연 연속) */}
      <div className="ee-report-print-page ee-report-print-page--diagnosis space-y-5">
        <IntegratedDiagnosisSection diagnosis={diagnosis} />
      </div>
    </article>
  )
}

function SubjectResultSection(props: {
  title: string
  emptyText: string
  subjectReport: EntranceExamDiagnosticReport | null
  tone: 'navy' | 'mint'
  sectionClassName?: string
}) {
  const { title, emptyText, subjectReport, tone, sectionClassName } = props
  const scoreColor = tone === 'mint' ? 'text-[#0F766E]' : 'text-[#163A70]'
  const panelClass =
    tone === 'mint'
      ? 'ee-report-score-panel ee-report-score-panel-mint bg-[rgba(40,199,183,0.12)]'
      : 'ee-report-score-panel ee-report-score-panel-navy bg-[rgba(22,58,112,0.06)]'

  return (
    <section
      className={`ee-report-subject-section space-y-4${sectionClassName ? ` ${sectionClassName}` : ''}`}
    >
      <h3 className="ee-report-section-title text-base font-bold text-[#163A70]">{title}</h3>
      {!subjectReport ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          {emptyText}
        </div>
      ) : (
        <>
          <div className={`${panelClass} rounded-xl px-4 py-3`}>
            <p className="text-sm font-semibold text-slate-800">
              {subjectReport.studentInfo.paperTitle || '시험지'}
            </p>
            <p className={`ee-report-score-big mt-1 text-3xl font-bold ${scoreColor}`}>
              {subjectReport.academicResult.totalScore}점
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-700">
              정답 {subjectReport.academicResult.correctCount} /{' '}
              {subjectReport.academicResult.totalCount}
            </p>
          </div>

          {/* 화면: 2열 / 인쇄: CSS에서 세로 1열 */}
          <div className="ee-report-score-grid ee-report-result-detail-grid grid gap-4 lg:grid-cols-2">
            <div className="ee-report-radar-panel rounded-xl border border-slate-200 px-3 py-3">
              <p className="mb-1 text-sm font-semibold text-slate-800">과목 평가영역</p>
              <div className="ee-report-radar-screen-only">
                <EntranceExamRadarChart
                  points={subjectReport.academicRadarPoints}
                  tone={tone}
                  emptyText="표시할 평가영역 점수가 없습니다."
                />
              </div>
              <div className="ee-report-radar-print-only ee-report-radar-print-only--subject">
                <EntranceExamRadarChart
                  points={subjectReport.academicRadarPoints}
                  tone={tone}
                  emptyText="표시할 평가영역 점수가 없습니다."
                  fixedSize={INTEGRATED_PRINT_SUBJECT_RADAR_SIZE}
                  printEnhance
                />
              </div>
            </div>

            <div className="ee-report-score-panel ee-report-area-score-panel rounded-xl border border-slate-200 px-4 py-3">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                {tone === 'mint' ? '영어' : '수학'} 영역별 점수
              </p>
              {/* 화면용 리스트 */}
              <ul className="ee-report-area-list-screen space-y-2">
                {subjectReport.academicAreas.map((item) => (
                  <li
                    key={item.area}
                    className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-0"
                  >
                    <span className="text-slate-800">{item.area}</span>
                    <span className="shrink-0 text-right">
                      <span className={`font-bold ${scoreColor}`}>
                        {item.score != null && item.status === 'accuracy' ? item.score : '-'}
                      </span>
                      <span className="ml-1 text-xs font-medium text-slate-500">
                        {item.fractionText}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              {/* 인쇄용 표 */}
              <table className="ee-report-area-table ee-report-area-table-print">
                <thead>
                  <tr>
                    <th scope="col">영역</th>
                    <th scope="col">점수</th>
                    <th scope="col">정답/문항</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectReport.academicAreas.map((item) => (
                    <tr key={item.area}>
                      <td>{item.area}</td>
                      <td className={scoreColor}>
                        {item.score != null && item.status === 'accuracy' ? item.score : '-'}
                      </td>
                      <td>{item.fractionText}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function LearningSurveySection({ report }: { report: EntranceExamIntegratedReport }) {
  return (
    <section className="ee-report-survey-section space-y-4">
      <h3 className="ee-report-section-title text-base font-bold text-[#163A70]">학습성향 결과</h3>
      {!report.learningSurvey ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          학습성향 설문 결과 없음
        </div>
      ) : (
        <>
          <div className="ee-report-score-panel ee-report-score-panel-mint rounded-xl bg-[rgba(40,199,183,0.12)] px-4 py-3">
            <p className="text-sm font-semibold text-slate-800">종합 학습성향</p>
            <p className="ee-report-score-big mt-1 text-3xl font-bold text-[#0F766E]">
              {report.learningSurvey.overallScore}점
            </p>
          </div>

          <div className="ee-report-score-grid ee-report-result-detail-grid grid gap-4 lg:grid-cols-2">
            <div className="ee-report-radar-panel rounded-xl border border-slate-200 px-3 py-3">
              <p className="mb-1 text-sm font-semibold text-slate-800">학습성향 영역</p>
              <div className="ee-report-radar-screen-only">
                <EntranceExamRadarChart
                  points={report.learningSurvey.radarPoints}
                  tone="mint"
                />
              </div>
              <div className="ee-report-radar-print-only ee-report-radar-print-only--survey">
                <EntranceExamRadarChart
                  points={report.learningSurvey.radarPoints}
                  tone="mint"
                  fixedSize={INTEGRATED_PRINT_SURVEY_RADAR_SIZE}
                  printEnhance
                />
              </div>
            </div>

            <div className="ee-report-score-panel ee-report-area-score-panel rounded-xl border border-slate-200 px-4 py-3">
              <p className="mb-3 text-sm font-semibold text-slate-800">6개 영역 점수</p>
              <ul className="ee-report-area-list-screen space-y-2">
                {report.learningSurvey.areas.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2 text-sm last:border-0"
                  >
                    <span className="text-slate-800">{item.label}</span>
                    <span className="font-bold text-[#0F766E]">{item.score}</span>
                  </li>
                ))}
              </ul>
              <table className="ee-report-area-table ee-report-area-table-print">
                <thead>
                  <tr>
                    <th scope="col">영역</th>
                    <th scope="col">점수 / 100</th>
                  </tr>
                </thead>
                <tbody>
                  {report.learningSurvey.areas.map((item) => (
                    <tr key={item.id}>
                      <td>{item.label}</td>
                      <td className="text-[#0F766E]">{item.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function IntegratedDiagnosisSection({
  diagnosis,
}: {
  diagnosis: EntranceExamIntegratedDiagnosis
}) {
  return (
    <section className="ee-report-diagnosis-section space-y-4 rounded-xl border border-[rgba(22,58,112,0.12)] bg-[rgba(22,58,112,0.03)] px-4 py-4">
      <h3 className="ee-report-section-title text-base font-bold text-[#163A70]">종합 학습진단</h3>

      <DiagnosisBlock
        title="① 수학 학업 진단"
        body={diagnosis.mathDiagnosis ?? '수학 입학테스트 결과가 없습니다.'}
      />
      <DiagnosisBlock
        title="② 영어 학업 진단"
        body={diagnosis.englishDiagnosis ?? '영어 입학테스트 결과가 없습니다.'}
      />
      <DiagnosisBlock
        title="③ 학습성향 진단"
        body={diagnosis.learningDiagnosis ?? '학습성향 설문 결과가 없습니다.'}
      />
      <DiagnosisBlock title="④ 통합 종합 진단" body={diagnosis.integratedDiagnosis} />

      <div className="ee-report-chip-block rounded-lg bg-white/80 px-3 py-3">
        <p className="text-sm font-semibold text-[#163A70]">⑤ 주요 강점</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {diagnosis.strengths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="ee-report-chip-block rounded-lg bg-white/80 px-3 py-3">
        <p className="text-sm font-semibold text-[#163A70]">⑥ 우선 보완 영역</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
          {diagnosis.improvementAreas.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="ee-report-manage-block rounded-lg border border-[rgba(15,118,110,0.25)] bg-[rgba(40,199,183,0.1)] px-3 py-3">
        <p className="text-sm font-semibold text-[#0F766E]">⑦ HYPER 맞춤 학습관리 방향</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-800">
          {diagnosis.managementRecommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="ee-report-block rounded-lg bg-white/70 px-3 py-3">
        <p className="text-sm font-semibold text-slate-700">⑧ 해석 유의사항</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {diagnosis.reliabilityNotes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function DiagnosisBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="ee-report-block rounded-lg bg-white/80 px-3 py-3">
      <p className="text-sm font-semibold text-[#163A70]">{title}</p>
      <p className="ee-report-body-text mt-1 text-sm leading-relaxed text-slate-700">{body}</p>
    </div>
  )
}
