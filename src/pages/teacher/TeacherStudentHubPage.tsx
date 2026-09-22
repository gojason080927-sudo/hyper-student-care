import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { useData } from '../../hooks/useData'
import { GRADES, btnPrimary, btnSecondary, inputClass } from '../../utils/labels'
import { getClassOptionsForGrade } from '../../utils/studentGradeClass'
import { createId } from '../../utils/id'
import type { HubAudienceType, HubInboxItem, HubMaterial, HubVideo } from '../../hub/types'
import { HUB_QUESTION_ATTACHMENTS_BUCKET } from '../../hub/types'
import {
  teacherDeleteMaterial,
  teacherDeleteVideo,
  teacherFetchInbox,
  teacherFetchMaterials,
  teacherFetchVideos,
  teacherSaveInboxReply,
  teacherSaveVideo,
  teacherSetMaterialStatus,
  teacherSignedUrl,
  teacherUpdateInboxStatus,
  teacherUpdateMaterialMetadata,
  teacherUploadMaterial,
} from '../../hub/teacherHubRepo'
import { parseTimestampLines, parseYoutubeVideoId } from '../../hub/youtube'
import { HUB_MATERIAL_ACCEPT } from '../../hub/hubFilePolicy'
import {
  hubAudienceSelectionError,
  hubAudienceSummary,
  nextHubAudienceOnTypeChange,
} from '../../hub/hubAudience'
import {
  applyFolderPickerAttributes,
  formatMaterialBatchResult,
  hubMaterialBatchPushEntityId,
  mergeMaterialFiles,
  pickHubMaterialFiles,
} from '../../hub/hubMaterialBatch'
import { notifyHubPush } from '../../lib/hubPushInvoke'
import {
  HUB_INBOX_REPLY_SAVE_FAILURE,
  HUB_INBOX_REPLY_SAVE_SUCCESS,
  HUB_INBOX_STATUS_SAVE_FAILURE,
  mergePatchedHubInboxItem,
} from '../../hub/hubInboxWrite'

type Tab = 'materials' | 'videos' | 'requests' | 'suggestions'

const tabs: { id: Tab; label: string }[] = [
  { id: 'materials', label: '문제 자료' },
  { id: 'videos', label: '영상 자료' },
  { id: 'requests', label: '자료 요청' },
  { id: 'suggestions', label: '건의' },
]

