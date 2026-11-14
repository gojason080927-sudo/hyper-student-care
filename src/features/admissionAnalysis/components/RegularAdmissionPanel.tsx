import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { btnPrimary, inputClass } from '../../../utils/labels'
import { loadRegularAdmissionMaster } from '../../../data/admissions/regularAdmissionRepository'
import { buildStudentMetrics, hasAnyScore } from '../../../lib/admissions/regular/metrics'
import { recommendRegularAdmission } from '../../../lib/admissions/regular/recommender'
import { formatScore } from '../../../lib/admissions/regular/format'
import type {
  AdmissionGroup,
  InquiryType,
  RegularAdmissionFilters,
  RegularAdmissionMasterRow,
  RegularAdmissionStudentInput,
  RegularFieldTrack,
  RegularRegion,
} from '../../../lib/admissions/regular/types'
import {
  HIGH_SCHOOL_2022_INQUIRY_TRACKS,
  HIGH_SCHOOL_2022_SCIENCE,
  HIGH_SCHOOL_2022_SOCIAL,
  REGULAR_ADMISSION_ENGLISH_SUBJECTS,
  REGULAR_ADMISSION_KOREAN_SUBJECTS,
  REGULAR_ADMISSION_MATH_SUBJECTS,
  type HighSchool2022InquiryTrack,
} from '../../../data/curriculum/highSchool2022Subjects'
import type { AdmissionStudentProfile } from '../types'
import { RegularAdmissionResultPanel } from './RegularAdmissionResultPanel'
import { OfficialNamesSelect, OfficialSubjectSelect } from './AdmissionCurriculumSubjectFields'

type Props = {
  profile: AdmissionStudentProfile
}

const ENGLISH_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const HISTORY_GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function inquiryTypeFromTrack(track: HighSchool2022InquiryTrack | ''): InquiryType | '' {
  if (track === '사회') return '사회탐구'
  if (track === '과학') return '과학탐구'
  return ''
}

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim()
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return n
}

function emptyScores(): Omit<
  RegularAdmissionStudentInput,
  'name' | 'school' | 'gradeYear'
> {
  return {
    koreanStandardScore: null,
    koreanPercentile: null,
    mathSelection: '',
    mathStandardScore: null,
    mathPercentile: null,
    englishGrade: null,
    inquiry1Type: '',
    inquiry1Name: '',
    inquiry1StandardScore: null,
    inquiry1Percentile: null,
    inquiry2Type: '',
    inquiry2Name: '',
    inquiry2StandardScore: null,
    inquiry2Percentile: null,
    historyGrade: null,
  }
}

type Curriculum2022Meta = {
  koreanSubject: string
  mathSubject: string
  englishSubject: string
  inquiry1Track: HighSchool2022InquiryTrack | ''
  inquiry1Subject: string
  inquiry2Track: HighSchool2022InquiryTrack | ''
  inquiry2Subject: string
}

function emptyCurriculumMeta(): Curriculum2022Meta {
  return {
    koreanSubject: '',
    mathSubject: '',
    englishSubject: '',
    inquiry1Track: '',
    inquiry1Subject: '',
    inquiry2Track: '',
    inquiry2Subject: '',
  }
}

