import { Navigate } from 'react-router-dom'
import { ParentPwaRegistrar } from '../../components/parent/ParentPwaRegistrar'
import { parentCareHomePath, readLastParentAccessKey } from '../../lib/parentLastCareRoute'

export function ParentCareLaunchPage() {
  const lastKey = readLastParentAccessKey()
  if (lastKey) {
    return <Navigate to={parentCareHomePath(lastKey)} replace />
  }

  return (
    <div className="parent-mobile-app flex min-h-svh items-center justify-center px-4">
      <ParentPwaRegistrar />
      <div className="pm-error-card max-w-sm p-8 text-center">
        <h1 className="text-xl font-bold text-[#163A70]">HYPER Student Care</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#6B7280]">
          학원에서 받은 학생 링크로 접속해 주세요. 한 번 연 뒤에는 홈 화면 앱에서 다시 열 수
          있습니다.
        </p>
      </div>
    </div>
  )
}
