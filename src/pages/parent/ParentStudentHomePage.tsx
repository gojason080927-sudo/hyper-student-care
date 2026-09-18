import { Menu } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { ParentCategoryGrid } from '../../components/parent/ParentCategoryGrid'
import { ParentPushOptIn } from '../../components/parent/ParentPushOptIn'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { HUB_ACADEMY_LOGO_PNG, HUB_ACADEMY_LOGO_WEBP } from '../../hub/types'
import '../../hub/hub.css'

type ParentHomeOutletContext = {
  openParentMenu?: () => void
}

export function ParentStudentHomePage() {
  const student = useParentStudent()
  const outlet = useOutletContext<ParentHomeOutletContext | null>()
  const openParentMenu = outlet?.openParentMenu
  const meta = [student.school, student.grade, student.className, student.teacher]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="student-hub-app parent-hub-home flex min-h-0 flex-1 flex-col">
      <div className="hub-home parent-home mx-auto w-full max-w-lg px-3 pb-10">
        <section className="hub-hero" aria-label="학생 정보">
          {openParentMenu ? (
            <button
              type="button"
              onClick={openParentMenu}
              className="parent-hub-menu lg:hidden"
              aria-label="메뉴 열기"
            >
              <Menu className="h-5 w-5" strokeWidth={2} />
            </button>
          ) : null}
          <div className="hub-hero-brand">
            <picture>
              <source type="image/webp" srcSet={HUB_ACADEMY_LOGO_WEBP} />
              <img
                src={HUB_ACADEMY_LOGO_PNG}
                alt="HYPER ACADEMY"
                className="hub-hero-logo"
                width={720}
                height={720}
                decoding="async"
              />
            </picture>
            <p className="hub-hero-kicker">HYPER ACADEMY</p>
            <h1 className="hub-hero-title">학부모 허브</h1>
          </div>
          <div className="hub-hero-identity">
            <p className="hub-hero-name">{student.name}</p>
            {meta ? <p className="hub-hero-meta">{meta}</p> : null}
          </div>
        </section>

        <ParentCategoryGrid />
        <ParentPushOptIn accessKey={student.studentAccessKey} />
      </div>
    </div>
  )
}
