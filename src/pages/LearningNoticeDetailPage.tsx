import { Link, useParams } from 'react-router-dom'
import { ContentPostDetailBody } from '../components/contentPost/ContentPostDetailBody'
import { usePublishedContentPosts } from '../hooks/usePublishedContentPosts'
import { getAdjacentPosts } from '../utils/contentPost'
import { useMemo } from 'react'

function useLearningNoticePaths() {
  const { studentAccessKey } = useParams()
  if (studentAccessKey) {
    const base = `/care/${studentAccessKey}/learning-notices`
    return { listPath: base, detailPathPrefix: base }
  }
  return { listPath: '/learning-notices', detailPathPrefix: '/learning-notices' }
}

export function LearningNoticeDetailPage() {
  const { postId = '' } = useParams()
  const { listPath, detailPathPrefix } = useLearningNoticePaths()
  const publishedPosts = usePublishedContentPosts()

  const post = publishedPosts.find((item) => item.id === postId)
  const { prev, next } = useMemo(
    () => getAdjacentPosts(publishedPosts, postId),
    [postId, publishedPosts],
  )

  if (!post) {
    return (
      <div className="parent-page rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="font-semibold text-slate-700">게시글을 찾을 수 없습니다.</p>
        <Link to={listPath} className="mt-4 inline-block min-h-11 text-sm text-navy-700">
          ← 목록으로
        </Link>
      </div>
    )
  }

  return (
    <div className="parent-page pb-6">
      <ContentPostDetailBody
        post={post}
        prevPost={prev}
        nextPost={next}
        listPath={listPath}
        detailPathPrefix={detailPathPrefix}
      />
    </div>
  )
}
