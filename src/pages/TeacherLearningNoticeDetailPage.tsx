import { ArrowLeft } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ContentPostDetailBody } from '../components/contentPost/ContentPostDetailBody'
import { ContentPostForm } from '../components/contentPost/ContentPostForm'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Modal } from '../components/ui/Modal'
import { RecordActions } from '../components/ui/RecordActions'
import { useData } from '../hooks/useData'
import {
  contentPostToForm,
  emptyContentPostForm,
  getAdjacentPosts,
  sortContentPosts,
  validateContentPostForm,
  type ContentPostFormData,
} from '../utils/contentPost'
import { useMemo, useState } from 'react'

export function TeacherLearningNoticeDetailPage() {
  const { postId = '' } = useParams()
  const navigate = useNavigate()
  const { students, contentPosts, saveContentPost, deleteContentPost } = useData()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ContentPostFormData>(emptyContentPostForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteOpen, setDeleteOpen] = useState(false)

  const post = contentPosts.find((item) => item.id === postId)
  const sortedPosts = useMemo(() => sortContentPosts(contentPosts), [contentPosts])
  const { prev, next } = useMemo(
    () => getAdjacentPosts(sortedPosts, postId),
    [postId, sortedPosts],
  )

  if (!post) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-slate-700">게시글을 찾을 수 없습니다.</p>
        <Link to="/teacher/learning-notices" className="mt-4 inline-block text-sm text-navy-700">
          ← 목록으로
        </Link>
      </div>
    )
  }

  const openEdit = () => {
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
      audienceType: form.audienceType,
      targetGrade: form.targetGrade.trim(),
      targetClassName: form.targetClassName.trim(),
      targetStudentId: form.targetStudentId.trim(),
      publishStartDate: form.publishStartDate,
      publishEndDate: form.publishEndDate,
      isImportant: form.isImportant,
    })
    setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/teacher/learning-notices"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-900"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로
        </Link>
        <RecordActions onEdit={openEdit} onDelete={() => setDeleteOpen(true)} />
      </div>

      <ContentPostDetailBody
        post={post}
        showPublishBadge
        prevPost={prev}
        nextPost={next}
        listPath="/teacher/learning-notices"
        detailPathPrefix="/teacher/learning-notices"
      />

      <Modal open={modalOpen} title="게시글 수정" onClose={() => setModalOpen(false)} wide>
        <ContentPostForm
          form={form}
          errors={errors}
          students={students}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="게시글 삭제"
        message="이 게시글을 삭제하시겠습니까?"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          deleteContentPost(post.id)
          setDeleteOpen(false)
          navigate('/teacher/learning-notices')
        }}
      />
    </div>
  )
}
