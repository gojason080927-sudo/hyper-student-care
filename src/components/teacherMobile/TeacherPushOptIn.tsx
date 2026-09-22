import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getVapidPublicKey } from '../../lib/parentPushSupport'
import {
  ensureTeacherPushSubscription,
  getTeacherPushUiState,
  subscribeTeacherPush,
  teacherPushUserMessage,
} from '../../lib/teacherPushClient'
import {
  resolveTeacherPushOptInView,
  type TeacherPushOptInView,
} from '../../lib/teacherPushOptInView'

type Props = {
  placement?: 'page' | 'sidebar'
}

export function TeacherPushOptIn({ placement = 'page' }: Props) {
  const { session, isLoading } = useAuth()
  const [view, setView] = useState<TeacherPushOptInView>(() =>
    resolveTeacherPushOptInView({
      authLoading: true,
      hasSession: false,
      vapidReady: true,
      capabilitySupported: true,
      permission: null,
      phase: 'checking',
    }),
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const apply = (next: TeacherPushOptInView) => {
      if (!cancelled) setView(next)
    }

    if (isLoading) {
      apply(
        resolveTeacherPushOptInView({
          authLoading: true,
          hasSession: Boolean(session),
          vapidReady: true,
          capabilitySupported: true,
          permission: null,
          phase: 'checking',
        }),
      )
      return () => {
        cancelled = true
      }
    }

    if (!session) {
      apply(
        resolveTeacherPushOptInView({
          authLoading: false,
          hasSession: false,
          vapidReady: true,
          capabilitySupported: true,
          permission: null,
          phase: 'ready',
        }),
      )
      return () => {
        cancelled = true
      }
    }

    apply(
      resolveTeacherPushOptInView({
        authLoading: false,
        hasSession: true,
        vapidReady: true,
        capabilitySupported: true,
        permission: null,
        phase: 'checking',
      }),
    )

    void getTeacherPushUiState()
      .then((state) => {
        if (cancelled) return
        const vapidReady = Boolean(getVapidPublicKey())
        if (!vapidReady) {
          apply(
            resolveTeacherPushOptInView({
              authLoading: false,
              hasSession: true,
              vapidReady: false,
              capabilitySupported: state.capability.supported,
              capabilityReason: state.capability.reason,
              permission: state.permission,
              phase: 'ready',
            }),
          )
          return
        }
        if (!state.capability.supported) {
          apply(
            resolveTeacherPushOptInView({
              authLoading: false,
              hasSession: true,
              vapidReady: true,
              capabilitySupported: false,
              capabilityReason: state.capability.reason,
              permission: state.permission,
              phase: 'ready',
            }),
          )
          return
        }
        if (state.permission === 'denied') {
          apply(
            resolveTeacherPushOptInView({
              authLoading: false,
              hasSession: true,
              vapidReady: true,
              capabilitySupported: true,
              permission: 'denied',
              phase: 'ready',
            }),
          )
          return
        }
        if (state.permission === 'granted') {
          apply(
            resolveTeacherPushOptInView({
              authLoading: false,
              hasSession: true,
              vapidReady: true,
              capabilitySupported: true,
              permission: 'granted',
              phase: 'ensuring',
            }),
          )
          void ensureTeacherPushSubscription()
            .then(() => {
              apply(
                resolveTeacherPushOptInView({
                  authLoading: false,
                  hasSession: true,
                  vapidReady: true,
                  capabilitySupported: true,
                  permission: 'granted',
                  phase: 'ready',
                }),
              )
            })
            .catch((error) => {
              apply(
                resolveTeacherPushOptInView({
                  authLoading: false,
                  hasSession: true,
                  vapidReady: true,
                  capabilitySupported: true,
                  permission: 'granted',
                  phase: 'error',
                  errorMessage: teacherPushUserMessage(error),
                }),
              )
            })
          return
        }
        apply(
          resolveTeacherPushOptInView({
            authLoading: false,
            hasSession: true,
            vapidReady: true,
            capabilitySupported: true,
            permission: state.permission,
            phase: 'ready',
          }),
        )
      })
      .catch((error) => {
        apply(
          resolveTeacherPushOptInView({
            authLoading: false,
            hasSession: true,
            vapidReady: Boolean(getVapidPublicKey()),
            capabilitySupported: true,
            permission: 'default',
            phase: 'error',
            errorMessage: teacherPushUserMessage(error),
          }),
        )
      })

    return () => {
      cancelled = true
    }
  }, [session, isLoading])

  const handleSubscribe = async () => {
    setBusy(true)
    try {
      await subscribeTeacherPush()
      setView(
        resolveTeacherPushOptInView({
          authLoading: false,
          hasSession: true,
          vapidReady: true,
          capabilitySupported: true,
          permission: 'granted',
          phase: 'ready',
        }),
      )
    } catch (error) {
      setView(
        resolveTeacherPushOptInView({
          authLoading: false,
          hasSession: true,
          vapidReady: true,
          capabilitySupported: true,
          permission: 'default',
          phase: 'error',
          errorMessage: teacherPushUserMessage(error),
        }),
      )
    } finally {
      setBusy(false)
    }
  }

  const wrapperClass =
    placement === 'sidebar'
      ? 'shrink-0 border-t border-slate-100 px-4 py-3'
      : 'rounded-2xl bg-white px-3 py-2.5 shadow-sm'

  return (
    <section className={wrapperClass} data-teacher-push-opt-in="true">
      <p className="text-[11px] font-semibold tracking-wide text-[#6B7280]">알림 설정</p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#163A70]">{view.statusLabel}</p>
        {view.canRequest ? (
          <button
            type="button"
            className="min-h-9 rounded-xl bg-[#163A70] px-3 text-xs font-semibold text-white disabled:opacity-60"
            disabled={busy}
            onClick={() => void handleSubscribe()}
          >
            {busy ? '등록 중…' : '알림 받기'}
          </button>
        ) : null}
      </div>
      {view.hint ? <p className="mt-1.5 text-xs leading-relaxed text-[#6B7280]">{view.hint}</p> : null}
    </section>
  )
}
