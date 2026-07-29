import { Link } from 'react-router-dom'
import type { ContentPost } from '../../types/records'
import { formatKoreanDate } from '../../utils/date'
import { StatusBadge } from '../ui/StatusBadge'
import { getContentPostCategoryColor } from '../../utils/labels'

type ContentPostDetailBodyProps = {
  post: ContentPost
  showPublishBadge?: boolean
  prevPost: ContentPost | null
  nextPost: ContentPost | null
  listPath: string
  detailPathPrefix: string
}

export function ContentPostDetailBody({
  post,
  showPublishBadge = false,
  prevPost,
  nextPost,
  listPath,
  detailPathPrefix,
}: ContentPostDetailBodyProps) {
  return (
    <article className="mx-auto max-w-[860px] space-y-6">
      <header className="space-y-3 border-b border-slate-200 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={post.category} colorClass={getContentPostCategoryColor(post.category)} />
          {post.isPinned && (
            <StatusBadge label="고정" colorClass="bg-amber-100 text-amber-900 border-amber-200" />
          )}
          {showPublishBadge && (
            <StatusBadge
              label={post.isPublished ? '공개' : '비공개'}
              colorClass={
                post.isPublished
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }
            />
          )}
        </div>
        <h1 className="break-anywhere text-xl font-bold leading-snug text-navy-900 sm:text-2xl">{post.title}</h1>
        <p className="text-sm text-slate-600">
          {post.authorName} · {formatKoreanDate(post.publishedAt)}
        </p>
        {post.sourceName && (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-700">출처: </span>
            {post.sourceName}
          </p>
        )}
        {post.originalArticleTitle && (
          <p className="text-sm text-slate-600">
            <span className="font-medium text-slate-700">기사 원문 제목: </span>
            {post.originalArticleTitle}
          </p>
        )}
      </header>

      <div className="whitespace-pre-wrap break-words break-anywhere text-[15px] leading-relaxed text-slate-800 sm:text-base">
        {post.content}
      </div>

      <nav className="grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2">
        {prevPost ? (
          <Link
            to={`${detailPathPrefix}/${prevPost.id}`}
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm transition hover:border-navy-300 hover:bg-slate-50"
          >
            <span className="text-slate-500">이전 글</span>
            <p className="mt-1 font-semibold text-navy-900 line-clamp-2">{prevPost.title}</p>
          </Link>
        ) : (
          <div />
        )}
        {nextPost ? (
          <Link
            to={`${detailPathPrefix}/${nextPost.id}`}
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm transition hover:border-navy-300 hover:bg-slate-50 sm:text-right"
          >
            <span className="text-slate-500">다음 글</span>
            <p className="mt-1 font-semibold text-navy-900 line-clamp-2">{nextPost.title}</p>
          </Link>
        ) : (
          <div />
        )}
      </nav>

      <div>
        <Link to={listPath} className="text-sm font-medium text-navy-700 hover:text-navy-900">
          ← 목록으로
        </Link>
      </div>
    </article>
  )
}
