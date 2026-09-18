import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { StudentHubQrCard } from '../../components/students/StudentHubQrCard'
import { useData } from '../../hooks/useData'
import { GRADES, btnSecondary, inputClass } from '../../utils/labels'
import { getClassOptionsForGrade } from '../../utils/studentGradeClass'
import { copyTextToClipboard } from '../../utils/copyToClipboard'
import { buildClassHubShareList } from '../../utils/studentCareUrl'
import {
  hubShareRowsForStudents,
  initialHubShareSelection,
  studentsForHubShare,
} from '../../utils/studentHubShare'

export function TeacherStudentHubSharePage() {
  const { students, showToast } = useData()
  const [searchParams] = useSearchParams()
  const initial = initialHubShareSelection(searchParams)
  const [grade, setGrade] = useState(initial.grade)
  const [className, setClassName] = useState(initial.className)
  const [nameQuery, setNameQuery] = useState('')
  const [classListConfirmOpen, setClassListConfirmOpen] = useState(false)
  const classOptions = getClassOptionsForGrade(grade)

  const classStudents = useMemo(
    () => studentsForHubShare(students, grade, className),
    [students, grade, className],
  )
  const rows = useMemo(() => hubShareRowsForStudents(classStudents), [classStudents])
  const visibleRows = useMemo(() => {
    const needle = nameQuery.trim()
    if (!needle) return rows
    return rows.filter((row) => row.student.name.includes(needle))
  }, [nameQuery, rows])
  const missingKeyCount = classStudents.length - rows.length

  const copyClassList = async () => {
    const text = buildClassHubShareList(
      rows.map((row) => ({ name: row.student.name, hubUrl: row.hubUrl })),
    )
    const copied = await copyTextToClipboard(text)
    showToast(copied.ok ? `${rows.length}명 Hub 링크 목록을 복사했습니다.` : '복사에 실패했습니다.')
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .hub-qr-card { break-inside: avoid; box-shadow: none !important; }
          nav, aside, header, .tm-bottom-nav { display: none !important; }
        }
      `}</style>
      <div className="no-print">
        <PageHeader
          title="학생 Hub 배포"
          description="반을 고르면 학생 이름과 QR이 바로 나옵니다. 교실에서 자기 이름을 스캔하거나, 링크를 복사해 보내면 됩니다."
        />
      </div>
      <div className="no-print grid gap-3 sm:grid-cols-3">
        <select
          className={inputClass()}
          value={grade}
          onChange={(event) => {
            setGrade(event.target.value)
            setClassName('')
          }}
        >
          <option value="">학년 선택</option>
          {GRADES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          className={inputClass()}
          value={className}
          onChange={(event) => setClassName(event.target.value)}
          disabled={!grade}
        >
          <option value="">반 선택</option>
          {classOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btnSecondary}
            disabled={rows.length === 0}
            onClick={() => setClassListConfirmOpen(true)}
          >
            이 반 링크 목록 복사
          </button>
          <button
            type="button"
            className={`${btnSecondary} inline-flex items-center gap-2`}
            disabled={rows.length === 0}
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4" />
            인쇄
          </button>
        </div>
      </div>
      {grade && className ? (
        <div className="no-print">
          <input
            className={inputClass()}
            value={nameQuery}
            onChange={(event) => setNameQuery(event.target.value)}
            placeholder="이름 찾기"
            aria-label="이름 찾기"
          />
          <p className="mt-2 break-keep text-xs leading-relaxed text-slate-600">
            학생은 자기 이름 QR만 스캔하면 됩니다. 반 링크 목록은 단체방에 붙여넣지 말고 학생
            개인에게만 보내 주세요.
          </p>
        </div>
      ) : null}

      {!grade || !className ? (
        <EmptyState title="학년과 반을 선택하세요." description="선택한 반의 재원 학생 QR이 한 화면에 나타납니다." />
      ) : classStudents.length === 0 ? (
        <EmptyState title="이 반에 재원 학생이 없습니다." />
      ) : (
        <>
          <p className="break-keep text-sm font-semibold text-navy-900">
            {className} · {visibleRows.length}명
            {nameQuery.trim() ? ` / 전체 ${rows.length}명` : ''}
          </p>
          {missingKeyCount > 0 ? (
            <p className="no-print break-keep text-sm text-amber-800">
              학부모 링크가 없는 학생 {missingKeyCount}명은 QR을 만들 수 없습니다. 학생관리에서 기존 개인 링크를
              생성한 뒤 다시 열어 주세요.
            </p>
          ) : null}
          {visibleRows.length === 0 ? (
            <EmptyState title="이름과 일치하는 학생이 없습니다." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleRows.map(({ student, hubUrl }) => (
                <StudentHubQrCard
                  key={student.id}
                  student={student}
                  hubUrl={hubUrl}
                  onToast={showToast}
                />
              ))}
            </div>
          )}
        </>
      )}
      <ConfirmDialog
        open={classListConfirmOpen}
        title="반 전체 Hub 링크 복사"
        message="이 목록에는 학생별 Hub 주소가 모두 들어 있습니다. 단체방에 붙여넣지 말고, 학생 개인에게만 보내 주세요."
        confirmLabel="복사"
        cancelLabel="취소"
        confirmTone="primary"
        onCancel={() => setClassListConfirmOpen(false)}
        onConfirm={() => {
          setClassListConfirmOpen(false)
          void copyClassList()
        }}
      />
    </div>
  )
}
