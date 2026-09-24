import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAuth } from '../../contexts/AuthContext'
import {
  createTeacherContentLibrarySignedUrl,
  deleteTeacherContentLibraryItem,
  draftFromTeacherContentLibraryItem,
  emptyTeacherContentLibraryDraft,
  filterTeacherContentLibraryItems,
  listTeacherContentLibraryItems,
  saveTeacherContentLibraryItem,
} from '../../lib/teacherContentLibrary'
import {
  TEACHER_CONTENT_LIBRARY_ACCEPT,
  TEACHER_CONTENT_LIBRARY_CATEGORIES,
  TEACHER_CONTENT_LIBRARY_STATUSES,
  type TeacherContentLibraryDraft,
  type TeacherContentLibraryFilters,
  type TeacherContentLibraryItem,
} from '../../types/teacherContentLibrary'
import { btnPrimary, btnSecondary, inputClass } from '../../utils/labels'

function useLibraryBasePath() {
  const { pathname } = useLocation()
  return pathname.startsWith('/teacher/mobile')
    ? '/teacher/mobile/content-library'
    : '/teacher/content-library'
}

function formatBytes(size: number | null): string {
  if (!size || size <= 0) return ''
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`
  return `${(size / (1024 * 1024)).toFixed(1)}MB`
}

function ItemForm({
  draft,
  file,
  error,
  saving,
  submitLabel,
  onChange,
  onFile,
  onSubmit,
  onCancel,
}: {
  draft: TeacherContentLibraryDraft
  file: File | null
  error: string | null
  saving: boolean
  submitLabel: string
  onChange: (next: TeacherContentLibraryDraft) => void
  onFile: (file: File | null) => void
  onSubmit: (event: FormEvent) => void
  onCancel: () => void
}) {
  return (
    <form className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4" onSubmit={onSubmit}>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-slate-800">원본 URL</span>
        <input
          className={inputClass()}
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://..."
          value={draft.sourceUrl}
          onChange={(event) => onChange({ ...draft, sourceUrl: event.target.value })}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-slate-800">제목</span>
        <input
          className={inputClass()}
          type="text"
          required
          placeholder="자료를 구분할 제목"
          value={draft.title}
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-800">카테고리</span>
          <select
            className={inputClass()}
            value={draft.category}
            onChange={(event) =>
              onChange({
                ...draft,
                category: event.target.value as TeacherContentLibraryDraft['category'],
              })
            }
          >
            {TEACHER_CONTENT_LIBRARY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-800">상태</span>
          <select
            className={inputClass()}
            value={draft.status}
            onChange={(event) =>
              onChange({
                ...draft,
                status: event.target.value as TeacherContentLibraryDraft['status'],
              })
            }
          >
            {TEACHER_CONTENT_LIBRARY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-slate-800">태그</span>
        <input
          className={inputClass()}
          type="text"
          placeholder="쉼표로 구분"
          value={draft.tagsText}
          onChange={(event) => onChange({ ...draft, tagsText: event.target.value })}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-slate-800">콘텐츠 메모</span>
        <textarea
          className={`${inputClass()} min-h-28`}
          placeholder="예: 공부 습관 부분을 Today Report와 연결해 블로그 작성"
          value={draft.memo}
          onChange={(event) => onChange({ ...draft, memo: event.target.value })}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-slate-800">첨부파일 (선택)</span>
        <input
          className={inputClass()}
          type="file"
          accept={TEACHER_CONTENT_LIBRARY_ACCEPT}
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
        <span className="block text-xs text-slate-500">
          SNS 영상은 URL로 저장하세요. 직접 파일은 50MB 이하 이미지/영상/문서만 가능합니다.
          {file ? ` 선택됨: ${file.name}` : ''}
        </span>
      </label>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? '저장 중...' : submitLabel}
        </button>
        <button type="button" className={btnSecondary} onClick={onCancel} disabled={saving}>
          취소
        </button>
      </div>
    </form>
  )
}

export function TeacherContentLibraryPage() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const basePath = useLibraryBasePath()
  const { user } = useAuth()
  const isNew = itemId === 'new'
  const isDesktop = !basePath.startsWith('/teacher/mobile')

  const [items, setItems] = useState<TeacherContentLibraryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TeacherContentLibraryFilters>({
    query: '',
    category: 'all',
    status: 'all',
  })
  const [draft, setDraft] = useState(emptyTeacherContentLibraryDraft())
  const [file, setFile] = useState<File | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [fileBusy, setFileBusy] = useState(false)

  const selected = items.find((item) => item.id === itemId) ?? null
  const visible = useMemo(
    () => filterTeacherContentLibraryItems(items, filters),
    [filters, items],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void listTeacherContentLibraryItems()
      .then((next) => {
        if (cancelled) return
        setItems(next)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : '자료 보관함을 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (isNew) {
      setDraft(emptyTeacherContentLibraryDraft())
      setFile(null)
      setEditing(false)
      setFormError(null)
      return
    }
    if (selected) {
      setDraft(draftFromTeacherContentLibraryItem(selected))
      setFile(null)
      setEditing(false)
      setFormError(null)
    }
  }, [isNew, selected])

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const saved = await saveTeacherContentLibraryItem({
        id: isNew ? undefined : selected?.id,
        draft,
        file,
        existing: isNew ? null : selected,
        createdByEmail: user?.email ?? null,
      })
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== saved.id)
        return [saved, ...next]
      })
      navigate(`${basePath}/${saved.id}`, { replace: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '자료를 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await deleteTeacherContentLibraryItem(selected)
      setItems((prev) => prev.filter((item) => item.id !== selected.id))
      setDeleteOpen(false)
      navigate(basePath, { replace: true })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '자료를 삭제하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const openAttachment = async (item: TeacherContentLibraryItem) => {
    if (!item.filePath) return
    setFileBusy(true)
    try {
      const url = await createTeacherContentLibrarySignedUrl(item.filePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '첨부파일을 열 수 없습니다.')
    } finally {
      setFileBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {isDesktop ? (
        <PageHeader
          title="영상·콘텐츠 자료 보관함"
          description="강사 전용입니다. 원본 URL과 콘텐츠 메모를 저장해 홍보·블로그 기획에 다시 사용합니다."
        />
      ) : (
        <p className="text-sm leading-relaxed text-slate-600">
          강사 전용입니다. 원본 URL과 콘텐츠 메모를 저장해 홍보·블로그 기획에 다시 사용합니다.
        </p>
      )}

      {loadError ? <p className="text-sm text-rose-600">{loadError}</p> : null}

      {!isNew && itemId && !loading && !selected ? (
        <p className="text-sm text-slate-600">
          자료를 찾을 수 없습니다.{' '}
          <Link to={basePath} className="font-semibold text-blue-700 underline">
            목록으로
          </Link>
        </p>
      ) : isNew ? (
        <section aria-labelledby="teacher-content-library-new-heading" className="space-y-3">
          <h2 id="teacher-content-library-new-heading" className="text-lg font-bold text-slate-900">
            새 자료 등록
          </h2>
          <ItemForm
            draft={draft}
            file={file}
            error={formError}
            saving={saving}
            submitLabel="저장"
            onChange={setDraft}
            onFile={setFile}
            onSubmit={(event) => void handleSave(event)}
            onCancel={() => navigate(basePath)}
          />
        </section>
      ) : selected ? (
        <section aria-labelledby="teacher-content-library-detail-heading" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link to={basePath} className={btnSecondary}>
              목록
            </Link>
            <button type="button" className={btnSecondary} onClick={() => setEditing((value) => !value)}>
              {editing ? '상세 보기' : '수정'}
            </button>
            <button type="button" className={btnSecondary} onClick={() => setDeleteOpen(true)}>
              삭제
            </button>
          </div>
          <h2 id="teacher-content-library-detail-heading" className="text-xl font-bold text-slate-900">
            {selected.title}
          </h2>
          {editing ? (
            <ItemForm
              draft={draft}
              file={file}
              error={formError}
              saving={saving}
              submitLabel="수정 저장"
              onChange={setDraft}
              onFile={setFile}
              onSubmit={(event) => void handleSave(event)}
              onCancel={() => {
                setEditing(false)
                setDraft(draftFromTeacherContentLibraryItem(selected))
                setFile(null)
              }}
            />
          ) : (
            <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800">
              <p>
                <strong>카테고리</strong> {selected.category}
              </p>
              <p>
                <strong>상태</strong> {selected.status}
              </p>
              {selected.tags.length > 0 ? (
                <p>
                  <strong>태그</strong> {selected.tags.join(', ')}
                </p>
              ) : null}
              <section>
                <h3 className="font-semibold">콘텐츠 메모</h3>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                  {selected.memo || '메모 없음'}
                </p>
              </section>
              {selected.sourceUrl ? (
                <p>
                  <a
                    href={selected.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-blue-700 underline"
                  >
                    원본 열기
                  </a>
                  <span className="mt-1 block break-all text-slate-500">{selected.sourceUrl}</span>
                </p>
              ) : null}
              {selected.filePath ? (
                <p>
                  <button
                    type="button"
                    className="font-semibold text-blue-700 underline"
                    onClick={() => void openAttachment(selected)}
                    disabled={fileBusy}
                  >
                    {fileBusy ? '첨부파일 여는 중...' : '첨부파일 열기'}
                  </button>
                  <span className="mt-1 block text-slate-500">
                    {[selected.fileName, formatBytes(selected.fileSize)].filter(Boolean).join(' · ')}
                  </span>
                </p>
              ) : null}
              <p className="text-xs text-slate-500">
                등록 {selected.createdByEmail || '강사'} · {new Date(selected.updatedAt).toLocaleString('ko-KR')}
              </p>
              {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
            </article>
          )}
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`${basePath}/new`} className={btnPrimary}>
              새 자료 등록
            </Link>
          </div>
          <section aria-labelledby="teacher-content-library-filters-heading" className="space-y-2">
            <h2 id="teacher-content-library-filters-heading" className="text-sm font-semibold text-slate-800">
              검색 · 필터
            </h2>
            <input
              className={inputClass()}
              type="search"
              placeholder="제목, 메모, 태그, URL 검색"
              value={filters.query}
              onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                className={inputClass()}
                value={filters.category}
                aria-label="카테고리 필터"
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    category: event.target.value as TeacherContentLibraryFilters['category'],
                  }))
                }
              >
                <option value="all">카테고리 전체</option>
                {TEACHER_CONTENT_LIBRARY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <select
                className={inputClass()}
                value={filters.status}
                aria-label="상태 필터"
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: event.target.value as TeacherContentLibraryFilters['status'],
                  }))
                }
              >
                <option value="all">상태 전체</option>
                {TEACHER_CONTENT_LIBRARY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {loading ? (
            <p className="text-sm text-slate-500">자료를 불러오는 중…</p>
          ) : visible.length === 0 ? (
            <EmptyState title="저장된 자료가 없습니다" description="URL을 붙여넣고 짧게 메모한 뒤 저장하세요." />
          ) : (
            <ul className="space-y-2">
              {visible.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`${basePath}/${item.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.category} · {item.status}
                      {item.tags.length > 0 ? ` · ${item.tags.join(', ')}` : ''}
                    </p>
                    {item.memo ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-700">{item.memo}</p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="자료 삭제"
        message="이 자료를 삭제하면 첨부파일도 함께 삭제됩니다."
        busy={saving}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  )
}
