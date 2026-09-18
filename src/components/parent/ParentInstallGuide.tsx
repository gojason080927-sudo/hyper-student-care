import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useIsStandalone } from '../../hooks/useIsStandalone'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { resolveHubInstallGuide, type HubInstallGuideKind } from '../../hub/hubInstallEnv'

export const PARENT_INSTALL_DISMISS_KEY = 'hyper-parent-pwa-install-dismissed'

const COPY: Record<
  Exclude<HubInstallGuideKind, 'hidden'>,
  { title: string; body: string; action?: string }
> = {
  'in-app': {
    title: 'HYPER 학부모 앱 설치',
    body: '지금 화면(카카오 등 앱 안 브라우저)에서는 설치하거나 알림을 받을 수 없습니다. 오른쪽 위 ⋮ 메뉴에서 Chrome 또는 Safari로 연 다음 다시 들어와 주세요.',
  },
  'android-install': {
    title: '홈 화면에 학부모 앱 넣기',
    body: '설치하면 홈 화면에서 같은 자녀 화면을 바로 열 수 있습니다.',
    action: '학부모 앱 설치',
  },
  'android-menu': {
    title: '홈 화면에 학부모 앱 넣기',
    body: '오른쪽 위 ⋮ 메뉴에서 「앱 설치」를 선택하세요. 「홈 화면에 추가」는 바로가기라서 아이콘이 달라질 수 있습니다.',
  },
  'ios-safari': {
    title: '홈 화면에 추가',
    body: '아래 공유 버튼을 누른 뒤 「홈 화면에 추가」를 선택하세요.',
  },
  'ios-safari-needed': {
    title: 'Safari에서 홈 화면에 추가',
    body: 'Safari로 이 페이지를 연 다음, 공유 → 홈 화면에 추가를 선택하세요.',
  },
}

export function ParentInstallGuide() {
  const isStandalone = useIsStandalone()
  const { canInstall, installed, install } = usePwaInstall()
  const [dismissed, setDismissed] = useState(true)
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const kind = resolveHubInstallGuide({
    userAgent,
    standalone: isStandalone || installed,
    canInstall,
  })

  useEffect(() => {
    setDismissed(localStorage.getItem(PARENT_INSTALL_DISMISS_KEY) === '1')
  }, [])

  useEffect(() => {
    if (!installed) return
    localStorage.setItem(PARENT_INSTALL_DISMISS_KEY, '1')
    setDismissed(true)
  }, [installed])

  if (kind === 'hidden' || dismissed) return null

  const copy = COPY[kind]
  const dismiss = () => {
    localStorage.setItem(PARENT_INSTALL_DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <section className="hub-install-card" data-parent-install-guide={kind}>
      <div className="hub-install-row">
        <div>
          <p className="hub-install-title">{copy.title}</p>
          <p className="hub-install-body">{copy.body}</p>
        </div>
        <button type="button" className="hub-install-close" onClick={dismiss} aria-label="닫기">
          <X className="h-4 w-4" />
        </button>
      </div>
      {copy.action ? (
        <button type="button" className="hub-install-btn" onClick={() => void install()}>
          {copy.action}
        </button>
      ) : null}
    </section>
  )
}
