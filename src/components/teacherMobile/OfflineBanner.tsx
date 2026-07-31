import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div
      className="sticky top-0 z-50 bg-rose-600 px-4 py-2 text-center text-sm font-semibold text-white"
      role="alert"
    >
      인터넷 연결을 확인해 주세요.
    </div>
  )
}
