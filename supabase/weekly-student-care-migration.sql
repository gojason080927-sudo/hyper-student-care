-- =============================================================================
-- 주간 학습 SUMMARY + 조기경보 — additive migration only
-- =============================================================================
-- 적용: Supabase Dashboard → SQL Editor → Run
-- DROP/TRUNCATE 없음. 기존 attendance/homework/daily_tests/class_notes 행 보존.
-- 레거시 지각/결석을 무단으로 변환하지 않음 (excuse_kind NULL 유지).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) attendance: 인정/무단 subtype (nullable)
-- ---------------------------------------------------------------------------

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS excuse_kind TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_excuse_kind_check'
      AND conrelid = 'public.attendance'::regclass
  ) THEN
    ALTER TABLE public.attendance
      ADD CONSTRAINT attendance_excuse_kind_check
      CHECK (excuse_kind IS NULL OR excuse_kind IN ('인정', '무단'));
  END IF;
END $$;

COMMENT ON COLUMN public.attendance.excuse_kind IS
  '지각/결석 하위분류. NULL = 레거시 또는 출석·조퇴. 무단으로 백필하지 않음.';

-- ---------------------------------------------------------------------------
-- 2) student_daily_care: 교재 준비 + 수업태도
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_daily_care (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  date            DATE        NOT NULL,
  material_prep   TEXT,
  attitude_issues TEXT[]      NOT NULL DEFAULT '{}',
  attitude_note   TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT student_daily_care_student_date_unique UNIQUE (student_id, date),
  CONSTRAINT student_daily_care_material_prep_check CHECK (
    material_prep IS NULL OR material_prep IN ('지참', '부분 지참')
  )
);

CREATE INDEX IF NOT EXISTS idx_student_daily_care_student_id
  ON public.student_daily_care (student_id);
CREATE INDEX IF NOT EXISTS idx_student_daily_care_date
  ON public.student_daily_care (date);

DROP TRIGGER IF EXISTS trg_student_daily_care_updated_at ON public.student_daily_care;
CREATE TRIGGER trg_student_daily_care_updated_at
  BEFORE UPDATE ON public.student_daily_care
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.student_daily_care IS
  '학생·날짜 단위 교재 준비·수업태도. material_prep NULL = 미입력(부분지참 아님). attitude_issues 빈 배열 = 우수.';

-- ---------------------------------------------------------------------------
-- 3) weekly_learning_summaries: durable snapshot
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.weekly_learning_summaries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  week_start      DATE        NOT NULL,
  period_start    DATE        NOT NULL,
  period_end      DATE        NOT NULL,
  as_of           TIMESTAMPTZ NOT NULL,
  total_score     NUMERIC(6, 2),
  grade           TEXT,
  scores          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  good_text       TEXT        NOT NULL DEFAULT '',
  check_text      TEXT        NOT NULL DEFAULT '',
  teacher_comment TEXT        NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT weekly_learning_summaries_unique UNIQUE (student_id, week_start),
  CONSTRAINT weekly_learning_summaries_grade_check CHECK (
    grade IS NULL OR grade IN ('우수', '양호', '보통', '미흡')
  )
);

CREATE INDEX IF NOT EXISTS idx_weekly_learning_summaries_student_id
  ON public.weekly_learning_summaries (student_id);
CREATE INDEX IF NOT EXISTS idx_weekly_learning_summaries_week_start
  ON public.weekly_learning_summaries (week_start);

DROP TRIGGER IF EXISTS trg_weekly_learning_summaries_updated_at ON public.weekly_learning_summaries;
CREATE TRIGGER trg_weekly_learning_summaries_updated_at
  BEFORE UPDATE ON public.weekly_learning_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.weekly_learning_summaries IS
  '주간 학습 SUMMARY durable snapshot. 동일 학생+주차는 INSERT ON CONFLICT DO NOTHING.';

-- ---------------------------------------------------------------------------
-- 4) weekly_summary_reads: 학부모 열람(dot 제거)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.weekly_summary_reads (
  student_id             UUID PRIMARY KEY REFERENCES public.students (id) ON DELETE CASCADE,
  last_read_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_summary_id   UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_weekly_summary_reads_updated_at ON public.weekly_summary_reads;
CREATE TRIGGER trg_weekly_summary_reads_updated_at
  BEFORE UPDATE ON public.weekly_summary_reads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5) RLS (최소 권한 — 구 코어 테이블의 개발용 anon USING(true)를 복사하지 않음)
