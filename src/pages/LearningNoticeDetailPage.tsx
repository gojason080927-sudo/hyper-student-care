import { Link, useParams } from 'react-router-dom'
import { ContentPostDetailBody } from '../components/contentPost/ContentPostDetailBody'
import { usePublishedContentPosts } from '../hooks/usePublishedContentPosts'
import { getAdjacentPosts } from '../utils/contentPost'
import { useMemo } from 'react'

export function LearningNoticeDetailPage() {
  const { postId = '' } = useParams()
  const publishedPosts = usePublishedContentPosts()

  const post = publishedPosts.find((item) => item.id === postId)
  const { prev, next } = useMemo(
    () => getAdjacentPosts(publishedPosts, postId),
    [postId, publishedPosts],
  )

  if (!post) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-slate-700">게시글을 찾을 수 없습니다.</p>
        <Link to="/learning-notices" className="mt-4 inline-block text-sm text-navy-700">
          ← 목록으로
        </Link>
      </div>
    )
  }

  return (
    <ContentPostDetailBody
      post={post}
      prevPost={prev}
      nextPost={next}
      listPath="/learning-notices"
      detailPathPrefix="/learning-notices"
    />
  )
}
