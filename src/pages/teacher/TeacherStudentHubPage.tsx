import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { useData } from '../../hooks/useData'
import { GRADES, btnPrimary, btnSecondary, inputClass } from '../../utils/labels'
import { getClassOptionsForGrade } from '../../utils/studentGradeClass'
import { createId } from '../../utils/id'
import type { HubAudienceType, HubInboxItem, HubMaterial, HubVideo } from '../../hub/types'
import { HUB_QUESTION_ATTACHMENTS_BUCKET } from '../../hub/types'
import {
  teacherDeleteVideo,
  teacherFetchInbox,
  teacherFetchMaterials,
  teacherFetchVideos,
  teacherSaveVideo,
  teacherSetMaterialStatus,
  teacherSignedUrl,
  teacherUpdateInboxStatus,
  teacherUpdateMaterialMetadata,
  teacherUploadMaterial,
} from '../../hub/teacherHubRepo'
import { parseTimestampLines, parseYoutubeVideoId } from '../../hub/youtube'
import { HUB_MATERIAL_ACCEPT } from '../../hub/hubFilePolicy'

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
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <select
        className={inputClass()}
        value={props.audienceType}
        onChange={(event) =>
          props.onChange({
            audienceType: event.target.value as HubAudienceType,
            targetGrade: props.targetGrade,
            targetClassName: props.targetClassName,
            targetStudentId: props.targetStudentId,
          })
        }
      >
        <option value="all">전체</option>
        <option value="grade">학년</option>
        <option value="class">반</option>
        <option value="student">개별 학생</option>
      </select>
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
      {props.audienceType === 'student' ? (
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
      ) : (
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
      )}
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
        오늘의 과제는 Today Report의 「반 공통 오늘 과제」에서 입력합니다. 학생 앱 연결은 다음 단계에서
        적용됩니다. 이 화면에서 과제를 다시 입력하지 마세요.
      </p>
      <p className="text-sm text-slate-600">
        학생 질문은 기존 <Link className="font-semibold text-navy-700" to="/questions">질문하기</Link>에서
        source 필터로 확인합니다.
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
          onSaved={async () => {
            showToast('자료를 저장했습니다.')
            await reload()
          }}
        />
      ) : null}
      {tab === 'videos' ? (
        <VideoPanel
          videos={videos}
          students={students.map((student) => ({ id: student.id, name: student.name }))}
          onSaved={async () => {
            showToast('영상을 저장했습니다.')
            await reload()
          }}
        />
      ) : null}
      {tab === 'requests' || tab === 'suggestions' ? (
        <InboxPanel
          kind={tab === 'requests' ? 'material_request' : 'suggestion'}
          items={inbox.filter((item) => item.kind === (tab === 'requests' ? 'material_request' : 'suggestion'))}
          onChanged={reload}
        />
      ) : null}
    </div>
  )
}


function MaterialPanel({
  materials,
  students,
  onSaved,
}: {
  materials: HubMaterial[]
  students: { id: string; name: string }[]
  onSaved: () => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [audience, setAudience] = useState({
    audienceType: 'all' as HubAudienceType,
    targetGrade: '',
    targetClassName: '',
    targetStudentId: '',
  })
  const [busy, setBusy] = useState(false)
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

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) return
    setBusy(true)
    try {
      await teacherUploadMaterial({
        title,
        description,
        file,
        audienceType: audience.audienceType,
        targetGrade: audience.targetGrade || null,
        targetClassName: audience.targetClassName || null,
        targetStudentId: audience.audienceType === 'student' ? audience.targetStudentId || null : null,
        publish: true,
      })
      setTitle('')
      setDescription('')
      setFile(null)
      await onSaved()
    } finally {
      setBusy(false)
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
    setMetaEdit(null)
    await onSaved()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="font-bold text-navy-900">자료 업로드</h3>
          <input className={inputClass()} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목" required />
          <textarea className={inputClass()} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="설명 (선택)" />
          <AudienceFields {...audience} students={students} onChange={setAudience} />
          <input
            type="file"
            accept={HUB_MATERIAL_ACCEPT}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            required
          />
          <p className="break-keep text-xs text-slate-500">PDF/이미지는 미리보기, HWP·DOC·DOCX·PPT·PPTX는 다운로드 우선. 파일 교체는 새 자료 업로드.</p>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? '업로드 중…' : '게시'}
          </button>
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
              {item.kind} · {item.status} · {students.find((student) => student.id === item.targetStudentId)?.name ?? item.audienceType}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className={btnSecondary} onClick={() => startMetaEdit(item)}>
                수정
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={async () => {
                  await teacherSetMaterialStatus(item.id, item.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED')
                  await onSaved()
                }}
              >
                {item.status === 'PUBLISHED' ? '숨기기' : '게시'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function VideoPanel({
  videos,
  students,
  onSaved,
}: {
  videos: HubVideo[]
  students: { id: string; name: string }[]
  onSaved: () => Promise<void>
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

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const videoId = parseYoutubeVideoId(form.url)
    if (!videoId) throw new Error('YouTube URL을 확인해 주세요.')
    const existing = videos.find((item) => item.id === form.id)
    await teacherSaveVideo({
      id: form.id || createId(),
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
    setForm(emptyForm)
    await onSaved()
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
                className={btnSecondary}
                onClick={async () => {
                  await teacherDeleteVideo(item.id)
                  if (form.id === item.id) setForm(emptyForm)
                  await onSaved()
                }}
              >
                삭제
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function InboxPanel({
  kind,
  items,
  onChanged,
}: {
  kind: 'material_request' | 'suggestion'
  items: HubInboxItem[]
  onChanged: () => Promise<void>
}) {
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
          <div className="mt-3 flex flex-wrap gap-2">
            {['접수', '처리중', '완료'].map((status) => (
              <button
                key={status}
                type="button"
                className={btnSecondary}
                onClick={async () => {
                  await teacherUpdateInboxStatus(item.id, status)
                  await onChanged()
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