--
-- 실제 인증 근거:
--   강사앱: AuthContext signInWithPassword → persistSession JWT role = authenticated
--           Today Report/출결 쓰기는 SECURITY DEFINER가 아니라 repository.ts
--           .from(table).upsert() 직접 테이블 접근. UI는 ProtectedRoute(session 필수).
--           운영 신규 테이블 패턴: admission_strategy_posts / entrance_exam_papers
--           (REVOKE anon, GRANT+POLICY TO authenticated USING(true)).
--           공용 강사 계정이라 강사 간 row 분리는 기존에도 없음.
--   학부모앱: 로그인 없음. anon key + access_key SECURITY DEFINER RPC.
--           신규 테이블 직접 INSERT/UPDATE/DELETE 없음.
--           읽음 표시 패턴: parent_category_reads (RLS ON, 정책 없음, RPC만).
-- ---------------------------------------------------------------------------

ALTER TABLE public.student_daily_care ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_learning_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_summary_reads ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'student_daily_care',
    'weekly_learning_summaries',
    'weekly_summary_reads'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dev_anon_select_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dev_anon_insert_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dev_anon_update_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dev_anon_delete_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dev_authenticated_select_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dev_authenticated_insert_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dev_authenticated_update_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dev_authenticated_delete_' || t, t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS student_daily_care_authenticated_crud ON public.student_daily_care;
DROP POLICY IF EXISTS weekly_learning_summaries_authenticated_select
  ON public.weekly_learning_summaries;

-- 강사 Today Report: upsertStudentDailyCare (authenticated JWT만)
REVOKE ALL ON TABLE public.student_daily_care FROM PUBLIC;
REVOKE ALL ON TABLE public.student_daily_care FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.student_daily_care TO authenticated;
GRANT ALL ON TABLE public.student_daily_care TO service_role;

CREATE POLICY student_daily_care_authenticated_crud
  ON public.student_daily_care
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 강사 fetchAllRecords SELECT만. INSERT는 generate/ensure SECURITY DEFINER 전용.
REVOKE ALL ON TABLE public.weekly_learning_summaries FROM PUBLIC;
REVOKE ALL ON TABLE public.weekly_learning_summaries FROM anon;
GRANT SELECT ON TABLE public.weekly_learning_summaries TO authenticated;
GRANT ALL ON TABLE public.weekly_learning_summaries TO service_role;

CREATE POLICY weekly_learning_summaries_authenticated_select
  ON public.weekly_learning_summaries
  FOR SELECT
  TO authenticated
  USING (true);

-- 학부모 열람: mark_weekly_summary_read RPC만. 테이블 직접 접근 없음.
REVOKE ALL ON TABLE public.weekly_summary_reads FROM PUBLIC;
REVOKE ALL ON TABLE public.weekly_summary_reads FROM anon;
REVOKE ALL ON TABLE public.weekly_summary_reads FROM authenticated;
GRANT ALL ON TABLE public.weekly_summary_reads TO service_role;

