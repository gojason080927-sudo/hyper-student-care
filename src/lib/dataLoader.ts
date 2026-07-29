import {
  fetchAllData,
  fetchTodayReportData,
  type TodayReportData,
} from '../lib/db/repository'
import {
  rpcGetParentCareBundle,
  rpcGetParentStudentByAccessKey,
  rpcGetParentTodayReport,
} from '../lib/db/parentAccessRpc'
import {
  getParentAccessKeyFromPath,
  isParentCarePathname,
  isSupabaseConfigured,
  normalizeRouteAccessKey,
} from '../lib/supabase'
import {
  hasLocalBackup,
  loadLocalBackup,
  mirrorLocalBackup,
  toLocalBackupData,
  type LocalBackupData,
} from '../storage/localBackup'

export type DataSource = 'supabase' | 'localStorage' | 'none'

export type AppData = LocalBackupData

export function shouldDeferInitialLoadForParentRoute(): boolean {
  if (typeof window === 'undefined') return false
  return isParentCarePathname(window.location.pathname)
}

export async function loadAppData(): Promise<{ data: AppData; source: DataSource }> {
  if (isSupabaseConfigured()) {
    try {
      const data = await fetchAllData()
      const backup = toLocalBackupData(data)
      mirrorLocalBackup(backup)
      return { data: backup, source: 'supabase' }
    } catch (error) {
      console.error('[HyperStudentCare] Supabase load failed, trying localStorage fallback:', error)
      if (hasLocalBackup()) {
        return { data: loadLocalBackup(), source: 'localStorage' }
      }
      throw error
    }
  }

  if (hasLocalBackup()) {
    return { data: loadLocalBackup(), source: 'localStorage' }
  }

  return {
    data: {
      students: [],
      attendance: [],
      homework: [],
      homeworkTextbookEntries: [],
      assignmentCompletion: [],
      dailyTests: [],
      monthlyEvaluations: [],
      questions: [],
      progress: [],
      studentTextbookSlots: [],
      makeupPlans: [],
      contentPosts: [],
      todayAssignments: [],
      classNotes: [],
    },
    source: 'none',
  }
}

export async function resolveStudentByAccessKey(
  accessKey: string,
  localStudents: AppData['students'] = [],
): Promise<AppData['students'][number] | null> {
  const normalizedKey = normalizeRouteAccessKey(accessKey)
  console.log('[ParentAccess] resolveStudentByAccessKey step 2', {
    keyPreview: normalizedKey ? `${normalizedKey.slice(0, 4)}…` : '(empty)',
    supabaseConfigured: isSupabaseConfigured(),
  })

  if (!normalizedKey) {
    console.error('[ParentAccess] accessKey is empty after normalize')
    return null
  }

  if (isSupabaseConfigured()) {
    try {
      const student = await rpcGetParentStudentByAccessKey(normalizedKey)
      if (student) {
        return student
      }
      console.error('[ParentAccess] resolveStudentByAccessKey: RPC returned null')
      return null
    } catch (error) {
      console.error('[ParentAccess] resolveStudentByAccessKey failed:', error)
      return null
    }
  }

  const local = localStudents.find(
    (student) => student.studentAccessKey.trim() === normalizedKey,
  )
  if (local) {
    console.log('[ParentAccess] resolveStudentByAccessKey: found in local state', local.id)
    return local
  }

  console.error('[ParentAccess] Supabase not configured and no local student match')
  return null
}

export async function loadParentCareData(
  accessKey: string,
): Promise<{ data: AppData; source: DataSource }> {
  const normalizedKey = normalizeRouteAccessKey(accessKey)
  console.log('[ParentAccess] loadParentCareData step 3: RPC get_parent_care_bundle')

  if (!isSupabaseConfigured()) {
    if (hasLocalBackup()) {
      return { data: loadLocalBackup(), source: 'localStorage' }
    }
    throw new Error('Supabase is not configured')
  }

  const bundle = await rpcGetParentCareBundle(normalizedKey)
  if (!bundle) {
    throw new Error('Invalid or inactive parent access key')
  }

  mirrorLocalBackup(bundle)
  console.log('[ParentAccess] loadParentCareData complete', {
    source: 'supabase',
    studentCount: bundle.students.length,
    attendanceCount: bundle.attendance.length,
  })
  return { data: bundle, source: 'supabase' }
}

export async function loadTodayReportFromSupabase(
  studentId: string,
  date: string,
): Promise<TodayReportData | null> {
  if (!isSupabaseConfigured()) return null

  const parentKey = getParentAccessKeyFromPath()
  if (parentKey) {
    try {
      return await rpcGetParentTodayReport(parentKey, date)
    } catch (error) {
      console.error('[ParentAccess] Today Report RPC load failed:', error)
      return null
    }
  }

  try {
    console.log('[ParentAccess] loadTodayReportFromSupabase', { studentId, date })
    return await fetchTodayReportData(studentId, date)
  } catch (error) {
    console.error('[ParentAccess] Today Report load failed:', error)
    return null
  }
}

export { fetchTodayReportData, type TodayReportData }
