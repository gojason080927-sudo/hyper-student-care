import { HubProvider } from '../../hub/HubContext'
import { HubHomePage } from '../../hub/HubHomePage'
import type { StudentHubBundle } from '../../hub/hubRpc'
import '../../hub/hub.css'

const longBundle: StudentHubBundle = {
  student: {
    id: 'preview-student',
    name: '김하이퍼영수긴이름테스트학생',
    school: '서울특별시립하이퍼국제중학교',
    grade: '중3',
    className: '중3-수학심화A반',
    accessKeyActive: true,
  },
  inactive: false,
  weeklyLearningSummaries: [],
  assignments: [],
  materials: [],
  videos: [],
  questions: [],
  inbox: [],
  classScheduleGrids: [],
  notices: [],
}

/** 개발 전용: Student Hub HOME 프리미엄 레이아웃 확인 */
export function HubHomeLayoutPreviewPage() {
  return (
    <HubProvider accessKey="preview-key" bundle={longBundle} reload={async () => {}}>
      <div className="student-hub-app min-h-svh">
        <HubHomePage />
      </div>
    </HubProvider>
  )
}
