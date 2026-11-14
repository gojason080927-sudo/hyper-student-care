import { useIsStandalone } from '../../hooks/useIsStandalone'
import { isAndroidChrome, isIosSafari, usePwaInstall } from '../../hooks/usePwaInstall'

export function ParentPwaInstallHint() {
  const isStandalone = useIsStandalone()
  const { canInstall, installed, install } = usePwaInstall()

  if (isStandalone || installed) return null

  if (canInstall) {
    return (
      <section className="pm-card mt-3 px-3 py-2.5" data-parent-pwa-install="prompt">
        <p className="text-xs leading-relaxed text-[#4B5563]">
          HYPER Student Care를 홈 화면에 설치하면 카카오톡 없이 바로 확인할 수 있습니다.
        </p>
        <button
          type="button"
          className="pm-btn-secondary mt-2 min-h-9 w-full text-xs"
          onClick={() => void install()}
        >
          앱 설치하기
        </button>
      </section>
    )
  }

  if (isIosSafari()) {
    return (
      <section className="pm-card mt-3 px-3 py-2.5" data-parent-pwa-install="ios">
        <p className="text-xs leading-relaxed text-[#4B5563]">
          HYPER Student Care를 홈 화면에 설치하면 카카오톡 없이 바로 확인할 수 있습니다.
          Safari 하단 <strong>공유</strong> → <strong>홈 화면에 추가</strong>를 선택하세요.
        </p>
      </section>
    )
  }

  if (isAndroidChrome()) {
    return (
      <section className="pm-card mt-3 px-3 py-2.5" data-parent-pwa-install="android">
        <p className="text-xs leading-relaxed text-[#4B5563]">
          HYPER Student Care를 홈 화면에 설치하면 카카오톡 없이 바로 확인할 수 있습니다.
          Chrome 메뉴 → <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를
          선택하세요.
        </p>
      </section>
    )
  }

  return null
}
