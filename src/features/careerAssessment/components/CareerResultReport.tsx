import {
  BEHAVIOR_LABELS,
  BEHAVIOR_ORDER,
  CAREER_DISCLAIMER,
  CAREER_PRINT_FOOTER,
  PROBLEM_SOLVING_LABELS,
  PROBLEM_SOLVING_ORDER,
  RIASEC_LABELS,
  RIASEC_ORDER,
  STRENGTH_LABELS,
  VALUE_ORDER,
} from '../data/labels'
import { formatRiasecPair, formatScore, topEntries } from '../engine/scoring'
import type { CareerAssessmentScores } from '../types'
import '../styles/careerResultPrint.css'

type StudentInfo = {
  name: string
  school: string
  grade: string
}

type CareerResultReportProps = {
  student: StudentInfo
  testedAt: string
  scores: CareerAssessmentScores
  showActions?: boolean
  onPrint?: () => void
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
      <div className="career-print-bar h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="career-print-card space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-navy-900">{formatScore(value)}</span>
      </div>
      <Bar value={value} />
    </div>
  )
}

export function runCareerResultPrint() {
  const root = document.documentElement
  root.classList.add('career-printing')
  const cleanup = () => {
    root.classList.remove('career-printing')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  try {
    window.print()
  } catch {
    cleanup()
  }
}

export function CareerResultReport({
  student,
  testedAt,
  scores,
  showActions = true,
  onPrint,
}: CareerResultReportProps) {
  const dateLabel = testedAt.slice(0, 10)
  const strengthTop5 = topEntries(scores.strengthScores, 5, Object.keys(STRENGTH_LABELS) as Array<keyof typeof STRENGTH_LABELS>)
  const valueTop5 = topEntries(scores.valueScores, 5, VALUE_ORDER)
  const majorsTop10 = scores.majorGroupScores.slice(0, 10)
  const majorsTop5 = majorsTop10.slice(0, 5)
  const detailedTop = scores.detailedMajorScores.slice(0, 10)

  return (
    <div className="space-y-4">
      {showActions && (
        <div className="career-no-print flex justify-end">
          <button
            type="button"
            onClick={onPrint ?? runCareerResultPrint}
            className="min-h-11 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            결과지 출력
          </button>
        </div>
      )}

      <div className="career-print-root space-y-6">
        <section className="career-print-page space-y-4">
          <header className="career-print-hero career-print-card rounded-2xl p-5">
            <p className="text-xs font-semibold tracking-[0.2em]">HYPER ACADEMY</p>
            <h1 className="mt-1 text-2xl font-bold">진로·학과 적성검사 REPORT</h1>
            <p className="mt-3 text-sm">
              {student.name} · {student.school} · {student.grade} · 검사일 {dateLabel}
            </p>
          </header>

          <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-navy-900">진로 DNA</h2>
            <p className="mt-2 text-xl font-semibold text-[#163A70]">{formatRiasecPair(scores.riasecTop2)}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{scores.dnaExplanation}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-navy-900">핵심 강점 TOP5</h3>
              <ol className="mt-3 space-y-2">
                {strengthTop5.map((item, index) => (
                  <li key={item.code} className="flex justify-between text-sm">
                    <span>
                      {index + 1}. {item.label}
                    </span>
                    <span className="font-semibold">{formatScore(item.score)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-bold text-navy-900">추천 전공 TOP5</h3>
              <ol className="mt-3 space-y-2">
                {majorsTop5.map((item, index) => (
                  <li key={item.id} className="flex justify-between text-sm">
                    <span>
                      {index + 1}. {item.name}
                    </span>
                    <span className="font-semibold">
                      {formatScore(item.score)} · {item.label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="career-print-footer text-xs text-slate-500">{CAREER_PRINT_FOOTER}</p>
        </section>

        <section className="career-print-page space-y-4">
          <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-navy-900">RIASEC 전체 결과</h2>
            <div className="mt-3 space-y-2">
              {RIASEC_ORDER.map((code) => (
                <ScoreRow
                  key={code}
                  label={`${RIASEC_LABELS[code]} ${code}`}
                  value={scores.riasecScores[code]}
                />
              ))}
            </div>
          </div>
          <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-navy-900">강점 8영역</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {(Object.keys(STRENGTH_LABELS) as Array<keyof typeof STRENGTH_LABELS>).map((code) => (
                <ScoreRow key={code} label={STRENGTH_LABELS[code]} value={scores.strengthScores[code]} />
              ))}
            </div>
          </div>
          <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-navy-900">직업가치 TOP5</h2>
            <div className="mt-3 space-y-2">
              {valueTop5.map((item) => (
                <ScoreRow key={item.code} label={item.label} value={item.score} />
              ))}
            </div>
          </div>
          <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-navy-900">행동 특성</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {BEHAVIOR_ORDER.map((code) => (
                <ScoreRow key={code} label={BEHAVIOR_LABELS[code]} value={scores.behaviorScores[code]} />
              ))}
            </div>
          </div>
          <p className="career-print-footer text-xs text-slate-500">{CAREER_PRINT_FOOTER}</p>
        </section>

        <section className="career-print-page space-y-4">
          <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-navy-900">추천 전공 TOP10</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2">순위</th>
                  <th>전공군</th>
                  <th>적합도</th>
                  <th>주요 근거</th>
                </tr>
              </thead>
              <tbody>
                {majorsTop10.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                    <td className="py-2">{index + 1}</td>
                    <td>{item.name}</td>
                    <td>
                      {formatScore(item.score)}
                      <div className="text-xs text-slate-500">{item.label}</div>
                    </td>
                    <td className="text-xs text-slate-600">{item.reasons[0] ?? scores.overallExplanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-navy-900">세부 추천학과</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {detailedTop.map((item, index) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>
                    {index + 1}. {item.name}
                  </span>
                  <span className="shrink-0 font-semibold">
                    {formatScore(item.score)} · {item.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-navy-900">왜 추천됐나요?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{scores.overallExplanation}</p>
          </div>
          <p className="career-print-footer text-xs text-slate-500">{CAREER_PRINT_FOOTER}</p>
        </section>

        <section className="career-print-page space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-navy-900">진로 실행역량</h2>
              <p className="mt-2 text-3xl font-bold text-navy-900">{formatScore(scores.careerEfficacy)}</p>
              <Bar value={scores.careerEfficacy} />
            </div>
            <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-navy-900">진로 준비도</h2>
              <p className="mt-2 text-3xl font-bold text-navy-900">{formatScore(scores.careerReadiness)}</p>
              <Bar value={scores.careerReadiness} />
            </div>
          </div>
          <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-navy-900">강점 활용 방법</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              상위 강점인 {strengthTop5.map((item) => item.label).join(', ')}을 실제 탐구·과제·동아리 활동에
              연결해 보면 전공 탐색이 더 구체해집니다.
            </p>
          </div>
          <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-navy-900">확인할 부분</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {(majorsTop5[0]?.watchItems ?? []).length > 0 ? (
                majorsTop5[0]?.watchItems.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>상위 추천 전공의 실제 수업·실습 경험을 통해 적합성을 추가로 확인해 보는 것이 좋습니다.</li>
              )}
            </ul>
          </div>
          <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-navy-900">추천 진로탐색 방향</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {majorsTop5.map((item) => item.name).join(', ')} 계열 자료·체험·학과 소개를 먼저 살펴보고, 현재
              흥미와 강점이 실제로 맞는지 확인하는 것을 권합니다.
            </p>
          </div>
          <div className="career-print-card rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold text-navy-900">문제해결</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PROBLEM_SOLVING_ORDER.map((code) => (
                <ScoreRow
                  key={code}
                  label={PROBLEM_SOLVING_LABELS[code]}
                  value={scores.problemSolvingScores[code]}
                />
              ))}
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">{CAREER_DISCLAIMER}</p>
          <p className="career-print-footer text-xs text-slate-500">{CAREER_PRINT_FOOTER}</p>
        </section>
      </div>
    </div>
  )
}
