import { HubInboxThread } from './HubInboxThread'
import { useHub } from './HubContext'

export function HubSuggestionsPage() {
  const { student } = useHub()
  return (
    <HubInboxThread
      kind="suggestion"
      title="건의사항"
      placeholder="바라는 점, 불편사항, 개선·시정 요청"
      submitLabel="건의 보내기"
      emptyMessage="보낸 건의가 없습니다."
      namedNotice={`기명 접수입니다. 작성자 ${student.name} 학생이 학원에 전달됩니다. 다른 학생은 볼 수 없습니다.`}
    />
  )
}
