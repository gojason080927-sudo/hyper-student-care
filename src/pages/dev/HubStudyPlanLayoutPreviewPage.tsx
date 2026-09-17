import { useState, type FormEvent } from 'react'
import { HubProvider } from '../../hub/HubContext'
import { HubStudyPlanScreen } from '../../hub/HubStudyPlanPage'
import type { StudentHubBundle } from '../../hub/hubRpc'
import type { StudentStudyPlan } from '../../hub/types'
import { startOfWeekMonday } from '../../hub/studyPlan'
import { addDays } from '../../utils/date'
import '../../hub/hub.css'

const bundle: StudentHubBundle = {
  student: {
    id: 'preview-student',
    name: '김하이퍼',
    school: '하이퍼중학교',
    grade: '중2',
    className: '중2-수학A',
    accessKeyActive: true,
  },
  inactive: false,
  weeklyLearningSummaries: [],
  assignments: [],
  materials: [],
  videos: [],
  questions: [],
  inbox: [],
  classScheduleGrids: [],
  notices: [],
}

const previewNowMs = Date.parse('2026-09-17T12:00:00+09:00')

const samplePlans: StudentStudyPlan[] = [
  {
    id: 'p1',
    planDate: '2026-09-17',
    subject: '수학',
    content: '쎈 수학 72~80p',
    startTime: '19:00:00',
    endTime: '20:30:00',
    completed: true,
    result: 'completed',
    createdAt: '2026-09-17T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z',
  },
  {
    id: 'p2',
    planDate: '2026-09-17',
    subject: '영어',
    content: '단어 1~100 복습',
    startTime: '21:00:00',
    endTime: '21:40:00',
    completed: false,
    result: 'failed',
    createdAt: '2026-09-17T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z',
  },
  {
    id: 'p3',
    planDate: '2026-09-17',
    subject: '국어',
    content: '비문학 지문 2개',
    startTime: '22:00:00',
    endTime: '22:40:00',
    completed: false,
    result: 'pending',
    createdAt: '2026-09-17T00:00:00.000Z',
    updatedAt: '2026-09-17T00:00:00.000Z',
  },
]

/** 개발 전용: My Study Plan 입력 UI 확인 */
export function HubStudyPlanLayoutPreviewPage() {
  const today = '2026-09-17'
  const [selectedDate, setSelectedDate] = useState(today)
  const [weekStart, setWeekStart] = useState(startOfWeekMonday(today))
  const [plans, setPlans] = useState(samplePlans)
  const [editor, setEditor] = useState<{
    id: string | null
    planDate: string
    subjectPreset: string
    customSubject: string
    content: string
    startTime: string
    endTime: string
  } | null>(null)
  const [mode, setMode] = useState<'list' | 'empty'>('list')

  const noop = (_event: FormEvent) => {
    _event.preventDefault()
  }

  return (
    <HubProvider accessKey="preview-key" bundle={bundle} reload={async () => {}}>
      <div className="student-hub-app min-h-svh">
          <div className="mx-auto flex max-w-lg gap-2 px-3 pt-3">
            <button
              type="button"
              className="rounded-full bg-white px-3 py-1 text-xs font-bold"
              onClick={() => {
                setMode('list')
                setPlans(samplePlans)
                setSelectedDate(today)
                setEditor(null)
              }}
            >
              목록
            </button>
            <button
              type="button"
              className="rounded-full bg-white px-3 py-1 text-xs font-bold"
              onClick={() => {
                setMode('empty')
                setPlans([])
                setEditor(null)
              }}
            >
              빈 화면
            </button>
          </div>
          <HubStudyPlanScreen
            selectedDate={selectedDate}
            weekStart={weekStart}
            today={today}
            nowMs={previewNowMs}
            plans={mode === 'empty' ? [] : plans}
            loading={false}
            error=""
            editor={editor}
            busy={false}
            onSelectDate={(date) => {
              setSelectedDate(date)
              setWeekStart(startOfWeekMonday(date))
            }}
            onShiftWeek={(delta) => {
              setWeekStart(addDays(weekStart, delta))
              setSelectedDate(addDays(selectedDate, delta))
            }}
            onToday={() => {
              setSelectedDate(today)
              setWeekStart(startOfWeekMonday(today))
            }}
            onAdd={() =>
              setEditor({
                id: null,
                planDate: selectedDate,
                subjectPreset: '수학',
                customSubject: '',
                content: '',
                startTime: '19:00',
                endTime: '20:30',
              })
            }
            onEdit={(plan) =>
              setEditor({
                id: plan.id,
                planDate: plan.planDate,
                subjectPreset: plan.subject === '수학' || plan.subject === '영어' ? plan.subject : 'custom',
                customSubject: plan.subject === '수학' || plan.subject === '영어' ? '' : plan.subject,
                content: plan.content,
                startTime: plan.startTime.slice(0, 5),
                endTime: plan.endTime.slice(0, 5),
              })
            }
            onSetResult={(plan, result) =>
              setPlans((current) =>
                current.map((item) =>
                  item.id === plan.id
                    ? { ...item, result, completed: result === 'completed' }
                    : item,
                ),
              )
            }
            onAskDelete={(plan) => setPlans((current) => current.filter((item) => item.id !== plan.id))}
            onSave={noop}
            onCancel={() => setEditor(null)}
            onDraftChange={setEditor}
          />
        </div>
      </HubProvider>
  )
}
