import { ArrowDown, ArrowUp, Printer, Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { upsertEntranceExamPaper } from '../../../lib/db/entranceExamRepository'
import { btnPrimary, btnSecondary, inputClass } from '../../../utils/labels'
import { CHOICE_LABELS } from '../constants'
import type { EntranceExamQuestion, EntranceExamSubject } from '../types'
import { EntranceExamQuestionModal } from './EntranceExamQuestionModal'
import './entranceExamPrint.css'

const HYPER_EXAM_LOGO_SRC = '/hyper-brand-cover-v1.png'

export type EntranceExamPaperMeta = {
  school: string
  studentName: string
  grade: string
  examDate: string
}

type Props = {
  open: boolean
  questions: EntranceExamQuestion[]
  onClose: () => void
}

function todayInputValue(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function buildDefaultExamGrade(questions: EntranceExamQuestion[]): string {
  if (questions.length === 0) return ''
  const counts = new Map<string, number>()
  for (const item of questions) {
    counts.set(item.targetGrade, (counts.get(item.targetGrade) ?? 0) + 1)
  }
  let best: string = questions[0].targetGrade
  let bestCount = 0
  for (const [grade, count] of counts) {
    if (count > bestCount) {
      best = grade
      bestCount = count
    }
  }
  return best
}

function isLongStem(stem: string): boolean {
  return stem.trim().length >= 160 || stem.split('\n').length >= 5
}

function blankOrValue(value: string): string {
  const trimmed = value.trim()
  return trimmed || '________________________'
}

function subjectClassName(subject: EntranceExamSubject): string {
  return subject === '수학' ? 'ee-exam-subject-math' : 'ee-exam-subject-english'
}

/** 수학: 페이지당 최대 6문항 = 좌 3 + 우 3 고정 */
const MATH_QUESTIONS_PER_PAGE = 6
const MATH_SLOTS_PER_COLUMN = 3

type MathPageChunk = {
  left: (EntranceExamQuestion | null)[]
  right: (EntranceExamQuestion | null)[]
  startNumber: number
}

function buildMathPages(questions: EntranceExamQuestion[]): MathPageChunk[] {
  const pages: MathPageChunk[] = []
  for (let i = 0; i < questions.length; i += MATH_QUESTIONS_PER_PAGE) {
    const slice = questions.slice(i, i + MATH_QUESTIONS_PER_PAGE)
    const left: (EntranceExamQuestion | null)[] = [null, null, null]
    const right: (EntranceExamQuestion | null)[] = [null, null, null]
    for (let s = 0; s < MATH_SLOTS_PER_COLUMN; s++) {
      left[s] = slice[s] ?? null
      right[s] = slice[MATH_SLOTS_PER_COLUMN + s] ?? null
    }
    pages.push({ left, right, startNumber: i + 1 })
  }
  return pages
}

/**
 * 영어: 수학과 동일 페이지 프레임(헤더·2단·중앙선·페이지 높이)을 쓰고
 * 문항 수만 콘텐츠 높이 기준으로 좌→우→다음 페이지에 배치한다.
 * (인쇄 CSS의 1페이지 220mm / 2페이지~ 270mm 과 맞춤)
 */
const ENGLISH_FIRST_PAGE_CAPACITY_MM = 220
const ENGLISH_NEXT_PAGE_CAPACITY_MM = 270
/** 영어 문항 간 세로 여백 — CSS `.ee-exam-english-col { gap }` 와 동일 유지 */
const ENGLISH_QUESTION_GAP_MM = 18
/** 2단 기준 대략 글자/줄 (수학 슬롯 너비와 유사) */
const ENGLISH_CHARS_PER_LINE = 28

type EnglishPageChunk = {
  left: EntranceExamQuestion[]
  right: EntranceExamQuestion[]
  startNumber: number
}

function estimateEnglishItemHeightMm(item: EntranceExamQuestion): number {
  const stem = item.stem.trim()
  const stemLines = stem
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / ENGLISH_CHARS_PER_LINE)), 0)
  const choiceLines = item.choices.reduce((sum, choice) => {
    return sum + Math.max(1, Math.ceil(choice.trim().length / ENGLISH_CHARS_PER_LINE))
  }, 0)
  // 번호행·줄간·선택지 + 문항 간 일정 gap
  return 4 + stemLines * 4.0 + 2 + choiceLines * 3.6 + ENGLISH_QUESTION_GAP_MM
}

