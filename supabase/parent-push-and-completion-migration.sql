-- 학부모 푸시 구독 + Today Report 입력 완료 이벤트
-- Additive only. DROP/TRUNCATE 없음.
-- Supabase SQL Editor에서 수동 실행
--
-- 강사 권한: 이 프로젝트에는 teacher profile / role / staff RPC가 없다.
-- 기존 강사 전용 구조(entrance-exam-*-migration.sql, ProtectedRoute)와 동일하게
-- Supabase Auth authenticated JWT (signInWithPassword)만 강사로 인정한다.
-- 학부모는 anon + _parent_active_student_id(access_key) RPC만 사용한다.
--
-- parent_push_subscriptions / today_report_completion_events:
-- RLS 활성 + 직접 접근 정책 없음 (parent_category_reads 패턴).
-- 접근은 아래 SECURITY DEFINER RPC만 허용.

CREATE TABLE IF NOT EXISTS public.parent_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parent_push_subscriptions_endpoint_key UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS parent_push_subscriptions_student_active_idx
  ON public.parent_push_subscriptions (student_id)
  WHERE is_active = true;

ALTER TABLE public.parent_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.today_report_completion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by uuid,
  notification_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT today_report_completion_events_student_date_key UNIQUE (student_id, report_date)
);

CREATE INDEX IF NOT EXISTS today_report_completion_events_date_idx
  ON public.today_report_completion_events (report_date);

ALTER TABLE public.today_report_completion_events ENABLE ROW LEVEL SECURITY;

-- 이전 초안의 USING (true) SELECT 정책 제거. 직접 SELECT/INSERT/UPDATE/DELETE 정책 없음.
DROP POLICY IF EXISTS today_report_completion_events_select_authenticated
  ON public.today_report_completion_events;

CREATE OR REPLACE FUNCTION public._parent_push_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parent_push_subscriptions_set_updated_at ON public.parent_push_subscriptions;
CREATE TRIGGER parent_push_subscriptions_set_updated_at
  BEFORE UPDATE ON public.parent_push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public._parent_push_touch();

DROP TRIGGER IF EXISTS today_report_completion_events_set_updated_at
  ON public.today_report_completion_events;
CREATE TRIGGER today_report_completion_events_set_updated_at
  BEFORE UPDATE ON public.today_report_completion_events
  FOR EACH ROW
  EXECUTE FUNCTION public._parent_push_touch();

CREATE OR REPLACE FUNCTION public.upsert_parent_push_subscription(
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

  INSERT INTO public.parent_push_subscriptions (
    student_id, endpoint, p256dh, auth, user_agent, is_active
  )
  VALUES (
    v_student_id, trim(p_endpoint), trim(p_p256dh), trim(p_auth), p_user_agent, true
  )
  ON CONFLICT (endpoint) DO UPDATE SET
    student_id = EXCLUDED.student_id,
    p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth,
    user_agent = EXCLUDED.user_agent,
    is_active = true,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_parent_push_subscription(text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_parent_push_subscription(text, text, text, text, text) TO anon;

CREATE OR REPLACE FUNCTION public.get_parent_push_subscription_status(
  p_access_key text,
  p_endpoint text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.parent_push_subscriptions s
    WHERE s.student_id = v_student_id
      AND s.endpoint = trim(p_endpoint)
      AND s.is_active = true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_push_subscription_status(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_push_subscription_status(text, text) TO anon;

-- 기존 강사 인증: ProtectedRoute + signInWithPassword → authenticated JWT
CREATE OR REPLACE FUNCTION public.get_today_report_completion(
  p_student_id uuid,
  p_report_date date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.today_report_completion_events%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_student_id IS NULL OR p_report_date IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = p_student_id
  ) THEN
    RETURN NULL;
  END IF;

  SELECT *
    INTO v_row
  FROM public.today_report_completion_events
  WHERE student_id = p_student_id
    AND report_date = p_report_date;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'completed_at', v_row.completed_at,
    'notification_sent_at', v_row.notification_sent_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_today_report_completion(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_today_report_completion(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_today_report_completed(
  p_student_id uuid,
  p_report_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted timestamptz;
  v_existing timestamptz;
BEGIN
  IF auth.uid() IS NULL OR auth.role() IS DISTINCT FROM 'authenticated' THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_student_id IS NULL OR p_report_date IS NULL THEN
    RAISE EXCEPTION 'invalid_student';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = p_student_id
  ) THEN
    RAISE EXCEPTION 'invalid_student';
  END IF;

  INSERT INTO public.today_report_completion_events (
    student_id, report_date, completed_by
  )
  VALUES (p_student_id, p_report_date, auth.uid())
  ON CONFLICT (student_id, report_date) DO NOTHING
  RETURNING completed_at INTO v_inserted;

  IF v_inserted IS NOT NULL THEN
    RETURN jsonb_build_object(
      'already_completed', false,
      'completed_at', v_inserted
    );
  END IF;

  SELECT completed_at
    INTO v_existing
  FROM public.today_report_completion_events
  WHERE student_id = p_student_id
    AND report_date = p_report_date;

  RETURN jsonb_build_object(
    'already_completed', true,
    'completed_at', v_existing
  );
END;
$$;

REVOKE ALL ON FUNCTION public.mark_today_report_completed(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_today_report_completed(uuid, date) TO authenticated;
