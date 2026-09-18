import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useIsStandalone } from '../../hooks/useIsStandalone'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import {
  kakaoOpenExternalHref,
  parentCareHomeAbsoluteUrl,
  resolveParentInstallGuide,
  type ParentInstallGuideKind,
} from '../../lib/parentInstallGuide'

export const PARENT_INSTALL_DISMISS_KEY = 'hyper-parent-pwa-install-dismissed'

const COPY: Record<
  Exclude<ParentInstallGuideKind, 'hidden'>,
  { title: string; body: string; action?: string }
> = {
  'kakao-android': {
    title: 'HYPER 학부모 앱 설치',
    body: '카카오 안에서는 설치할 수 없습니다. 아래 버튼을 누르면 같은 자녀 화면이 Chrome에서 열립니다. 전환이 안 되면 화면 아래쪽 ⋮에서 「다른 브라우저로 열기」를 선택하세요.',
    action: 'Chrome에서 HYPER 학부모 앱 설치',
  },
  'kakao-ios': {
    title: 'Safari에서 홈 화면에 추가',
    body: '카카오 안에서는 홈 화면에 추가할 수 없습니다. 아래 버튼을 눌러 Safari로 연 다음, 공유 → 홈 화면에 추가를 선택하세요. 안 되면 화면 아래 공유에서 Safari를 선택하세요.',
    action: 'Safari로 열기',
  },
  'in-app': {
    title: 'HYPER 학부모 앱 설치',
    body: '앱 안 브라우저에서는 설치할 수 없습니다. 메뉴에서 Chrome 또는 Safari로 연 다음 다시 들어와 주세요.',
  },
  'android-install': {
    title: '홈 화면에 학부모 앱 넣기',
    body: '설치하면 홈 화면에서 같은 자녀 화면을 바로 열 수 있습니다.',
    action: 'HYPER 학부모 앱 설치',
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

export function ParentInstallGuide({ studentAccessKey = '' }: { studentAccessKey?: string }) {
  const isStandalone = useIsStandalone()
  const { canInstall, installed, install } = usePwaInstall()
  const [dismissed, setDismissed] = useState(true)
  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const kind = resolveParentInstallGuide({
    userAgent,
    standalone: isStandalone || installed,
    canInstall,
  })
  const kakaoHref = useMemo(() => {
    if (typeof window === 'undefined') return null
    if (kind !== 'kakao-android' && kind !== 'kakao-ios') return null
    const careUrl = parentCareHomeAbsoluteUrl(window.location.origin, studentAccessKey)
    if (!careUrl) return null
    return kakaoOpenExternalHref(careUrl, window.location.origin)
  }, [kind, studentAccessKey])

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
      {kind === 'android-install' && copy.action ? (
        <button type="button" className="hub-install-btn" onClick={() => void install()}>
          {copy.action}
        </button>
      ) : kakaoHref && copy.action ? (
        <a className="hub-install-btn" href={kakaoHref}>
          {copy.action}
        </a>
      ) : null}
    </section>
  )
}
