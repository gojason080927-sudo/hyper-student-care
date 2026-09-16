import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { useData } from '../../hooks/useData'
import { GRADES, btnPrimary, btnSecondary, inputClass } from '../../utils/labels'
import { getClassOptionsForGrade } from '../../utils/studentGradeClass'
import { TEXTBOOK_SUBJECTS } from '../../types/records'
import { createId } from '../../utils/id'
import type { HubAssignment, HubAudienceType, HubInboxItem, HubMaterial, HubVideo } from '../../hub/types'
import { HUB_QUESTION_ATTACHMENTS_BUCKET } from '../../hub/types'
import {
  teacherDeleteAssignment,
  teacherDeleteVideo,
  teacherFetchAssignments,
  teacherFetchInbox,
  teacherFetchMaterials,
  teacherFetchVideos,
  teacherSaveAssignment,
  teacherSaveVideo,
  teacherSetMaterialStatus,
  teacherSignedUrl,
  teacherUpdateInboxStatus,
  teacherUploadMaterial,
} from '../../hub/teacherHubRepo'
import { parseTimestampLines, parseYoutubeVideoId } from '../../hub/youtube'

type Tab = 'assignments' | 'materials' | 'videos' | 'requests' | 'suggestions'

const tabs: { id: Tab; label: string }[] = [
  { id: 'assignments', label: '오늘의 과제' },
  { id: 'materials', label: '문제 자료실' },
  { id: 'videos', label: '영상 자료실' },
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
  const [tab, setTab] = useState<Tab>('assignments')
  const [error, setError] = useState('')
  const [assignments, setAssignments] = useState<HubAssignment[]>([])
  const [materials, setMaterials] = useState<HubMaterial[]>([])
  const [videos, setVideos] = useState<HubVideo[]>([])
  const [inbox, setInbox] = useState<HubInboxItem[]>([])

  const reload = async () => {
    try {
      const [nextAssignments, nextMaterials, nextVideos, nextInbox] = await Promise.all([
        teacherFetchAssignments(),
        teacherFetchMaterials(),
        teacherFetchVideos(),
        teacherFetchInbox(),
      ])
      setAssignments(nextAssignments)
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
        title="학생 학습 허브"
        description="반 과제 · 문제/영상 자료실 · 자료요청 · 건의를 관리합니다. YouTube 일부공개는 ACL이 아닙니다."
      />
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
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === item.id ? 'bg-[#163A70] text-white' : 'bg-white text-slate-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'assignments' ? (
        <AssignmentPanel
          assignments={assignments}
          onSaved={async () => {
            showToast('과제를 저장했습니다.')
            await reload()
          }}
        />
      ) : null}
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

function AssignmentPanel({
  assignments,
  onSaved,
}: {
  assignments: HubAssignment[]
  onSaved: () => Promise<void>
}) {
  const [grade, setGrade] = useState('')
  const [className, setClassName] = useState('')
  const [subject, setSubject] = useState('수학')
  const [textbookName, setTextbookName] = useState('')
  const [content, setContent] = useState('')
  const [dueDate, setDueDate] = useState('')
  const classOptions = getClassOptionsForGrade(grade)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await teacherSaveAssignment({
      id: createId(),
      grade,
      className,
      subject,
      textbookName,
      content,
      dueDate: dueDate || null,
      studentId: null,
      published: true,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setContent('')
    await onSaved()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="font-bold text-navy-900">반 과제 게시</h3>
        <select className={inputClass()} value={grade} onChange={(event) => setGrade(event.target.value)} required>
          <option value="">학년</option>
          {GRADES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select className={inputClass()} value={className} onChange={(event) => setClassName(event.target.value)} required>
          <option value="">반</option>
          {classOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select className={inputClass()} value={subject} onChange={(event) => setSubject(event.target.value)}>
          {TEXTBOOK_SUBJECTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <input className={inputClass()} value={textbookName} onChange={(event) => setTextbookName(event.target.value)} placeholder="교재 (선택)" />
        <textarea className={inputClass()} rows={4} value={content} onChange={(event) => setContent(event.target.value)} placeholder="과제 내용" required />
        <input className={inputClass()} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        <button type="submit" className={btnPrimary}>
          게시
        </button>
      </form>
      <div className="space-y-3">
        {assignments.length === 0 ? <EmptyState title="과제가 없습니다." /> : null}
        {assignments.map((item) => (
          <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">
              {item.grade} {item.className} · {item.subject}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{item.content}</p>
            <button
              type="button"
              className={`${btnSecondary} mt-3`}
              onClick={async () => {
                await teacherDeleteAssignment(item.id)
                await onSaved()
              }}
            >
              삭제
            </button>
          </article>
        ))}
      </div>
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

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="font-bold text-navy-900">자료 업로드</h3>
        <input className={inputClass()} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목" required />
        <textarea className={inputClass()} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="설명 (선택)" />
        <AudienceFields {...audience} students={students} onChange={setAudience} />
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.hwp,.hwpx,.docx,.pptx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          required
        />
        <p className="text-xs text-slate-500">PDF/이미지는 미리보기, HWP·DOCX·PPTX는 다운로드 우선.</p>
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? '업로드 중…' : '게시'}
        </button>
      </form>
      <div className="space-y-3">
        {materials.length === 0 ? <EmptyState title="자료가 없습니다." /> : null}
        {materials.map((item) => (
          <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-semibold">{item.title}</p>
            <p className="text-xs text-slate-500">
              {item.kind} · {item.status} · {students.find((student) => student.id === item.targetStudentId)?.name ?? item.audienceType}
            </p>
            <button
              type="button"
              className={`${btnSecondary} mt-2`}
              onClick={async () => {
                await teacherSetMaterialStatus(item.id, item.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED')
                await onSaved()
              }}
            >
              {item.status === 'PUBLISHED' ? '숨기기' : '게시'}
            </button>
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
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [timestampText, setTimestampText] = useState('')
  const [audience, setAudience] = useState({
    audienceType: 'all' as HubAudienceType,
    targetGrade: '',
    targetClassName: '',
    targetStudentId: '',
  })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const videoId = parseYoutubeVideoId(url)
    if (!videoId) throw new Error('YouTube URL을 확인해 주세요.')
    await teacherSaveVideo({
      id: createId(),
      title,
      description,
      videoUrl: url.trim(),
      videoId,
      audienceType: audience.audienceType,
      targetGrade: audience.targetGrade || null,
      targetClassName: audience.targetClassName || null,
      targetStudentId: audience.audienceType === 'student' ? audience.targetStudentId || null : null,
      published: true,
      publishedAt: new Date().toISOString(),
      timestamps: parseTimestampLines(timestampText),
      createdAt: new Date().toISOString(),
    })
    setTitle('')
    setDescription('')
    setUrl('')
    setTimestampText('')
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
        <h3 className="font-bold text-navy-900">YouTube 일부공개 영상</h3>
        <input className={inputClass()} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목" required />
        <textarea className={inputClass()} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="설명" />
        <input className={inputClass()} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://youtu.be/..." required />
        <textarea
          className={inputClass()}
          value={timestampText}
          onChange={(event) => setTimestampText(event.target.value)}
          placeholder="타임스탬프 선택 (한 줄에 1:30 제목)"
          rows={3}
        />
        <AudienceFields {...audience} students={students} onChange={setAudience} />
        <p className="text-xs text-slate-500">일부공개(unlisted)는 링크를 아는 사람이 볼 수 있습니다.</p>
        <button type="submit" className={btnPrimary}>
          게시
        </button>
      </form>
      <div className="space-y-3">
        {videos.length === 0 ? <EmptyState title="영상이 없습니다." /> : null}
        {videos.map((item) => (
          <article key={item.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="font-semibold">{item.title}</p>
            <p className="text-xs text-slate-500">{item.videoId}</p>
            <button
              type="button"
              className={`${btnSecondary} mt-2`}
              onClick={async () => {
                await teacherDeleteVideo(item.id)
                await onSaved()
              }}
            >
              삭제
            </button>
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