function buildEnglishPages(questions: EntranceExamQuestion[]): EnglishPageChunk[] {
  const pages: EnglishPageChunk[] = []
  let left: EntranceExamQuestion[] = []
  let right: EntranceExamQuestion[] = []
  let leftUsed = 0
  let rightUsed = 0
  let column: 'left' | 'right' = 'left'
  let capacity = ENGLISH_FIRST_PAGE_CAPACITY_MM
  let startNumber = 1

  const flushPage = () => {
    if (left.length === 0 && right.length === 0) return
    pages.push({ left, right, startNumber })
    startNumber += left.length + right.length
    left = []
    right = []
    leftUsed = 0
    rightUsed = 0
    column = 'left'
    capacity = ENGLISH_NEXT_PAGE_CAPACITY_MM
  }

  for (const item of questions) {
    const heightMm = estimateEnglishItemHeightMm(item)
    // 빈 단에는 한 문항이 단 높이보다 커도 배치(출력 깨짐 방지 fallback)
    const fitsLeft = left.length === 0 || leftUsed + heightMm <= capacity
    const fitsRight = right.length === 0 || rightUsed + heightMm <= capacity

    if (column === 'left') {
      if (fitsLeft) {
        left.push(item)
        leftUsed += heightMm
        continue
      }
      column = 'right'
    }

    if (column === 'right') {
      if (fitsRight) {
        right.push(item)
        rightUsed += heightMm
        continue
      }
      flushPage()
      left.push(item)
      leftUsed = heightMm
      column = 'left'
    }
  }

  flushPage()
  return pages
}

