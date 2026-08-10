-- =============================================================================
-- 월간 학습진단 REPORT — additive migration only
-- =============================================================================
-- 적용: Supabase Dashboard → SQL Editor → Run
-- 기존 테이블 DROP/TRUNCATE 없음. 기존 컬럼/데이터 보존.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) daily_tests: 학습진단 보조 데이터 (JSONB)
--    - 수학 문항별 오답 원인
--    - 금요일 오답BANK 재시험
--    - 영어 어휘/문법/독해
-- ---------------------------------------------------------------------------

ALTER TABLE public.daily_tests
  ADD COLUMN IF NOT EXISTS learning_diagnosis JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.daily_tests.learning_diagnosis IS
  '월간 학습진단 보조 데이터. wrongAnswerItems, questionTotal, fridayRetest*, english* 키 사용';

-- ---------------------------------------------------------------------------
-- 2) monthly_evaluations: 수학 문항별 오답 원인 + 문항 수
-- ---------------------------------------------------------------------------

ALTER TABLE public.monthly_evaluations
  ADD COLUMN IF NOT EXISTS wrong_answer_items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.monthly_evaluations
  ADD COLUMN IF NOT EXISTS question_total INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.monthly_evaluations.wrong_answer_items IS
  '수학 월말평가 문항별 오답 원인 [{id,label,cause}]';

COMMENT ON COLUMN public.monthly_evaluations.question_total IS
  '월말평가 총 문항 수 (오류율 산출용). 0이면 difficulty_breakdown 합계를 fallback';

-- ---------------------------------------------------------------------------
-- 3) monthly_learning_reports: 확정/공개 snapshot
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.monthly_learning_reports (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id              UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  year                    INTEGER     NOT NULL,
  month                   INTEGER     NOT NULL,
  subject                 TEXT        NOT NULL,
  status                  TEXT        NOT NULL DEFAULT 'draft',
  published_at            TIMESTAMPTZ,
  scores                  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  learning_records        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  strengths               TEXT        NOT NULL DEFAULT '',
  improvements            TEXT        NOT NULL DEFAULT '',
  teacher_overall_comment TEXT        NOT NULL DEFAULT '',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT monthly_learning_reports_month_range CHECK (month >= 1 AND month <= 12),
  CONSTRAINT monthly_learning_reports_subject_check CHECK (subject IN ('수학', '영어')),
  CONSTRAINT monthly_learning_reports_status_check CHECK (status IN ('draft', 'published')),
  CONSTRAINT monthly_learning_reports_unique UNIQUE (student_id, year, month, subject)
);

CREATE INDEX IF NOT EXISTS idx_monthly_learning_reports_student_id
  ON public.monthly_learning_reports (student_id);

CREATE INDEX IF NOT EXISTS idx_monthly_learning_reports_year_month
  ON public.monthly_learning_reports (year, month);

CREATE INDEX IF NOT EXISTS idx_monthly_learning_reports_status
  ON public.monthly_learning_reports (status);

DROP TRIGGER IF EXISTS trg_monthly_learning_reports_updated_at ON public.monthly_learning_reports;
CREATE TRIGGER trg_monthly_learning_reports_updated_at
  BEFORE UPDATE ON public.monthly_learning_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) RLS (개발용 — 기존 rls-policies 패턴과 동일)
-- ---------------------------------------------------------------------------

ALTER TABLE public.monthly_learning_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_anon_select_monthly_learning_reports" ON public.monthly_learning_reports;
DROP POLICY IF EXISTS "dev_anon_insert_monthly_learning_reports" ON public.monthly_learning_reports;
DROP POLICY IF EXISTS "dev_anon_update_monthly_learning_reports" ON public.monthly_learning_reports;
DROP POLICY IF EXISTS "dev_anon_delete_monthly_learning_reports" ON public.monthly_learning_reports;
DROP POLICY IF EXISTS "dev_authenticated_select_monthly_learning_reports" ON public.monthly_learning_reports;
DROP POLICY IF EXISTS "dev_authenticated_insert_monthly_learning_reports" ON public.monthly_learning_reports;
DROP POLICY IF EXISTS "dev_authenticated_update_monthly_learning_reports" ON public.monthly_learning_reports;
DROP POLICY IF EXISTS "dev_authenticated_delete_monthly_learning_reports" ON public.monthly_learning_reports;

CREATE POLICY "dev_anon_select_monthly_learning_reports"
  ON public.monthly_learning_reports FOR SELECT TO anon USING (true);
CREATE POLICY "dev_anon_insert_monthly_learning_reports"
  ON public.monthly_learning_reports FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "dev_anon_update_monthly_learning_reports"
  ON public.monthly_learning_reports FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "dev_anon_delete_monthly_learning_reports"
  ON public.monthly_learning_reports FOR DELETE TO anon USING (true);

CREATE POLICY "dev_authenticated_select_monthly_learning_reports"
  ON public.monthly_learning_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "dev_authenticated_insert_monthly_learning_reports"
  ON public.monthly_learning_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dev_authenticated_update_monthly_learning_reports"
  ON public.monthly_learning_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "dev_authenticated_delete_monthly_learning_reports"
  ON public.monthly_learning_reports FOR DELETE TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- 5) Parent RPC: published REPORT만 care bundle에 포함
--    production-schedule-grid-full-migration.sql 기준 CREATE OR REPLACE
--    (+ monthly_learning_reports 키만 추가)
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
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_care_bundle(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_care_bundle(text) TO anon;
