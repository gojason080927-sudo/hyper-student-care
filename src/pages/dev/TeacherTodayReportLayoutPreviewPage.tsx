import { useState } from 'react'
import { ArrowRight, ClipboardList, MessageCircle } from 'lucide-react'
import { ClassAttitudePicker } from '../../components/studentCare/ClassAttitudePicker'
import { TeacherMobileBottomNav } from '../../components/teacherMobile/TeacherMobileBottomNav'
import { TeacherMobileHeader } from '../../components/teacherMobile/TeacherMobileHeader'
import { HyperFeaturedCardWave } from '../../components/ui/HyperFeaturedCardWave'
import { AttendanceExcuseButtons } from '../../components/studentCare/AttendanceExcuseButtons'
import { SectionVoiceInput } from '../../components/todayReport/SectionVoiceInput'
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
            <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#163A70]">김하이퍼</p>
              <SectionVoiceInput
                label="출결 음성 입력"
                chipLabel="출결"
                compact
                explicitStop
                onApply={() => ({
                  appliedCount: 0,
                  excludedAbsentCount: 0,
                  needsReviewCount: 0,
                  needsReview: [],
                })}
              />
            </div>
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
            <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#163A70]">김하이퍼</p>
              <SectionVoiceInput
                label="수학 개념 숙제 음성 입력"
                chipLabel="숙제"
                compact
                explicitStop
                onApply={() => ({
                  appliedCount: 0,
                  excludedAbsentCount: 0,
                  needsReviewCount: 0,
                  needsReview: [],
                })}
              />
            </div>
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

          <section className="tm-card px-3 py-3" data-preview-block="assignment">
            <h2 className="mb-2 text-sm font-bold text-[#163A70]">반 공통 오늘 과제</h2>
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="text-xs font-bold text-[#163A70]">수학 개념</p>
              <SectionVoiceInput
                label="수학 개념 오늘 과제 음성 입력"
                chipLabel="과제"
                compact
                explicitStop
                onApply={() => ({
                  appliedCount: 0,
                  excludedAbsentCount: 0,
                  needsReviewCount: 0,
                  needsReview: [],
                })}
              />
            </div>
            <div className="mt-1.5 min-h-[2.5rem] w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800">
              77페이지에서 80페이지
            </div>
          </section>

          <section className="tm-card px-3 py-3" data-preview-block="absent-excluded">
            <h2 className="mb-2 text-sm font-bold text-[#163A70]">교재 준비</h2>
            <div className="mb-1.5 flex min-w-0 flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                <p className="min-w-0 text-sm font-bold text-[#163A70]">김민재</p>
                <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  결석 · 입력 제외
                </span>
              </div>
              <SectionVoiceInput
                label="교재 준비 음성 입력"
                chipLabel="교재"
                compact
                explicitStop
                onApply={() => ({
                  appliedCount: 0,
                  excludedAbsentCount: 0,
                  needsReviewCount: 0,
                  needsReview: [],
                })}
              />
            </div>
            <p className="text-[11px] leading-5 text-slate-500">
              결석으로 저장되어 이 날짜의 수업 참여 항목에서 제외됩니다.
            </p>
            <button type="button" className="tm-btn-primary mt-2 w-full min-h-11 text-sm font-semibold">
              전체 교재 준비 저장
            </button>
          </section>

          <section className="tm-card px-3 py-3" data-preview-block="progress">
            <h2 className="mb-2 text-sm font-bold text-[#163A70]">반 공통 오늘의 진도</h2>
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="text-xs font-bold text-[#163A70]">수학 개념</p>
              <SectionVoiceInput
                label="수학 개념 진도 음성 입력"
                chipLabel="진도"
                compact
                explicitStop
                onApply={() => ({
                  appliedCount: 2,
                  excludedAbsentCount: 0,
                  needsReviewCount: 0,
                  needsReview: [],
                })}
              />
            </div>
            <label className="mb-0.5 mt-1.5 block text-[11px] font-semibold text-slate-600">현재 진도</label>
            <div className="min-h-[2.5rem] w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800">
              이차함수 최대최소
            </div>
            <div className="mt-1.5 grid min-w-0 grid-cols-2 gap-1.5">
              <div className="min-w-0">
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">현재 페이지</label>
                <div className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800">
                  35
                </div>
              </div>
              <div className="min-w-0">
                <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">전체 페이지</label>
                <div className="min-h-9 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800">
                  180
                </div>
              </div>
            </div>
          </section>

          <section className="tm-card px-3 py-3" data-preview-block="daily-test">
            <h2 className="mb-2 text-sm font-bold text-[#163A70]">일일테스트</h2>
            <p className="mb-1.5 text-xs font-semibold text-slate-700">시험명</p>
            <div className="mb-2 min-h-10 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800">
              9월 14일 일일테스트
            </div>
            <p className="mb-1.5 text-xs font-semibold text-slate-700">과목</p>
            <div className="mb-2 min-h-10 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-800">
              수학
            </div>
            <div className="mb-1.5 flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
              <p className="min-w-0 text-sm font-bold text-[#163A70]">류정현</p>
              <div className="ml-auto shrink-0">
                <SectionVoiceInput
                  label="류정현 일일테스트 음성 입력"
                  chipLabel="음성입력"
                  compact
                  hideStatus
                  explicitStop
                  forceVoiceTransport="recorded-stt"
                  onApply={() => ({
                    appliedCount: 3,
                    excludedAbsentCount: 0,
                    needsReviewCount: 0,
                    needsReview: [],
                  })}
                />
              </div>
            </div>
            <p
              data-voice-listening-hint=""
              className="mt-1 w-full min-w-0 max-w-full whitespace-normal break-words text-[11px] leading-4 text-rose-800 [overflow-wrap:anywhere]"
            >
              🔴 듣는 중 · 다 말한 뒤 종료를 누르세요
            </p>
            <p
              data-voice-transcribing="true"
              className="mt-1 w-full min-w-0 max-w-full whitespace-normal break-words text-[11px] leading-4 text-rose-800 [overflow-wrap:anywhere]"
            >
              음성 변환 중...
            </p>
            <p
              data-voice-error="true"
              className="mt-1 w-full min-w-0 max-w-full whitespace-normal break-words text-[11px] leading-4 text-amber-800 [overflow-wrap:anywhere]"
            >
              음성 변환에 실패했습니다. 다시 시도하거나 텍스트 입력을 이용해 주세요.
            </p>
            <p
              data-voice-summary="true"
              className="mb-1 w-full min-w-0 max-w-full whitespace-normal break-words text-[11px] leading-4 text-slate-600 [overflow-wrap:anywhere]"
            >
              음성 내용 반영 완료
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex min-w-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/50 px-1.5 py-1">
                <span className="w-7 shrink-0 text-[11px] font-semibold text-slate-600">1차</span>
                <span className="min-h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-center text-sm text-slate-800">
                  80
                </span>
                <span className="inline-flex min-h-7 min-w-[2.8rem] items-center justify-center rounded-md border border-rose-500 bg-rose-50 text-[10px] font-semibold text-rose-800">
                  불합격
                </span>
              </div>
              <div className="flex min-w-0 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/50 px-1.5 py-1">
                <span className="w-7 shrink-0 text-[11px] font-semibold text-slate-600">2차</span>
                <span className="min-h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-center text-sm text-slate-800">
                  95
                </span>
                <span className="inline-flex min-h-7 min-w-[2.8rem] items-center justify-center rounded-md border border-emerald-500 bg-emerald-50 text-[10px] font-semibold text-emerald-800">
                  합격
                </span>
              </div>
              {['3차', '4차'].map((label) => (
                <div
                  key={label}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/50 px-1.5 py-1"
                >
                  <span className="w-7 shrink-0 text-[11px] font-semibold text-slate-600">{label}</span>
                  <span className="min-h-7 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-center text-sm text-slate-400">
                    점수
                  </span>
                  <span className="inline-flex min-h-7 min-w-[2.8rem] items-center justify-center rounded-md border border-slate-200 bg-white text-[10px] font-semibold text-slate-400" />
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-700">오답 분석</p>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {['개념 부족', '계산 실수', '응용 능력 부족'].map((label) => (
                <div key={label}>
                  <p className="mb-1 text-[11px] font-semibold text-slate-600">{label}</p>
                  <div className="min-h-9 rounded-lg border border-slate-200 bg-white" />
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-700">강사의 피드백</p>
            <div className="mt-1 min-h-[5.5rem] w-full min-w-0 max-w-full whitespace-pre-wrap break-all rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 [overflow-wrap:anywhere]">
              2차 함수에 대한 이해가 늦는 거 같다
            </div>
            <button type="button" className="tm-btn-primary mt-2 w-full min-h-11 text-sm font-semibold">
              일일테스트 전체 저장
            </button>
          </section>

          <section className="tm-card px-3 py-3" data-preview-block="attitude">
            <h2 className="mb-2 text-sm font-bold text-[#163A70]">수업태도</h2>
            <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
              <p className="min-w-0 text-sm font-bold text-[#163A70]">김하이퍼</p>
              <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1">
                <SectionVoiceInput
                  label="수업태도 음성 입력"
                  chipLabel="태도"
                  compact
                  explicitStop
                  hideStatus
                  onApply={() => ({
                    appliedCount: 0,
                    excludedAbsentCount: 0,
                    needsReviewCount: 0,
                    needsReview: [],
                  })}
                />
                <button
                  type="button"
                  className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
                >
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  카카오
                </button>
              </div>
            </div>
            <ClassAttitudePicker
              issues={issues}
              note={note}
              hideNote
              onIssuesChange={setIssues}
              onNoteChange={setNote}
              compact
            />
            <div data-attitude-comment="true" className="mt-1.5 min-w-0">
              <div className="mb-0.5 flex min-w-0 items-center justify-between gap-1">
                <label className="block text-xs font-semibold text-slate-600">강사의 의견</label>
                <SectionVoiceInput
                  label="김하이퍼 강사의 의견 음성 입력"
                  chipLabel="의견"
                  compact
                  hideStatus
                  explicitStop
                  onApply={() => ({
                    appliedCount: 1,
                    excludedAbsentCount: 0,
                    needsReviewCount: 0,
                    needsReview: [],
                  })}
                />
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                rows={2}
                placeholder="오늘 수업에서 확인한 의견을 입력"
                className="w-full min-w-0 max-w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800"
              />
            </div>
            <div className="mt-3 border-t border-[rgba(22,58,112,0.06)] pt-2.5" data-absent-excluded="true">
              <div className="mb-1 flex min-w-0 flex-wrap items-center gap-1.5">
                <p className="min-w-0 text-sm font-bold text-[#163A70]">김민재</p>
                <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  결석 · 입력 제외
                </span>
              </div>
              <p className="text-[11px] leading-5 text-slate-500">
                결석으로 저장되어 이 날짜의 수업 참여 항목에서 제외됩니다.
              </p>
            </div>
            <button type="button" className="tm-btn-primary mt-2 w-full min-h-11 text-sm font-semibold">
              수업태도 일괄 저장
            </button>
          </section>
        </section>
      </main>
      <TeacherMobileBottomNav />
    </div>
  )
}
