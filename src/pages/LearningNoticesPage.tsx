import { useMemo, useState } from 'react'
import { ContentPostListCard } from '../components/contentPost/ContentPostListCard'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { usePublishedContentPosts } from '../hooks/usePublishedContentPosts'
import type { ContentPostCategory } from '../types/records'
import { CONTENT_POST_CATEGORIES } from '../utils/contentPost'
import { inputClass } from '../utils/labels'

type CategoryFilter = '전체' | ContentPostCategory

export function LearningNoticesPage() {
  const publishedPosts = usePublishedContentPosts()
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('전체')
  const [titleSearch, setTitleSearch] = useState('')

  const filtered = useMemo(() => {
    let list = publishedPosts
    if (categoryFilter !== '전체') list = list.filter((p) => p.category === categoryFilter)
    if (titleSearch.trim()) {
      const q = titleSearch.trim()
      list = list.filter((p) => p.title.includes(q))
    }
    return list
  }, [categoryFilter, publishedPosts, titleSearch])

  return (
    <div className="space-y-6">
      <PageHeader
        title="학습정보 & 공지사항"
        description="유용한 학습정보와 학원 공지사항을 확인합니다."
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">구분</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className={inputClass()}
            >
              <option value="전체">전체</option>
              {CONTENT_POST_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">제목 검색</label>
            <input
              value={titleSearch}
              onChange={(e) => setTitleSearch(e.target.value)}
              className={inputClass()}
              placeholder="제목"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="등록된 게시글이 없습니다." />
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <ContentPostListCard
              key={post.id}
              post={post}
              detailPath={`/learning-notices/${post.id}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
