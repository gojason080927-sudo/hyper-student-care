-- =============================================================================
-- Hyper Student Care — Production 통합 Migration
-- Supabase SQL Editor에서 이 파일 전체를 한 번에 실행하세요.
--
-- 포함 내용:
--   1) notices 공지 대상 지정 컬럼
--   2) 수학A↔영수A / 수학B↔영수B helper
--   3) 공지 학생별 노출 helper
--   4) class_schedule_grids (Grid 시간표 테이블)
--   5) Grid 시간표 학생별 노출 helper
--   6) get_parent_care_bundle RPC 갱신 (class_schedule_grids + notices 필터)
--
-- 전제: _parent_active_student_id() 함수가 이미 존재 (parent-access-rpc.sql)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. notices — 공지 대상 지정 컬럼 (기존 데이터 호환: audience_type 기본값 'all')
-- ---------------------------------------------------------------------------
ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS audience_type TEXT NOT NULL DEFAULT 'all';

ALTER TABLE public.notices
  DROP CONSTRAINT IF EXISTS notices_audience_type_check;

ALTER TABLE public.notices
  ADD CONSTRAINT notices_audience_type_check
  CHECK (audience_type IN ('all', 'grade', 'class', 'student'));

ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS target_grade TEXT;

ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS target_class_name TEXT;

ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS target_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL;

ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS publish_start_date DATE;

ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS publish_end_date DATE;

ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notices_audience
  ON public.notices (audience_type, target_grade, target_class_name, target_student_id);

-- ---------------------------------------------------------------------------
-- 2. 반 연동 helper — 수학A↔영수A, 수학B↔영수B (고1/중1/중3)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._math_shared_group(p_grade text, p_class_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_trimmed text := trim(p_class_name);
BEGIN
  IF p_grade IN ('중1', '중3', '고1') THEN
    IF v_trimmed LIKE '% 수학A' OR v_trimmed LIKE '% 영수A' THEN RETURN 'A'; END IF;
    IF v_trimmed LIKE '% 수학B' OR v_trimmed LIKE '% 영수B' THEN RETURN 'B'; END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._math_linked_class_names(p_grade text, p_class_name text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_trimmed text := trim(p_class_name);
  v_group text;
  v_math text;
  v_eng text;
BEGIN
  v_group := public._math_shared_group(p_grade, v_trimmed);
  IF v_group IS NULL THEN
    RETURN ARRAY[v_trimmed];
  END IF;
  v_math := p_grade || ' 수학' || v_group;
  v_eng := p_grade || ' 영수' || v_group;
  IF v_trimmed = v_math THEN RETURN ARRAY[v_math, v_eng]; END IF;
  IF v_trimmed = v_eng THEN RETURN ARRAY[v_eng, v_math]; END IF;
  RETURN ARRAY[v_trimmed];
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. 공지 노출 helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._notice_visible_to_student(
  p_notice public.notices,
  p_student_id uuid,
  p_grade text,
  p_class_name text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_trimmed text := trim(p_class_name);
  v_linked text[];
  v_target_linked text[];
BEGIN
  IF NOT p_notice.is_published THEN RETURN false; END IF;

  IF p_notice.publish_start_date IS NOT NULL AND p_notice.publish_start_date > CURRENT_DATE THEN
    RETURN false;
  END IF;
  IF p_notice.publish_end_date IS NOT NULL AND p_notice.publish_end_date < CURRENT_DATE THEN
    RETURN false;
  END IF;

  IF coalesce(p_notice.audience_type, 'all') = 'all' THEN RETURN true; END IF;

  IF p_notice.audience_type = 'grade' THEN
    RETURN p_notice.target_grade = p_grade;
  END IF;

  IF p_notice.audience_type = 'student' THEN
    RETURN p_notice.target_student_id = p_student_id;
  END IF;

  IF p_notice.audience_type = 'class' THEN
    IF trim(coalesce(p_notice.target_class_name, '')) = v_trimmed THEN RETURN true; END IF;
    v_target_linked := public._math_linked_class_names(p_grade, coalesce(p_notice.target_class_name, ''));
    v_linked := public._math_linked_class_names(p_grade, v_trimmed);
    IF v_target_linked && v_linked THEN
      IF public._math_shared_group(p_grade, p_notice.target_class_name) IS NOT NULL
         AND public._math_shared_group(p_grade, p_notice.target_class_name)
             = public._math_shared_group(p_grade, v_trimmed)
         AND p_notice.target_class_name LIKE '% 수학%'
      THEN RETURN true; END IF;
    END IF;
    RETURN false;
  END IF;

  RETURN false;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Grid 시간표 테이블 (반별 1개, UNIQUE grade+class_name)
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
-- 5. Grid 시간표 학생별 노출 helper
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
-- 6. get_parent_care_bundle — Grid 시간표 + 공지 학생별 필터
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

-- ---------------------------------------------------------------------------
-- 7. class_schedule_grids RLS (강사 저장·조회 허용)
-- ---------------------------------------------------------------------------
ALTER TABLE public.class_schedule_grids ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS class_schedule_grids_authenticated_all ON public.class_schedule_grids';
  EXECUTE 'DROP POLICY IF EXISTS dev_anon_select_class_schedule_grids ON public.class_schedule_grids';
  EXECUTE 'DROP POLICY IF EXISTS dev_anon_insert_class_schedule_grids ON public.class_schedule_grids';
  EXECUTE 'DROP POLICY IF EXISTS dev_anon_update_class_schedule_grids ON public.class_schedule_grids';
  EXECUTE 'DROP POLICY IF EXISTS dev_anon_delete_class_schedule_grids ON public.class_schedule_grids';

  EXECUTE $p$
    CREATE POLICY class_schedule_grids_authenticated_all
      ON public.class_schedule_grids
      FOR ALL TO authenticated
      USING (true) WITH CHECK (true)
  $p$;

  EXECUTE $p$
    CREATE POLICY dev_anon_select_class_schedule_grids
      ON public.class_schedule_grids
      FOR SELECT TO anon, authenticated
      USING (true)
  $p$;
  EXECUTE $p$
    CREATE POLICY dev_anon_insert_class_schedule_grids
      ON public.class_schedule_grids
      FOR INSERT TO anon, authenticated
      WITH CHECK (true)
  $p$;
  EXECUTE $p$
    CREATE POLICY dev_anon_update_class_schedule_grids
      ON public.class_schedule_grids
      FOR UPDATE TO anon, authenticated
      USING (true) WITH CHECK (true)
  $p$;
  EXECUTE $p$
    CREATE POLICY dev_anon_delete_class_schedule_grids
      ON public.class_schedule_grids
      FOR DELETE TO anon, authenticated
      USING (true)
  $p$;
END $$;

-- ---------------------------------------------------------------------------
-- 8. 실행 확인 (선택) — 아래 SELECT 결과가 나오면 성공
-- ---------------------------------------------------------------------------
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'class_schedule_grids' ORDER BY ordinal_position;
-- SELECT proname FROM pg_proc WHERE proname = '_schedule_grid_visible_to_student';
