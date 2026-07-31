import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useIsStandalone } from '../../hooks/useIsStandalone'
import { isAndroidChrome, isIosSafari, usePwaInstall } from '../../hooks/usePwaInstall'

const DISMISS_KEY = 'hyper-teacher-pwa-install-dismissed'

export function PwaInstallPrompt() {
  const isStandalone = useIsStandalone()
  const { canInstall, installed, install } = usePwaInstall()
  const [dismissed, setDismissed] = useState(true)
  const [justInstalled, setJustInstalled] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  useEffect(() => {
    if (installed) {
      setJustInstalled(true)
      localStorage.setItem(DISMISS_KEY, '1')
      setDismissed(true)
    }
  }, [installed])

  if (isStandalone || dismissed || justInstalled) return null

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  if (canInstall) {
    return (
      <div className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 rounded-xl border border-navy-200 bg-white p-4 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-navy-900">HYPER TEACHER 설치</p>
            <p className="mt-1 text-xs text-slate-600">
              공식 앱 설치를 진행하면 홈 화면 또는 앱 서랍에서 독립 앱으로 실행할 수 있습니다.
            </p>
          </div>
          <button type="button" onClick={dismiss} aria-label="닫기" className="text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => void install()}
          className="mt-3 w-full min-h-11 rounded-xl bg-navy-800 text-sm font-semibold text-white"
        >
          HYPER TEACHER 설치
        </button>
      </div>
    )
  }

  if (isIosSafari()) {
    return (
      <div className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 rounded-xl border border-navy-200 bg-white p-4 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-navy-900">홈 화면에 추가</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Safari 하단 <strong>공유</strong> 버튼 → <strong>홈 화면에 추가</strong>를
              선택하세요.
            </p>
          </div>
          <button type="button" onClick={dismiss} aria-label="닫기" className="text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  if (isAndroidChrome()) {
    return (
      <div className="fixed inset-x-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 rounded-xl border border-navy-200 bg-white p-4 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-navy-900">HYPER TEACHER 앱 설치</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Chrome 우측 상단 <strong>⋮</strong> 메뉴 → <strong>앱 설치</strong> 또는{' '}
              <strong>홈 화면에 추가</strong>를 선택하세요. Chrome 새 탭의 사이트 바로가기는
              독립 앱이 아닙니다.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              설치 후 앱 서랍에만 보이는 기기는 아이콘을 길게 눌러 홈 화면으로 옮길 수 있습니다.
            </p>
          </div>
          <button type="button" onClick={dismiss} aria-label="닫기" className="text-slate-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  return null
}

export function RememberLoginCheckbox({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 active:bg-slate-100">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-slate-300 accent-navy-800"
      />
      <span className="text-sm font-medium text-slate-700">로그인 상태 유지</span>
    </label>
  )
}
