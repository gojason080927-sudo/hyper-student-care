import { Navigate } from 'react-router-dom'
import { readLastHubAccessKey } from './hubSession'
import { HUB_ACADEMY_LOGO_PNG, HUB_ACADEMY_LOGO_WEBP } from './types'
import './hub.css'

export function HubLaunchPage() {
  const key = readLastHubAccessKey()
  if (key) return <Navigate to={`/hub/${key}`} replace />
  return (
    <div className="student-hub-app flex min-h-svh items-center justify-center px-4">
      <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        <picture>
          <source type="image/webp" srcSet={HUB_ACADEMY_LOGO_WEBP} />
          <img
            src={HUB_ACADEMY_LOGO_PNG}
            alt="HYPER ACADEMY"
            className="mx-auto h-20 w-20 object-contain"
            width={720}
            height={720}
          />
        </picture>
        <p className="mt-4 text-[11px] font-extrabold tracking-[0.18em] text-[#5b348a]">HYPER ACADEMY</p>
        <h1 className="mt-2 break-keep text-xl font-bold text-[#161b3a]">학생 학습 허브</h1>
        <p className="mt-3 break-keep text-sm leading-relaxed text-slate-500">
          학원에서 받은 학생 전용 링크로 들어와 주세요.
        </p>
      </div>
    </div>
  )
}
