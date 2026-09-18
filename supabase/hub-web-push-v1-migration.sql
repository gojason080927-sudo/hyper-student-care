-- Additive Student Hub / Teacher Web Push V1.
-- Does not alter parent_push_subscriptions or parent Today Report RPCs.
-- Run in Supabase SQL Editor. Idempotent / rerunnable.
-- Do not apply to Production without explicit approval.

CREATE TABLE IF NOT EXISTS public.student_push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  user_agent    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS student_push_subscriptions_student_active_idx
  ON public.student_push_subscriptions (student_id)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.teacher_push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint      TEXT NOT NULL,
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  user_agent    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS teacher_push_subscriptions_active_idx
  ON public.teacher_push_subscriptions (id)
  WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.hub_push_deliveries (
  event_key     TEXT PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent a first scan from notifying students about already-published weekly summaries.
INSERT INTO public.hub_push_deliveries (event_key)
SELECT 'student:weekly:' || student_id::text || ':' || week_start::text
FROM public.weekly_learning_summaries
ON CONFLICT (event_key) DO NOTHING;

ALTER TABLE public.student_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_push_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.student_push_subscriptions FROM PUBLIC;
REVOKE ALL ON TABLE public.student_push_subscriptions FROM anon;
REVOKE ALL ON TABLE public.student_push_subscriptions FROM authenticated;
REVOKE ALL ON TABLE public.teacher_push_subscriptions FROM PUBLIC;
REVOKE ALL ON TABLE public.teacher_push_subscriptions FROM anon;
REVOKE ALL ON TABLE public.teacher_push_subscriptions FROM authenticated;
REVOKE ALL ON TABLE public.hub_push_deliveries FROM PUBLIC;
REVOKE ALL ON TABLE public.hub_push_deliveries FROM anon;
REVOKE ALL ON TABLE public.hub_push_deliveries FROM authenticated;

DROP POLICY IF EXISTS student_push_subscriptions_no_direct ON public.student_push_subscriptions;
DROP POLICY IF EXISTS teacher_push_subscriptions_no_direct ON public.teacher_push_subscriptions;
DROP POLICY IF EXISTS hub_push_deliveries_no_direct ON public.hub_push_deliveries;

CREATE OR REPLACE FUNCTION public.upsert_student_push_subscription(
  p_access_key text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid_access_key';
  END IF;
  IF trim(coalesce(p_endpoint, '')) = '' OR trim(coalesce(p_p256dh, '')) = '' OR trim(coalesce(p_auth, '')) = '' THEN
    RAISE EXCEPTION 'invalid_subscription';
  END IF;

  INSERT INTO public.student_push_subscriptions (
    student_id, endpoint, p256dh, auth, user_agent, is_active, updated_at
  )
  VALUES (
    v_student_id, trim(p_endpoint), trim(p_p256dh), trim(p_auth),
    nullif(trim(coalesce(p_user_agent, '')), ''), true, now()
  )
  ON CONFLICT (endpoint) DO UPDATE
    SET student_id = EXCLUDED.student_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        is_active = true,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_student_push_subscription_status(
  p_access_key text,
  p_endpoint text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_active boolean;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT is_active INTO v_active
  FROM public.student_push_subscriptions
  WHERE student_id = v_student_id
    AND endpoint = trim(p_endpoint)
  LIMIT 1;

  RETURN coalesce(v_active, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_student_push_subscription(
  p_access_key text,
  p_endpoint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid_access_key';
  END IF;

  UPDATE public.student_push_subscriptions
  SET is_active = false,
      updated_at = now()
  WHERE student_id = v_student_id
    AND endpoint = trim(p_endpoint)
    AND is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_teacher_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  IF trim(coalesce(p_endpoint, '')) = '' OR trim(coalesce(p_p256dh, '')) = '' OR trim(coalesce(p_auth, '')) = '' THEN
    RAISE EXCEPTION 'invalid_subscription';
  END IF;

  INSERT INTO public.teacher_push_subscriptions (
    endpoint, p256dh, auth, user_agent, is_active, updated_at
  )
  VALUES (
    trim(p_endpoint), trim(p_p256dh), trim(p_auth),
    nullif(trim(coalesce(p_user_agent, '')), ''), true, now()
  )
  ON CONFLICT (endpoint) DO UPDATE
    SET p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        is_active = true,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_teacher_push_subscription_status(
  p_endpoint text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT is_active INTO v_active
  FROM public.teacher_push_subscriptions
  WHERE endpoint = trim(p_endpoint)
  LIMIT 1;

  RETURN coalesce(v_active, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.deactivate_teacher_push_subscription(
  p_endpoint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.teacher_push_subscriptions
  SET is_active = false,
      updated_at = now()
  WHERE endpoint = trim(p_endpoint)
    AND is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_student_push_subscription(text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_student_push_subscription_status(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deactivate_student_push_subscription(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_teacher_push_subscription(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_teacher_push_subscription_status(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.deactivate_teacher_push_subscription(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.upsert_student_push_subscription(text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_student_push_subscription_status(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.deactivate_student_push_subscription(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_teacher_push_subscription(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_teacher_push_subscription_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_teacher_push_subscription(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_hub_push_assignment_recipients(p_assignment_id uuid)
RETURNS TABLE(student_id uuid, access_key text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.student_access_key
  FROM public.class_hub_assignments a
  JOIN public.students s
    ON trim(s.grade) = trim(a.grade)
   AND trim(s.class_name) = trim(a.class_name)
   AND (a.student_id IS NULL OR s.id = a.student_id)
  WHERE a.id = p_assignment_id
    AND a.published = true
    AND coalesce(s.access_key_active, true) = true;
$$;

CREATE OR REPLACE FUNCTION public.list_hub_push_notice_recipients(p_notice_id uuid)
RETURNS TABLE(student_id uuid, access_key text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.student_access_key
  FROM public.notices n
  JOIN public.students s ON true
  WHERE n.id = p_notice_id
    AND n.is_published = true
    AND coalesce(s.access_key_active, true) = true
    AND public._notice_visible_to_student(n, s.id, s.grade, trim(s.class_name));
$$;

REVOKE ALL ON FUNCTION public.list_hub_push_assignment_recipients(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_hub_push_notice_recipients(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_hub_push_assignment_recipients(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_hub_push_notice_recipients(uuid) TO service_role;
