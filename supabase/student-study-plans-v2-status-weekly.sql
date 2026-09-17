-- =============================================================================
-- HYPER Student Care — Student Hub My Study Plan V2
-- 3-state result + 48h KST auto-fail (compute-on-read) + weekly rate support
-- =============================================================================
-- 적용: 사용자 승인 후 Supabase Dashboard → SQL Editor → Run
-- Cursor/에이전트가 Production에서 실행하지 마세요.
--
-- 전제: V1 (student-study-plans-v1-migration.sql) 이 이미 적용되어 있어야 한다.
-- 이 파일은 additive 다. V1 파일을 수정한 것이 아니다.
--
-- 금지:
--   DROP/TRUNCATE of existing tables
--   기존 completed=false 행을 failed 로 대량 backfill
--   CREATE OR REPLACE of get_parent_care_bundle / submit_parent_question
--   CREATE OR REPLACE of get_student_hub_bundle / get_student_hub_identity
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. result 컬럼 (nullable → backfill → NOT NULL)
--    기존 completed=true  → completed
--    기존 completed=false → pending  (실패로 간주하지 않음)
-- ---------------------------------------------------------------------------

ALTER TABLE public.student_study_plans
  ADD COLUMN IF NOT EXISTS result TEXT;

UPDATE public.student_study_plans
SET result = CASE WHEN completed THEN 'completed' ELSE 'pending' END
WHERE result IS NULL;

ALTER TABLE public.student_study_plans
  ALTER COLUMN result SET DEFAULT 'pending';

