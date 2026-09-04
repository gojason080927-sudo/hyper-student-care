import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  ParentEmptyState,
  ParentPageHeader,
  ParentRecordCard,
  ParentSegmentTabs,
} from '../../components/parent/ParentStudentComponents'
import { useParentAdmissionStrategyPosts } from '../../hooks/useParentAdmissionStrategyPosts'
import { useParentStudent } from '../../contexts/ParentStudentContext'
import { filterAdmissionStrategyByTrack } from '../../lib/db/admissionStrategy'
import type { AdmissionStrategyTrack } from '../../types/admissionStrategy'
import { formatKoreanDate } from '../../utils/date'

type AdmissionStrategyTab = '고입' | '대입'

function tabToTrack(tab: AdmissionStrategyTab): AdmissionStrategyTrack {
  return tab
}

export function ParentStudentAdmissionStrategyPage() {
  const { postId } = useParams()
  const student = useParentStudent()
  const { posts, loading } = useParentAdmissionStrategyPosts()
  const [tab, setTab] = useState<AdmissionStrategyTab>('고입')
  const basePath = `/care/${student.studentAccessKey}/admission-strategy`

  const selected = useMemo(
    () => (postId ? posts.find((post) => post.id === postId) ?? null : null),
    [postId, posts],
  )

  if (postId) {
    if (loading) {
      return (
        <div className="parent-page pb-6">
          <p className="text-sm text-slate-500">불러오는 중...</p>
        </div>
      )
    }
    if (!selected) {
      return (
        <div className="parent-page rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-semibold text-slate-700">게시글을 찾을 수 없습니다.</p>
          <Link to={basePath} className="mt-4 inline-block min-h-11 text-sm text-navy-700">
            ← 목록으로
          </Link>
        </div>
      )
    }
    return (
      <div className="parent-page space-y-5 pb-6">
        <ParentPageHeader title={selected.title} description={formatKoreanDate(selected.publishedAt)} />
        <Link to={basePath} className="inline-block min-h-11 text-sm text-navy-700">
          ← 목록으로
        </Link>
        <article className="pm-card whitespace-pre-wrap p-4 text-[15px] leading-relaxed text-[#1E293B] sm:p-5">
          {selected.content}
        </article>
      </div>
    )
  }

  const visible = filterAdmissionStrategyByTrack(posts, tabToTrack(tab))

  return (
    <div className="parent-page space-y-5 pb-6">
      <ParentPageHeader title="고입 · 대입 입시전략" description="진학 · 입시 정보" />

      <ParentSegmentTabs
        value={tab}
        onChange={setTab}
        items={[
          { id: '고입', label: '고입 전략' },
          { id: '대입', label: '대입 전략' },
        ]}
      />

      {loading ? (
        <p className="text-sm text-slate-500">불러오는 중...</p>
      ) : visible.length === 0 ? (
        <ParentEmptyState
          message={
            tab === '고입'
              ? '고입 전략 자료를 준비 중입니다.'
              : '대입 전략 자료를 준비 중입니다.'
          }
        />
      ) : (
        <div className="parent-record-list space-y-3">
          {visible.map((post) => (
            <Link key={post.id} to={`${basePath}/${post.id}`} className="block">
              <ParentRecordCard title={post.title} date={formatKoreanDate(post.publishedAt)}>
                <p className="text-sm text-[#6B7280]">자세히 보기</p>
              </ParentRecordCard>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
