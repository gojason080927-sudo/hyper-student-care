import { Navigate } from 'react-router-dom'
import { readLastHubAccessKey } from './hubSession'

export function HubLaunchPage() {
  const key = readLastHubAccessKey()
  if (key) return <Navigate to={`/hub/${key}`} replace />
  return (
    <div className="student-hub-app flex min-h-svh items-center justify-center px-4">
      <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-[#28c7b7]">HYPER ACADEMY</p>
        <h1 className="mt-2 break-keep text-xl font-bold text-[#163A70]">학생 학습 허브</h1>
        <p className="mt-3 break-keep text-sm leading-relaxed text-slate-500">
          학원에서 받은 학생 전용 링크로 들어와 주세요.
        </p>
      </div>
    </div>
  )
}
