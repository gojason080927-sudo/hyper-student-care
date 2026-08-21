import { useNavigate } from 'react-router-dom'
import {
  BookOpenCheck,
  ChevronRight,
  ClipboardList,
  ClipboardPen,
  FileBarChart2,
  FileStack,
  FolderOpen,
} from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'

/** 신입생 평가 메인 메뉴 — Phase 4 「종합진단 REPORT」 포함 */
const MENUS = [
  {
    path: '/entrance-exam/questions',
    title: '문제은행',
    description: '수학·영어 객관식 문제 등록 및 시험지 생성·저장',
    icon: BookOpenCheck,
    iconWrap: 'bg-[rgba(40,199,183,0.14)] text-[#0F766E]',
  },
  {
    path: '/entrance-exam/attempts',
    title: '응시 결과 입력',
    description: '답안 입력 · 자동채점 · 평가영역 점수 · 결과 저장',
    icon: ClipboardPen,
    iconWrap: 'bg-[rgba(22,58,112,0.08)] text-[#163A70]',
  },
  {
    path: '/entrance-exam/survey',
    title: '학습성향 설문',
    description: '24문항 Likert 설문 · 영역 점수 · 저장/재조회',
    icon: ClipboardList,
    iconWrap: 'bg-[rgba(40,199,183,0.14)] text-[#0F766E]',
  },
  {
    path: '/entrance-exam/results',
    title: '저장된 평가 결과',
    description: '입학테스트·학습성향 저장 현황 확인',
    icon: FolderOpen,
    iconWrap: 'bg-[rgba(22,58,112,0.08)] text-[#163A70]',
  },
  {
    path: '/entrance-exam/report',
    title: '종합진단 REPORT',
    description: '입학테스트·학습성향 통합 조회 및 규칙 기반 종합 학습진단',
    icon: FileBarChart2,
    iconWrap: 'bg-[rgba(40,199,183,0.14)] text-[#0F766E]',
  },
  {
    path: '/entrance-exam/integrated',
    title: '통합 종합진단 REPORT',
    description: '수학·영어 입학테스트와 학습성향 결과를 하나의 REPORT로 통합',
    icon: FileStack,
    iconWrap: 'bg-[rgba(22,58,112,0.08)] text-[#163A70]',
  },
] as const

/** 외부 AI API 문장 생성은 추후 Phase */
const UPCOMING = ['AI 평가 생성(외부 API)'] as const

export function EntranceExamHubPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6" data-page="entrance-exam-hub">
      <PageHeader
        title="신입생 평가"
        description="신입생 평가 전용 모듈입니다. 문제은행, 응시 결과, 학습성향 설문, 종합진단 REPORT를 사용할 수 있습니다."
      />

      <div className="space-y-3" data-testid="entrance-exam-menus">
        {MENUS.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.path}
              type="button"
              data-menu-path={item.path}
              onClick={() => navigate(item.path)}
              className="flex w-full items-center gap-4 rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white px-5 py-4 text-left shadow-sm transition hover:border-[#28C7B7]"
            >
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.iconWrap}`}
              >
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-[#163A70]">{item.title}</span>
                <span className="mt-0.5 block text-sm text-slate-500">{item.description}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden />
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-sm font-semibold text-slate-600">향후 단계</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-500">
          {UPCOMING.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
