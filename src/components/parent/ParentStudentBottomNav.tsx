import { NavLink, useLocation } from 'react-router-dom'

import {

  ClipboardList,

  FileBarChart2,

  Home,

  MessageCircleQuestion,

  MoreHorizontal,

} from 'lucide-react'

import { useParentStudent } from '../../contexts/ParentStudentContext'

import { useParentUnread } from '../../contexts/ParentUnreadContext'

import { ParentUnreadDot } from './ParentUnreadDot'

import type { ParentUnreadCategory } from '../../utils/parentUnread'



type ParentStudentBottomNavProps = {

  onOpenMore: () => void

}



const navItems = [

  { kind: 'link' as const, segment: '', label: '홈', icon: Home, end: true },

  {

    kind: 'link' as const,

    segment: 'today-report',

    label: 'Today Report',

    icon: ClipboardList,

    unreadCategory: 'today-report' as ParentUnreadCategory,

  },

  {

    kind: 'link' as const,

    segment: 'monthly-learning-report',

    label: '진단REPORT',

    icon: FileBarChart2,

  },

  {

    kind: 'link' as const,

    segment: 'questions',

    label: '질문하기',

    icon: MessageCircleQuestion,

    unreadCategory: 'questions' as ParentUnreadCategory,

  },

  { kind: 'more' as const, label: '더보기', icon: MoreHorizontal },

]



export function ParentStudentBottomNav({ onOpenMore }: ParentStudentBottomNavProps) {

  const student = useParentStudent()

  const location = useLocation()

  const { isCategoryUnread } = useParentUnread()

  const basePath = `/care/${student.studentAccessKey}`



  const moreUnread =

    isCategoryUnread('makeup-plans') || isCategoryUnread('learning-notices')



  return (

    <nav

      className="tm-bottom-nav tm-bottom-nav--navy fixed inset-x-0 bottom-0 z-40 lg:hidden"

      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}

      aria-label="학부모 앱 메뉴"

    >

      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-2">

        {navItems.map((item) => {

          const Icon = item.icon



          if (item.kind === 'more') {

            const sidebarActive = !['', 'today-report', 'monthly-evaluation', 'questions'].some(

              (seg) => {

                const path = seg ? `${basePath}/${seg}` : basePath

                return (

                  location.pathname === path ||

                  (seg && location.pathname.startsWith(`${path}/`))

                )

              },

            )



            return (

              <li key="more" className="flex-1 px-0.5">

                <button

                  type="button"

                  onClick={onOpenMore}

                  className={`tm-nav-link relative w-full ${sidebarActive ? 'tm-nav-link--active' : ''}`}

                >

                  <span className="relative inline-flex">

                    <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={2} aria-hidden />

                    {moreUnread && <ParentUnreadDot className="-right-1 -top-0.5" />}

                  </span>

                  <span className="max-w-full truncate leading-tight">{item.label}</span>

                </button>

              </li>

            )

          }



          const to = item.segment ? `${basePath}/${item.segment}` : basePath

          const unread = item.unreadCategory ? isCategoryUnread(item.unreadCategory) : false



          return (

            <li key={item.segment || 'home'} className="flex-1 px-0.5">

              <NavLink

                to={to}

                end={item.end}

                className={({ isActive }) =>

                  `tm-nav-link w-full ${isActive ? 'tm-nav-link--active' : ''}`

                }

              >

                <span className="relative inline-flex">

                  <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={2} aria-hidden />

                  {unread && <ParentUnreadDot className="-right-1 -top-0.5" />}

                </span>

                <span className="max-w-full truncate leading-tight">{item.label}</span>

              </NavLink>

            </li>

          )

        })}

      </ul>

    </nav>

  )

}

