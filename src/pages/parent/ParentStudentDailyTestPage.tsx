import { DailyTestSessionGrid } from '../../components/dailytest/DailyTestSessionGrid'
import { ParentDailyTestDiagnosisBlock } from '../../components/dailytest/ParentDailyTestDiagnosisBlock'
import {
  ParentEmptyState,
  ParentPageHeader,
  ParentRecordCard,
} from '../../components/parent/ParentStudentComponents'
import { useParentStudentRecords } from '../../hooks/useParentStudentRecords'
import { formatKoreanDate } from '../../utils/date'

export function ParentStudentDailyTestPage() {
  const { dailyTests } = useParentStudentRecords()

  return (
    <div className="parent-page space-y-5 pb-6">
      <ParentPageHeader title="일일 테스트" description="차시별 통과 결과를 확인합니다." />

      {dailyTests.length === 0 ? (
        <ParentEmptyState />
      ) : (
        <div className="parent-record-list space-y-3">
          {dailyTests.map((record) => (
            <ParentRecordCard
              key={record.id}
              date={formatKoreanDate(record.date)}
              title={record.subject}
            >
              <div className="space-y-3">
                <DailyTestSessionGrid record={record} variant="parentReport" readOnly />
                <ParentDailyTestDiagnosisBlock record={record} />
              </div>
            </ParentRecordCard>
          ))}
        </div>
      )}
    </div>
  )
}
