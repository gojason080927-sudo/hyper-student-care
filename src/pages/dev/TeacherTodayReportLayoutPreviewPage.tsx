import { useState } from 'react'
import { ArrowRight, ClipboardList } from 'lucide-react'
import { ClassAttitudePicker } from '../../components/studentCare/ClassAttitudePicker'
import { TeacherMobileBottomNav } from '../../components/teacherMobile/TeacherMobileBottomNav'
import { TeacherMobileHeader } from '../../components/teacherMobile/TeacherMobileHeader'
import { HyperFeaturedCardWave } from '../../components/ui/HyperFeaturedCardWave'
import { AttendanceExcuseButtons } from '../../components/studentCare/AttendanceExcuseButtons'
import type { ClassAttitudeIssue } from '../../types/records'
import '../../styles/teacherMobileTheme.css'

const SECTION_ORDER = [
  '출결',
  '숙제 수행 결과',
  '반 공통 오늘 과제',
  '교재 준비',
  '반 공통 오늘의 진도',
  '일일테스트',
  '수업태도',
] as const

/** 개발 전용: 강사 Today Report 모바일 입력동선 확인 */
export function TeacherTodayReportLayoutPreviewPage() {
  const [issues, setIssues] = useState<ClassAttitudeIssue[]>([])
  const [note, setNote] = useState('')
  const [lateExcuse, setLateExcuse] = useState<'인정' | '무단' | null>('무단')

  return (
    <div className="teacher-mobile-app min-h-svh overflow-x-hidden bg-[#F6F8FB]">
      <main className="flex flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        <section data-preview-section="home" className="px-4 pb-4 pt-3">
          <TeacherMobileHeader subtitle="preview@hyper" />
          <a className="tm-featured-card mt-3 block" href="#today-report-preview">
            <div className="tm-featured-card__body">
              <div className="flex items-center gap-3">
                <span className="tm-featured-icon">
                  <ClipboardList className="h-7 w-7" strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold leading-tight">Today Report 입력</p>
                  <p className="mt-0.5 text-[12px] leading-[1.35] text-white/85">
                    <span className="block break-keep">출결 · 숙제 · 교재준비</span>
                    <span className="block break-keep">진도 · 일일테스트 · 수업태도</span>
                  </p>
                </div>
                <span className="tm-featured-arrow" aria-hidden>
                  <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
                </span>
              </div>
            </div>
            <HyperFeaturedCardWave />
          </a>
        </section>

        <section
          id="today-report-preview"
          data-preview-section="today-report"
          className="tm-page-content space-y-3"
        >
          <p className="text-xs font-semibold text-[#6B7280]">강사 Today Report 입력 순서</p>
          <ol className="space-y-2" data-section-order="">
            {SECTION_ORDER.map((label) => (
              <li
                key={label}
                data-section-label={label}
                className="tm-card rounded-xl px-3 py-2.5 text-sm font-bold text-[#163A70]"
              >
                {label}
              </li>
            ))}
          </ol>

          <section className="tm-card px-3 py-3" data-preview-block="attendance">
            <h2 className="mb-2 text-sm font-bold text-[#163A70]">출결</h2>
            <p className="mb-2 text-sm font-bold text-[#163A70]">김하이퍼</p>
            <div className="flex flex-nowrap gap-1">
              {['출석', '지각', '결석', '조퇴'].map((status) => (
                <span
                  key={status}
                  className={`min-h-8 rounded-md px-2 py-1 text-xs font-semibold ${
                    status === '지각'
                      ? 'border border-amber-300 bg-amber-50 text-amber-900'
                      : 'border border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {status}
                </span>
              ))}
            </div>
            <div className="mt-2">
              <AttendanceExcuseButtons
                status="지각"
                excuseKind={lateExcuse}
                onChange={setLateExcuse}
                compact
              />
            </div>
          </section>

          <section className="tm-card px-3 py-3" data-preview-block="homework">
            <h2 className="mb-2 text-sm font-bold text-[#163A70]">숙제 수행 결과</h2>
            <p className="mb-2 text-sm font-bold text-[#163A70]">김하이퍼</p>
            <div className="flex flex-wrap gap-1.5">
              {['완료', '부분 완료'].map((status) => (
                <span
                  key={status}
                  className="min-h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-600"
                >
                  {status}
                </span>
              ))}
            </div>
          </section>

          <section className="tm-card px-3 py-3" data-preview-block="attitude">
            <h2 className="mb-2 text-sm font-bold text-[#163A70]">수업태도</h2>
            <p className="mb-2 text-sm font-bold text-[#163A70]">김하이퍼</p>
            <ClassAttitudePicker
              issues={issues}
              note={note}
              onIssuesChange={setIssues}
              onNoteChange={setNote}
              compact
            />
            <button type="button" className="tm-btn-primary mt-2 w-full min-h-11 text-sm font-semibold">
              수업태도 일괄 저장
            </button>
          </section>

          <section className="tm-card px-3 py-3" data-preview-block="absent-excluded">
            <h2 className="mb-2 text-sm font-bold text-[#163A70]">교재 준비</h2>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-bold text-[#163A70]">김민재</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                결석 · 입력 제외
              </span>
            </div>
            <p className="text-[11px] leading-5 text-slate-500">
              결석으로 저장되어 이 날짜의 수업 참여 항목에서 제외됩니다.
            </p>
          </section>
        </section>
      </main>
      <TeacherMobileBottomNav />
    </div>
  )
}
