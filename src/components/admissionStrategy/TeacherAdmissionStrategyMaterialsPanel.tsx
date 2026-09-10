import { ArrowDown, ArrowUp, Eye, EyeOff, Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { EmptyState } from '../ui/EmptyState'
import { Modal } from '../ui/Modal'
import { RecordActions } from '../ui/RecordActions'
import { StatusBadge } from '../ui/StatusBadge'
import { useAuth } from '../../contexts/AuthContext'
import { useTeacherAdmissionStrategyMaterials } from '../../hooks/useTeacherAdmissionStrategyMaterials'
import { useData } from '../../hooks/useData'
import { ConnectedAdmissionStrategyViewer } from './ConnectedAdmissionStrategyViewer'
import { processAdmissionStrategyUpload } from '../../lib/admissionStrategy/materialUploadFlow'
import {
  canPublishMaterial,
  conversionStatusLabel,
  materialStatusLabel,
  nextDisplayOrder,
} from '../../lib/db/admissionStrategyMaterialModel'
import { teacherFacingError, validateUploadFile } from '../../lib/admissionStrategy/storagePaths'
import type { AdmissionStrategyMaterial, AdmissionStrategyMaterialStatus } from '../../types/admissionStrategyMaterial'
import { createId } from '../../utils/id'
import { formatKoreanDate } from '../../utils/date'
import { btnPrimary, btnSecondary, inputClass } from '../../utils/labels'
import { createTimestamps, touchRecord } from '../../utils/recordStorage'
import { requireNonEmpty } from '../../utils/validation'

type FormState = {
  id?: string
  title: string
  description: string
  status: AdmissionStrategyMaterialStatus
  file: File | null
}

function emptyForm(): FormState {
  return { title: '', description: '', status: 'DRAFT', file: null }
}

function createdDateLabel(iso: string): string {
  const day = iso.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? formatKoreanDate(day) : iso
}

export function TeacherAdmissionStrategyMaterialsPanel() {
  const { user } = useAuth()
  const { showToast } = useData()
  const { materials, loading, saveMaterial, setStatus, moveMaterial, removeMaterial } =
    useTeacherAdmissionStrategyMaterials()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdmissionStrategyMaterial | null>(null)
  const [preview, setPreview] = useState<AdmissionStrategyMaterial | null>(null)

  const sorted = materials
  const existing = useMemo(
    () => (form.id ? materials.find((item) => item.id === form.id) : undefined),
    [form.id, materials],
  )

  const openAdd = () => {
    setForm(emptyForm())
    setErrors({})
    setProgress('')
    setModalOpen(true)
  }

  const openEdit = (material: AdmissionStrategyMaterial) => {
    setForm({
      id: material.id,
      title: material.title,
      description: material.description,
      status: material.status,
      file: null,
    })
    setErrors({})
    setProgress('')
    setModalOpen(true)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    const titleErr = requireNonEmpty(form.title, '자료 이름')
    if (titleErr) nextErrors.title = titleErr
    if (!form.id && !form.file) nextErrors.file = 'PDF 또는 PPTX 파일을 선택해 주세요.'
    if (form.file) {
      const fileErr = validateUploadFile(form.file)
      if (fileErr) nextErrors.file = fileErr
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setBusy(true)
    try {
      const timestamps = existing ? touchRecord(existing) : createTimestamps()
      let record: AdmissionStrategyMaterial = existing
        ? {
            ...existing,
            title: form.title.trim(),
            description: form.description.trim(),
            status: form.status === 'PUBLISHED' && !canPublishMaterial(existing) ? existing.status : form.status,
            updatedAt: timestamps.updatedAt,
          }
        : {
            id: createId(),
            title: form.title.trim(),
            description: form.description.trim(),
            materialType: 'pdf',
            sourceFilePath: null,
            originalFileName: form.file?.name ?? '',
            status: 'DRAFT',
            conversionStatus: 'pending',
            conversionError: '',
            displayOrder: nextDisplayOrder(materials),
            pageCount: 0,
            publishedAt: null,
            createdBy: user?.id ?? null,
            createdAt: timestamps.createdAt,
            updatedAt: timestamps.updatedAt,
            pages: [],
          }

      await saveMaterial(record, '자료 정보를 저장했습니다.')
      if (form.file) {
        record = await processAdmissionStrategyUpload({
          material: record,
          file: form.file,
          onProgress: (item) => setProgress(item.message),
        })
      }

      const shouldPublish = form.status === 'PUBLISHED'
      if (shouldPublish) {
        if (!canPublishMaterial(record)) {
          showToast('페이지 변환이 끝난 뒤에만 게시할 수 있습니다. PDF를 업로드해 주세요.')
        } else {
          await setStatus(
            {
              ...record,
              publishedAt: record.publishedAt ?? new Date().toISOString(),
            },
            'PUBLISHED',
          )
        }
      } else if (existing && form.status !== existing.status) {
        await setStatus(record, form.status)
      }
      setModalOpen(false)
    } catch (error) {
      showToast(teacherFacingError(error, '자료를 저장하지 못했습니다.'))
    } finally {
      setBusy(false)
      setProgress('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-navy-900">입시전략 자료 관리</h3>
          <p className="mt-1 text-sm text-slate-500">
            PDF를 올리면 학부모 앱 이름표와 전체화면 뷰어로 자동 게시됩니다. PPTX는 원본 보관만 되며, 열람용 PDF가
            필요합니다.
          </p>
        </div>
        <button type="button" onClick={openAdd} className={`${btnPrimary} inline-flex items-center gap-2`}>
          <Plus className="h-4 w-4" />
          자료 추가
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : sorted.length === 0 ? (
        <EmptyState
          title="등록된 입시전략 자료가 없습니다."
          description="자료 이름표를 정한 뒤 PDF를 업로드하면 학부모 앱에 게시할 수 있습니다."
        />
      ) : (
        <div className="space-y-3">
          {sorted.map((material, index) => (
            <article key={material.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="break-anywhere text-base font-bold text-navy-900">{material.title}</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {createdDateLabel(material.createdAt)}
                    {material.originalFileName ? ` · ${material.originalFileName}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    label={materialStatusLabel(material.status)}
                    colorClass={
                      material.status === 'PUBLISHED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : material.status === 'HIDDEN'
                          ? 'bg-amber-50 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                    }
                  />
                  <StatusBadge
                    label={conversionStatusLabel(material.conversionStatus)}
                    colorClass={
                      material.conversionStatus === 'ready'
                        ? 'bg-sky-50 text-sky-800'
                        : material.conversionStatus === 'failed'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-slate-100 text-slate-600'
                    }
                  />
                </div>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-400">페이지</dt>
                  <dd>{material.pageCount ?? 0}쪽</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">게시</dt>
                  <dd>{material.status === 'PUBLISHED' ? '게시됨' : '미게시'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">순서</dt>
                  <dd>{index + 1}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">형식</dt>
                  <dd>{material.materialType.toUpperCase()}</dd>
                </div>
              </dl>

              {material.conversionError && (
                <p className="mt-2 text-sm text-rose-600">{material.conversionError}</p>
              )}
              {material.description && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{material.description}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`${btnSecondary} px-3 py-1.5 text-xs`}
                  disabled={index === 0}
                  onClick={() => void moveMaterial(material.id, 'up')}
                >
                  <span className="inline-flex items-center gap-1">
                    <ArrowUp className="h-3.5 w-3.5" />
                    위로
                  </span>
                </button>
                <button
                  type="button"
                  className={`${btnSecondary} px-3 py-1.5 text-xs`}
                  disabled={index === sorted.length - 1}
                  onClick={() => void moveMaterial(material.id, 'down')}
                >
                  <span className="inline-flex items-center gap-1">
                    <ArrowDown className="h-3.5 w-3.5" />
                    아래로
                  </span>
                </button>
                {canPublishMaterial(material) && (
                  <button
                    type="button"
                    className={`${btnSecondary} px-3 py-1.5 text-xs`}
                    onClick={() => setPreview(material)}
                  >
                    미리보기
                  </button>
                )}
                {material.status !== 'PUBLISHED' && (
                  <button
                    type="button"
                    className={`${btnPrimary} px-3 py-1.5 text-xs`}
                    onClick={() => {
                      void setStatus(material, 'PUBLISHED').catch((error: unknown) => {
                        showToast(teacherFacingError(error, '게시하지 못했습니다.'))
                      })
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      게시
                    </span>
                  </button>
                )}
                {material.status === 'PUBLISHED' && (
                  <button
                    type="button"
                    className={`${btnSecondary} px-3 py-1.5 text-xs`}
                    onClick={() => {
                      void setStatus(material, 'HIDDEN').catch((error: unknown) => {
                        showToast(teacherFacingError(error, '숨기지 못했습니다.'))
                      })
                    }}
                  >
                    <span className="inline-flex items-center gap-1">
                      <EyeOff className="h-3.5 w-3.5" />
                      숨김
                    </span>
                  </button>
                )}
                <RecordActions onEdit={() => openEdit(material)} onDelete={() => setDeleteTarget(material)} />
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          if (!busy) setModalOpen(false)
        }}
        title={form.id ? '입시전략 자료 수정' : '입시전략 자료 추가'}
      >
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">자료 이름 / 이름표 *</label>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className={inputClass(errors.title)}
              placeholder="예: 2028 대입 완전정리"
              disabled={busy}
            />
            {errors.title && <p className="mt-1 text-sm text-rose-500">{errors.title}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">설명 (선택)</label>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className={`${inputClass()} min-h-24`}
              disabled={busy}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              파일 {form.id ? '(바꾸려면 선택)' : '*'}
            </label>
            <input
              type="file"
              accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              disabled={busy}
              onChange={(event) => setForm({ ...form, file: event.target.files?.[0] ?? null })}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            <p className="mt-1 text-xs text-slate-500">
              PDF는 페이지 이미지로 변환되어 학부모 앱에서 열립니다. PPTX는 원본 보관만 가능합니다.
            </p>
            {form.file && <p className="mt-1 text-sm text-slate-600">{form.file.name}</p>}
            {existing?.originalFileName && !form.file && (
              <p className="mt-1 text-sm text-slate-500">현재 파일: {existing.originalFileName}</p>
            )}
            {errors.file && <p className="mt-1 text-sm text-rose-500">{errors.file}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">게시 상태</label>
            <select
              value={form.status}
              disabled={busy}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as AdmissionStrategyMaterialStatus })
              }
              className={inputClass()}
            >
              <option value="DRAFT">초안</option>
              <option value="PUBLISHED">게시</option>
              <option value="HIDDEN">숨김</option>
            </select>
          </div>
          {progress && <p className="text-sm text-navy-700">{progress}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" disabled={busy} onClick={() => setModalOpen(false)} className={btnSecondary}>
              취소
            </button>
            <button type="submit" disabled={busy} className={btnPrimary}>
              {busy ? '처리 중...' : '저장'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="입시전략 자료 삭제"
        message="이 자료와 업로드된 파일만 삭제합니다. 학생·학부모·수업 데이터는 건드리지 않습니다."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          void removeMaterial(deleteTarget.id).catch((error: unknown) => {
            showToast(teacherFacingError(error, '자료를 삭제하지 못했습니다.'))
          })
          setDeleteTarget(null)
        }}
      />

      <ConnectedAdmissionStrategyViewer
        key={preview?.id ?? 'teacher-preview'}
        open={Boolean(preview)}
        title={preview?.title ?? ''}
        pages={preview?.pages ?? []}
        onClose={() => setPreview(null)}
      />
    </div>
  )
}
