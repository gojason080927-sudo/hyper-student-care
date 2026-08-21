import { Link } from 'react-router-dom'
import type { ContentPost, ContentPostCategory } from '../../types/records'
import { formatKoreanDate } from '../../utils/date'
import {
  getContentPostDisplayCategory,
  getContentPostPreview,
  hasContentPostAttachment,
} from '../../utils/contentPost'
import {
  getContentPostCategoryColor,
  getContentPostPublishColor,
} from '../../utils/labels'
import { RecordActions } from '../ui/RecordActions'
import { StatusBadge } from '../ui/StatusBadge'

type ContentPostListCardProps = {
  post: ContentPost
  detailPath: string
  showAdmin?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export function ContentPostListCard({
  post,
  detailPath,
  showAdmin = false,
  onEdit,
  onDelete,
}: ContentPostListCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              label={getContentPostDisplayCategory(post.category as ContentPostCategory)}
              colorClass={getContentPostCategoryColor(post.category)}
            />
            {post.isImportant && (
              <StatusBadge label="중요" colorClass="bg-rose-100 text-rose-900 border-rose-200" />
            )}
            {post.isPinned && (
              <StatusBadge label="고정" colorClass="bg-amber-100 text-amber-900 border-amber-200" />
            )}
            {hasContentPostAttachment(post) && (
              <StatusBadge label="첨부" colorClass="bg-sky-100 text-sky-900 border-sky-200" />
            )}
            {showAdmin && (
              <StatusBadge
                label={post.isPublished ? '공개' : '비공개'}
                colorClass={getContentPostPublishColor(post.isPublished)}
              />
            )}
          </div>
          <Link
            to={detailPath}
            className="block break-anywhere text-base font-bold text-navy-900 hover:text-blue-700 hover:underline"
          >
            {post.title}
          </Link>
          <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
            {getContentPostPreview(post)}
          </p>
          <p className="text-xs text-slate-500">
            {post.authorName} · {formatKoreanDate(post.publishedAt)}
          </p>
        </div>
        {showAdmin && onEdit && onDelete && (
          <RecordActions onEdit={onEdit} onDelete={onDelete} />
        )}
      </div>
    </div>
  )
}
