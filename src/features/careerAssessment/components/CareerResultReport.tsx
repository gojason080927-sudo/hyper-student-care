import type { ReactNode } from 'react'
import { MAJOR_CAREER_LICENSE_NOTE } from '../data/careerMajorCareerPaths'
import { PAGE4_EXPLORATION_NOTE } from '../data/careerMajorDetails'
import {
  CREDIT_SUBJECT_DISCLAIMER,
  CREDIT_SYSTEM_INTRO,
  CREDIT_WATCH_ITEMS,
  EXPLORATION_GUIDE_STEPS,
  IN_SCHOOL_PREP_CHECKLIST,
  OUT_OF_SCHOOL_NOTE,
  OUT_OF_SCHOOL_OPTIONS,
  RIASEC_TRAIT_DESCRIPTIONS,
  STRENGTH_DESCRIPTIONS,
  VALUE_DESCRIPTIONS,
} from '../data/careerReportDescriptions'
import {
  BEHAVIOR_LABELS,
  BEHAVIOR_ORDER,
  CAREER_DISCLAIMER,
  CAREER_PRINT_FOOTER,
  RIASEC_LABELS,
  RIASEC_ORDER,
  STRENGTH_LABELS,
  STRENGTH_ORDER,
  VALUE_ORDER,
} from '../data/labels'
import { formatRiasecPair, formatScore, topEntries } from '../engine/scoring'
import type { CareerAssessmentScores } from '../types'
import {
  buildDistinctMajorReason,
  buildSelectionPoints,
  buildTop3DeepCards,
} from '../utils/careerMajorDeepAnalysis'
import {
  buildReportDnaExplanation,
  commentForEfficacy,
  commentForReadiness,
  creditClustersForMajors,
  detailedMajorsByTopGroups,
  scaleCaption,
} from '../utils/careerReportContent'
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