export function RegularAdmissionPanel({ profile }: Props) {
  const [scores, setScores] = useState(emptyScores)
  const [curriculum, setCurriculum] = useState(emptyCurriculumMeta)
  const [showResult, setShowResult] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<RegularAdmissionFilters>({
    region: '전체',
    admissionGroup: '전체',
    fieldTrack: '전체',
  })
  const [master, setMaster] = useState<RegularAdmissionMasterRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void loadRegularAdmissionMaster().then((rows) => {
      if (!cancelled) setMaster(rows)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const input: RegularAdmissionStudentInput = useMemo(
    () => ({
      name: profile.name,
      school: profile.school,
      gradeYear: profile.gradeYear,
      koreanStandardScore: scores.koreanStandardScore,
      koreanPercentile: scores.koreanPercentile,
      mathSelection: scores.mathSelection,
      mathStandardScore: scores.mathStandardScore,
      mathPercentile: scores.mathPercentile,
      englishGrade: scores.englishGrade,
      inquiry1Type: inquiryTypeFromTrack(curriculum.inquiry1Track),
      inquiry1Name: '',
      inquiry1StandardScore: scores.inquiry1StandardScore,
      inquiry1Percentile: scores.inquiry1Percentile,
      inquiry2Type: inquiryTypeFromTrack(curriculum.inquiry2Track),
      inquiry2Name: '',
      inquiry2StandardScore: scores.inquiry2StandardScore,
      inquiry2Percentile: scores.inquiry2Percentile,
      historyGrade: scores.historyGrade,
    }),
    [curriculum.inquiry1Track, curriculum.inquiry2Track, profile, scores],
  )

  const metrics = useMemo(() => buildStudentMetrics(input), [input])

  const analysis = useMemo(() => {
    if (master == null) {
      return {
        ready: false,
        message: '정시 MASTER를 불러오는 중입니다.',
        metrics,
        reach: [],
        ambitious: [],
        target: [],
        scienceTechReference: [],
        excludedUnmet: 0,
        skippedCount: 0,
      }
    }
    return recommendRegularAdmission({ metrics, records: master, filters })
  }, [filters, master, metrics])

  const patch = (next: Partial<typeof scores>) => {
    setScores((prev) => ({ ...prev, ...next }))
    setShowResult(false)
  }

  const patchCurriculum = (next: Partial<Curriculum2022Meta>) => {
    setCurriculum((prev) => ({ ...prev, ...next }))
    setShowResult(false)
  }

  return (
    <div className="space-y-6" data-page="regular-admission-analysis">
      <section className="no-print rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-[#163A70]">수능 성적 입력</h3>
        <p className="mt-1 text-xs text-slate-500">
          과목명은 2022 개정 교육과정 기준입니다. 추천 비교는 기존 2025 MASTER의 백분위·등급
          구조로 계산하며, 새 과목명으로 입결을 바꾸지 않습니다.
        </p>

        <div className="mt-4 space-y-4" data-curriculum="2022">
          <ScoreBlock title="국어">
            <label className="block min-w-[8rem] flex-1 space-y-1.5">
              <span className="text-sm font-medium text-slate-700">국어 과목</span>
              <OfficialNamesSelect
                name={curriculum.koreanSubject}
                names={REGULAR_ADMISSION_KOREAN_SUBJECTS}
                dataSource="HIGH_SCHOOL_2022_KOREAN"
                dataSlot="regular-korean"
                onChange={(koreanSubject) => patchCurriculum({ koreanSubject })}
              />
            </label>
            <NumField
              label="표준점수"
              value={scores.koreanStandardScore}
              onChange={(v) => patch({ koreanStandardScore: v })}
              placeholder="예: 132"
            />
            <NumField
              label="백분위"
              value={scores.koreanPercentile}
              onChange={(v) => patch({ koreanPercentile: v })}
              placeholder="예: 96"
            />
          </ScoreBlock>

          <ScoreBlock title="수학">
            <label className="block min-w-[8rem] flex-1 space-y-1.5">
              <span className="text-sm font-medium text-slate-700">수학 과목</span>
              <OfficialNamesSelect
                name={curriculum.mathSubject}
                names={REGULAR_ADMISSION_MATH_SUBJECTS}
                dataSource="HIGH_SCHOOL_2022_MATH"
                dataSlot="regular-math"
                onChange={(mathSubject) => patchCurriculum({ mathSubject })}
              />
            </label>
            <NumField
              label="표준점수"
              value={scores.mathStandardScore}
              onChange={(v) => patch({ mathStandardScore: v })}
              placeholder="예: 128"
            />
            <NumField
              label="백분위"
              value={scores.mathPercentile}
              onChange={(v) => patch({ mathPercentile: v })}
              placeholder="예: 72"
            />
          </ScoreBlock>

          <ScoreBlock title="영어">
            <label className="block min-w-[8rem] flex-1 space-y-1.5">
              <span className="text-sm font-medium text-slate-700">과목 선택</span>
              <OfficialNamesSelect
                name={curriculum.englishSubject}
                names={REGULAR_ADMISSION_ENGLISH_SUBJECTS}
                dataSource="HIGH_SCHOOL_2022_ENGLISH"
                dataSlot="regular-english"
                onChange={(englishSubject) => patchCurriculum({ englishSubject })}
              />
            </label>
            <label className="block min-w-[7rem] flex-1 space-y-1.5">
              <span className="text-sm font-medium text-slate-700">등급</span>
              <select
                className={inputClass()}
                value={scores.englishGrade ?? ''}
                onChange={(e) =>
                  patch({
                    englishGrade: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              >
                <option value="">선택</option>
                {ENGLISH_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}등급
                  </option>
                ))}
              </select>
            </label>
          </ScoreBlock>

          <Inquiry2022Block
            title="탐구1"
            track={curriculum.inquiry1Track}
            subject={curriculum.inquiry1Subject}
            standardScore={scores.inquiry1StandardScore}
            percentile={scores.inquiry1Percentile}
            onTrack={(inquiry1Track) =>
              patchCurriculum({
                inquiry1Track,
                inquiry1Subject: '',
              })
            }
            onSubject={(inquiry1Subject) => patchCurriculum({ inquiry1Subject })}
            onStandard={(inquiry1StandardScore) => patch({ inquiry1StandardScore })}
            onPercentile={(inquiry1Percentile) => patch({ inquiry1Percentile })}
          />
          <Inquiry2022Block
            title="탐구2"
            track={curriculum.inquiry2Track}
            subject={curriculum.inquiry2Subject}
            standardScore={scores.inquiry2StandardScore}
            percentile={scores.inquiry2Percentile}
            onTrack={(inquiry2Track) =>
              patchCurriculum({
                inquiry2Track,
                inquiry2Subject: '',
              })
            }
            onSubject={(inquiry2Subject) => patchCurriculum({ inquiry2Subject })}
            onStandard={(inquiry2StandardScore) => patch({ inquiry2StandardScore })}
            onPercentile={(inquiry2Percentile) => patch({ inquiry2Percentile })}
          />

          <ScoreBlock title="한국사">
            <label className="block min-w-[7rem] flex-1 space-y-1.5">
              <span className="text-sm font-medium text-slate-700">등급</span>
              <select
                className={inputClass()}
                value={scores.historyGrade ?? ''}
                onChange={(e) =>
                  patch({
                    historyGrade: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              >
                <option value="">선택</option>
                {HISTORY_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}등급
                  </option>
                ))}
              </select>
            </label>
          </ScoreBlock>
        </div>
      </section>

      {hasAnyScore(metrics) ? (
        <section className="no-print rounded-2xl border border-[rgba(22,58,112,0.14)] bg-gradient-to-br from-white to-[rgba(40,199,183,0.06)] p-5 shadow-sm">
          <h3 className="text-lg font-bold text-[#163A70]">학생 성적 참고값</h3>
          <p className="mt-3 text-sm text-[#163A70]">
            국·수·탐 평균백분위{' '}
            <span className="font-bold">{formatScore(metrics.koreanMathInquiryAverage)}</span>
            <span className="mx-2 text-slate-300">·</span>
            탐구 평균 {formatScore(metrics.inquiryAveragePercentile)}
            <span className="mx-2 text-slate-300">·</span>
            탐구 상위 1과목 {formatScore(metrics.inquiryBestPercentile)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            ※ 영어 등급은 임의 백분위로 바꾸지 않습니다. 대학 공식 환산표가 있는 모집단위에서만
            영어를 환산합니다. 위 평균은 내부 참고값이며 공식 대학환산점수가 아닙니다.
          </p>
        </section>
      ) : null}

      <div className="no-print">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white px-4 py-3 text-left text-sm font-semibold text-[#163A70] shadow-sm"
          onClick={() => setShowFilters((v) => !v)}
        >
          상세조건
          <ChevronDown className={`h-4 w-4 transition ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        {showFilters ? (
          <div className="mt-2 grid gap-3 rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-4 sm:grid-cols-3">
            <FilterSelect
              label="지역"
              value={filters.region}
              options={['전체', '서울', '경기/인천', '지방', '지방국립대']}
              onChange={(region) =>
                setFilters((f) => ({ ...f, region: region as RegularRegion | '전체' }))
              }
            />
            <FilterSelect
              label="모집군"
              value={filters.admissionGroup}
              options={['전체', '가', '나', '다', '군외']}
              onChange={(admissionGroup) =>
                setFilters((f) => ({
                  ...f,
                  admissionGroup: admissionGroup as AdmissionGroup | '전체',
                }))
              }
            />
            <FilterSelect
              label="계열"
              value={filters.fieldTrack}
              options={['전체', '인문', '자연', '공학', '의약학', '교육']}
              onChange={(fieldTrack) =>
                setFilters((f) => ({
                  ...f,
                  fieldTrack: fieldTrack as RegularFieldTrack | '전체',
                }))
              }
            />
          </div>
        ) : null}
      </div>

      <div className="no-print">
        <button
          type="button"
          className={`${btnPrimary} w-full bg-[#163A70] hover:bg-[#122f5c]`}
          disabled={!hasAnyScore(metrics)}
          onClick={() => setShowResult(true)}
        >
          정시 대학 분석
        </button>
      </div>

      {showResult ? (
        <RegularAdmissionResultPanel profile={profile} analysis={analysis} />
      ) : null}
    </div>
  )
}

function ScoreBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-xl border border-[rgba(22,58,112,0.08)] bg-slate-50/60 p-3">
      <p className="text-sm font-semibold text-[#163A70]">{title}</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">{children}</div>
    </article>
  )
}

function NumField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
  placeholder: string
}) {
  return (
    <label className="block min-w-[6rem] flex-1 space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        inputMode="decimal"
        className={inputClass()}
        value={value ?? ''}
        onChange={(e) => onChange(parseOptionalNumber(e.target.value))}
        placeholder={placeholder}
        aria-label={label}
      />
    </label>
  )
}

function Inquiry2022Block({
  title,
  track,
  subject,
  standardScore,
  percentile,
  onTrack,
  onSubject,
  onStandard,
  onPercentile,
}: {
  title: string
  track: HighSchool2022InquiryTrack | ''
  subject: string
  standardScore: number | null
  percentile: number | null
  onTrack: (v: HighSchool2022InquiryTrack | '') => void
  onSubject: (v: string) => void
  onStandard: (v: number | null) => void
  onPercentile: (v: number | null) => void
}) {
  const table = track === '과학' ? HIGH_SCHOOL_2022_SCIENCE : HIGH_SCHOOL_2022_SOCIAL
  const dataSource =
    track === '사회'
      ? 'HIGH_SCHOOL_2022_SOCIAL'
      : track === '과학'
        ? 'HIGH_SCHOOL_2022_SCIENCE'
        : ''

  return (
    <ScoreBlock title={title}>
      <label className="block min-w-[7rem] flex-1 space-y-1.5">
        <span className="text-sm font-medium text-slate-700">계열</span>
        <select
          className={inputClass()}
          value={track}
          onChange={(e) => onTrack(e.target.value as HighSchool2022InquiryTrack | '')}
          data-source="HIGH_SCHOOL_2022_INQUIRY_TRACKS"
          data-inquiry-slot={`${title}-track`}
        >
          <option value="">선택</option>
          {HIGH_SCHOOL_2022_INQUIRY_TRACKS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-[8rem] flex-1 space-y-1.5">
        <span className="text-sm font-medium text-slate-700">과목명</span>
        <OfficialSubjectSelect
          id={`regular-${title}-name`}
          name={subject}
          table={table}
          dataSource={dataSource}
          dataSlot={`${title}-name`}
          disabled={!track}
          onChange={onSubject}
        />
      </label>
      <NumField
        label="표준점수"
        value={standardScore}
        onChange={onStandard}
        placeholder="예: 68"
      />
      <NumField
        label="백분위"
        value={percentile}
        onChange={onPercentile}
        placeholder="예: 95"
      />
    </ScoreBlock>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select className={inputClass()} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
