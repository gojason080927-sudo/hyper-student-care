import type { Student } from '../../types/student'
import type { ContentPostFormData } from '../../utils/contentPost'
import {
  CONTENT_POST_CATEGORIES,
  CONTENT_POST_MAX_LENGTH,
} from '../../utils/contentPost'
import { NOTICE_AUDIENCE_OPTIONS } from '../../utils/noticeAudience'
import { getClassOptionsForGrade, isActiveGrade } from '../../utils/studentGradeClass'
import { GRADES } from '../../utils/labels'
import { btnPrimary, btnSecondary, inputClass } from '../../utils/labels'

type ContentPostFormProps = {
  form: ContentPostFormData
  errors: Record<string, string>
  students: Student[]
  onChange: (form: ContentPostFormData) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
}

export function ContentPostForm({
  form,
  errors,
  students,
  onChange,
  onSubmit,
  onCancel,
}: ContentPostFormProps) {
  const classOptions =
    form.targetGrade && isActiveGrade(form.targetGrade)
      ? getClassOptionsForGrade(form.targetGrade)
      : []

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
              {category === '학습정보' ? '학습 공지사항 (학습정보)' : '학습 공지사항 (공지)'}
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

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
        <p className="text-sm font-semibold text-slate-800">공개 대상</p>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">대상 유형</label>
          <select
            value={form.audienceType}
            onChange={(e) =>
              onChange({
                ...form,
                audienceType: e.target.value as ContentPostFormData['audienceType'],
                targetGrade: '',
                targetClassName: '',
                targetStudentId: '',
              })
            }
            className={inputClass()}
          >
            {NOTICE_AUDIENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {form.audienceType === 'grade' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">대상 학년 *</label>
            <select
              value={form.targetGrade}
              onChange={(e) => onChange({ ...form, targetGrade: e.target.value })}
              className={inputClass(errors.targetGrade)}
            >
              <option value="">선택</option>
              {GRADES.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            {errors.targetGrade && (
              <p className="mt-1 text-sm text-rose-500">{errors.targetGrade}</p>
            )}
          </div>
        )}

        {form.audienceType === 'class' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">대상 학년 *</label>
              <select
                value={form.targetGrade}
                onChange={(e) =>
                  onChange({ ...form, targetGrade: e.target.value, targetClassName: '' })
                }
                className={inputClass(errors.targetGrade)}
              >
                <option value="">선택</option>
                {GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
              {errors.targetGrade && (
                <p className="mt-1 text-sm text-rose-500">{errors.targetGrade}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">대상 반/과정 *</label>
              <select
                value={form.targetClassName}
                onChange={(e) => onChange({ ...form, targetClassName: e.target.value })}
                className={inputClass(errors.targetClassName)}
                disabled={!form.targetGrade}
              >
                <option value="">선택</option>
                {classOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.targetClassName && (
                <p className="mt-1 text-sm text-rose-500">{errors.targetClassName}</p>
              )}
            </div>
          </div>
        )}

        {form.audienceType === 'student' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">대상 학생 *</label>
            <select
              value={form.targetStudentId}
              onChange={(e) => onChange({ ...form, targetStudentId: e.target.value })}
              className={inputClass(errors.targetStudentId)}
            >
              <option value="">선택</option>
              {students
                .filter((student) => student.status === '재원')
                .map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.grade} {student.className})
                  </option>
                ))}
            </select>
            {errors.targetStudentId && (
              <p className="mt-1 text-sm text-rose-500">{errors.targetStudentId}</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">게시 시작일</label>
          <input
            type="date"
            value={form.publishStartDate}
            onChange={(e) => onChange({ ...form, publishStartDate: e.target.value })}
            className={inputClass()}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">게시 종료일</label>
          <input
            type="date"
            value={form.publishEndDate}
            onChange={(e) => onChange({ ...form, publishEndDate: e.target.value })}
            className={inputClass(errors.publishEndDate)}
          />
          {errors.publishEndDate && (
            <p className="mt-1 text-sm text-rose-500">{errors.publishEndDate}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isImportant}
            onChange={(e) => onChange({ ...form, isImportant: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          중요 공지
        </label>
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