ALTER TABLE public.student_study_plans
  ALTER COLUMN result SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.student_study_plans
    ADD CONSTRAINT student_study_plans_result_allowed
    CHECK (result IN ('pending', 'completed', 'failed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE public.student_study_plans
    ADD CONSTRAINT student_study_plans_completed_result_sync
    CHECK (completed = (result = 'completed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

COMMENT ON COLUMN public.student_study_plans.result IS
  'Stored result: pending | completed | failed. completed=true iff result=completed. Auto-fail is computed on read from plan end (KST) + 48 hours and does not rewrite this column.';

-- ---------------------------------------------------------------------------
-- 2. KST deadline + effective result (Option B: compute-on-read, no cron)
--    end_at = (plan_date + end_time) interpreted as Asia/Seoul
--    deadline = end_at + 48 hours
--    Boundary: now >= deadline → effective failed
--    Example: 2026-09-17 20:00 KST → deadline 2026-09-19 20:00 KST
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._study_plan_deadline_at(
  p_plan_date date,
  p_end_time time
)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT ((p_plan_date + p_end_time) AT TIME ZONE 'Asia/Seoul') + interval '48 hours';
$$;

CREATE OR REPLACE FUNCTION public._study_plan_effective_result(
  p_result text,
  p_plan_date date,
  p_end_time time,
  p_now timestamptz DEFAULT now()
)
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_result IN ('completed', 'failed') THEN p_result
    WHEN p_now >= public._study_plan_deadline_at(p_plan_date, p_end_time) THEN 'failed'
    ELSE 'pending'
  END;
$$;

CREATE OR REPLACE FUNCTION public._study_plan_result_locked(
  p_plan_date date,
  p_end_time time,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT p_now >= public._study_plan_deadline_at(p_plan_date, p_end_time);
$$;

CREATE OR REPLACE FUNCTION public._study_plan_public_json(p public.student_study_plans)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'plan_date', p.plan_date,
    'subject', p.subject,
    'content', p.content,
    'start_time', p.start_time,
    'end_time', p.end_time,
    'completed', p.completed,
    'result', p.result,
    'effective_result', public._study_plan_effective_result(p.result, p.plan_date, p.end_time, now()),
    'result_locked', public._study_plan_result_locked(p.plan_date, p.end_time, now()),
    'created_at', p.created_at,
    'updated_at', p.updated_at
  );
$$;

REVOKE ALL ON FUNCTION public._study_plan_deadline_at(date, time) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._study_plan_deadline_at(date, time) FROM anon;
REVOKE ALL ON FUNCTION public._study_plan_deadline_at(date, time) FROM authenticated;

REVOKE ALL ON FUNCTION public._study_plan_effective_result(text, date, time, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._study_plan_effective_result(text, date, time, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public._study_plan_effective_result(text, date, time, timestamptz) FROM authenticated;

REVOKE ALL ON FUNCTION public._study_plan_result_locked(date, time, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._study_plan_result_locked(date, time, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public._study_plan_result_locked(date, time, timestamptz) FROM authenticated;

REVOKE ALL ON FUNCTION public._study_plan_public_json(public.student_study_plans) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._study_plan_public_json(public.student_study_plans) FROM anon;
REVOKE ALL ON FUNCTION public._study_plan_public_json(public.student_study_plans) FROM authenticated;

-- ---------------------------------------------------------------------------
-- 3. Replace V1 RPCs (same signatures). Identity is still access_key only.
--    Payload omits student_id.
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
      SELECT jsonb_agg(public._study_plan_public_json(p) ORDER BY p.plan_date, p.start_time, p.created_at)
      FROM public.student_study_plans p
      WHERE p.student_id = v_student_id
        AND p.plan_date >= p_from_date
        AND p.plan_date <= p_to_date
    ),
    '[]'::jsonb
  );
END;
$$;

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
      student_id, plan_date, subject, content, start_time, end_time, completed, result
    ) VALUES (
      v_student_id, p_plan_date, v_subject, v_content, p_start_time, p_end_time, false, 'pending'
    )
    RETURNING * INTO v_row;
  ELSE
    SELECT * INTO v_row
    FROM public.student_study_plans p
    WHERE p.id = p_id
      AND p.student_id = v_student_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'plan_not_found';
    END IF;

    -- Auto-failed pending rows must not move their deadline by editing times.
    IF v_row.result = 'pending'
       AND public._study_plan_result_locked(v_row.plan_date, v_row.end_time) THEN
      IF p_plan_date IS DISTINCT FROM v_row.plan_date
         OR p_start_time IS DISTINCT FROM v_row.start_time
         OR p_end_time IS DISTINCT FROM v_row.end_time THEN
        RAISE EXCEPTION 'result_locked';
      END IF;
    END IF;

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

  RETURN public._study_plan_public_json(v_row);
END;
$$;

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
  v_result text;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  SELECT * INTO v_row
  FROM public.student_study_plans p
  WHERE p.id = p_id
    AND p.student_id = v_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  IF public._study_plan_result_locked(v_row.plan_date, v_row.end_time) THEN
    RAISE EXCEPTION 'result_locked';
  END IF;

  -- V1 mapping: true → completed, false → pending (never failed).
  v_result := CASE WHEN coalesce(p_completed, false) THEN 'completed' ELSE 'pending' END;

  UPDATE public.student_study_plans p
  SET
    completed = (v_result = 'completed'),
    result = v_result
  WHERE p.id = p_id
    AND p.student_id = v_student_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;
  RETURN public._study_plan_public_json(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_student_study_plan_result(
  p_access_key text,
  p_id uuid,
  p_result text
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
  v_result text;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;
  IF p_id IS NULL THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  v_result := lower(trim(coalesce(p_result, '')));
  IF v_result NOT IN ('completed', 'failed') THEN
    RAISE EXCEPTION 'invalid_result';
  END IF;

  SELECT * INTO v_row
  FROM public.student_study_plans p
  WHERE p.id = p_id
    AND p.student_id = v_student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;

  IF public._study_plan_result_locked(v_row.plan_date, v_row.end_time) THEN
    RAISE EXCEPTION 'result_locked';
  END IF;

  UPDATE public.student_study_plans p
  SET
    result = v_result,
    completed = (v_result = 'completed')
  WHERE p.id = p_id
    AND p.student_id = v_student_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_not_found';
  END IF;
  RETURN public._study_plan_public_json(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.set_student_study_plan_result(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_student_study_plan_result(text, uuid, text) TO anon;

-- Existing V1 GRANTs on list/upsert/set_completed/delete are preserved by CREATE OR REPLACE.
-- Re-assert list/upsert/set_completed grants and table ACL so a partial apply cannot widen them.

REVOKE ALL ON FUNCTION public.list_student_study_plans(text, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_student_study_plans(text, date, date) TO anon;

REVOKE ALL ON FUNCTION public.upsert_student_study_plan(text, uuid, date, text, text, time, time) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_student_study_plan(text, uuid, date, text, text, time, time) TO anon;

REVOKE ALL ON FUNCTION public.set_student_study_plan_completed(text, uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_student_study_plan_completed(text, uuid, boolean) TO anon;

REVOKE ALL ON TABLE public.student_study_plans FROM PUBLIC;
REVOKE ALL ON TABLE public.student_study_plans FROM anon;
REVOKE ALL ON TABLE public.student_study_plans FROM authenticated;
GRANT ALL ON TABLE public.student_study_plans TO service_role;

COMMIT;