function AudienceFields(props: {
  audienceType: HubAudienceType
  targetGrade: string
  targetClassName: string
  targetStudentId: string
  students?: { id: string; name: string }[]
  onChange: (next: {
    audienceType: HubAudienceType
    targetGrade: string
    targetClassName: string
    targetStudentId: string
  }) => void
}) {
  const classOptions = getClassOptionsForGrade(props.targetGrade)
  const showGrade = props.audienceType === 'grade' || props.audienceType === 'class'
  const showClass = props.audienceType === 'class'
  const showStudent = props.audienceType === 'student'
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <select
        className={inputClass()}
        value={props.audienceType}
        onChange={(event) =>
          props.onChange(
            nextHubAudienceOnTypeChange(props, event.target.value as HubAudienceType),
          )
        }
      >
        <option value="all">전체 학생</option>
        <option value="grade">학년 전체</option>
        <option value="class">특정 반</option>
        <option value="student">개별 학생</option>
      </select>
      {showGrade ? (
        <select
          className={inputClass()}
          value={props.targetGrade}
          onChange={(event) =>
            props.onChange({
              audienceType: props.audienceType,
              targetGrade: event.target.value,
              targetClassName: '',
              targetStudentId: props.targetStudentId,
            })
          }
        >
          <option value="">학년 선택</option>
          {GRADES.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
      ) : null}
      {showClass ? (
        <select
          className={inputClass()}
          value={props.targetClassName}
          onChange={(event) =>
            props.onChange({
              audienceType: props.audienceType,
              targetGrade: props.targetGrade,
              targetClassName: event.target.value,
              targetStudentId: props.targetStudentId,
            })
          }
        >
          <option value="">반 선택</option>
          {classOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : null}
      {showStudent ? (
        <select
          className={inputClass()}
          value={props.targetStudentId}
          onChange={(event) =>
            props.onChange({
              audienceType: props.audienceType,
              targetGrade: props.targetGrade,
              targetClassName: props.targetClassName,
              targetStudentId: event.target.value,
            })
          }
        >
          <option value="">학생 선택</option>
          {(props.students ?? []).map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  )
}

export function TeacherStudentHubPage() {
  const { showToast, students } = useData()
  const [tab, setTab] = useState<Tab>('materials')
  const [error, setError] = useState('')
  const [materials, setMaterials] = useState<HubMaterial[]>([])
  const [videos, setVideos] = useState<HubVideo[]>([])
  const [inbox, setInbox] = useState<HubInboxItem[]>([])

  const reload = async () => {
    try {
      const [nextMaterials, nextVideos, nextInbox] = await Promise.all([
        teacherFetchMaterials(),
        teacherFetchVideos(),
        teacherFetchInbox(),
      ])
      setMaterials(nextMaterials)
      setVideos(nextVideos)
      setInbox(nextInbox)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hub 데이터를 불러오지 못했습니다. SQL 적용 전일 수 있습니다.')
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="학생 학습자료"
        description="학생 앱의 문제 자료·영상 자료를 등록하고 관리합니다. YouTube 일부공개는 ACL이 아닙니다."
      />
      <p className="break-keep rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
        오늘의 과제는 Today Report의 「반 공통 오늘 과제」에서 한 번만 입력합니다. 학생 Hub 「오늘의
        과제」와 학부모 Today Report에 자동으로 표시됩니다. 이 화면에서 같은 과제를 다시 입력하지
        마세요.
      </p>
      <p className="text-sm text-slate-600">
        학생 Hub 건의는 아래 「건의」 탭에서 확인하고 답변합니다. 학부모 건의사항과 학생 질문은{' '}
        <Link className="font-semibold text-navy-700" to="/questions">
          질문하기
        </Link>
        에서 source·유형 필터로 확인합니다.
      </p>
      {error ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${
              tab === item.id ? 'bg-[#163A70] text-white' : 'bg-white text-slate-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'materials' ? (
        <MaterialPanel
          materials={materials}
          students={students.map((student) => ({ id: student.id, name: student.name }))}
          showToast={showToast}
          onRemoved={(id) => setMaterials((prev) => prev.filter((item) => item.id !== id))}
          onChanged={reload}
        />
      ) : null}
      {tab === 'videos' ? (
        <VideoPanel
          videos={videos}
          students={students.map((student) => ({ id: student.id, name: student.name }))}
          showToast={showToast}
          onRemoved={(id) => setVideos((prev) => prev.filter((item) => item.id !== id))}
          onChanged={reload}
        />
      ) : null}
      {tab === 'requests' || tab === 'suggestions' ? (
        <InboxPanel
          kind={tab === 'requests' ? 'material_request' : 'suggestion'}
          items={inbox.filter((item) => item.kind === (tab === 'requests' ? 'material_request' : 'suggestion'))}
          showToast={showToast}
          onItemPatched={(id, patch) =>
            setInbox((prev) => mergePatchedHubInboxItem(prev, id, patch))
          }
          onChanged={reload}
        />
      ) : null}
    </div>
  )
}

const deleteBtnClass =
  'min-h-11 rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60'

function MaterialPanel({
  materials,
  students,
  onChanged,
  onRemoved,
  showToast,
}: {
  materials: HubMaterial[]
  students: { id: string; name: string }[]
  onChanged: () => Promise<void>
  onRemoved: (id: string) => void
  showToast: (text: string) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [skippedUnsupported, setSkippedUnsupported] = useState<string[]>([])
  const [failedNames, setFailedNames] = useState<string[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [audience, setAudience] = useState({
    audienceType: 'all' as HubAudienceType,
    targetGrade: '',
    targetClassName: '',
    targetStudentId: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [metaEdit, setMetaEdit] = useState<HubMaterial | null>(null)
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [metaStatus, setMetaStatus] = useState<HubMaterial['status']>('PUBLISHED')
  const [metaAudience, setMetaAudience] = useState({
    audienceType: 'all' as HubAudienceType,
    targetGrade: '',
    targetClassName: '',
    targetStudentId: '',
  })
  const [deleteTarget, setDeleteTarget] = useState<HubMaterial | null>(null)
  const [deleting, setDeleting] = useState(false)

  const picked = pickHubMaterialFiles(files)
  const accepted = picked.accepted

  const applyIncomingFiles = (incoming: Iterable<File>) => {
    const merged = mergeMaterialFiles(files, incoming)
    const next = pickHubMaterialFiles(merged)
    setFiles(next.accepted.map((item) => item.file))
    setSkippedUnsupported(next.skipped.filter((item) => item.reason === 'unsupported').map((item) => item.name))
    setFailedNames((prev) => prev.filter((name) => next.accepted.some((item) => item.file.name === name)))
    if (next.accepted.length === 1 && !title.trim()) {
      setTitle(next.accepted[0].title)
    }
  }

  const removeFile = (index: number) => {
    const nextFiles = files.filter((_, itemIndex) => itemIndex !== index)
    const next = pickHubMaterialFiles(nextFiles)
    setFiles(next.accepted.map((item) => item.file))
    setFailedNames((prev) => prev.filter((name) => next.accepted.some((item) => item.file.name === name)))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const batch = pickHubMaterialFiles(files)
    if (batch.accepted.length === 0) {
      setError('파일을 선택해 주세요.')
      return
    }
    const audienceError = hubAudienceSelectionError(audience)
    if (audienceError) {
      setError(audienceError)
      return
    }
    const queue = batch.accepted
    if (queue.length === 0) {
      setError('업로드할 파일이 없습니다.')
      return
    }
    setBusy(true)
    setError('')
    setProgress({ done: 0, total: queue.length })
    const successIds: string[] = []
    const nextFailed: string[] = []
    const succeededNames = new Set<string>()
    try {
      for (let index = 0; index < queue.length; index += 1) {
        const item = queue[index]
        const itemTitle =
          queue.length === 1 && title.trim() ? title.trim() : item.title
        try {
          const saved = await teacherUploadMaterial({
            title: itemTitle,
            description,
            file: item.file,
            audienceType: audience.audienceType,
            targetGrade: audience.targetGrade || null,
            targetClassName: audience.targetClassName || null,
            targetStudentId: audience.audienceType === 'student' ? audience.targetStudentId || null : null,
            publish: true,
          })
          successIds.push(saved.id)
          succeededNames.add(item.file.name)
        } catch {
          nextFailed.push(item.file.name)
        }
        setProgress({ done: index + 1, total: queue.length })
      }
      const pushId = hubMaterialBatchPushEntityId(successIds)
      if (pushId) notifyHubPush({ event: 'material_saved', entityId: pushId })
      const remaining = files.filter((file) => nextFailed.includes(file.name) && !succeededNames.has(file.name))
      setFiles(remaining)
      setFailedNames(nextFailed)
      setSkippedUnsupported([])
      if (nextFailed.length === 0) {
        setTitle('')
        setDescription('')
      }
      const summary = formatMaterialBatchResult(successIds.length, nextFailed)
      if (successIds.length > 0) showToast(summary)
      if (nextFailed.length > 0) {
        setError(`${summary}\n${nextFailed.join('\n')}`)
      } else {
        setError('')
      }
      if (successIds.length > 0) await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : '자료 업로드에 실패했습니다.')
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  const startMetaEdit = (item: HubMaterial) => {
    setMetaEdit(item)
    setMetaTitle(item.title)
    setMetaDescription(item.description)
    setMetaStatus(item.status)
    setMetaAudience({
      audienceType: item.audienceType,
      targetGrade: item.targetGrade ?? '',
      targetClassName: item.targetClassName ?? '',
      targetStudentId: item.targetStudentId ?? '',
    })
  }

  const saveMeta = async (event: FormEvent) => {
    event.preventDefault()
    if (!metaEdit) return
    const audienceError = hubAudienceSelectionError(metaAudience)
    if (audienceError) {
      setError(audienceError)
      return
    }
    setError('')
    try {
      await teacherUpdateMaterialMetadata({
        id: metaEdit.id,
        title: metaTitle,
        description: metaDescription,
        audienceType: metaAudience.audienceType,
        targetGrade: metaAudience.targetGrade || null,
        targetClassName: metaAudience.targetClassName || null,
        targetStudentId: metaAudience.audienceType === 'student' ? metaAudience.targetStudentId || null : null,
        status: metaStatus,
        publishedAt: metaEdit.publishedAt,
      })
      notifyHubPush({
        event: 'material_saved',
        entityId: metaEdit.id,
        previous: { published: metaEdit.status === 'PUBLISHED' },
      })
      setMetaEdit(null)
      showToast('자료를 저장했습니다.')
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : '자료 정보 수정에 실패했습니다.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    const target = deleteTarget
    setDeleting(true)
    setError('')
    try {
      await teacherDeleteMaterial(target)
      if (metaEdit?.id === target.id) setMetaEdit(null)
      onRemoved(target.id)
      setDeleteTarget(null)
      showToast('자료를 삭제했습니다.')
      await onChanged().catch(() => undefined)
    } catch (err) {
      const message = err instanceof Error ? err.message : '자료 삭제에 실패했습니다.'
      setError(message)
      showToast(message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="font-bold text-navy-900">자료 업로드</h3>
          {error ? <p className="whitespace-pre-wrap break-keep text-sm text-rose-600">{error}</p> : null}
          {accepted.length <= 1 ? (
            <input
              className={inputClass()}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="제목"
              required={accepted.length === 1}
            />
          ) : (
            <p className="break-keep text-xs text-slate-500">여러 자료는 각 파일명(확장자 제외)이 제목으로 저장됩니다.</p>
          )}
          <textarea className={inputClass()} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="설명 (선택)" />
          <AudienceFields {...audience} students={students} onChange={setAudience} />
          <div className="flex flex-wrap gap-2">
            <label className={`${btnSecondary} cursor-pointer`}>
              파일 선택
              <input
                type="file"
                accept={HUB_MATERIAL_ACCEPT}
                multiple
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  applyIncomingFiles(event.target.files ?? [])
                  event.target.value = ''
                }}
              />
            </label>
            <label className={`${btnSecondary} cursor-pointer`}>
              폴더 선택
              <input
                ref={applyFolderPickerAttributes}
                type="file"
                accept={HUB_MATERIAL_ACCEPT}
                multiple
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  applyIncomingFiles(event.target.files ?? [])
                  event.target.value = ''
                }}
              />
            </label>
          </div>
          {accepted.length > 0 ? (
            <div className="space-y-2 rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-700">선택된 자료 {accepted.length}개</p>
              <ul className="space-y-1">
                {accepted.map((item, index) => (
                  <li key={`${item.file.name}-${index}`} className="flex items-center justify-between gap-2 text-sm text-slate-700">
                    <span className="break-anywhere">✓ {item.file.name}</span>
                    <button
                      type="button"
                      className="shrink-0 text-xs font-semibold text-rose-600 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => removeFile(index)}
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {skippedUnsupported.length > 0 ? (
            <div className="break-keep text-xs text-amber-800">
              <p>
                업로드 가능 {accepted.length}개 · 지원하지 않는 파일 {skippedUnsupported.length}개 제외
              </p>
              <ul className="mt-1 list-disc pl-4">
                {skippedUnsupported.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {progress ? (
            <p className="text-sm font-semibold text-navy-700">
              {progress.done} / {progress.total} 업로드 완료
            </p>
          ) : null}
          <p className="break-keep text-xs text-slate-500">PDF/이미지는 미리보기, HWP·DOC·DOCX·PPT·PPTX는 다운로드 우선. 파일 교체는 새 자료 업로드.</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className={btnPrimary} disabled={busy || accepted.length === 0}>
              {busy ? '업로드 중…' : failedNames.length > 0 ? '실패 파일 다시 시도' : '게시'}
            </button>
          </div>
        </form>
        {metaEdit ? (
          <form onSubmit={(event) => void saveMeta(event)} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="font-bold text-navy-900">자료 정보 수정</h3>
            <p className="break-keep text-xs text-slate-500">원본 파일은 바꾸지 않습니다. 파일 교체가 필요하면 새 자료를 업로드하세요.</p>
            <input className={inputClass()} value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} required />
            <textarea className={inputClass()} value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} />
            <AudienceFields {...metaAudience} students={students} onChange={setMetaAudience} />
            <select
              className={inputClass()}
              value={metaStatus}
              onChange={(event) => setMetaStatus(event.target.value as HubMaterial['status'])}
            >
              <option value="PUBLISHED">게시</option>
              <option value="DRAFT">초안</option>
              <option value="HIDDEN">숨김</option>
            </select>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={btnPrimary}>
                정보 저장
              </button>
              <button type="button" className={btnSecondary} onClick={() => setMetaEdit(null)}>
                취소
              </button>
            </div>
          </form>
        ) : null}
      </div>
      <div className="space-y-3">
        {materials.length === 0 ? <EmptyState title="자료가 없습니다." /> : null}
        {materials.map((item) => (
          <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="break-anywhere font-semibold">{item.title}</p>
            <p className="break-keep text-xs text-slate-500">
              {item.kind} · {item.status} ·{' '}
              {hubAudienceSummary(
                item,
                students.find((student) => student.id === item.targetStudentId)?.name,
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={btnSecondary} onClick={() => startMetaEdit(item)}>
                수정
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={async () => {
                  const previousPublished = item.status === 'PUBLISHED'
                  await teacherSetMaterialStatus(item.id, previousPublished ? 'HIDDEN' : 'PUBLISHED')
                  notifyHubPush({
                    event: 'material_saved',
                    entityId: item.id,
                    previous: { published: previousPublished },
                  })
                  showToast('자료를 저장했습니다.')
                  await onChanged()
                }}
              >
                {item.status === 'PUBLISHED' ? '숨기기' : '게시'}
              </button>
              <button
                type="button"
                className={deleteBtnClass}
                disabled={deleting}
                onClick={() => setDeleteTarget(item)}
              >
                삭제
              </button>
            </div>
          </article>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="문제 자료 삭제"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" 자료를 삭제합니다. 학생 Hub에서도 더 이상 보이지 않습니다.`
            : ''
        }
        confirmLabel="삭제"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={() => {
          void confirmDelete()
        }}
      />
    </div>
  )
}

function VideoPanel({
  videos,
  students,
  onChanged,
  onRemoved,
  showToast,
}: {
  videos: HubVideo[]
  students: { id: string; name: string }[]
  onChanged: () => Promise<void>
  onRemoved: (id: string) => void
  showToast: (text: string) => void
}) {
  const emptyForm = {
    id: '',
    title: '',
    description: '',
    url: '',
    timestampText: '',
    published: true,
    audienceType: 'all' as HubAudienceType,
    targetGrade: '',
    targetClassName: '',
    targetStudentId: '',
  }
  const [form, setForm] = useState(emptyForm)
  const editing = Boolean(form.id)
  const [deleteTarget, setDeleteTarget] = useState<HubVideo | null>(null)
  const [deleting, setDeleting] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const audienceError = hubAudienceSelectionError(form)
    if (audienceError) throw new Error(audienceError)
    const videoId = parseYoutubeVideoId(form.url)
    if (!videoId) throw new Error('YouTube URL을 확인해 주세요.')
    const existing = videos.find((item) => item.id === form.id)
    const savedId = form.id || createId()
    await teacherSaveVideo({
      id: savedId,
      title: form.title,
      description: form.description,
      videoUrl: form.url.trim(),
      videoId,
      audienceType: form.audienceType,
      targetGrade: form.targetGrade || null,
      targetClassName: form.targetClassName || null,
      targetStudentId: form.audienceType === 'student' ? form.targetStudentId || null : null,
      published: form.published,
      publishedAt: form.published ? existing?.publishedAt || new Date().toISOString() : null,
      timestamps: parseTimestampLines(form.timestampText),
      createdAt: existing?.createdAt || new Date().toISOString(),
    })
    notifyHubPush({
      event: 'video_saved',
      entityId: savedId,
      previous: existing ? { published: existing.published } : undefined,
    })
    setForm(emptyForm)
    showToast(editing ? '영상을 수정했습니다.' : '영상을 저장했습니다.')
    await onChanged()
  }

  const confirmDeleteVideo = async () => {
    if (!deleteTarget || deleting) return
    const target = deleteTarget
    setDeleting(true)
    try {
      await teacherDeleteVideo(target.id)
      if (form.id === target.id) setForm(emptyForm)
      onRemoved(target.id)
      setDeleteTarget(null)
      showToast('영상을 삭제했습니다.')
      await onChanged().catch(() => undefined)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '영상 삭제에 실패했습니다.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={(event) => {
          void submit(event).catch((err) => {
            window.alert(err instanceof Error ? err.message : '저장 실패')
          })
        }}
        className="space-y-3 rounded-2xl bg-white p-5 shadow-sm"
      >
        <h3 className="font-bold text-navy-900">{editing ? '영상 수정' : 'YouTube 일부공개 영상'}</h3>
        <input
          className={inputClass()}
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="제목"
          required
        />
        <textarea
          className={inputClass()}
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="설명"
        />
        <input
          className={inputClass()}
          value={form.url}
          onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
          placeholder="https://youtu.be/..."
          required
        />
        <textarea
          className={inputClass()}
          value={form.timestampText}
          onChange={(event) => setForm((prev) => ({ ...prev, timestampText: event.target.value }))}
          placeholder="타임스탬프 선택 (한 줄에 1:30 제목)"
          rows={3}
        />
        <AudienceFields
          audienceType={form.audienceType}
          targetGrade={form.targetGrade}
          targetClassName={form.targetClassName}
          targetStudentId={form.targetStudentId}
          students={students}
          onChange={(next) => setForm((prev) => ({ ...prev, ...next }))}
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) => setForm((prev) => ({ ...prev, published: event.target.checked }))}
          />
          학생에게 게시
        </label>
        <p className="break-keep text-xs text-slate-500">일부공개(unlisted)는 링크를 아는 사람이 볼 수 있습니다.</p>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={btnPrimary}>
            {editing ? '수정 저장' : '게시'}
          </button>
          {editing ? (
            <button type="button" className={btnSecondary} onClick={() => setForm(emptyForm)}>
              취소
            </button>
          ) : null}
        </div>
      </form>
      <div className="space-y-3">
        {videos.length === 0 ? <EmptyState title="영상이 없습니다." /> : null}
        {videos.map((item) => (
          <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="break-anywhere font-semibold">{item.title}</p>
            <p className="break-keep text-xs text-slate-500">
              {item.videoId}
              {item.published ? ' · 게시' : ' · 숨김'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() =>
                  setForm({
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    url: item.videoUrl,
                    timestampText: item.timestamps
                      .map((stamp) => {
                        const minutes = Math.floor(stamp.seconds / 60)
                        const seconds = stamp.seconds % 60
                        return `${minutes}:${String(seconds).padStart(2, '0')} ${stamp.label}`.trim()
                      })
                      .join('\n'),
                    published: item.published,
                    audienceType: item.audienceType,
                    targetGrade: item.targetGrade ?? '',
                    targetClassName: item.targetClassName ?? '',
                    targetStudentId: item.targetStudentId ?? '',
                  })
                }
              >
                수정
              </button>
              <button
                type="button"
                className={deleteBtnClass}
                disabled={deleting}
                onClick={() => setDeleteTarget(item)}
              >
                삭제
              </button>
            </div>
          </article>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="영상 자료 삭제"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" 영상을 삭제합니다. 학생 Hub에서도 더 이상 보이지 않습니다. YouTube 원본은 삭제하지 않습니다.`
            : ''
        }
        confirmLabel="삭제"
        busy={deleting}
        onCancel={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        onConfirm={() => {
          void confirmDeleteVideo()
        }}
      />
    </div>
  )
}

function InboxPanel({
  kind,
  items,
  showToast,
  onItemPatched,
  onChanged,
}: {
  kind: 'material_request' | 'suggestion'
  items: HubInboxItem[]
  showToast: (text: string) => void
  onItemPatched: (id: string, patch: Partial<HubInboxItem>) => void
  onChanged: () => Promise<void>
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState('')

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <EmptyState title={kind === 'suggestion' ? '건의가 없습니다.' : '자료 요청이 없습니다.'} />
      ) : null}
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">
            {item.studentName || '학생'} · {item.status}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{item.content}</p>
          {item.attachments.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.attachments.map((attachment) => (
                <button
                  key={attachment.id}
                  type="button"
                  className="text-xs font-semibold text-navy-700 underline"
                  onClick={async () => {
                    const url = await teacherSignedUrl(
                      HUB_QUESTION_ATTACHMENTS_BUCKET,
                      attachment.storagePath,
                    )
                    window.open(url, '_blank', 'noopener')
                  }}
                >
                  {attachment.originalName || '이미지 확인'}
                </button>
              ))}
            </div>
          ) : null}
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">교사 답변</span>
            <textarea
              className={inputClass()}
              rows={3}
              value={drafts[item.id] ?? item.teacherReply}
              placeholder="예: 금요일까지 올려주겠습니다."
              disabled={busyId === item.id}
              onChange={(event) =>
                setDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))
              }
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={btnPrimary}
              disabled={busyId === item.id}
              onClick={async () => {
                if (busyId) return
                setBusyId(item.id)
                try {
                  const saved = await teacherSaveInboxReply(
                    item.id,
                    drafts[item.id] ?? item.teacherReply,
                  )
                  onItemPatched(item.id, {
                    teacherReply: saved.teacherReply,
                    teacherRepliedAt: saved.teacherRepliedAt,
                  })
                  setDrafts((prev) => {
                    const next = { ...prev }
                    delete next[item.id]
                    return next
                  })
                  notifyHubPush({
                    event: 'inbox_replied',
                    entityId: item.id,
                    previous: { teacherReply: item.teacherReply },
                  })
                  showToast(HUB_INBOX_REPLY_SAVE_SUCCESS)
                  await onChanged().catch(() => undefined)
                } catch (err) {
                  showToast(err instanceof Error ? err.message : HUB_INBOX_REPLY_SAVE_FAILURE)
                } finally {
                  setBusyId('')
                }
              }}
            >
              {busyId === item.id ? '저장 중…' : '답변 저장'}
            </button>
            {['접수', '처리중', '완료'].map((status) => (
              <button
                key={status}
                type="button"
                className={btnSecondary}
                disabled={busyId === item.id}
                onClick={async () => {
                  if (busyId) return
                  setBusyId(item.id)
                  try {
                    const saved = await teacherUpdateInboxStatus(item.id, status)
                    onItemPatched(item.id, {
                      status: saved.status,
                      teacherReply: saved.teacherReply,
                    })
                    await onChanged().catch(() => undefined)
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : HUB_INBOX_STATUS_SAVE_FAILURE)
                  } finally {
                    setBusyId('')
                  }
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}
