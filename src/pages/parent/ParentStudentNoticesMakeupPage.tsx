import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ParentPageHeader,
  ParentSegmentTabs,
} from '../../components/parent/ParentStudentComponents'
import { useMarkParentCategoryReadOnView } from '../../hooks/useMarkParentCategoryReadOnView'
import { LearningNoticesPage } from '../LearningNoticesPage'
import { ParentStudentMakeupPlanPage } from './ParentStudentMakeupPlanPage'

type NoticesMakeupTab = 'notices' | 'makeup'

function parseTab(value: string | null): NoticesMakeupTab {
  return value === 'makeup' ? 'makeup' : 'notices'
}

/** 구 경로(/makeup-plans, /learning-notices)를 통합 화면으로 보낸다. */
export function ParentCareNoticesMakeupRedirect({ tab }: { tab?: NoticesMakeupTab }) {
  const { studentAccessKey } = useParams()
  const search = tab === 'makeup' ? '?tab=makeup' : ''
  return <Navigate to={`/care/${studentAccessKey}/notices-makeup${search}`} replace />
}

export function ParentStudentNoticesMakeupPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = parseTab(searchParams.get('tab'))

  useMarkParentCategoryReadOnView('learning-notices')
  useMarkParentCategoryReadOnView('makeup-plans')

  return (
    <div className="parent-page space-y-5 pb-6">
      <ParentPageHeader
        title="공지사항 · 보강계획"
        description="학원 공지와 보강 일정을 확인합니다."
      />

      <ParentSegmentTabs
        value={tab}
        onChange={(next) => {
          if (next === 'makeup') setSearchParams({ tab: 'makeup' }, { replace: true })
          else setSearchParams({}, { replace: true })
        }}
        items={[
          { id: 'notices', label: '공지사항' },
          { id: 'makeup', label: '보강계획' },
        ]}
      />

      {tab === 'notices' ? (
        <LearningNoticesPage embedded />
      ) : (
        <ParentStudentMakeupPlanPage embedded />
      )}
    </div>
  )
}
