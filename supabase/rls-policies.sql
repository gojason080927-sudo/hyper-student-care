-- =============================================================================
-- Hyper Student Care — 개발용 RLS 정책 (한 번에 실행)
-- =============================================================================
--
-- ⚠️ 보안 주의
-- anon key에 SELECT/INSERT/UPDATE/DELETE 전체 허용 — 개발·초기 연동 전용
-- 운영 전 Supabase Auth + 역할 기반 RLS로 반드시 교체하세요.
--
-- 적용: Supabase Dashboard → SQL Editor → New query → 붙여넣기 → Run
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. RLS 활성화 (12개 테이블)
-- ---------------------------------------------------------------------------

ALTER TABLE public.students               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.today_assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_notes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tests            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_evaluations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.makeup_plans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices                ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. 기존 개발용 정책 제거 (재실행 안전)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
  op text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'students',
    'attendance',
    'progress',
    'assignment_completions',
    'today_assignments',
    'class_notes',
    'daily_tests',
    'monthly_evaluations',
    'makeup_plans',
    'homework',
    'questions',
    'notices',
    'student_textbook_slots',
    'homework_textbook_entries'
  ]
  LOOP
    -- 이전 단일 정책 (FOR ALL)
    EXECUTE format('DROP POLICY IF EXISTS "dev_anon_all_%s" ON public.%I', t, t);

    -- 개별 CRUD 정책
    FOREACH op IN ARRAY ARRAY['select', 'insert', 'update', 'delete']
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS "dev_anon_%s_%s" ON public.%I',
        op, t, t
      );
    END LOOP;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. 개발용 CRUD 정책 생성 — anon, authenticated 모두 허용
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'students',
    'attendance',
    'progress',
    'assignment_completions',
    'today_assignments',
    'class_notes',
    'daily_tests',
    'monthly_evaluations',
    'makeup_plans',
    'homework',
    'questions',
    'notices',
    'student_textbook_slots',
    'homework_textbook_entries'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY "dev_anon_select_%s" ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "dev_anon_insert_%s" ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "dev_anon_update_%s" ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "dev_anon_delete_%s" ON public.%I FOR DELETE TO anon, authenticated USING (true)',
      t, t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. 적용 확인 (선택 — 실행 결과로 정책 수 확인)
-- ---------------------------------------------------------------------------

SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'students', 'attendance', 'progress', 'assignment_completions',
    'today_assignments', 'class_notes', 'daily_tests', 'monthly_evaluations',
    'makeup_plans', 'homework', 'questions', 'notices',
    'student_textbook_slots', 'homework_textbook_entries'
  )
ORDER BY tablename, cmd;
