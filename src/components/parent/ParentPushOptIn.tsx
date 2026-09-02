import { useEffect, useState } from 'react'
import { getParentPushUiState, subscribeParentPush } from '../../lib/parentPushClient'
import { getVapidPublicKey } from '../../lib/parentPushSupport'

type Props = {
  accessKey: string
  placement?: 'page' | 'sidebar'
}

export function ParentPushOptIn({ accessKey, placement = 'page' }: Props) {
  const [statusLabel, setStatusLabel] = useState('알림 꺼짐')
  const [hint, setHint] = useState('')
  const [busy, setBusy] = useState(false)
  const [canRequest, setCanRequest] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getParentPushUiState(accessKey).then((state) => {
      if (cancelled) return
      if (!getVapidPublicKey()) {
        setStatusLabel('알림 꺼짐')
        setHint('알림 설정이 아직 준비되지 않았습니다.')
        setCanRequest(false)
        return
      }
      if (!state.capability.supported) {
        setStatusLabel('알림 꺼짐')
        setCanRequest(false)
        setHint(
          state.capability.reason === 'ios-install-required'
            ? '아이폰·아이패드에서는 홈 화면에 추가한 앱에서만 학습보고 알림을 받을 수 있습니다.'
            : '이 브라우저에서는 푸시 알림을 지원하지 않습니다.',
        )
        return
      }
      if (state.permission === 'denied') {
        setStatusLabel('알림 꺼짐')
        setCanRequest(false)
        setHint('알림이 차단되어 있습니다. 브라우저 설정에서 허용한 뒤 다시 시도해 주세요.')
        return
      }
      if (state.subscribed && state.permission === 'granted') {
        setStatusLabel('알림 켜짐')
        setHint('')
        setCanRequest(false)
        return
      }
      setStatusLabel('알림 꺼짐')
      setHint('')
      setCanRequest(true)
    })
    return () => {
      cancelled = true
    }
  }, [accessKey])

  const handleSubscribe = async () => {
    setBusy(true)
    setHint('')
    try {
      await subscribeParentPush(accessKey)
      setStatusLabel('알림 켜짐')
      setCanRequest(false)
    } catch (error) {
      setHint(error instanceof Error ? error.message : '알림 등록에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  const wrapperClass =
    placement === 'sidebar'
      ? 'shrink-0 border-t border-[rgba(22,58,112,0.06)] px-3 py-3 sm:px-4'
      : 'pm-card mt-3 px-3 py-2.5'

  return (
    <section className={wrapperClass} data-parent-push-opt-in="true">
      <p className="text-[11px] font-semibold tracking-wide text-[#6B7280]">알림 설정</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#163A70]">{statusLabel}</p>
        {canRequest ? (
          <button
            type="button"
            className="pm-btn-secondary min-h-9 px-3 text-xs"
            disabled={busy}
            onClick={() => void handleSubscribe()}
          >
            {busy ? '등록 중…' : '알림 받기'}
          </button>
        ) : null}
      </div>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-[#6B7280]">{hint}</p> : null}
    </section>
  )
}
