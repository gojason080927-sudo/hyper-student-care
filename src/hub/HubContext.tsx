import { createContext, useContext, type ReactNode } from 'react'
import type { ClassScheduleGrid, ContentPost, WeeklyLearningSummaryRecord } from '../types/records'
import type {
  HubAssignment,
  HubIdentity,
  HubInboxItem,
  HubMaterial,
  HubQuestion,
  HubVideo,
} from './types'
import type { StudentHubBundle } from './hubRpc'

export type HubData = {
  accessKey: string
  student: HubIdentity
  weeklyLearningSummaries: WeeklyLearningSummaryRecord[]
  assignments: HubAssignment[]
  materials: HubMaterial[]
  videos: HubVideo[]
  questions: HubQuestion[]
  inbox: HubInboxItem[]
  classScheduleGrids: ClassScheduleGrid[]
  notices: ContentPost[]
  reload: () => Promise<void>
}

const HubContext = createContext<HubData | null>(null)

export function HubProvider({
  accessKey,
  bundle,
  reload,
  children,
}: {
  accessKey: string
  bundle: StudentHubBundle
  reload: () => Promise<void>
  children: ReactNode
}) {
  return (
    <HubContext.Provider
      value={{
        accessKey,
        student: bundle.student,
        weeklyLearningSummaries: bundle.weeklyLearningSummaries,
        assignments: bundle.assignments,
        materials: bundle.materials,
        videos: bundle.videos,
        questions: bundle.questions,
        inbox: bundle.inbox,
        classScheduleGrids: bundle.classScheduleGrids,
        notices: bundle.notices,
        reload,
      }}
    >
      {children}
    </HubContext.Provider>
  )
}

export function useHub(): HubData {
  const value = useContext(HubContext)
  if (!value) throw new Error('useHub must be used within HubProvider')
  return value
}
