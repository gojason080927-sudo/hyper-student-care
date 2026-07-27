import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { handleShareStudentCareToKakao } from '../components/students/KakaoShareButton'
import { StudentFilterBar } from '../components/students/StudentFilterBar'
import { StudentFormModal } from '../components/students/StudentFormModal'
import { StudentTable } from '../components/students/StudentTable'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { useData } from '../hooks/useData'
import type { Student, StudentListFilters } from '../types/student'
import { filterStudents } from '../utils/filters'

export function StudentsPage() {
  const { students, addStudent, updateStudent, deleteStudent, copyStudentCareLink, showToast } =
    useData()
  const navigate = useNavigate()
  const [filters, setFilters] = useState<StudentListFilters>({
    search: '',
    school: '',
    grade: '',
    className: '',
    status: '',
    subject: '',
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | undefined>()
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)

  const filtered = useMemo(
    () => filterStudents(students, filters),
    [filters, students],
  )

  const enrolledCount = useMemo(
    () => students.filter((s) => s.status === '재원').length,
    [students],
  )

  const openAdd = () => {
    setEditingStudent(undefined)
    setModalOpen(true)
  }

  const openEdit = (student: Student) => {
    setEditingStudent(student)
    setModalOpen(true)
  }

  const handleSubmit = (data: Parameters<typeof addStudent>[0]) => {
    if (editingStudent) {
      updateStudent(editingStudent.id, data)
    } else {
      addStudent(data)
    }
  }

  const handleKakaoShare = async (student: Student) => {
    await handleShareStudentCareToKakao(student, {
      onError: (message) => showToast(message),
    })
  }

  const hasStudents = students.length > 0
  const hasFilteredResults = filtered.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">학생관리</h2>
          <p className="mt-1 text-sm text-slate-500">
            학생 정보를 등록하고 검색·수정·관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          학생 등록
        </button>
      </div>

      <StudentFilterBar
        students={students}
        filters={filters}
        totalCount={students.length}
        enrolledCount={enrolledCount}
        onChange={setFilters}
      />

      {!hasStudents ? (
        <EmptyState title="등록된 학생이 없습니다." />
      ) : !hasFilteredResults ? (
        <EmptyState
          title="검색 결과가 없습니다."
          description="검색어나 필터 조건을 변경해 보세요."
        />
      ) : (
        <StudentTable
          students={filtered}
          onView={(student) => navigate(`/students/${student.id}`)}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onCopyLink={(student) => copyStudentCareLink(student.id)}
          onKakaoShare={handleKakaoShare}
        />
      )}

      <StudentFormModal
        open={modalOpen}
        student={editingStudent}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="학생 삭제"
        message="이 학생 정보를 삭제하시겠습니까? 삭제한 정보는 복구할 수 없습니다."
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteStudent(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