function ExamQuestionBlock({
  item,
  number,
  slotClassName,
  /** 수학: 풀이 여백 슬롯 / 영어: 높이 자동(풀이 여백 없음) */
  showWorkSpace = true,
}: {
  item: EntranceExamQuestion
  number: number
  slotClassName?: string
  showWorkSpace?: boolean
}) {
  return (
    <section
      className={`ee-exam-print-item${isLongStem(item.stem) ? ' ee-exam-item-long' : ''}${slotClassName ? ` ${slotClassName}` : ''}`}
      data-exam-question-id={item.id}
    >
      <div className="ee-exam-print-qhead">
        <p className="ee-exam-print-qnum">{number}.</p>
        <div className="ee-exam-print-qbody">
          <p className="ee-exam-print-stem">{item.stem}</p>
          <ol className="ee-exam-print-choices">
            {item.choices.map((choice, choiceIndex) => (
              <li key={CHOICE_LABELS[choiceIndex]}>
                <span className="ee-print-choice-label">{CHOICE_LABELS[choiceIndex]}</span>
                <span>{choice}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {showWorkSpace ? <div className="ee-exam-work-space" aria-hidden="true" /> : null}
    </section>
  )
}

/** 수학·영어 공통 상단 헤더 (수학 최종 확정 디자인 그대로 재사용) */
function ExamPaperHeader({
  subject,
  meta,
  questionCount,
}: {
  subject: EntranceExamSubject
  meta: EntranceExamPaperMeta
  questionCount: number
}) {
  return (
    <header className="ee-exam-header-box">
      <div className="ee-exam-header-box-top">
        <div className="ee-exam-header-box-left">
          <img
            className="ee-exam-logo ee-exam-logo--color"
            src={HYPER_EXAM_LOGO_SRC}
            alt="HYPER"
            width={48}
            height={48}
          />
          <div>
            <p className="ee-exam-academy">HYPER 영수 전문학원</p>
            <h1 className="ee-exam-doc-title">신입생 입학 테스트</h1>
          </div>
        </div>
        <div className="ee-exam-header-box-right">
          <p>총 {questionCount}문항 / 30분</p>
          <p>과목 : {subject}</p>
        </div>
      </div>
      <div className="ee-exam-header-box-info">
        <p>
          <span className="ee-exam-info-label">학교 :</span>
          {blankOrValue(meta.school)}
        </p>
        <p>
          <span className="ee-exam-info-label">학생 이름 :</span>
          {blankOrValue(meta.studentName)}
        </p>
        <p>
          <span className="ee-exam-info-label">학년 :</span>
          {blankOrValue(meta.grade)}
        </p>
        <p>
          <span className="ee-exam-info-label">시험일 :</span>
          {meta.examDate || '____________________'}
        </p>
      </div>
    </header>
  )
}

type ExamPaperViewProps = {
  className: string
  subject: EntranceExamSubject
  meta: EntranceExamPaperMeta
  questions: EntranceExamQuestion[]
  /** 인쇄 묶음에서 두 번째 이후 과목 시험지 */
  pageBreakBefore?: boolean
}

function ExamPaperView({
  className,
  subject,
  meta,
  questions,
  pageBreakBefore = false,
}: ExamPaperViewProps) {
  const mathPages = subject === '수학' ? buildMathPages(questions) : []
  const englishPages = subject === '영어' ? buildEnglishPages(questions) : []
  const isMath = subject === '수학'

  return (
    <div
      className={`${className}${pageBreakBefore ? ' ee-exam-sheet-next' : ''}`}
      data-exam-subject={subject}
      data-exam-question-count={questions.length}
    >
      <ExamPaperHeader subject={subject} meta={meta} questionCount={questions.length} />

      {isMath ? (
        <div className="ee-exam-print-body ee-exam-math-body">
          {mathPages.map((page, pageIndex) => (
            <div
              key={`math-page-${page.startNumber}`}
              className={`ee-exam-math-page${pageIndex === 0 ? ' ee-exam-math-page--first' : ''}`}
            >
              <div className="ee-exam-math-col">
                {page.left.map((item, slot) =>
                  item ? (
                    <ExamQuestionBlock
                      key={item.id}
                      item={item}
                      number={page.startNumber + slot}
                      slotClassName="ee-exam-math-slot"
                    />
                  ) : (
                    <div
                      key={`math-left-empty-${page.startNumber}-${slot}`}
                      className="ee-exam-math-slot ee-exam-math-slot-empty"
                      aria-hidden="true"
                    />
                  ),
                )}
              </div>
              <div className="ee-exam-math-vrule" aria-hidden="true" />
              <div className="ee-exam-math-col">
                {page.right.map((item, slot) =>
                  item ? (
                    <ExamQuestionBlock
                      key={item.id}
                      item={item}
                      number={page.startNumber + MATH_SLOTS_PER_COLUMN + slot}
                      slotClassName="ee-exam-math-slot"
                    />
                  ) : (
                    <div
                      key={`math-right-empty-${page.startNumber}-${slot}`}
                      className="ee-exam-math-slot ee-exam-math-slot-empty"
                      aria-hidden="true"
                    />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 영어: 수학과 동일 페이지 프레임(2단·vrule·페이지 높이). 문항만 높이 기준 배치 */
        <div className="ee-exam-print-body ee-exam-math-body ee-exam-english-body">
          {englishPages.map((page, pageIndex) => {
            let numberCursor = page.startNumber
            return (
              <div
                key={`english-page-${page.startNumber}`}
                className={`ee-exam-math-page ee-exam-english-page${pageIndex === 0 ? ' ee-exam-math-page--first' : ''}`}
              >
                <div className="ee-exam-math-col ee-exam-english-col">
                  {page.left.map((item) => {
                    const number = numberCursor
                    numberCursor += 1
                    return (
                      <ExamQuestionBlock
                        key={item.id}
                        item={item}
                        number={number}
                        slotClassName="ee-exam-english-item"
                        showWorkSpace={false}
                      />
                    )
                  })}
                </div>
                <div className="ee-exam-math-vrule" aria-hidden="true" />
                <div className="ee-exam-math-col ee-exam-english-col">
                  {page.right.map((item) => {
                    const number = numberCursor
                    numberCursor += 1
                    return (
                      <ExamQuestionBlock
                        key={item.id}
                        item={item}
                        number={number}
                        slotClassName="ee-exam-english-item"
                        showWorkSpace={false}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * 선택한 문제들로 학생용 시험지를 구성·출력한다.
 * 수학/영어는 과목별 별도 시험지로 출력한다. 정답/해설은 제외.
 */
export function EntranceExamPaperBuilderModal({ open, questions, onClose }: Props) {
  const { session } = useAuth()
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [paperTitle, setPaperTitle] = useState('')
  const [savingPaper, setSavingPaper] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [meta, setMeta] = useState<EntranceExamPaperMeta>({
    school: '',
    studentName: '',
    grade: '',
    examDate: todayInputValue(),
  })

  useEffect(() => {
    if (!open) return
    setOrderedIds(questions.map((item) => item.id))
    const grade = buildDefaultExamGrade(questions)
    setMeta({
      school: '',
      studentName: '',
      grade,
      examDate: todayInputValue(),
    })
    const subjects = [...new Set(questions.map((item) => item.subject))]
    setPaperTitle(
      subjects.length === 1
        ? `${grade} ${subjects[0]} 입학테스트`
        : `${grade} 입학테스트`,
    )
    setSaveMessage(null)
  }, [open, questions])

  const orderedQuestions = useMemo(() => {
    const byId = new Map(questions.map((item) => [item.id, item]))
    return orderedIds
      .map((id) => byId.get(id))
      .filter((item): item is EntranceExamQuestion => Boolean(item))
  }, [orderedIds, questions])

  /** 선택 순서를 유지한 채 과목별로만 분리 — 한 시험지에 섞지 않음 */
  const mathQuestions = useMemo(
    () => orderedQuestions.filter((item) => item.subject === '수학'),
    [orderedQuestions],
  )
  const englishQuestions = useMemo(
    () => orderedQuestions.filter((item) => item.subject === '영어'),
    [orderedQuestions],
  )

  const subjectPapers = useMemo(() => {
    const papers: { subject: EntranceExamSubject; questions: EntranceExamQuestion[] }[] = []
    if (mathQuestions.length > 0) papers.push({ subject: '수학', questions: mathQuestions })
    if (englishQuestions.length > 0) papers.push({ subject: '영어', questions: englishQuestions })
    return papers
  }, [mathQuestions, englishQuestions])

  const move = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= orderedIds.length) return
    setOrderedIds((prev) => {
      const copy = [...prev]
      const tmp = copy[index]
      copy[index] = copy[nextIndex]
      copy[nextIndex] = tmp
      return copy
    })
  }

  const handleSavePapers = async () => {
    if (!session) {
      setSaveMessage('로그인이 필요합니다.')
      return
    }
    if (subjectPapers.length === 0) return
    setSavingPaper(true)
    setSaveMessage(null)
    const baseTitle = paperTitle.trim() || `${meta.grade || '신입생'} 입학테스트`
    const savedTitles: string[] = []
    for (const paper of subjectPapers) {
      const title =
        subjectPapers.length > 1 ? `${baseTitle} (${paper.subject})` : baseTitle
      const result = await upsertEntranceExamPaper({
        title,
        subject: paper.subject,
        targetGrade: meta.grade.trim() || buildDefaultExamGrade(paper.questions),
        questionIds: paper.questions.map((item) => item.id),
      })
      if (!result.success) {
        setSavingPaper(false)
        const errText =
          typeof result.error === 'string' && result.error.trim()
            ? result.error
            : '시험지 저장에 실패했습니다. (Supabase에 phase2 migration 적용 여부를 확인해 주세요.)'
        setSaveMessage(errText)
        return
      }
      savedTitles.push(result.record.title)
    }
    setSavingPaper(false)
    setSaveMessage(
      savedTitles.length === 1
        ? `시험지를 저장했습니다: ${savedTitles[0]}`
        : `과목별 시험지 ${savedTitles.length}개를 저장했습니다.`,
    )
  }

  if (!open) return null

  const bothSubjects = mathQuestions.length > 0 && englishQuestions.length > 0

  return (
    <>
      <EntranceExamQuestionModal open title="시험지 구성" onClose={onClose} size="wide">
        <div className="ee-no-print space-y-5 p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-[#163A70]">
              신입생 입학 테스트
              {mathQuestions.length > 0 ? ` · 수학 ${mathQuestions.length}문항` : ''}
              {englishQuestions.length > 0 ? ` · 영어 ${englishQuestions.length}문항` : ''}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              학생용 시험지에는 정답·해설이 포함되지 않습니다. 출력 전 학교·이름·학년을 입력하세요.
              {bothSubjects
                ? ' 수학·영어가 함께 선택된 경우 과목별 시험지로 나눠 출력·저장합니다.'
                : ''}
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">시험지 제목</span>
            <input
              value={paperTitle}
              onChange={(e) => setPaperTitle(e.target.value)}
              className={inputClass()}
              placeholder="예: 중1 수학 입학테스트 A"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">학교</span>
              <input
                value={meta.school}
                onChange={(e) => setMeta((prev) => ({ ...prev, school: e.target.value }))}
                className={inputClass()}
                placeholder="학교명"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">학생 이름</span>
              <input
                value={meta.studentName}
                onChange={(e) => setMeta((prev) => ({ ...prev, studentName: e.target.value }))}
                className={inputClass()}
                placeholder="이름"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">학년</span>
              <input
                value={meta.grade}
                onChange={(e) => setMeta((prev) => ({ ...prev, grade: e.target.value }))}
                className={inputClass()}
                placeholder="예: 중1"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">시험일</span>
              <input
                type="date"
                value={meta.examDate}
                onChange={(e) => setMeta((prev) => ({ ...prev, examDate: e.target.value }))}
                className={inputClass()}
              />
            </label>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500">문제 순서 (위로/아래로 조정)</p>
            {orderedQuestions.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
                data-exam-question-id={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#163A70]">
                      {index + 1}.{' '}
                      <span className="text-xs font-semibold text-slate-500">{item.subject}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-slate-800">
                      {item.stem}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={`${index + 1}번 문제 위로`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`${index + 1}번 문제 아래로`}
                      disabled={index === orderedQuestions.length - 1}
                      onClick={() => move(index, 1)}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500">
              학생용 시험지 미리보기 (정답·해설 미포함 · 과목별 분리)
            </p>
            <div className="ee-exam-screen-preview-host max-h-[70vh] space-y-6 overflow-auto rounded-xl border border-slate-300 bg-white p-3">
              {subjectPapers.map((paper) => (
                <ExamPaperView
                  key={paper.subject}
                  className={`ee-exam-print-sheet ee-exam-screen-preview ${subjectClassName(paper.subject)}`}
                  subject={paper.subject}
                  meta={meta}
                  questions={paper.questions}
                />
              ))}
            </div>
          </div>

          {saveMessage ? (
            <p className="text-sm font-medium text-[#163A70]">{saveMessage}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className={btnSecondary}>
              닫기
            </button>
            <button
              type="button"
              onClick={() => void handleSavePapers()}
              className={`${btnSecondary} inline-flex items-center gap-2`}
              disabled={subjectPapers.length === 0 || savingPaper}
            >
              <Save className="h-4 w-4" />
              {savingPaper ? '저장 중...' : '시험지 저장'}
            </button>
            <button
              type="button"
              onClick={() => {
                const root = document.documentElement
                root.classList.add('ee-printing-exam')
                const cleanup = () => {
                  root.classList.remove('ee-printing-exam')
                  window.removeEventListener('afterprint', cleanup)
                }
                window.addEventListener('afterprint', cleanup)
                window.setTimeout(cleanup, 2000)
                window.print()
              }}
              className={`${btnPrimary} inline-flex items-center gap-2`}
              disabled={subjectPapers.length === 0}
            >
              <Printer className="h-4 w-4" />
              시험지 출력
            </button>
          </div>
        </div>
      </EntranceExamQuestionModal>

      {/* body 포털: 인쇄 시 #root 앱 UI와 분리해 페이지 분할이 깨지지 않게 함 */}
      {createPortal(
        <div className="ee-print-sheet" aria-hidden="true">
          {subjectPapers.map((paper, index) => (
            <ExamPaperView
              key={paper.subject}
              className={`ee-exam-print-sheet ${subjectClassName(paper.subject)}`}
              subject={paper.subject}
              meta={meta}
              questions={paper.questions}
              pageBreakBefore={index > 0}
            />
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
