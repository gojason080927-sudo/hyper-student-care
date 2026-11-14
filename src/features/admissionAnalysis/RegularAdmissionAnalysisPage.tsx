import { useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { inputClass } from '../../utils/labels'
import type { AdmissionStudentProfile, HighSchoolGradeYear } from './types'
import { RegularAdmissionPanel } from './components/RegularAdmissionPanel'

const GRADE_YEARS: HighSchoolGradeYear[] = ['고1', '고2', '고3']

type Props = {
  hidePageHeader?: boolean
}

export function RegularAdmissionAnalysisPage({ hidePageHeader = false }: Props) {
  const [profile, setProfile] = useState<AdmissionStudentProfile>({
    linkedStudentId: null,
    name: '',
    school: '',
    gradeYear: '',
  })

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6" data-page="regular-admission-analysis">
      {!hidePageHeader ? (
        <div className="no-print">
          <PageHeader
            title="정시 대입 분석"
            description="2022 개정 과목을 입력할 수 있습니다. 추천 비교는 기존 2025 정시 MASTER의 백분위·등급 구조로 계산합니다."
          />
        </div>
      ) : null}

      <section className="no-print rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white p-5 shadow-sm">
        <h3 className="text-base font-bold text-[#163A70]">학생 기본정보</h3>
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
                setProfile((p) => ({
                  ...p,
                  gradeYear: e.target.value as HighSchoolGradeYear | '',
                }))
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

      <RegularAdmissionPanel profile={profile} />
    </div>
  )
}
