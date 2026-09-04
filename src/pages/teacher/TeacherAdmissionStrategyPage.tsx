import { Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { RecordActions } from '../../components/ui/RecordActions'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { useTeacherAdmissionStrategyPosts } from '../../hooks/useTeacherAdmissionStrategyPosts'
import type { AdmissionStrategyPost, AdmissionStrategyTrack } from '../../types/admissionStrategy'
import { createId } from '../../utils/id'
import { formatKoreanDate, getTodayString } from '../../utils/date'
import { btnPrimary, btnSecondary, inputClass } from '../../utils/labels'
import { createTimestamps, touchRecord } from '../../utils/recordStorage'
import { requireDate, requireNonEmpty } from '../../utils/validation'

type FormState = {
  id?: string
  track: AdmissionStrategyTrack
  title: string
  content: string
  publishedAt: string
  isPublished: boolean
  authorName: string
}

function emptyForm(track: AdmissionStrategyTrack, authorName: string): FormState {
  return {
    track,
    title: '',
    content: '',
    publishedAt: getTodayString(),
    isPublished: false,
    authorName,
  }
}

export function TeacherAdmissionStrategyPage() {
  const { user } = useAuth()
  const defaultAuthor = user?.email?.split('@')[0] ?? ''
  const { posts, loading, savePost, removePost } = useTeacherAdmissionStrategyPosts()
  const [track, setTrack] = useState<AdmissionStrategyTrack>('고입')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(() => emptyForm('고입', defaultAuthor))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<AdmissionStrategyPost | null>(null)

  const visiblePosts = useMemo(
    () => posts.filter((post) => post.track === track),
    [posts, track],
  )

  const openAdd = () => {
    setForm(emptyForm(track, defaultAuthor))
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (post: AdmissionStrategyPost) => {
    setForm({
      id: post.id,
      track: post.track,
      title: post.title,
      content: post.content,
      publishedAt: post.publishedAt,
      isPublished: post.isPublished,
      authorName: post.authorName || defaultAuthor,
    })
    setErrors({})
    setModalOpen(true)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    const titleErr = requireNonEmpty(form.title, '제목')
    const contentErr = requireNonEmpty(form.content, '내용')
    const dateErr = requireDate(form.publishedAt)
    if (titleErr) nextErrors.title = titleErr
    if (contentErr) nextErrors.content = contentErr
    if (dateErr) nextErrors.publishedAt = dateErr
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const existing = form.id ? posts.find((post) => post.id === form.id) : undefined
    const timestamps = existing ? touchRecord(existing) : createTimestamps()
    await savePost({
      id: form.id ?? createId(),
      track: form.track,
      title: form.title.trim(),
      content: form.content.trim(),
      publishedAt: form.publishedAt,
      isPublished: form.isPublished,
      authorName: form.authorName.trim(),
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
    })
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="고입 · 대입 입시전략"
        description="학부모 앱에 공개할 진학·입시 자료를 관리합니다."
        action={
          <button type="button" onClick={openAdd} className={`${btnPrimary} inline-flex items-center gap-2`}>
            <Plus className="h-4 w-4" />
            새 글 작성
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {(['고입', '대입'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTrack(item)}
            className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${
              track === item ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item} 전략
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : visiblePosts.length === 0 ? (
        <EmptyState title={`${track} 전략 글이 없습니다.`} />
      ) : (
        <div className="space-y-3">
          {visiblePosts.map((post) => (
            <article
              key={post.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-navy-900">{post.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{formatKoreanDate(post.publishedAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={post.isPublished ? '공개' : '비공개'}
                    colorClass={post.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}
                  />
                  <RecordActions onEdit={() => openEdit(post)} onDelete={() => setDeleteTarget(post)} />
                </div>
              </div>
              <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm text-slate-600">{post.content}</p>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? '입시전략 수정' : '입시전략 작성'}
      >
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">구분 *</label>
            <select
              value={form.track}
              onChange={(event) =>
                setForm({ ...form, track: event.target.value as AdmissionStrategyTrack })
              }
              className={inputClass()}
            >
              <option value="고입">고입</option>
              <option value="대입">대입</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">제목 *</label>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={inputClass(errors.title)}
            />
            {errors.title && <p className="mt-1 text-sm text-rose-500">{errors.title}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">내용 *</label>
            <textarea
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              className={`${inputClass(errors.content)} min-h-40`}
            />
            {errors.content && <p className="mt-1 text-sm text-rose-500">{errors.content}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">작성일 *</label>
            <input
              type="date"
              value={form.publishedAt}
              onChange={(event) => setForm({ ...form, publishedAt: event.target.value })}
              className={inputClass(errors.publishedAt)}
            />
            {errors.publishedAt && <p className="mt-1 text-sm text-rose-500">{errors.publishedAt}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">작성자</label>
            <input
              value={form.authorName}
              onChange={(event) => setForm({ ...form, authorName: event.target.value })}
              className={inputClass()}
            />
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(event) => setForm({ ...form, isPublished: event.target.checked })}
            />
            학부모 앱에 공개
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>
              취소
            </button>
            <button type="submit" className={btnPrimary}>
              저장
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="입시전략 삭제"
        message="이 글을 삭제하시겠습니까? 학부모 앱에서도 더 이상 보이지 않습니다."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          void removePost(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
