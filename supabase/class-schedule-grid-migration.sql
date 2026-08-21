-- Grid 방식 반별 시간표 (기존 class_schedules 대체)
-- Supabase SQL Editor에서 수동 실행 필요

-- ---------------------------------------------------------------------------
-- 1. class_schedule_grids
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_schedule_grids (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade          TEXT NOT NULL,
  class_name     TEXT NOT NULL,
  template_type  TEXT NOT NULL
    CHECK (template_type IN ('mon-sun', 'mon-wed-fri-sat', 'tue-thu-sat')),
  time_labels    JSONB NOT NULL DEFAULT '[]'::jsonb,
  cells          JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grade, class_name)
);

CREATE INDEX IF NOT EXISTS idx_class_schedule_grids_class
  ON public.class_schedule_grids (grade, class_name)
  WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 2. Grid 노출 helper (반 연동)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._schedule_grid_visible_to_student(
  p_grid public.class_schedule_grids,
  p_grade text,
  p_class_name text
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_trimmed text := trim(p_class_name);
  v_linked text[];
BEGIN
  IF NOT p_grid.is_active THEN RETURN false; END IF;
  IF p_grid.grade <> p_grade THEN RETURN false; END IF;
  IF p_grid.class_name = v_trimmed THEN RETURN true; END IF;

  v_linked := public._math_linked_class_names(p_grade, v_trimmed);
  IF p_grid.class_name = ANY(v_linked) THEN RETURN true; END IF;

  IF v_trimmed LIKE '% 영수%' AND p_grid.class_name = p_grade || ' 영어' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. get_parent_care_bundle — class_schedule_grids 반영
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_parent_care_bundle(p_access_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_grade text;
  v_class_name text;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT s.grade, trim(s.class_name)
  INTO v_grade, v_class_name
  FROM public.students s
  WHERE s.id = v_student_id;

  RETURN jsonb_build_object(
    'student',
    (SELECT to_jsonb(s) FROM public.students s WHERE s.id = v_student_id),
    'attendance',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.date DESC)
       FROM public.attendance a WHERE a.student_id = v_student_id),
      '[]'::jsonb
    ),
    'progress',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.last_study_date DESC)
       FROM public.progress p WHERE p.student_id = v_student_id),
      '[]'::jsonb
    ),
    'homework',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(h) ORDER BY h.date DESC)
       FROM public.homework h WHERE h.student_id = v_student_id),
      '[]'::jsonb
    ),
    'daily_tests',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.date DESC)
       FROM public.daily_tests d WHERE d.student_id = v_student_id),
      '[]'::jsonb
    ),
    'monthly_evaluations',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.evaluation_date DESC)
       FROM public.monthly_evaluations m WHERE m.student_id = v_student_id),
      '[]'::jsonb
    ),
    'makeup_plans',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(mp) ORDER BY mp.scheduled_date DESC)
       FROM public.makeup_plans mp WHERE mp.student_id = v_student_id),
      '[]'::jsonb
    ),
    'questions',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(q) ORDER BY q.date DESC, q.created_at DESC)
       FROM public.questions q WHERE q.student_id = v_student_id),
      '[]'::jsonb
    ),
    'today_assignments',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(ta) ORDER BY ta.date DESC)
       FROM public.today_assignments ta WHERE ta.student_id = v_student_id),
      '[]'::jsonb
    ),
    'homework_textbook_entries',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(h) ORDER BY h.date DESC, h.subject, h.slot_number)
       FROM public.homework_textbook_entries h WHERE h.student_id = v_student_id),
      '[]'::jsonb
    ),
    'student_textbook_slots',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.subject, s.slot_number)
       FROM public.student_textbook_slots s WHERE s.student_id = v_student_id),
      '[]'::jsonb
    ),
    'class_notes',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(cn) ORDER BY cn.date DESC)
       FROM public.class_notes cn WHERE cn.student_id = v_student_id),
      '[]'::jsonb
    ),
    'class_today_report_common',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.report_date DESC, c.subject, c.slot_number)
       FROM public.class_today_report_common c
       WHERE c.grade = v_grade AND c.class_name = v_class_name),
      '[]'::jsonb
    ),
    'class_schedule_grids',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(g) ORDER BY g.class_name)
       FROM public.class_schedule_grids g
       WHERE public._schedule_grid_visible_to_student(g, v_grade, v_class_name)),
      '[]'::jsonb
    ),
    'notices',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(n) ORDER BY n.is_pinned DESC, n.is_important DESC, n.published_at DESC NULLS LAST)
       FROM public.notices n
       WHERE public._notice_visible_to_student(n, v_student_id, v_grade, v_class_name)),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_care_bundle(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_care_bundle(text) TO anon;

-- 참고: notices 대상 컬럼·_notice_visible_to_student·_math_linked_class_names 는
-- supabase/class-schedules-and-notice-targeting-migration.sql 에서 먼저 생성되어 있어야 합니다.