function Bar({ value, tall = false }: { value: number; tall?: boolean }) {
  return (
    <div className={`career-print-bar-track ${tall ? 'career-print-bar-track--tall' : ''}`}>
      <div
        className="career-print-bar"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

function PrintPage({
  page,
  density = 'normal',
  children,
}: {
  page: 1 | 2 | 3 | 4 | 5
  density?: 'air' | 'normal' | 'dense'
  children: ReactNode
}) {
  return (
    <>
      <section className={`career-print-page career-print-page--${density} career-print-page--p${page}`}>
        <div className="career-print-frame">
          <div className="career-print-page-body">{children}</div>
          <footer className="career-print-footer">
            <span>{CAREER_PRINT_FOOTER}</span>
            <span className="career-print-pageno">- {page} -</span>
          </footer>
        </div>
      </section>
      {page < 5 ? <div className="career-print-break" aria-hidden="true" /> : null}
    </>
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
  const strengthTop5 = topEntries(scores.strengthScores, 5, STRENGTH_ORDER)
  const valueTop5 = topEntries(scores.valueScores, 5, VALUE_ORDER)
  const majorsTop10 = scores.majorGroupScores.slice(0, 10)
  const majorsTop5 = majorsTop10.slice(0, 5)
  const dna = buildReportDnaExplanation(scores.riasecTop2)
  const detailedGroups = detailedMajorsByTopGroups(majorsTop10, scores.detailedMajorScores)
  const creditClusters = creditClustersForMajors(majorsTop5)
  const top3Cards = buildTop3DeepCards(scores)
  const selectionPoints = buildSelectionPoints(scores)

  return (
    <div className="career-report-wrap">
      {showActions && (
        <div className="career-no-print career-report-actions">
          <button
            type="button"
            onClick={onPrint ?? runCareerResultPrint}
            className="min-h-11 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            결과지 출력
          </button>
        </div>
      )}

      <div className="career-print-root">
        <PrintPage page={1} density="air">
          <header className="career-print-hero">
            <p className="career-print-kicker">HYPER ACADEMY</p>
            <h1 className="career-print-title">진로·학과 적성검사 REPORT</h1>
            <p className="career-print-meta">
              {student.name} · {student.school} · {student.grade} · 검사일 {dateLabel}
            </p>
          </header>

          <article className="career-print-card career-print-card--dna">
            <h2 className="career-print-h2">진로 DNA</h2>
            <p className="career-print-dna-pair">{formatRiasecPair(scores.riasecTop2)}</p>
            <p className="career-print-dna-body">{dna}</p>
          </article>

          <article className="career-print-card">
            <h2 className="career-print-h2">핵심 강점 TOP5</h2>
            <ol className="career-print-explained-list">
              {strengthTop5.map((item, index) => (
                <li key={item.code}>
                  <div className="career-print-explained-head">
                    <strong>
                      {index + 1}. {item.label}
                    </strong>
                    <span>{formatScore(item.score)}</span>
                  </div>
                  <p>{STRENGTH_DESCRIPTIONS[item.code]}</p>
                </li>
              ))}
            </ol>
          </article>

          <article className="career-print-card">
            <h2 className="career-print-h2">추천 전공 TOP5</h2>
            <ol className="career-print-major-top5">
              {majorsTop5.map((item, index) => (
                <li key={item.id}>
                  <span className="career-print-major-name">
                    {index + 1}. {item.name}
                  </span>
                  <span className="career-print-major-fit">
                    {formatScore(item.score)} · {item.label}
                  </span>
                </li>
              ))}
            </ol>
          </article>
        </PrintPage>

        <PrintPage page={2} density="dense">
          <article className="career-print-card">
            <h2 className="career-print-h2">RIASEC 전체 결과</h2>
            <div className="career-print-riasec-list">
              {RIASEC_ORDER.map((code) => (
                <div key={code} className="career-print-riasec-row">
                  <div className="career-print-riasec-head">
                    <strong>
                      {code} {RIASEC_LABELS[code]}
                    </strong>
                    <span>{formatScore(scores.riasecScores[code])}</span>
                  </div>
                  <Bar value={scores.riasecScores[code]} />
                  <p>{RIASEC_TRAIT_DESCRIPTIONS[code]}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="career-print-card">
            <h2 className="career-print-h2">강점 8영역</h2>
            <div className="career-print-strength-grid">
              {STRENGTH_ORDER.map((code) => (
                <div key={code} className="career-print-mini-row">
                  <div className="career-print-mini-head">
                    <span>{STRENGTH_LABELS[code]}</span>
                    <strong>{formatScore(scores.strengthScores[code])}</strong>
                  </div>
                  <Bar value={scores.strengthScores[code]} />
                </div>
              ))}
            </div>
          </article>

          <article className="career-print-card">
            <h2 className="career-print-h2">직업가치 TOP5</h2>
            <div className="career-print-explained-list career-print-explained-list--compact">
              {valueTop5.map((item) => (
                <div key={item.code} className="career-print-value-row">
                  <div className="career-print-explained-head">
                    <strong>{item.label}</strong>
                    <span>{formatScore(item.score)}</span>
                  </div>
                  <Bar value={item.score} />
                  <p>{VALUE_DESCRIPTIONS[item.code]}</p>
                </div>
              ))}
            </div>
          </article>
        </PrintPage>

        <PrintPage page={3} density="dense">
          <article className="career-print-card">
            <h2 className="career-print-h2">행동 특성</h2>
            <div className="career-print-behavior-grid">
              {BEHAVIOR_ORDER.map((code) => (
                <div key={code} className="career-print-mini-row">
                  <div className="career-print-mini-head">
                    <span>{BEHAVIOR_LABELS[code]}</span>
                    <strong>{formatScore(scores.behaviorScores[code])}</strong>
                  </div>
                  <Bar value={scores.behaviorScores[code]} />
                </div>
              ))}
            </div>
          </article>

          <div className="career-print-scale-grid">
            <article className="career-print-card career-print-scale-card">
              <h2 className="career-print-h2">진로 실행역량</h2>
              <p className="career-print-scale-number">{formatScore(scores.careerEfficacy)}</p>
              <Bar value={scores.careerEfficacy} tall />
              <p className="career-print-scale-desc">{scaleCaption('efficacy')}</p>
              <p className="career-print-scale-comment">{commentForEfficacy(scores.careerEfficacy)}</p>
            </article>
            <article className="career-print-card career-print-scale-card">
              <h2 className="career-print-h2">진로 준비도</h2>
              <p className="career-print-scale-number">{formatScore(scores.careerReadiness)}</p>
              <Bar value={scores.careerReadiness} tall />
              <p className="career-print-scale-desc">{scaleCaption('readiness')}</p>
              <p className="career-print-scale-comment">{commentForReadiness(scores.careerReadiness)}</p>
            </article>
          </div>

          <article className="career-print-card">
            <h2 className="career-print-h2">추천 전공 TOP10</h2>
            <table className="career-print-table">
              <thead>
                <tr>
                  <th className="career-print-col-rank">순위</th>
                  <th className="career-print-col-name">전공군</th>
                  <th className="career-print-col-fit">적합도</th>
                  <th>주요 근거</th>
                </tr>
              </thead>
              <tbody>
                {majorsTop10.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>{item.name}</td>
                    <td>
                      {formatScore(item.score)}
                      <div className="career-print-fit-label">{item.label}</div>
                    </td>
                    <td>
                      {buildDistinctMajorReason(item, scores)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        </PrintPage>

        <PrintPage page={4} density="dense">
          <header className="career-print-page4-title">
            <h2>추천 전공 상세 분석</h2>
          </header>

          <article className="career-print-card">
            <h3 className="career-print-h3">세부 추천학과</h3>
            <ol className="career-print-detail-majors">
              {detailedGroups.map((row, index) => (
                <li key={row.group.id}>
                  <strong>
                    {index + 1}. {row.group.name}
                  </strong>
                  <span>관련 학과: {row.majors.join(' · ')}</span>
                  {row.careers.length > 0 ? (
                    <span className="career-print-careers">
                      대표 진출 직업: {row.careers.join(' · ')}
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </article>

          <h3 className="career-print-h3 career-print-deep-title">TOP3 전공 심층 분석</h3>
          <div className="career-print-deep-grid">
            {top3Cards.map((card) => (
              <article key={card.group.id} className="career-print-card career-print-deep-card">
                <h3 className="career-print-deep-head">
                  <span>
                    {card.rank}위 {card.group.name}
                  </span>
                  <span>
                    적합도 {formatScore(card.group.score)}
                    <em>{card.fitLabel}</em>
                  </span>
                </h3>
                <p className="career-print-deep-why">
                  <strong>왜 잘 맞을까?</strong>
                  {card.whyFit}
                </p>
                <p className="career-print-deep-line">
                  <strong>관련 학과</strong>
                  {card.relatedMajors.join(' · ')}
                </p>
                <p className="career-print-deep-line">
                  <strong>추천 탐색 교과</strong>
                  {card.exploratorySubjects.join(' · ')}
                </p>
                <p className="career-print-deep-line">
                  <strong>추천 탐구 주제</strong>
                  {card.explorationTopics.join(' · ')}
                </p>
                <p className="career-print-deep-careers">
                  <strong>대표 진출 직업</strong>
                  {card.careers.join(' · ')}
                </p>
              </article>
            ))}
          </div>

          <article className="career-print-card career-print-points">
            <h3 className="career-print-h3">나의 전공 선택 포인트</h3>
            <ul>
              {selectionPoints.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </li>
              ))}
            </ul>
            <p className="career-print-license-note">{MAJOR_CAREER_LICENSE_NOTE}</p>
            <p className="career-print-explore-note">{PAGE4_EXPLORATION_NOTE}</p>
          </article>
        </PrintPage>

        <PrintPage page={5} density="dense">
          <article className="career-print-card career-print-guide">
            <h2 className="career-print-h2 career-print-guide-title">진로 탐색·준비 가이드</h2>
            <ol className="career-print-guide-steps">
              {EXPLORATION_GUIDE_STEPS.map((step) => (
                <li key={step.title}>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="career-print-note career-print-guide-note">
              현재 결과에서는 {majorsTop5.slice(0, 3).map((item) => item.name).join(', ')} 계열을
              중심으로 위 단계를 적용해 보면 좋습니다. 구체적인 과목 선택은 아래 고교학점제
              가이드를 참고하세요.
            </p>
          </article>

          <header className="career-print-page5-title">
            <h2>고교학점제 기반 진로 설계 가이드</h2>
          </header>

          <article className="career-print-card">
            <h3 className="career-print-h3">1. 고교학점제란?</h3>
            <p className="career-print-body">{CREDIT_SYSTEM_INTRO}</p>
          </article>

          <article className="career-print-card">
            <h3 className="career-print-h3">2. 나의 진로와 연결된 선택과목 예시</h3>
            <p className="career-print-note">{CREDIT_SUBJECT_DISCLAIMER}</p>
            <div className="career-print-cluster-grid">
              {creditClusters.map((cluster) => (
                <div key={cluster.id}>
                  <strong>
                    {cluster.title}
                    {majorsTop5.some((item) => cluster.groupIds.includes(item.id))
                      ? ` · ${majorsTop5
                          .filter((item) => cluster.groupIds.includes(item.id))
                          .slice(0, 2)
                          .map((item) => item.name)
                          .join(', ')}`
                      : ''}
                  </strong>
                  <p>{cluster.examples.join(' · ')}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="career-print-card">
            <h3 className="career-print-h3">3. 학교 안에서 할 수 있는 준비</h3>
            <ul className="career-print-checklist">
              {IN_SCHOOL_PREP_CHECKLIST.map((item) => (
                <li key={item}>□ {item}</li>
              ))}
            </ul>
          </article>

          <article className="career-print-card">
            <h3 className="career-print-h3">4. 학교 밖에서 확장할 수 있는 방법</h3>
            <p className="career-print-body">{OUT_OF_SCHOOL_OPTIONS.join(' · ')}</p>
            <p className="career-print-note">{OUT_OF_SCHOOL_NOTE}</p>
          </article>

          <article className="career-print-card">
            <h3 className="career-print-h3">5. 확인할 부분</h3>
            <ul className="career-print-watch">
              {CREDIT_WATCH_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="career-print-disclaimer">{CAREER_DISCLAIMER}</p>
          </article>
        </PrintPage>
      </div>
    </div>
  )
}
