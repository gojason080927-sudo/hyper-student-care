import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ClassScheduleGridList } from '../components/classSchedule/ClassScheduleGridDisplay'
import { ContentPostListCard } from '../components/contentPost/ContentPostListCard'
import {
  ParentEmptyState,
  ParentPageHeader,
} from '../components/parent/ParentStudentComponents'
import { useParentStudentOptional } from '../contexts/ParentStudentContext'
import { useMarkParentCategoryReadOnView } from '../hooks/useMarkParentCategoryReadOnView'
import { usePublishedContentPosts } from '../hooks/usePublishedContentPosts'
import { useData } from '../hooks/useData'
import { filterScheduleGridsForStudent, sortScheduleGrids } from '../utils/classScheduleAccess'
import { inputClass } from '../utils/labels'

type SectionFilter = '전체' | '수업 시간표' | '학습 공지사항'

function useLearningNoticePaths() {
  const { studentAccessKey } = useParams()
  if (studentAccessKey) {
    const base = `/care/${studentAccessKey}/learning-notices`
    return { listPath: base, detailPathPrefix: base }
  }
  return { listPath: '/learning-notices', detailPathPrefix: '/learning-notices' }
}

export function LearningNoticesPage() {
  const student = useParentStudentOptional()
  useMarkParentCategoryReadOnView('learning-notices', Boolean(student))
  const publishedPosts = usePublishedContentPosts(student ?? undefined)
  const { classScheduleGrids } = useData()
  const { detailPathPrefix } = useLearningNoticePaths()
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('전체')
  const [titleSearch, setTitleSearch] = useState('')

  const visibleScheduleGrids = useMemo(() => {
    if (!student) return sortScheduleGrids(classScheduleGrids.filter((item) => item.isActive))
    return sortScheduleGrids(filterScheduleGridsForStudent(classScheduleGrids, student))
  }, [classScheduleGrids, student])

  const filteredNotices = useMemo(() => {
    let list = publishedPosts
    if (titleSearch.trim()) {
      const q = titleSearch.trim()
      list = list.filter((p) => p.title.includes(q))
    }
    return list
  }, [publishedPosts, titleSearch])

  const showSchedules = sectionFilter === '전체' || sectionFilter === '수업 시간표'
  const showNotices = sectionFilter === '전체' || sectionFilter === '학습 공지사항'

  return (
    <div className="parent-page space-y-5 pb-6">
      <ParentPageHeader
        title="수업 시간표 & 학습 공지사항"
        description="학원 시간표와 학습 관련 공지 사항을 확인합니다."
      />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm pm-card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">구분</label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value as SectionFilter)}
              className={inputClass()}
            >
              <option value="전체">전체</option>
              <option value="수업 시간표">수업 시간표</option>
              <option value="학습 공지사항">학습 공지사항</option>
            </select>
          </div>
          {showNotices && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">제목 검색</label>
              <input
                value={titleSearch}
                onChange={(e) => setTitleSearch(e.target.value)}
                className={inputClass()}
                placeholder="제목"
              />
            </div>
          )}
        </div>
      </div>

      {showSchedules && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-navy-900">내 수업 시간표</h2>
          <ClassScheduleGridList grids={visibleScheduleGrids} />
        </section>
      )}

      {showNotices && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-navy-900">학습 공지사항</h2>
          {filteredNotices.length === 0 ? (
            <ParentEmptyState message="등록된 학습 공지사항이 없습니다." />
          ) : (
            <div className="parent-record-list space-y-3">
              {filteredNotices.map((post) => (
                <ContentPostListCard
                  key={post.id}
                  post={post}
                  detailPath={`${detailPathPrefix}/${post.id}`}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
