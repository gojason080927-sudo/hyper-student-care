import { ChevronRight, FileText, Folder, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { RecordActions } from '../../components/ui/RecordActions'
import { btnPrimary, btnSecondary } from '../../utils/labels'
import {
  ENTRANCE_EXAM_FOLDER_GRADES,
  ENTRANCE_EXAM_GRADES,
  ENTRANCE_EXAM_SUBJECTS,
  CHOICE_LABELS,
  normalizeEntranceExamAreaLabel,
  type EntranceExamFolderGrade,
} from './constants'
import {
  EntranceExamQuestionFilters,
  type EntranceExamQuestionFilterState,
} from './components/EntranceExamQuestionFilters'
import {
  emptyEntranceExamQuestionForm,
  EntranceExamQuestionForm,
  formToInput,
  questionToForm,
  type EntranceExamQuestionFormState,
} from './components/EntranceExamQuestionForm'
import { EntranceExamPaperBuilderModal } from './components/EntranceExamPaperBuilderModal'
import { EntranceExamQuestionModal } from './components/EntranceExamQuestionModal'
import { EntranceExamQuestionPreviewModal } from './components/EntranceExamQuestionPreviewModal'
import { useEntranceExamQuestions } from './hooks/useEntranceExamQuestions'
import type { EntranceExamGrade, EntranceExamQuestion, EntranceExamSubject } from './types'

type BrowseState =
  | { level: 'root' }
  | { level: 'subject'; subject: EntranceExamSubject }
  | { level: 'grade'; subject: EntranceExamSubject; grade: EntranceExamFolderGrade }

function isRegistrableGrade(grade: EntranceExamFolderGrade): grade is EntranceExamGrade {
  return (ENTRANCE_EXAM_GRADES as readonly string[]).includes(grade)
}

export function EntranceExamQuestionBankPage() {
  const { questions, loading, error, toast, saveQuestion, removeQuestion } =
    useEntranceExamQuestions()
  const [browse, setBrowse] = useState<BrowseState>({ level: 'root' })
  const [filters, setFilters] = useState<EntranceExamQuestionFilterState>({
    subject: '',
    grade: '',
    difficulty: '',
    evaluationArea: '',
    unitName: '',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EntranceExamQuestionFormState>(emptyEntranceExamQuestionForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<EntranceExamQuestion | null>(null)
  const [previewQuestion, setPreviewQuestion] = useState<EntranceExamQuestion | null>(null)
  /** 선택 순서 유지 (시험지 기본 순서) */
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [paperBuilderOpen, setPaperBuilderOpen] = useState(false)

  const subjectCounts = useMemo(() => {
    const counts: Record<EntranceExamSubject, number> = { 수학: 0, 영어: 0 }
    for (const item of questions) {
      counts[item.subject] += 1
    }
    return counts
  }, [questions])

  const gradeCounts = useMemo(() => {
    if (browse.level === 'root') return null
    const subject = browse.subject
    const counts = Object.fromEntries(
      ENTRANCE_EXAM_FOLDER_GRADES.map((grade) => [grade, 0]),
    ) as Record<EntranceExamFolderGrade, number>
    for (const item of questions) {
      if (item.subject !== subject) continue
      const grade = item.targetGrade as EntranceExamFolderGrade
      if (grade in counts) counts[grade] += 1
    }
    return counts
  }, [browse, questions])

  const folderScopedQuestions = useMemo(() => {
    if (browse.level !== 'grade') return []
    return questions.filter(
      (item) => item.subject === browse.subject && item.targetGrade === browse.grade,
    )
  }, [browse, questions])

  const unitOptions = useMemo(
    () =>
      [
        ...new Set(folderScopedQuestions.map((item) => item.unitName.trim()).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b, 'ko')),
    [folderScopedQuestions],
  )

  const filtered = useMemo(() => {
    return folderScopedQuestions.filter((item) => {
      if (filters.difficulty && item.difficulty !== filters.difficulty) return false
      if (filters.evaluationArea) {
        const wanted = filters.evaluationArea
        const match = item.evaluationAreas.some(
          (area) =>
            area === wanted ||
            normalizeEntranceExamAreaLabel(area, item.subject) === wanted ||
            normalizeEntranceExamAreaLabel(wanted, item.subject) ===
              normalizeEntranceExamAreaLabel(area, item.subject),
        )
        if (!match) return false
      }
      if (
        filters.unitName.trim() &&
        !item.unitName.toLowerCase().includes(filters.unitName.trim().toLowerCase())
      ) {
        return false
      }
      return true
    })
  }, [filters.difficulty, filters.evaluationArea, filters.unitName, folderScopedQuestions])

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const selectedQuestions = useMemo(() => {
    const byId = new Map(questions.map((item) => [item.id, item]))
    return selectedIds
      .map((id) => byId.get(id))
      .filter((item): item is EntranceExamQuestion => Boolean(item))
  }, [questions, selectedIds])

  /** 현재 화면에 표시 중인(필터 적용된) 문제 id — 전체 선택/해제 대상 */
  const filteredIds = useMemo(() => filtered.map((item) => item.id), [filtered])

  const allFilteredSelected = useMemo(() => {
    if (filteredIds.length === 0) return false
    return filteredIds.every((id) => selectedIdSet.has(id))
  }, [filteredIds, selectedIdSet])

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  /** 현재 목록만 모두 선택 (이미 선택된 다른 필터 문제는 유지, 순서 보존) */
  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const seen = new Set(prev)
      const next = [...prev]
      for (const id of filteredIds) {
        if (!seen.has(id)) {
          next.push(id)
          seen.add(id)
        }
      }
      return next
    })
  }

  /** 현재 목록만 해제 (화면에 없는 기존 선택은 유지) */
  const deselectAllFiltered = () => {
    const remove = new Set(filteredIds)
    setSelectedIds((prev) => prev.filter((id) => !remove.has(id)))
  }

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) deselectAllFiltered()
    else selectAllFiltered()
  }

  const resetListFilters = () => {
    setFilters((prev) => ({
      ...prev,
      difficulty: '',
      evaluationArea: '',
      unitName: '',
    }))
  }

  const goRoot = () => {
    setBrowse({ level: 'root' })
    resetListFilters()
  }

  const goSubject = (subject: EntranceExamSubject) => {
    setBrowse({ level: 'subject', subject })
    resetListFilters()
  }

  const goGrade = (subject: EntranceExamSubject, grade: EntranceExamFolderGrade) => {
    setBrowse({ level: 'grade', subject, grade })
    resetListFilters()
  }

  const goBack = () => {
    if (browse.level === 'grade') {
      goSubject(browse.subject)
      return
    }
    if (browse.level === 'subject') {
      goRoot()
    }
  }

  const openAdd = () => {
    const defaults: Partial<Pick<EntranceExamQuestionFormState, 'subject' | 'targetGrade'>> = {}
    if (browse.level === 'subject' || browse.level === 'grade') {
      defaults.subject = browse.subject
    }
    if (browse.level === 'grade' && isRegistrableGrade(browse.grade)) {
      defaults.targetGrade = browse.grade
    }
    setForm(emptyEntranceExamQuestionForm(defaults))
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (record: EntranceExamQuestion) => {
    setForm(questionToForm(record))
    setErrors({})
    setModalOpen(true)
  }

  const validate = () => {
    const next: Record<string, string> = {}
    if (!form.stem.trim()) next.stem = '문제를 입력해 주세요.'
    if (!form.unitName.trim()) next.unitName = '단원을 입력해 주세요.'
    if (form.choices.some((choice) => !choice.trim())) {
      next.choices = '5개 보기를 모두 입력해 주세요.'
    }
    if (form.correctChoice < 1 || form.correctChoice > 5) {
      next.correctChoice = '정답을 선택해 주세요.'
    }
    if (form.evaluationAreas.length === 0) {
      next.evaluationAreas = '평가영역을 1개 이상 선택해 주세요.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    const ok = await saveQuestion(formToInput(form))
    setSaving(false)
    if (ok) setModalOpen(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to=".." className="text-sm font-medium text-slate-500 hover:text-[#163A70]">
          ← 신입생 평가
        </Link>
        <PageHeader
          title="문제은행"
          description="신입생 평가용 수학·영어 객관식(5지선다) 문제를 등록하고 관리합니다."
          action={
            <button
              type="button"
              onClick={openAdd}
              className={`${btnPrimary} inline-flex items-center gap-2`}
            >
              <Plus className="h-4 w-4" />
              문제 등록
            </button>
          }
        />
      </div>

      <nav
        aria-label="문제은행 탐색 경로"
        className="flex flex-wrap items-center gap-1 text-sm font-semibold text-slate-600"
      >
        {browse.level !== 'root' ? (
          <button
            type="button"
            onClick={goBack}
            className="mr-2 rounded-lg px-2 py-1 text-slate-500 transition hover:bg-slate-100 hover:text-[#163A70]"
          >
            ← 뒤로
          </button>
        ) : null}
        <button
          type="button"
          onClick={goRoot}
          className={
            browse.level === 'root'
              ? 'text-[#163A70]'
              : 'text-slate-500 transition hover:text-[#163A70]'
          }
        >
          문제은행
        </button>
        {browse.level === 'subject' || browse.level === 'grade' ? (
          <>
            <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
            <button
              type="button"
              onClick={() => goSubject(browse.subject)}
              className={
                browse.level === 'subject'
                  ? 'text-[#163A70]'
                  : 'text-slate-500 transition hover:text-[#163A70]'
              }
            >
              {browse.subject}
            </button>
          </>
        ) : null}
        {browse.level === 'grade' ? (
          <>
            <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
            <span className="text-[#163A70]">{browse.grade}</span>
          </>
        ) : null}
      </nav>

      {loading ? <p className="text-sm text-slate-500">불러오는 중...</p> : null}
      {error ? <p className="text-sm text-rose-500">{error}</p> : null}

      {browse.level !== 'grade' && selectedIds.length > 0 ? (
        <div className="ee-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            <span className="text-[#163A70]">{selectedIds.length}문제</span> 선택됨
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={() => setSelectedIds([])}>
              선택 해제
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewQuestion(null)
                setPaperBuilderOpen(true)
              }}
              className={`${btnPrimary} inline-flex items-center gap-2`}
            >
              <FileText className="h-4 w-4" />
              선택한 문제로 시험지 만들기
            </button>
          </div>
        </div>
      ) : null}

      {browse.level === 'root' ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {ENTRANCE_EXAM_SUBJECTS.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => goSubject(subject)}
              className="flex w-full items-center gap-4 rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white px-5 py-5 text-left shadow-sm transition hover:border-[#28C7B7] hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(40,199,183,0.14)] text-[#0F766E]">
                <Folder className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold text-[#163A70]">{subject}</span>
                <span className="mt-1 block text-sm text-slate-500">
                  등록 문제 {subjectCounts[subject]}개
                </span>
              </span>
              <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}

      {browse.level === 'subject' && gradeCounts ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-[#163A70]">{browse.subject}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              학년 폴더를 선택하면 해당 문제 목록을 볼 수 있습니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ENTRANCE_EXAM_FOLDER_GRADES.map((grade) => (
              <button
                key={grade}
                type="button"
                onClick={() => goGrade(browse.subject, grade)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[rgba(22,58,112,0.12)] bg-white px-4 py-4 text-left shadow-sm transition hover:border-[#28C7B7] hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(22,58,112,0.08)] text-[#163A70]">
                  <Folder className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-bold text-[#163A70]">{grade}</span>
                  <span className="mt-0.5 block text-sm text-slate-500">
                    등록 문제 {gradeCounts[grade]}개
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {browse.level === 'grade' ? (
        <>
          <div>
            <h2 className="text-base font-bold text-[#163A70]">
              {browse.grade} {browse.subject}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              등록 문제 {folderScopedQuestions.length}개
            </p>
          </div>

          <EntranceExamQuestionFilters
            value={filters}
            onChange={setFilters}
            unitOptions={unitOptions}
            hideSubjectGrade
            scopedSubject={browse.subject}
          />

          <div className="ee-no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">
              {selectedIds.length > 0 ? (
                <>
                  <span className="text-[#163A70]">{selectedIds.length}문제</span> 선택됨
                </>
              ) : (
                <span className="font-medium text-slate-500">
                  문제를 선택하면 시험지를 만들 수 있습니다.
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnSecondary}
                disabled={filteredIds.length === 0}
                onClick={toggleSelectAllFiltered}
              >
                {allFilteredSelected ? '전체 해제' : '전체 선택'}
              </button>
              {selectedIds.length > 0 ? (
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setSelectedIds([])}
                >
                  선택 해제
                </button>
              ) : null}
              <button
                type="button"
                disabled={selectedIds.length === 0}
                onClick={() => {
                  setPreviewQuestion(null)
                  setPaperBuilderOpen(true)
                }}
                className={`${btnPrimary} inline-flex items-center gap-2`}
              >
                <FileText className="h-4 w-4" />
                선택한 문제로 시험지 만들기
              </button>
            </div>
          </div>

          {filtered.length === 0 && !loading ? (
            <EmptyState title="등록된 문제가 없습니다." />
          ) : (
            <ul className="space-y-3">
              {filtered.map((item) => {
                const checked = selectedIdSet.has(item.id)
                return (
                  <li key={item.id}>
                    <article
                      className={`cursor-pointer rounded-2xl border bg-white px-4 py-3 shadow-sm transition hover:border-[#163A70]/hover:shadow-md focus-within:border-[#163A70] ${
                        checked
                          ? 'border-[#163A70] ring-1 ring-[#163A70]/30'
                          : 'border-slate-200'
                      }`}
                      onClick={() => setPreviewQuestion(item)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div
                            className="pt-0.5"
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              aria-label={`문제 선택: ${item.stem.slice(0, 40)}`}
                              onChange={() => toggleSelected(item.id)}
                              className="h-4 w-4 rounded border-slate-300 text-[#163A70] focus:ring-[#163A70]"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                              <span className="rounded-full bg-[#163A70] px-2 py-0.5 text-white">
                                {item.subject}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                                {item.targetGrade}
                              </span>
                              <span className="rounded-full bg-[rgba(40,199,183,0.14)] px-2 py-0.5 text-[#0F766E]">
                                난이도 {item.difficulty}
                              </span>
                              <span className="text-slate-500">{item.unitName}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-800">
                              {item.stem}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {item.evaluationAreas.map((area) => (
                                <span
                                  key={area}
                                  className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] text-slate-600"
                                >
                                  {area}
                                </span>
                              ))}
                            </div>
                            <p className="mt-2 text-xs text-slate-500">
                              정답 {CHOICE_LABELS[item.correctChoice - 1] ?? item.correctChoice}
                            </p>
                          </div>
                        </div>
                        <div
                          className="shrink-0"
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <RecordActions
                            onEdit={() => {
                              setPreviewQuestion(null)
                              openEdit(item)
                            }}
                            onDelete={() => {
                              setPreviewQuestion(null)
                              setDeleteTarget(item)
                            }}
                          />
                        </div>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      ) : null}

      <EntranceExamQuestionPreviewModal
        question={previewQuestion}
        onClose={() => setPreviewQuestion(null)}
      />

      <EntranceExamPaperBuilderModal
        open={paperBuilderOpen}
        questions={selectedQuestions}
        onClose={() => setPaperBuilderOpen(false)}
      />

      <EntranceExamQuestionModal
        open={modalOpen}
        title={form.id ? '문제 수정' : '문제 등록'}
        onClose={() => setModalOpen(false)}
      >
        <EntranceExamQuestionForm
          value={form}
          errors={errors}
          saving={saving}
          onChange={setForm}
          onSubmit={() => void handleSubmit()}
          onCancel={() => setModalOpen(false)}
        />
      </EntranceExamQuestionModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="문제 삭제"
        message="이 문제를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return
          void removeQuestion(deleteTarget.id).then(() => setDeleteTarget(null))
        }}
      />

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-[#163A70] px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  )
}
