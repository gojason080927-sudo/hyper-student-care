import { useCallback, useMemo, useState } from 'react'
import { SchoolExamReport } from '../../components/schoolExam/SchoolExamReport'
import { compressCapture } from '../../lib/schoolExamImage'
import {
  draftNote,
  parseAnalysisPackage,
  type SchoolExam,
  type SchoolImage,
  type SchoolReportData,
} from '../../utils/schoolExamReport'
import samplePackage from '../../dev/schoolExamSample/analysis-package.json'

const imageUrls = import.meta.glob('../../dev/schoolExamSample/images/*.jpg', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** 확인용 — 샘플 분석 패키지(JSON)와 캡처를 로컬에서 읽어 리포트를 그린다. DB 호출·저장·발송 없음. (DEV 전용) */
export function SchoolExamReportPreviewPage() {
  const [imagesOn, setImagesOn] = useState(true)
  const [mode, setMode] = useState<'full' | 'wrong3'>('full')

  const reports = useMemo<SchoolReportData[]>(() => {
    const pkg = parseAnalysisPackage(samplePackage)
    const sample = (samplePackage as { student_sample: { wrong: number[] } }).student_sample
    const wrongNos = mode === 'wrong3' ? sample.wrong.slice(0, 3) : sample.wrong
    const items = pkg.items
    const exam: SchoolExam = {
      id: 'sample',
      grade: pkg.grade,
      schoolName: pkg.school,
      title: pkg.title,
      subject: pkg.subject,
      examDate: pkg.date,
      author: pkg.author,
      rangeText: pkg.range,
      totalPoints: pkg.totalPoints,
      items,
      units: pkg.units,
      topProblems: pkg.topProblems,
      sourceStudentId: null,
      imagesClean: imagesOn,
      packageImportedAt: null,
      imagesVisible: imagesOn,
    }
    const wrongItems = wrongNos.map((no) => {
      const it = items.find((i) => i.no === no)!
      return { no, cause: it.recommendedCause, note: draftNote(it) }
    })
    const lost = wrongNos.reduce((s, no) => s + (items.find((i) => i.no === no)?.points ?? 0), 0)
    return [{
      exam,
      result: {
        score: Math.round(pkg.totalPoints - lost),
        wrongItems,
        teacherComment: '기본(하) 문항은 대부분 지켰지만, 중 난이도에서 점수가 많이 빠졌습니다. 경우의 수에서 "순서를 세는지, 고르기만 하는지" 구분이 아직 흔들립니다. 시험장에서 바로 떠올리는 연습이 필요합니다.',
        nextPlan: [
          '경우의 수: 순열·조합 구분 문제 매일 10개',
          '확률: 여사건·연속 시행 유형 주 3회 복습',
          '인수분해 공식으로 수 계산하기 집중 연습',
          '시험 1주 전 오답 재시험',
        ],
        sentAt: '2026-10-05T00:00:00Z',
      },
    }]
  }, [imagesOn, mode])

  const loadImages = useCallback(async (_exam: { id: string }, nos: number[]): Promise<SchoolImage[]> => {
    const out: SchoolImage[] = []
    for (const no of nos) {
      const url = Object.entries(imageUrls).find(([path]) => path.endsWith(`q${String(no).padStart(2, '0')}.jpg`))?.[1]
      if (!url) continue
      const blob = await (await fetch(url)).blob()
      out.push({ no, ...(await compressCapture(blob)) })
    }
    return out
  }, [])

  return (
    <div className="mx-auto max-w-[900px] space-y-4 p-4">
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        미리보기 — 샘플 JSON을 로컬에서 읽어 그린 화면입니다. DB 저장·발송 없음.
      </p>
      <div className="flex flex-wrap gap-2 text-sm">
        <button type="button" className="rounded-lg border px-3 py-1.5" onClick={() => setImagesOn((v) => !v)}>
          이미지 공개: {imagesOn ? '켜짐' : '꺼짐("준비 중" 카드)'}
        </button>
        <button type="button" className="rounded-lg border px-3 py-1.5" onClick={() => setMode((m) => (m === 'full' ? 'wrong3' : 'full'))}>
          오답 수: {mode === 'full' ? '18문항' : '3문항'}
        </button>
      </div>
      <SchoolExamReport key={`${imagesOn}-${mode}`} student={{ name: '샘플 학생' }} reports={reports} loadImages={loadImages} />
    </div>
  )
}
