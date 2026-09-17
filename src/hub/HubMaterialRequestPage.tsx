import { HubInboxThread } from './HubInboxThread'

export function HubMaterialRequestPage() {
  return (
    <HubInboxThread
      kind="material_request"
      title="자료 요청실"
      placeholder="예: 이차함수 최고난도 문제 더 주세요."
      submitLabel="요청 보내기"
      emptyMessage="보낸 자료 요청이 없습니다."
      allowImages
    />
  )
}
