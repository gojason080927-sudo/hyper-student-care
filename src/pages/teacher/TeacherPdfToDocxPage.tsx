import { PageHeader } from '../../components/ui/PageHeader'
import { PdfToDocxConverter } from '../../components/teacher/PdfToDocxConverter'

export function TeacherPdfToDocxPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="PDF → DOCX 변환"
        description="강사가 직접 만든 자료 PDF, 또는 학부모·학생이 제출한 PDF를 편집 가능한 워드 파일로 바꿔요."
      />
      <PdfToDocxConverter />
    </div>
  )
}
