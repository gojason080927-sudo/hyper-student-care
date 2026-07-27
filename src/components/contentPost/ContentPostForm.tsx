import type { ContentPostFormData } from '../../utils/contentPost'
import {
  CONTENT_POST_CATEGORIES,
  CONTENT_POST_MAX_LENGTH,
} from '../../utils/contentPost'
import { btnPrimary, btnSecondary, inputClass } from '../../utils/labels'

type ContentPostFormProps = {
  form: ContentPostFormData
  errors: Record<string, string>
  onChange: (form: ContentPostFormData) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export function ContentPostForm({
  form,
  errors,
  onChange,
  onSubmit,
  onCancel,
}: ContentPostFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">구분 *</label>
        <select
          value={form.category}
          onChange={(e) =>
            onChange({ ...form, category: e.target.value as ContentPostFormData['category'] })
          }
          className={inputClass(errors.category)}
        >
          <option value="">선택</option>
          {CONTENT_POST_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {errors.category && <p className="mt-1 text-sm text-rose-500">{errors.category}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">제목 *</label>
        <input
          value={form.title}
          onChange={(e) => onChange({ ...form, title: e.target.value })}
          className={inputClass(errors.title)}
        />
        {errors.title && <p className="mt-1 text-sm text-rose-500">{errors.title}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">요약</label>
        <textarea
          value={form.summary}
          onChange={(e) => onChange({ ...form, summary: e.target.value })}
          rows={2}
          className={inputClass()}
          placeholder="목록에 표시할 짧은 요약 (선택)"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">기사 원문 제목</label>
        <input
          value={form.originalArticleTitle}
          onChange={(e) => onChange({ ...form, originalArticleTitle: e.target.value })}
          className={inputClass()}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">출처명</label>
        <input
          value={form.sourceName}
          onChange={(e) => onChange({ ...form, sourceName: e.target.value })}
          className={inputClass()}
          placeholder="예: 교육부, ○○일보"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          기사 원문 또는 본문 *
        </label>
        <textarea
          value={form.content}
          onChange={(e) =>
            onChange({
              ...form,
              content: e.target.value.slice(0, CONTENT_POST_MAX_LENGTH),
            })
          }
          rows={12}
          className={`${inputClass(errors.content)} min-h-[240px] w-full font-mono text-sm leading-relaxed`}
          placeholder="기사 원문이나 학습자료 본문을 여기에 붙여 넣거나 직접 작성해 주세요."
        />
        <p className="mt-1 text-right text-xs text-slate-500">
          {form.content.length.toLocaleString()}/{CONTENT_POST_MAX_LENGTH.toLocaleString()}자
        </p>
        {errors.content && <p className="mt-1 text-sm text-rose-500">{errors.content}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">작성자 *</label>
        <input
          value={form.authorName}
          onChange={(e) => onChange({ ...form, authorName: e.target.value })}
          className={inputClass(errors.authorName)}
        />
        {errors.authorName && <p className="mt-1 text-sm text-rose-500">{errors.authorName}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">게시일 *</label>
        <input
          type="date"
          value={form.publishedAt}
          onChange={(e) => onChange({ ...form, publishedAt: e.target.value })}
          className={inputClass(errors.publishedAt)}
        />
        {errors.publishedAt && (
          <p className="mt-1 text-sm text-rose-500">{errors.publishedAt}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isPinned}
            onChange={(e) => onChange({ ...form, isPinned: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          상단 고정
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => onChange({ ...form, isPublished: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          공개
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className={btnSecondary}>
          취소
        </button>
        <button type="submit" className={btnPrimary}>
          저장
        </button>
      </div>
    </form>
  )
}
