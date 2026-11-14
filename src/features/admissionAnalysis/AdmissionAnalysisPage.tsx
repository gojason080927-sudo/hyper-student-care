import { useId, useMemo, useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { btnPrimary, btnSecondary, inputClass } from '../../utils/labels'
import {
  ExtraOfficialSubjectSelect,
  EnglishSubjectSelect,
  KoreanSubjectSelect,
  MathSubjectSelect,
  ScienceSubjectSelect,
  SocialSubjectSelect,
  subjectSlotLabel,
} from './components/AdmissionCurriculumSubjectFields'
import {
  type AdmissionStudentProfile,
  type AdmissionSubjectInput,
  type AdmissionSubjectSlot,
  type HighSchoolGradeYear,
  type SubjectAdmissionResult,
} from './types'
import {
  averageGrade,
  calcSubjectAdmission,
  formatGradeAverage,
  formatPercentile,
  validateRankInput,
} from './utils/admissionGradeCalculator'
import { recommendV124Universities } from './utils/v124Recommendation'
import { V124RecommendationPanel } from './components/V124RecommendationPanel'
import { loadV124RecommendationRecords } from './data/v124MasterData'
import type { V124RecommendationRecord } from './types/v124Recommendation'

const GRADE_YEARS: HighSchoolGradeYear[] = ['고1', '고2', '고3']

function createSubjectId(): string {
  return `subj_${Math.random().toString(36).slice(2, 10)}`
}

function emptySubjectFields(): Pick<
  AdmissionSubjectInput,
  'rank' | 'totalStudents' | 'creditUnits' | 'weight'
> {
  return {
    rank: null,
    totalStudents: null,
    creditUnits: null,
    weight: null,
  }
}

const DEFAULT_SUBJECT_SLOTS: ReadonlyArray<{
  slot: AdmissionSubjectSlot
  name: string
}> = [
  { slot: 'korean', name: '' },
  { slot: 'math', name: '' },
  { slot: 'english', name: '' },
  { slot: 'inquiry1', name: '' },
  { slot: 'inquiry2', name: '' },
]

function presetCardTitle(slot: AdmissionSubjectSlot | undefined): string | null {
  if (slot === 'korean') return '국어'
  if (slot === 'math') return '수학'
  if (slot === 'english') return '영어'
  if (slot === 'inquiry1') return '사회'
  if (slot === 'inquiry2') return '과학'
  return null
}

function createDefaultSubjects(): AdmissionSubjectInput[] {
  return DEFAULT_SUBJECT_SLOTS.map((row) => ({
    id: createSubjectId(),
    name: row.name,
    slot: row.slot,
    isPreset: true,
    ...emptySubjectFields(),
  }))
}

function parseOptionalInt(raw: string): number | null {
  const t = raw.trim()
  if (t === '') return null
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return Math.trunc(n)
}

type Props = {
  /** 모바일 셸에서 헤더를 숨길 때 */
  hidePageHeader?: boolean
}

export function AdmissionAnalysisPage({ hidePageHeader = false }: Props) {
  const formId = useId()
  const [profile, setProfile] = useState<AdmissionStudentProfile>({
    linkedStudentId: null,
    name: '',
    school: '',
    gradeYear: '',
  })
  const [subjects, setSubjects] = useState<AdmissionSubjectInput[]>(createDefaultSubjects)
  const [showGrade9, setShowGrade9] = useState(false)
  const [masterRecords, setMasterRecords] = useState<
    V124RecommendationRecord[] | null
  >(null)

  useEffect(() => {
    let cancelled = false
    void loadV124RecommendationRecords().then((rows) => {
      if (!cancelled) setMasterRecords(rows)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const subjectResults = useMemo(() => {
    const results: SubjectAdmissionResult[] = []
    const errors: Record<string, string> = {}

    for (const subject of subjects) {
      const name = subject.name.trim()
      const touched = subject.rank !== null || subject.totalStudents !== null
      if (!touched) continue

      if (!name) {
        errors[subject.id] = '과목명을 입력해 주세요.'
        continue
      }

      const validation = validateRankInput(subject.rank, subject.totalStudents)
      if (!validation.ok) {
        errors[subject.id] = validation.message
        continue
      }

      const computed = calcSubjectAdmission(subject.rank!, subject.totalStudents!)
      results.push({
        subjectId: subject.id,
        subjectName: name,
        rank: subject.rank!,
        totalStudents: subject.totalStudents!,
        percentile: computed.percentile,
        grade5: computed.grade5,
        grade9: computed.grade9,
        creditUnits: subject.creditUnits ?? null,
        weight: subject.weight ?? null,
      })
    }

    return { results, errors }
  }, [subjects])

  // Sync validation messages for display
  const displayErrors = subjectResults.errors

  const grade5Average = useMemo(
    () => averageGrade(subjectResults.results.map((r) => r.grade5)),
    [subjectResults.results],
  )
  const grade9Average = useMemo(
    () => averageGrade(subjectResults.results.map((r) => r.grade9)),
    [subjectResults.results],
  )

  const universityAnalysis = useMemo(() => {
    if (masterRecords == null) {
      return {
        ready: false,
        message: '공식 입결 MASTER를 불러오는 중입니다.',
        studentGrade9: grade9Average,
        reach: [],
        ambitious: [],
        target: [],
      }
    }
    return recommendV124Universities({
      studentGrade9: grade9Average,
      records: masterRecords,
    })
  }, [grade9Average, masterRecords])

  const updateSubject = (id: string, patch: Partial<AdmissionSubjectInput>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    setShowGrade9(false)
  }

  const handleGradeYearChange = (gradeYear: HighSchoolGradeYear | '') => {
    setProfile((p) => ({ ...p, gradeYear }))
  }

  const addSubject = () => {
    setSubjects((prev) => [
      ...prev,
      {
        id: createSubjectId(),
        name: '',
        slot: 'extra',
        isPreset: false,
        ...emptySubjectFields(),
      },
    ])
  }

  const removeSubject = (id: string) => {
    setSubjects((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)))
    setShowGrade9(false)
  }

  const canConvertToGrade9 = subjectResults.results.length > 0

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6" data-page="admission-analysis">
      {!hidePageHeader ? (
        <div className="no-print">
          <PageHeader
            title="대입 내신 분석"
            description="석차·수강자수로 석차백분율과 5등급제 예상 등급을 계산하고, 9등급제 환산 참고값으로 상담에 활용합니다."
          />
        </div>
      ) : null}

      {/* 1. 학생 기본정보 */}
      <section className="no-print rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-[#163A70]">학생 기본정보</h3>
        <p className="mt-1 text-xs text-slate-500">
          1차 버전은 직접 입력입니다. 추후 학생관리와 연결할 수 있습니다.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">학생 이름</span>
            <input
              className={inputClass()}
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              placeholder="예: 홍길동"
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">학교</span>
            <input
              className={inputClass()}
              value={profile.school}
              onChange={(e) => setProfile((p) => ({ ...p, school: e.target.value }))}
              placeholder="예: ○○고등학교"
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">학년</span>
            <select
              className={inputClass()}
              value={profile.gradeYear}
              onChange={(e) =>
                handleGradeYearChange(e.target.value as HighSchoolGradeYear | '')
              }
            >
              <option value="">선택</option>
              {GRADE_YEARS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* 2. 과목별 석차 입력 */}
      <section className="no-print space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#163A70]">과목별 석차 입력</h3>
            <p className="mt-1 text-xs text-slate-500">
              국어·수학·영어·사회·과학은 2022 개정 교육과정 공통과목부터 선택과목까지
              공식 과목명에서 고릅니다.
            </p>
          </div>
          <button type="button" className={btnSecondary} onClick={addSubject}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" aria-hidden />
              과목 추가
            </span>
          </button>
        </div>

        <div className="space-y-3">
          {subjects.map((subject) => {
            const result = subjectResults.results.find((r) => r.subjectId === subject.id)
            const error = displayErrors[subject.id]
            const isPreset = Boolean(subject.isPreset)

            const cardTitle = presetCardTitle(subject.slot)

            return (
              <article
                key={subject.id}
                className="rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-4 shadow-sm"
                data-subject-id={subject.id}
                data-subject-slot={subject.slot ?? 'extra'}
                data-card-title={cardTitle ?? undefined}
              >
                {cardTitle ? (
                  <h4 className="mb-3 text-sm font-bold text-[#163A70]">{cardTitle}</h4>
                ) : null}
                <div className="flex flex-wrap items-start gap-3">
                  {subject.slot === 'english' ? (
                    <label className="block min-w-[12rem] flex-1 space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">영어 선택과목</span>
                      <EnglishSubjectSelect
                        id={`${formId}-name-${subject.id}`}
                        name={subject.name}
                        error={error && !subject.name.trim() ? error : undefined}
                        onChange={(name) => updateSubject(subject.id, { name })}
                      />
                    </label>
                  ) : subject.slot === 'korean' ? (
                    <label className="block min-w-[12rem] flex-1 space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">국어 선택과목</span>
                      <KoreanSubjectSelect
                        id={`${formId}-name-${subject.id}`}
                        name={subject.name}
                        error={error && !subject.name.trim() ? error : undefined}
                        onChange={(name) => updateSubject(subject.id, { name })}
                      />
                    </label>
                  ) : subject.slot === 'math' ? (
                    <label className="block min-w-[12rem] flex-1 space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">수학 선택과목</span>
                      <MathSubjectSelect
                        id={`${formId}-name-${subject.id}`}
                        name={subject.name}
                        error={error && !subject.name.trim() ? error : undefined}
                        onChange={(name) => updateSubject(subject.id, { name })}
                      />
                    </label>
                  ) : subject.slot === 'inquiry1' ? (
                    <label className="block min-w-[12rem] flex-1 space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">사회 선택과목</span>
                      <SocialSubjectSelect
                        id={`${formId}-name-${subject.id}`}
                        name={subject.name}
                        error={error && !subject.name.trim() ? error : undefined}
                        onChange={(name) => updateSubject(subject.id, { name })}
                      />
                    </label>
                  ) : subject.slot === 'inquiry2' ? (
                    <label className="block min-w-[12rem] flex-1 space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">과학 선택과목</span>
                      <ScienceSubjectSelect
                        id={`${formId}-name-${subject.id}`}
                        name={subject.name}
                        error={error && !subject.name.trim() ? error : undefined}
                        onChange={(name) => updateSubject(subject.id, { name })}
                      />
                    </label>
                  ) : (
                    <label className="block min-w-[12rem] flex-1 space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">
                        {subjectSlotLabel(subject.slot)}
                      </span>
                      <ExtraOfficialSubjectSelect
                        id={`${formId}-name-${subject.id}`}
                        name={subject.name}
                        error={error && !subject.name.trim() ? error : undefined}
                        onChange={(name) => updateSubject(subject.id, { name })}
                      />
                    </label>
                  )}
                  <div className="flex flex-1 flex-wrap items-end gap-2">
                    <label className="block min-w-[5.5rem] flex-1 space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">석차</span>
                      <input
                        inputMode="numeric"
                        className={inputClass(error)}
                        value={subject.rank ?? ''}
                        onChange={(e) =>
                          updateSubject(subject.id, { rank: parseOptionalInt(e.target.value) })
                        }
                        placeholder="예: 33"
                        aria-label={`${subject.name || subjectSlotLabel(subject.slot)} 석차`}
                      />
                    </label>
                    <span className="pb-2.5 text-sm text-slate-500">등 /</span>
                    <label className="block min-w-[5.5rem] flex-1 space-y-1.5">
                      <span className="text-sm font-medium text-slate-700">수강자수</span>
                      <input
                        inputMode="numeric"
                        className={inputClass(error)}
                        value={subject.totalStudents ?? ''}
                        onChange={(e) =>
                          updateSubject(subject.id, {
                            totalStudents: parseOptionalInt(e.target.value),
                          })
                        }
                        placeholder="예: 255"
                        aria-label={`${subject.name || subjectSlotLabel(subject.slot)} 수강자수`}
                      />
                    </label>
                    <span className="pb-2.5 text-sm text-slate-500">명</span>
                  </div>
                  {!isPreset ? (
                    <button
                      type="button"
                      className="mt-6 rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-rose-600"
                      onClick={() => removeSubject(subject.id)}
                      aria-label="과목 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                {error ? (
                  <p className="mt-3 text-sm text-rose-600" role="alert">
                    {error}
                  </p>
                ) : null}

                {result ? (
                  <div className="mt-3 rounded-xl bg-[rgba(40,199,183,0.08)] px-3 py-2.5 text-sm text-[#163A70]">
                    <p className="font-semibold">
                      {result.subjectName}{' '}
                      <span className="font-normal text-slate-600">
                        {result.rank}등 / {result.totalStudents}명
                      </span>
                    </p>
                    <p className="mt-1">
                      석차백분율{' '}
                      <span className="font-semibold">{formatPercentile(result.percentile)}%</span>
                    </p>
                    <p className="mt-0.5">
                      5등급제 예상 등급{' '}
                      <span className="font-semibold">{result.grade5}등급</span>
                    </p>
                  </div>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>

      {/* 8. 전체 5등급 예상 내신 */}
      <section className="no-print rounded-2xl border border-[rgba(22,58,112,0.14)] bg-gradient-to-br from-white to-[rgba(40,199,183,0.06)] p-5 shadow-sm">
        <h3 className="text-lg font-bold text-[#163A70]">5등급제 예상 내신</h3>
        {grade5Average !== null ? (
          <>
            <p className="mt-3 text-3xl font-black tracking-tight text-[#163A70]">
              예상 내신 {formatGradeAverage(grade5Average)}등급
            </p>
            <p className="mt-2 text-sm text-slate-600">
              단순 평균 (
              {subjectResults.results.map((r) => `${r.subjectName} ${r.grade5}`).join(' · ')})
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            유효한 과목 석차를 입력하면 예상 내신이 표시됩니다.
          </p>
        )}
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          ※ 석차와 수강자수를 이용한 상담용 예상값이며 실제 학교생활기록부 및 대학별 내신 산출
          방식과 다를 수 있습니다.
        </p>
      </section>

      <div className="no-print space-y-3">
        <button
          type="button"
          className={`${btnPrimary} w-full`}
          disabled={!canConvertToGrade9}
          onClick={() => {
            setShowGrade9(true)
          }}
        >
          9등급 기준으로 환산
        </button>

        {showGrade9 && canConvertToGrade9 ? (
          <section className="rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-[#163A70]">9등급제 환산 참고값</h3>
            <p className="mt-1 text-xs text-amber-800/90">
              9등급제 환산 참고 분석 · 석차백분율 기반 (5등급 숫자를 단순 변환하지 않음)
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3 font-medium">과목</th>
                    <th className="py-2 pr-3 font-medium">석차백분율</th>
                    <th className="py-2 pr-3 font-medium">5등급 예상</th>
                    <th className="py-2 font-medium">9등급 환산</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectResults.results.map((r) => (
                    <tr key={r.subjectId} className="border-b border-slate-100 text-[#163A70]">
                      <td className="py-2.5 pr-3 font-medium">{r.subjectName}</td>
                      <td className="py-2.5 pr-3">{formatPercentile(r.percentile)}%</td>
                      <td className="py-2.5 pr-3">{r.grade5}등급</td>
                      <td className="py-2.5 font-semibold">{r.grade9}등급</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xl font-bold text-[#163A70]">
              9등급제 환산 평균 {formatGradeAverage(grade9Average)}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              ※ 이 값은 기존 9등급제 대학 입시결과와 비교하기 위한 석차백분율 기반 참고값이며
              특정 대학의 공식 환산등급이 아닙니다.
            </p>
          </section>
        ) : null}
      </div>

      {showGrade9 && canConvertToGrade9 ? (
        <V124RecommendationPanel
          profile={profile}
          grade5Average={grade5Average}
          grade9Average={grade9Average}
          analysis={universityAnalysis}
        />
      ) : null}
    </div>
  )
}
