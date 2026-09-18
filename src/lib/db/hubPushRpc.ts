import { getSupabase } from '../supabase'

export async function rpcUpsertStudentPushSubscription(params: {
  accessKey: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}): Promise<void> {
  const { error } = await getSupabase().rpc('upsert_student_push_subscription', {
    p_access_key: params.accessKey.trim(),
    p_endpoint: params.endpoint.trim(),
    p_p256dh: params.p256dh.trim(),
    p_auth: params.auth.trim(),
    p_user_agent: params.userAgent?.trim() || null,
  })
  if (error) {
    console.error('[HubPush] upsert_student_push_subscription error:', error)
    throw error
  }
}

export async function rpcGetStudentPushSubscriptionStatus(
  accessKey: string,
  endpoint: string,
): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('get_student_push_subscription_status', {
    p_access_key: accessKey.trim(),
    p_endpoint: endpoint.trim(),
  })
  if (error) {
    console.error('[HubPush] get_student_push_subscription_status error:', error)
    return false
  }
  return data === true
}

export async function rpcDeactivateStudentPushSubscription(params: {
  accessKey: string
  endpoint: string
}): Promise<void> {
  const { error } = await getSupabase().rpc('deactivate_student_push_subscription', {
    p_access_key: params.accessKey.trim(),
    p_endpoint: params.endpoint.trim(),
  })
  if (error) {
    console.error('[HubPush] deactivate_student_push_subscription error:', error)
    throw error
  }
}

export async function rpcUpsertTeacherPushSubscription(params: {
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}): Promise<void> {
  const { error } = await getSupabase().rpc('upsert_teacher_push_subscription', {
    p_endpoint: params.endpoint.trim(),
    p_p256dh: params.p256dh.trim(),
    p_auth: params.auth.trim(),
    p_user_agent: params.userAgent?.trim() || null,
  })
  if (error) {
    console.error('[HubPush] upsert_teacher_push_subscription error:', error)
    throw error
  }
}

export async function rpcGetTeacherPushSubscriptionStatus(endpoint: string): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('get_teacher_push_subscription_status', {
    p_endpoint: endpoint.trim(),
  })
  if (error) {
    console.error('[HubPush] get_teacher_push_subscription_status error:', error)
    return false
  }
  return data === true
}

export async function rpcDeactivateTeacherPushSubscription(endpoint: string): Promise<void> {
  const { error } = await getSupabase().rpc('deactivate_teacher_push_subscription', {
    p_endpoint: endpoint.trim(),
  })
  if (error) {
    console.error('[HubPush] deactivate_teacher_push_subscription error:', error)
    throw error
  }
}
