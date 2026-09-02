import { getSupabase } from '../supabase'

export type ParentPushStatus = {
  subscribed: boolean
  permission: NotificationPermission | 'unsupported'
}

export async function rpcUpsertParentPushSubscription(params: {
  accessKey: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string
}): Promise<void> {
  const { error } = await getSupabase().rpc('upsert_parent_push_subscription', {
    p_access_key: params.accessKey.trim(),
    p_endpoint: params.endpoint.trim(),
    p_p256dh: params.p256dh.trim(),
    p_auth: params.auth.trim(),
    p_user_agent: params.userAgent?.trim() || null,
  })
  if (error) {
    console.error('[ParentPush] upsert_parent_push_subscription error:', error)
    throw error
  }
}

export async function rpcGetParentPushSubscriptionStatus(
  accessKey: string,
  endpoint: string,
): Promise<boolean> {
  const { data, error } = await getSupabase().rpc('get_parent_push_subscription_status', {
    p_access_key: accessKey.trim(),
    p_endpoint: endpoint.trim(),
  })
  if (error) {
    console.error('[ParentPush] get_parent_push_subscription_status error:', error)
    return false
  }
  return data === true
}
