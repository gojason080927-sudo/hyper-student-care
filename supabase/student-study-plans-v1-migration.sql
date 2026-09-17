-- =============================================================================
-- HYPER Student Care — Student Hub My Study Plan V1 (additive only)
-- =============================================================================
-- 적용: 사용자 승인 후 Supabase Dashboard → SQL Editor → Run
-- Cursor/에이전트가 Production에서 실행하지 마세요.
--
-- 금지:
--   DROP/TRUNCATE of existing tables
--   CREATE OR REPLACE of get_parent_care_bundle / submit_parent_question
--   CREATE OR REPLACE of get_student_hub_bundle
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.student_study_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  plan_date    DATE NOT NULL,
  subject      TEXT NOT NULL,
  content      TEXT NOT NULL DEFAULT '',
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  completed    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT student_study_plans_subject_len
    CHECK (char_length(trim(subject)) BETWEEN 1 AND 40),
  CONSTRAINT student_study_plans_content_len
    CHECK (char_length(content) <= 500),
  CONSTRAINT student_study_plans_time_order
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_student_study_plans_student_date
  ON public.student_study_plans (student_id, plan_date, start_time);

COMMENT ON TABLE public.student_study_plans IS
  '학생 Hub My Study Plan. 본인 access_key RPC로만 읽기/쓰기. 학부모 Care 번들과 분리.';

DROP TRIGGER IF EXISTS trg_student_study_plans_updated_at ON public.student_study_plans;
CREATE TRIGGER trg_student_study_plans_updated_at
  BEFORE UPDATE ON public.student_study_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 학생은 RPC(SECURITY DEFINER)만 사용. 테이블 직접 접근 금지.
-- V1에 teacher CMS가 없으므로 authenticated ALL policy를 두지 않는다.
ALTER TABLE public.student_study_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.student_study_plans FROM PUBLIC;
REVOKE ALL ON TABLE public.student_study_plans FROM anon;
REVOKE ALL ON TABLE public.student_study_plans FROM authenticated;
GRANT ALL ON TABLE public.student_study_plans TO service_role;
DROP POLICY IF EXISTS student_study_plans_authenticated_all ON public.student_study_plans;

-- ---------------------------------------------------------------------------
-- RPCs — identity는 access_key만. 클라이언트 student_id 신뢰 금지.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_student_study_plans(
  p_access_key text,
  p_from_date date,
  p_to_date date
)
RETURNS jsonb
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
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;
  IF p_from_date IS NULL OR p_to_date IS NULL OR p_to_date < p_from_date THEN
    RAISE EXCEPTION 'invalid_date_range';
  END IF;
  IF p_to_date > p_from_date + 31 THEN
    RAISE EXCEPTION 'invalid_date_range';
  END IF;

  RETURN coalesce(
    (
      SELECT jsonb_agg(to_jsonb(p) ORDER BY p.plan_date, p.start_time, p.created_at)
      FROM public.student_study_plans p
      WHERE p.student_id = v_student_id
        AND p.plan_date >= p_from_date
        AND p.plan_date <= p_to_date
    ),
    '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.list_student_study_plans(text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_student_study_plans(text, date, date) TO anon;

CREATE OR REPLACE FUNCTION public.upsert_student_study_plan(
  p_access_key text,
  p_id uuid,
  p_plan_date date,
  p_subject text,
  p_content text,
  p_start_time time,
  p_end_time time
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_subject text;
  v_content text;
  v_count integer;
  v_row public.student_study_plans;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;

  v_subject := left(trim(coalesce(p_subject, '')), 40);
  v_content := left(trim(coalesce(p_content, '')), 500);
  IF v_subject = '' THEN
    RAISE EXCEPTION 'subject_required';
  END IF;
  IF v_content = '' THEN
    RAISE EXCEPTION 'content_required';
  END IF;
  IF p_plan_date IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
    RAISE EXCEPTION 'invalid_plan';
  END IF;
  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'invalid_time_range';
  END IF;

  IF p_id IS NULL THEN
    SELECT count(*) INTO v_count
    FROM public.student_study_plans p
    WHERE p.student_id = v_student_id
      AND p.created_at > now() - interval '10 minutes';
    IF v_count >= 10 THEN
      RAISE EXCEPTION 'rate_limited';
    END IF;

    SELECT count(*) INTO v_count
    FROM public.student_study_plans p
    WHERE p.student_id = v_student_id
      AND p.plan_date = p_plan_date;
    IF v_count >= 15 THEN
      RAISE EXCEPTION 'too_many_plans';
    END IF;

    INSERT INTO public.student_study_plans (
      student_id, plan_date, subject, content, start_time, end_time, completed
    ) VALUES (
      v_student_id, p_plan_date, v_subject, v_content, p_start_time, p_end_time, false
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.student_study_plans p
    SET
      plan_date = p_plan_date,
      subject = v_subject,
      content = v_content,
      start_time = p_start_time,
      end_time = p_end_time
    WHERE p.id = p_id
      AND p.student_id = v_student_id
    RETURNING * INTO v_row;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'plan_not_found';
    END IF;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_student_study_plan(text, uuid, date, text, text, time, time) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_student_study_plan(text, uuid, date, text, text, time, time) TO anon;

CREATE OR REPLACE FUNCTION public.set_student_study_plan_completed(
  p_access_key text,
  p_id uuid,
  p_completed boolean
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_row public.student_study_plans;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  UPDATE public.student_study_plans p
  SET completed = coalesce(p_completed, false)
  WHERE p.id = p_id
    AND p.student_id = v_student_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.set_student_study_plan_completed(text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_student_study_plan_completed(text, uuid, boolean) TO anon;

CREATE OR REPLACE FUNCTION public.delete_student_study_plan(
  p_access_key text,
  p_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_id uuid;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  DELETE FROM public.student_study_plans p
  WHERE p.id = p_id
    AND p.student_id = v_student_id
  RETURNING p.id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;
  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_student_study_plan(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_student_study_plan(text, uuid) TO anon;
