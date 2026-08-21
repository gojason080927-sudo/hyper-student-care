import { ArrowRight } from 'lucide-react'

import { Link } from 'react-router-dom'

import { HyperFeaturedCardWave } from '../ui/HyperFeaturedCardWave'

import { useParentStudent } from '../../contexts/ParentStudentContext'

import { useParentUnread } from '../../contexts/ParentUnreadContext'

import { ParentUnreadDot } from './ParentUnreadDot'

import { parentCategoryItems, parentTodayReportItem } from './parentNavItems'

import type { ParentUnreadCategory } from '../../utils/parentUnread'



const todayReportHighlights = ['출결', '오늘의 진도', '과제 수행', '일일 테스트'] as const



/** 홈 그리드 카드 전용 표시 (사이드바·페이지 제목과 분리) */

const homeCardDisplayOverrides: Record<

  string,

  { label?: string; hideDescription?: boolean }

> = {

  'monthly-learning-report': { hideDescription: true },

  'monthly-evaluation': { hideDescription: true },

  'learning-notices': {

    label: '수업 시간표\n학습 공지사항',

    hideDescription: true,

  },

}



export function ParentCategoryGrid() {

  const student = useParentStudent()

  const { isCategoryUnread } = useParentUnread()

  const basePath = `/care/${student.studentAccessKey}`



  const todayPath = `${basePath}/${parentTodayReportItem.segment}`

  const TodayIcon = parentTodayReportItem.icon

  const todayUnread = isCategoryUnread(parentTodayReportItem.segment as ParentUnreadCategory)



  return (

    <div className="parent-home-menu space-y-3 sm:space-y-3.5">

      <Link to={todayPath} className="tm-featured-card relative">

        {todayUnread && <ParentUnreadDot className="right-3 top-3" size="md" />}

        <div className="tm-featured-card__body">

          <div className="flex items-center gap-3">

            <span className="tm-featured-icon tm-featured-icon--light">

              <TodayIcon className="h-7 w-7" strokeWidth={2} aria-hidden />

            </span>

            <div className="min-w-0 flex-1">

              <p className="text-lg font-bold leading-tight sm:text-xl">

                {parentTodayReportItem.label}

              </p>

              <p className="mt-1 text-[15px] leading-snug text-white/90 sm:text-base">

                {parentTodayReportItem.description}

              </p>

            </div>

            <span className="tm-featured-arrow" aria-hidden>

              <ArrowRight className="h-5 w-5" strokeWidth={2.25} />

            </span>

          </div>



          <div className="mt-3.5 flex flex-wrap gap-2">

            {todayReportHighlights.map((tag) => (

              <span key={tag} className="tm-featured-pill">

                {tag}

              </span>

            ))}

          </div>

        </div>

        <HyperFeaturedCardWave />

      </Link>



      <div className="grid auto-rows-fr grid-cols-2 gap-2.5 sm:gap-3">

        {parentCategoryItems.map(({ segment, label, icon: Icon, description }) => {

          const path = `${basePath}/${segment}`

          const homeOverride = homeCardDisplayOverrides[segment]

          const displayLabel = homeOverride?.label ?? label

          const displayDescription =

            homeOverride?.hideDescription ? undefined : description

          const unread = isCategoryUnread(segment as ParentUnreadCategory)



          return (

            <Link key={segment} to={path} className="tm-menu-card tm-menu-card--with-arrow relative">

              {unread && <ParentUnreadDot className="right-2.5 top-2.5" />}

              <span className="tm-menu-icon">

                <Icon className="h-[22px] w-[22px] sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />

              </span>

              <span className="mt-2 min-w-0">

                <span className="tm-menu-title whitespace-pre-line break-keep text-[0.875rem] sm:text-[0.9375rem]">

                  {displayLabel}

                </span>

                {displayDescription && (

                  <span className="tm-menu-desc line-clamp-2 break-anywhere text-xs sm:text-[0.8125rem]">

                    {displayDescription}

                  </span>

                )}

              </span>

              <span className="tm-menu-card-arrow" aria-hidden>

                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.25} />

              </span>

            </Link>

          )

        })}

      </div>

    </div>

  )

}