-- ---------------------------------------------------------------------------
-- 6) Parent RPC: care bundle + today report (기존 키 유지, 키만 추가)
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
    'monthly_learning_reports',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY r.year DESC, r.month DESC, r.subject)
       FROM public.monthly_learning_reports r
       WHERE r.student_id = v_student_id
         AND r.status = 'published'),
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
    ),
    'student_daily_care',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.date DESC)
       FROM public.student_daily_care c WHERE c.student_id = v_student_id),
      '[]'::jsonb
    ),
    'weekly_learning_summaries',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(w) ORDER BY w.week_start DESC)
       FROM public.weekly_learning_summaries w WHERE w.student_id = v_student_id),
      '[]'::jsonb
    ),
    'weekly_summary_read',
    (SELECT to_jsonb(r) FROM public.weekly_summary_reads r WHERE r.student_id = v_student_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_care_bundle(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_care_bundle(text) TO anon;

CREATE OR REPLACE FUNCTION public.get_parent_today_report(p_access_key text, p_date date)
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
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'attendance',
    (SELECT to_jsonb(a)
     FROM public.attendance a
     WHERE a.student_id = v_student_id AND a.date = p_date
     LIMIT 1),
    'progress',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(p))
       FROM public.progress p
       WHERE p.student_id = v_student_id AND p.last_study_date = p_date),
      '[]'::jsonb
    ),
    'homework',
    (SELECT to_jsonb(h)
     FROM public.homework h
     WHERE h.student_id = v_student_id AND h.date = p_date
     LIMIT 1),
    'today_assignment',
    (SELECT to_jsonb(ta)
     FROM public.today_assignments ta
     WHERE ta.student_id = v_student_id AND ta.date = p_date
     LIMIT 1),
    'homework_textbook_entries',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(h) ORDER BY h.subject, h.slot_number)
       FROM public.homework_textbook_entries h
       WHERE h.student_id = v_student_id AND h.date = p_date),
      '[]'::jsonb
    ),
    'student_textbook_slots',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.subject, s.slot_number)
       FROM public.student_textbook_slots s WHERE s.student_id = v_student_id),
      '[]'::jsonb
    ),
    'class_note',
    (SELECT to_jsonb(cn)
     FROM public.class_notes cn
     WHERE cn.student_id = v_student_id AND cn.date = p_date
     LIMIT 1),
    'daily_tests',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.subject)
       FROM public.daily_tests d
       WHERE d.student_id = v_student_id AND d.date = p_date),
      '[]'::jsonb
    ),
    'daily_test',
    (SELECT to_jsonb(d)
     FROM public.daily_tests d
     WHERE d.student_id = v_student_id AND d.date = p_date
     ORDER BY d.subject
     LIMIT 1),
    'class_today_report_common',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.subject, c.slot_number)
       FROM public.class_today_report_common c
       INNER JOIN public.students s ON s.id = v_student_id
       WHERE c.grade = s.grade
         AND c.class_name = trim(s.class_name)
         AND c.report_date IN (p_date, (p_date - interval '1 day')::date)),
      '[]'::jsonb
    ),
    'student_daily_care',
    (SELECT to_jsonb(c)
     FROM public.student_daily_care c
     WHERE c.student_id = v_student_id AND c.date = p_date
     LIMIT 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_today_report(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_today_report(text, date) TO anon;

CREATE OR REPLACE FUNCTION public.mark_weekly_summary_read(p_access_key text)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_last_read_at timestamptz;
  v_summary_id uuid;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT w.id INTO v_summary_id
  FROM public.weekly_learning_summaries w
  WHERE w.student_id = v_student_id
  ORDER BY w.week_start DESC
  LIMIT 1;

  v_last_read_at := now();

  INSERT INTO public.weekly_summary_reads (student_id, last_read_at, last_read_summary_id)
  VALUES (v_student_id, v_last_read_at, v_summary_id)
  ON CONFLICT (student_id)
  DO UPDATE SET
    last_read_at = EXCLUDED.last_read_at,
    last_read_summary_id = EXCLUDED.last_read_summary_id;

  RETURN v_last_read_at;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_weekly_summary_read(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_weekly_summary_read(text) TO anon;

-- ---------------------------------------------------------------------------
-- 7) Saturday 08:00 KST snapshot generator (idempotent)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._weekly_summary_cutoff(p_as_of timestamptz)
RETURNS TABLE (week_start date, period_end date, saturday_date date, as_of timestamptz)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_seoul_ts timestamp;
  v_seoul_date date;
  v_dow integer;
  v_monday date;
  v_saturday date;
  v_reached boolean;
BEGIN
  v_seoul_ts := p_as_of AT TIME ZONE 'Asia/Seoul';
  v_seoul_date := v_seoul_ts::date;
  v_dow := extract(isodow from v_seoul_date)::integer; -- 1=Mon
  v_monday := v_seoul_date - (v_dow - 1);
  v_saturday := v_monday + 5;
  v_reached := v_seoul_date > v_saturday
    OR (v_seoul_date = v_saturday AND extract(hour from v_seoul_ts) >= 8);
  IF NOT v_reached THEN
    v_saturday := v_saturday - 7;
    v_monday := v_monday - 7;
  END IF;
  week_start := v_monday;
  period_end := v_monday + 4;
  saturday_date := v_saturday;
  as_of := (v_saturday::text || ' 08:00:00')::timestamp AT TIME ZONE 'Asia/Seoul';
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_weekly_learning_summaries(p_as_of timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date;
  v_period_end date;
  v_as_of timestamptz;
  v_inserted integer := 0;
  v_row_count integer := 0;
  v_student record;
BEGIN
  SELECT c.week_start, c.period_end, c.as_of
  INTO v_week_start, v_period_end, v_as_of
  FROM public._weekly_summary_cutoff(p_as_of) c;

  FOR v_student IN
    SELECT s.id
    FROM public.students s
    WHERE s.status = '재원'
      AND NOT EXISTS (
        SELECT 1
        FROM public.weekly_learning_summaries w
        WHERE w.student_id = s.id
          AND w.week_start = v_week_start
      )
  LOOP
    INSERT INTO public.weekly_learning_summaries (
      student_id, week_start, period_start, period_end, as_of,
      total_score, grade, scores, good_text, check_text, teacher_comment
    )
    SELECT
      v_student.id,
      v_week_start,
      coalesce(snap.period_start, v_week_start),
      coalesce(snap.period_end, v_period_end),
      v_as_of,
      snap.total_score,
      snap.grade,
      snap.scores,
      snap.good_text,
      snap.check_text,
      snap.teacher_comment
    FROM public._build_weekly_learning_summary(v_student.id, v_week_start, v_period_end, v_as_of) snap
    ON CONFLICT (student_id, week_start) DO NOTHING;

    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    IF v_row_count > 0 THEN
      v_inserted := v_inserted + 1;
    END IF;
  END LOOP;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_weekly_learning_summaries(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_weekly_learning_summaries(timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.generate_weekly_learning_summaries(timestamptz) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.generate_weekly_learning_summaries(timestamptz) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_weekly_learning_summaries()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.generate_weekly_learning_summaries(now());
$$;

REVOKE ALL ON FUNCTION public.ensure_weekly_learning_summaries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_weekly_learning_summaries() TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_weekly_learning_summaries() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_weekly_learning_summaries() TO service_role;

CREATE OR REPLACE FUNCTION public._attendance_index(p_status text, p_excuse text)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_status IN ('출석', '조퇴') THEN 100
    WHEN p_status = '지각' AND p_excuse = '무단' THEN 70
    WHEN p_status = '결석' AND p_excuse = '무단' THEN 0
    WHEN p_status IN ('지각', '결석') THEN 100
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public._daily_test_attempt_score(p_row public.daily_tests)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_elem jsonb;
  v_scores numeric[] := '{}';
  v_score numeric;
  v_total numeric;
  v_status text;
BEGIN
  IF p_row.session_results IS NOT NULL AND jsonb_typeof(p_row.session_results) = 'array' THEN
    FOR v_elem IN SELECT value FROM jsonb_array_elements(p_row.session_results)
    LOOP
      v_status := coalesce(v_elem->>'status', '미응시');
      IF v_status = '미응시' THEN
        CONTINUE;
      END IF;
      v_score := nullif(v_elem->>'score', '')::numeric;
      v_total := coalesce(nullif(v_elem->>'totalScore', '')::numeric, nullif(v_elem->>'total_score', '')::numeric);
      IF v_score IS NOT NULL AND v_total IS NOT NULL AND v_total > 0 THEN
        v_scores := array_append(v_scores, v_score / v_total * 100);
      ELSIF v_score IS NOT NULL THEN
        v_scores := array_append(v_scores, v_score);
      END IF;
    END LOOP;
  END IF;
  IF array_length(v_scores, 1) IS NOT NULL THEN
    RETURN (SELECT avg(x) FROM unnest(v_scores) AS x);
  END IF;
  IF coalesce(p_row.percentage, 0) > 0 OR coalesce(p_row.score, 0) > 0 THEN
    RETURN p_row.percentage;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public._build_weekly_learning_summary(
  p_student_id uuid,
  p_week_start date,
  p_period_end date,
  p_as_of timestamptz
)
RETURNS TABLE (
  period_start date,
  period_end date,
  total_score numeric,
  grade text,
  scores jsonb,
  good_text text,
  check_text text,
  teacher_comment text
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_dates date[] := '{}';
  v_date date;
  v_att public.attendance%ROWTYPE;
  v_att_idx numeric;
  v_att_vals numeric[] := '{}';
  v_present int := 0;
  v_unexcused_late int := 0;
  v_unexcused_absent int := 0;
  v_excused_late int := 0;
  v_excused_absent int := 0;
  v_mat_vals numeric[] := '{}';
  v_brought int := 0;
  v_partial_mat int := 0;
  v_hw_vals numeric[] := '{}';
  v_hw_complete int := 0;
  v_hw_partial int := 0;
  v_hw_incomplete int := 0;
  v_test_vals numeric[] := '{}';
  v_test_pass int := 0;
  v_att_issue_count int := 0;
  v_sleep int := 0;
  v_focus int := 0;
  v_chat int := 0;
  v_disrupt int := 0;
  v_bad int := 0;
  v_att_vals_idx numeric[] := '{}';
  v_notes text[] := '{}';
  v_care public.student_daily_care%ROWTYPE;
  v_hw_cat text;
  v_test_score numeric;
  v_avg numeric;
  v_area jsonb;
  v_att_area jsonb;
  v_mat_area jsonb;
  v_hw_area jsonb;
  v_test_area jsonb;
  v_attitude_area jsonb;
  v_total numeric := 0;
  v_available numeric := 0;
  v_grade_score numeric;
  v_grade text;
  v_good text;
  v_check text;
  v_comment text;
  v_period_start date;
  v_period_end_out date;
  v_issue text;
BEGIN
  FOR v_date IN
    SELECT d::date
    FROM generate_series(p_week_start, p_period_end, interval '1 day') d
    WHERE EXISTS (
      SELECT 1 FROM public.attendance a WHERE a.student_id = p_student_id AND a.date = d::date
      UNION ALL
      SELECT 1 FROM public.homework h WHERE h.student_id = p_student_id AND h.date = d::date AND coalesce(h.status, '') <> ''
      UNION ALL
      SELECT 1 FROM public.homework_textbook_entries h
      WHERE h.student_id = p_student_id AND h.date = d::date AND coalesce(h.status, '') <> ''
      UNION ALL
      SELECT 1 FROM public.daily_tests t WHERE t.student_id = p_student_id AND t.date = d::date
      UNION ALL
      SELECT 1 FROM public.student_daily_care c
      WHERE c.student_id = p_student_id AND c.date = d::date
        AND (c.material_prep IS NOT NULL OR coalesce(array_length(c.attitude_issues, 1), 0) > 0 OR coalesce(c.attitude_note, '') <> '')
      UNION ALL
      SELECT 1 FROM public.progress p WHERE p.student_id = p_student_id AND p.last_study_date = d::date
      UNION ALL
      SELECT 1 FROM public.class_notes n WHERE n.student_id = p_student_id AND n.date = d::date
    )
  LOOP
    v_dates := array_append(v_dates, v_date);
  END LOOP;

  IF array_length(v_dates, 1) IS NOT NULL THEN
    v_period_start := v_dates[1];
    v_period_end_out := v_dates[array_length(v_dates, 1)];
  ELSE
    v_period_start := p_week_start;
    v_period_end_out := p_period_end;
  END IF;

  FOREACH v_date IN ARRAY coalesce(v_dates, ARRAY[]::date[])
  LOOP
    SELECT * INTO v_att FROM public.attendance
    WHERE student_id = p_student_id AND date = v_date;
    IF FOUND THEN
      v_att_idx := public._attendance_index(v_att.status, v_att.excuse_kind);
      IF v_att_idx IS NOT NULL THEN
        v_att_vals := array_append(v_att_vals, v_att_idx);
        IF v_att.status = '출석' THEN v_present := v_present + 1; END IF;
        IF v_att.status = '지각' AND v_att.excuse_kind = '무단' THEN v_unexcused_late := v_unexcused_late + 1; END IF;
        IF v_att.status = '결석' AND v_att.excuse_kind = '무단' THEN v_unexcused_absent := v_unexcused_absent + 1; END IF;
        IF v_att.status = '지각' AND v_att.excuse_kind = '인정' THEN v_excused_late := v_excused_late + 1; END IF;
        IF v_att.status = '결석' AND v_att.excuse_kind = '인정' THEN v_excused_absent := v_excused_absent + 1; END IF;
      END IF;
    END IF;

    SELECT * INTO v_care FROM public.student_daily_care
    WHERE student_id = p_student_id AND date = v_date;
    IF FOUND THEN
      IF v_care.material_prep = '지참' THEN
        v_mat_vals := array_append(v_mat_vals, 100);
        v_brought := v_brought + 1;
      ELSIF v_care.material_prep = '부분 지참' THEN
        v_mat_vals := array_append(v_mat_vals, 50);
        v_partial_mat := v_partial_mat + 1;
      END IF;
      v_att_vals_idx := array_append(
        v_att_vals_idx,
        greatest(60, 100 - coalesce(array_length(v_care.attitude_issues, 1), 0) * 20)
      );
      IF v_care.attitude_issues IS NOT NULL THEN
        FOREACH v_issue IN ARRAY v_care.attitude_issues
        LOOP
          v_att_issue_count := v_att_issue_count + 1;
          IF v_issue = '졸음' THEN v_sleep := v_sleep + 1; END IF;
          IF v_issue = '집중 저하' THEN v_focus := v_focus + 1; END IF;
          IF v_issue = '잡담' THEN v_chat := v_chat + 1; END IF;
          IF v_issue = '수업방해' THEN v_disrupt := v_disrupt + 1; END IF;
          IF v_issue = '태도 불량' THEN v_bad := v_bad + 1; END IF;
        END LOOP;
      END IF;
      IF coalesce(v_care.attitude_note, '') <> '' THEN
        v_notes := array_append(v_notes, v_care.attitude_note);
      END IF;
    ELSE
      v_att_vals_idx := array_append(v_att_vals_idx, 100);
    END IF;

    v_hw_cat := NULL;
    IF EXISTS (
      SELECT 1 FROM public.homework_textbook_entries h
      WHERE h.student_id = p_student_id AND h.date = v_date AND coalesce(h.status, '') <> ''
    ) THEN
      IF EXISTS (
        SELECT 1 FROM public.homework_textbook_entries h
        WHERE h.student_id = p_student_id AND h.date = v_date AND h.status IN ('미완료', '미 완료', '미제출')
      ) THEN
        v_hw_cat := 'incomplete';
      ELSIF EXISTS (
        SELECT 1 FROM public.homework_textbook_entries h
        WHERE h.student_id = p_student_id AND h.date = v_date AND h.status IN ('부분 완료', '부분완료')
      ) THEN
        v_hw_cat := 'partial';
      ELSIF EXISTS (
        SELECT 1 FROM public.homework_textbook_entries h
        WHERE h.student_id = p_student_id AND h.date = v_date AND h.status = '완료'
      ) THEN
        v_hw_cat := 'complete';
      END IF;
    ELSE
      IF EXISTS (
        SELECT 1 FROM public.homework h
        WHERE h.student_id = p_student_id AND h.date = v_date AND h.status IN ('미완료', '미 완료', '미제출')
      ) THEN
        v_hw_cat := 'incomplete';
      ELSIF EXISTS (
        SELECT 1 FROM public.homework h
        WHERE h.student_id = p_student_id AND h.date = v_date AND h.status IN ('부분 완료', '부분완료')
      ) THEN
        v_hw_cat := 'partial';
      ELSIF EXISTS (
        SELECT 1 FROM public.homework h
        WHERE h.student_id = p_student_id AND h.date = v_date AND h.status = '완료'
      ) THEN
        v_hw_cat := 'complete';
      END IF;
    END IF;
    IF v_hw_cat = 'complete' THEN
      v_hw_vals := array_append(v_hw_vals, 100); v_hw_complete := v_hw_complete + 1;
    ELSIF v_hw_cat = 'partial' THEN
      v_hw_vals := array_append(v_hw_vals, 50); v_hw_partial := v_hw_partial + 1;
    ELSIF v_hw_cat = 'incomplete' THEN
      v_hw_vals := array_append(v_hw_vals, 0); v_hw_incomplete := v_hw_incomplete + 1;
    END IF;

    SELECT avg(public._daily_test_attempt_score(t)) INTO v_test_score
    FROM public.daily_tests t
    WHERE t.student_id = p_student_id AND t.date = v_date
      AND public._daily_test_attempt_score(t) IS NOT NULL;
    IF v_test_score IS NOT NULL THEN
      v_test_vals := array_append(v_test_vals, v_test_score);
      IF v_test_score >= 85 THEN v_test_pass := v_test_pass + 1; END IF;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.class_notes n
      WHERE n.student_id = p_student_id AND n.date = v_date AND n.has_class_note AND coalesce(n.note, '') <> ''
    ) THEN
      v_notes := array_append(
        v_notes,
        (SELECT n.note FROM public.class_notes n
         WHERE n.student_id = p_student_id AND n.date = v_date LIMIT 1)
      );
    END IF;
  END LOOP;

  v_att_area := public._weekly_area_payload(v_att_vals, 20, jsonb_build_object(
    'presentCount', v_present,
    'unexcusedLateCount', v_unexcused_late,
    'unexcusedAbsentCount', v_unexcused_absent,
    'excusedLateCount', v_excused_late,
    'excusedAbsentCount', v_excused_absent,
    'lessonCount', coalesce(array_length(v_att_vals, 1), 0)
  ));
  v_mat_area := public._weekly_area_payload(v_mat_vals, 10, jsonb_build_object(
    'broughtCount', v_brought,
    'partialCount', v_partial_mat,
    'lessonCount', coalesce(array_length(v_mat_vals, 1), 0)
  ));
  v_hw_area := public._weekly_area_payload(v_hw_vals, 25, jsonb_build_object(
    'completeCount', v_hw_complete,
    'partialCount', v_hw_partial,
    'incompleteCount', v_hw_incomplete,
    'lessonCount', coalesce(array_length(v_hw_vals, 1), 0)
  ));
  IF array_length(v_test_vals, 1) IS NULL THEN
    v_test_area := public._weekly_area_payload(NULL, 30, jsonb_build_object(
      'averageScore', NULL, 'passCount', 0, 'attemptCount', 0
    ));
  ELSE
    v_avg := (SELECT avg(x) FROM unnest(v_test_vals) AS x);
    v_test_area := public._weekly_area_payload(
      ARRAY[(v_avg * 0.7) + ((v_test_pass::numeric / array_length(v_test_vals, 1)) * 100 * 0.3)],
      30,
      jsonb_build_object(
        'averageScore', round(v_avg::numeric, 2),
        'passCount', v_test_pass,
        'attemptCount', array_length(v_test_vals, 1)
      )
    );
  END IF;
  v_attitude_area := public._weekly_area_payload(v_att_vals_idx, 15, jsonb_build_object(
    'issueCount', v_att_issue_count,
    '졸음', v_sleep,
    '집중 저하', v_focus,
    '잡담', v_chat,
    '수업방해', v_disrupt,
    '태도 불량', v_bad,
    'lessonCount', coalesce(array_length(v_att_vals_idx, 1), 0)
  ));

  v_area := jsonb_build_object(
    'attendance', v_att_area,
    'material', v_mat_area,
    'homework', v_hw_area,
    'dailyTest', v_test_area,
    'attitude', v_attitude_area
  );

  v_total := 0;
  v_available := 0;
  IF (v_att_area->>'score') IS NOT NULL THEN
    v_total := v_total + (v_att_area->>'score')::numeric; v_available := v_available + 20;
  END IF;
  IF (v_mat_area->>'score') IS NOT NULL THEN
    v_total := v_total + (v_mat_area->>'score')::numeric; v_available := v_available + 10;
  END IF;
  IF (v_hw_area->>'score') IS NOT NULL THEN
    v_total := v_total + (v_hw_area->>'score')::numeric; v_available := v_available + 25;
  END IF;
  IF (v_test_area->>'score') IS NOT NULL THEN
    v_total := v_total + (v_test_area->>'score')::numeric; v_available := v_available + 30;
  END IF;
  IF (v_attitude_area->>'score') IS NOT NULL THEN
    v_total := v_total + (v_attitude_area->>'score')::numeric; v_available := v_available + 15;
  END IF;

  IF v_available <= 0 THEN
    v_total := NULL;
    v_grade := NULL;
  ELSE
    v_total := round(v_total, 2);
    v_grade_score := CASE WHEN v_available = 100 THEN v_total ELSE round(v_total / v_available * 100, 2) END;
    v_grade := CASE
      WHEN v_grade_score >= 90 THEN '우수'
      WHEN v_grade_score >= 80 THEN '양호'
      WHEN v_grade_score >= 70 THEN '보통'
      ELSE '미흡'
    END;
  END IF;

  v_good := concat_ws(', ',
    CASE WHEN v_present > 0 THEN '출석 ' || v_present || '회' END,
    CASE WHEN v_brought > 0 THEN '교재 지참 ' || v_brought || '회' END,
    CASE WHEN v_hw_complete > 0 THEN '숙제 완료 ' || v_hw_complete || '회' END,
    CASE WHEN v_test_pass > 0 THEN '일일테스트 합격 ' || v_test_pass || '/' || coalesce(array_length(v_test_vals, 1), 0) || '회' END,
    CASE WHEN v_att_issue_count = 0 AND coalesce(array_length(v_dates, 1), 0) > 0 THEN '수업태도 문제 기록 없음' END
  );
  IF v_good IS NULL OR v_good = '' THEN
    v_good := '이번 주 기록된 학습 사실이 아직 충분하지 않습니다.';
  END IF;

  v_check := concat_ws(', ',
    CASE WHEN v_unexcused_late > 0 THEN '무단지각 ' || v_unexcused_late || '회' END,
    CASE WHEN v_unexcused_absent > 0 THEN '무단결석 ' || v_unexcused_absent || '회' END,
    CASE WHEN v_partial_mat > 0 THEN '교재 부분지참 ' || v_partial_mat || '회' END,
    CASE WHEN v_hw_partial > 0 THEN '숙제 부분완료 ' || v_hw_partial || '회' END,
    CASE WHEN v_hw_incomplete > 0 THEN '숙제 미완료 ' || v_hw_incomplete || '회' END,
    CASE WHEN v_sleep > 0 THEN '졸음 ' || v_sleep || '회' END,
    CASE WHEN v_focus > 0 THEN '집중 저하 ' || v_focus || '회' END,
    CASE WHEN v_chat > 0 THEN '잡담 ' || v_chat || '회' END,
    CASE WHEN v_disrupt > 0 THEN '수업방해 ' || v_disrupt || '회' END,
    CASE WHEN v_bad > 0 THEN '태도 불량 ' || v_bad || '회' END
  );
  IF v_check IS NULL OR v_check = '' THEN
    v_check := '이번 주 따로 확인할 기록은 없습니다.';
  END IF;

  IF array_length(v_notes, 1) IS NULL THEN
    v_comment := '이번 주 저장된 강사 메모는 없습니다.';
  ELSE
    v_comment := array_to_string(v_notes, ' / ');
  END IF;

  period_start := v_period_start;
  period_end := v_period_end_out;
  total_score := v_total;
  grade := v_grade;
  scores := v_area;
  good_text := v_good;
  check_text := v_check;
  teacher_comment := v_comment;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public._weekly_area_payload(
  p_indexes numeric[],
  p_max numeric,
  p_facts jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_index numeric;
  v_score numeric;
  v_grade text;
BEGIN
  IF p_indexes IS NULL OR array_length(p_indexes, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'score', NULL, 'max', p_max, 'index', NULL, 'grade', NULL, 'facts', p_facts
    );
  END IF;
  v_index := (SELECT avg(x) FROM unnest(p_indexes) AS x);
  v_score := round(v_index / 100.0 * p_max, 2);
  v_grade := CASE
    WHEN v_index >= 90 THEN '우수'
    WHEN v_index >= 80 THEN '양호'
    WHEN v_index >= 70 THEN '보통'
    ELSE '미흡'
  END;
  RETURN jsonb_build_object(
    'score', v_score, 'max', p_max, 'index', round(v_index, 2), 'grade', v_grade, 'facts', p_facts
  );
END;
$$;

-- Internal helpers are not a browser API. Default PUBLIC EXECUTE would expose them
-- via PostgREST; generate/ensure (SECURITY DEFINER) can still call them as owner.
REVOKE ALL ON FUNCTION public._weekly_summary_cutoff(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._weekly_summary_cutoff(timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public._weekly_summary_cutoff(timestamptz) FROM authenticated;
REVOKE ALL ON FUNCTION public._attendance_index(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._attendance_index(text, text) FROM anon;
REVOKE ALL ON FUNCTION public._attendance_index(text, text) FROM authenticated;
REVOKE ALL ON FUNCTION public._daily_test_attempt_score(public.daily_tests) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._daily_test_attempt_score(public.daily_tests) FROM anon;
REVOKE ALL ON FUNCTION public._daily_test_attempt_score(public.daily_tests) FROM authenticated;
REVOKE ALL ON FUNCTION public._build_weekly_learning_summary(uuid, date, date, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._build_weekly_learning_summary(uuid, date, date, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public._build_weekly_learning_summary(uuid, date, date, timestamptz) FROM authenticated;
REVOKE ALL ON FUNCTION public._weekly_area_payload(numeric[], numeric, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._weekly_area_payload(numeric[], numeric, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public._weekly_area_payload(numeric[], numeric, jsonb) FROM authenticated;

-- pg_cron: Friday 23:00 UTC = Saturday 08:00 Asia/Seoul.
-- Fallback when pg_cron is unavailable: supabase/functions/generate-weekly-summaries
-- (service_role only — anon/authenticated cannot execute generate_weekly_learning_summaries)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule(j.jobid)
      FROM cron.job j
      WHERE j.jobname = 'weekly-learning-summaries-sat-0800-kst';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'weekly-learning-summaries-sat-0800-kst',
      '0 23 * * 5',
      'SELECT public.generate_weekly_learning_summaries()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
