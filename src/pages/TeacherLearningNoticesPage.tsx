import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ContentPostForm } from '../components/contentPost/ContentPostForm'
import { ContentPostListCard } from '../components/contentPost/ContentPostListCard'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Modal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { useData } from '../hooks/useData'
import type { ContentPost, ContentPostCategory } from '../types/records'
import {
  CONTENT_POST_CATEGORIES,
  contentPostToForm,
  emptyContentPostForm,
  sortContentPosts,
  validateContentPostForm,
  type ContentPostFormData,
} from '../utils/contentPost'
import { btnPrimary, inputClass } from '../utils/labels'

type CategoryFilter = '전체' | ContentPostCategory
type PublishFilter = '전체' | '공개' | '비공개'
type SortOrder = 'desc' | 'asc'

export function TeacherLearningNoticesPage() {
  const { contentPosts, saveContentPost, deleteContentPost } = useData()
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('전체')
  const [titleSearch, setTitleSearch] = useState('')
  const [authorSearch, setAuthorSearch] = useState('')
  const [publishFilter, setPublishFilter] = useState<PublishFilter>('전체')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ContentPostFormData>(emptyContentPostForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<ContentPost | null>(null)

  const filtered = useMemo(() => {
    let list = contentPosts
    if (categoryFilter !== '전체') list = list.filter((p) => p.category === categoryFilter)
    if (titleSearch.trim()) {
      const q = titleSearch.trim()
      list = list.filter((p) => p.title.includes(q))
    }
    if (authorSearch.trim()) {
      const q = authorSearch.trim()
      list = list.filter((p) => p.authorName.includes(q))
    }
    if (publishFilter === '공개') list = list.filter((p) => p.isPublished)
    if (publishFilter === '비공개') list = list.filter((p) => !p.isPublished)
    return sortContentPosts(list, sortOrder)
  }, [authorSearch, categoryFilter, contentPosts, publishFilter, sortOrder, titleSearch])

  const openAdd = () => {
    setForm(emptyContentPostForm())
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (post: ContentPost) => {
    setForm(contentPostToForm(post))
    setErrors({})
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors = validateContentPostForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (!form.category) return
    saveContentPost({
      id: form.id,
      category: form.category,
      title: form.title.trim(),
      content: form.content,
      summary: form.summary.trim(),
      sourceName: form.sourceName.trim(),
      originalArticleTitle: form.originalArticleTitle.trim(),
      authorName: form.authorName.trim(),
      isPinned: form.isPinned,
      isPublished: form.isPublished,
      publishedAt: form.publishedAt,
    })
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="학습정보 & 공지사항"
        description="유용한 학습정보와 학원 공지사항을 작성하고 관리합니다."
        action={
          <button type="button" onClick={openAdd} className={`${btnPrimary} inline-flex items-center gap-2`}>
            <Plus className="h-4 w-4" />
            글 작성
          </button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">작성자 검색</label>
            <input
              value={authorSearch}
              onChange={(e) => setAuthorSearch(e.target.value)}
              className={inputClass()}
              placeholder="작성자"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">공개 상태</label>
            <select
              value={publishFilter}
              onChange={(e) => setPublishFilter(e.target.value as PublishFilter)}
              className={inputClass()}
            >
              <option value="전체">전체</option>
              <option value="공개">공개</option>
              <option value="비공개">비공개</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-600">정렬</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className={inputClass()}
            >
              <option value="desc">최신순</option>
              <option value="asc">오래된순</option>
            </select>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="게시글이 없습니다." />
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <ContentPostListCard
              key={post.id}
              post={post}
              detailPath={`/teacher/learning-notices/${post.id}`}
              showAdmin
              onEdit={() => openEdit(post)}
              onDelete={() => setDeleteTarget(post)}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={form.id ? '게시글 수정' : '글 작성'}
        onClose={() => setModalOpen(false)}
        wide
      >
        <ContentPostForm
          form={form}
          errors={errors}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="게시글 삭제"
        message="이 게시글을 삭제하시겠습니까?"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteContentPost(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
