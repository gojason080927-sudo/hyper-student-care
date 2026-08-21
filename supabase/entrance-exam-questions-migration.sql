-- =============================================================================
-- 신입생 평가 — 문제은행 (Phase 1) additive migration only
-- =============================================================================
-- 적용: Supabase Dashboard → SQL Editor → Run
-- 기존 테이블 DROP/TRUNCATE/ALTER 없음. questions(Q&A) 테이블과 무관.
--
-- RLS: 강사용 authenticated 전용
--   - 모바일 강사앱: ProtectedRoute + signInWithPassword → authenticated JWT
--   - PC 강사앱: 동일 Supabase Auth 세션 사용 시 authenticated로 접근
--   - anon(비로그인)에는 SELECT/INSERT/UPDATE/DELETE 정책 없음
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.entrance_exam_questions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject            TEXT NOT NULL,
  target_grade       TEXT NOT NULL,
  question_type      TEXT NOT NULL DEFAULT 'multiple_choice',
  stem               TEXT NOT NULL DEFAULT '',
  choices            JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_choice     INTEGER NOT NULL,
  explanation        TEXT NOT NULL DEFAULT '',
  difficulty         TEXT NOT NULL,
  evaluation_areas   TEXT[] NOT NULL DEFAULT '{}',
  unit_name          TEXT NOT NULL DEFAULT '',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT entrance_exam_questions_subject_check
    CHECK (subject IN ('수학', '영어')),
  CONSTRAINT entrance_exam_questions_grade_check
    CHECK (target_grade IN ('중1', '중2', '중3', '고1')),
  CONSTRAINT entrance_exam_questions_difficulty_check
    CHECK (difficulty IN ('하', '중', '상')),
  CONSTRAINT entrance_exam_questions_type_check
    CHECK (question_type IN ('multiple_choice')),
  CONSTRAINT entrance_exam_questions_correct_choice_check
    CHECK (correct_choice BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_questions_subject
  ON public.entrance_exam_questions (subject);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_questions_grade
  ON public.entrance_exam_questions (target_grade);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_questions_difficulty
  ON public.entrance_exam_questions (difficulty);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_questions_unit_name
  ON public.entrance_exam_questions (unit_name);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_questions_evaluation_areas
  ON public.entrance_exam_questions USING GIN (evaluation_areas);

DROP TRIGGER IF EXISTS trg_entrance_exam_questions_updated_at ON public.entrance_exam_questions;
CREATE TRIGGER trg_entrance_exam_questions_updated_at
  BEFORE UPDATE ON public.entrance_exam_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.entrance_exam_questions IS
  '신입생 평가 문제은행. 기존 questions(질문하기 Q&A)와 무관한 독립 테이블. authenticated 강사만 CRUD.';

ALTER TABLE public.entrance_exam_questions ENABLE ROW LEVEL SECURITY;

-- 신규 테이블 전용 policy만 정리 (기존 테이블 policy 미대상)
-- 이전 초안(anon 허용)이 적용된 경우에도 제거하기 위한 DROP IF EXISTS
DROP POLICY IF EXISTS "dev_anon_select_entrance_exam_questions" ON public.entrance_exam_questions;
DROP POLICY IF EXISTS "dev_anon_insert_entrance_exam_questions" ON public.entrance_exam_questions;
DROP POLICY IF EXISTS "dev_anon_update_entrance_exam_questions" ON public.entrance_exam_questions;
DROP POLICY IF EXISTS "dev_anon_delete_entrance_exam_questions" ON public.entrance_exam_questions;
DROP POLICY IF EXISTS "dev_authenticated_select_entrance_exam_questions" ON public.entrance_exam_questions;
DROP POLICY IF EXISTS "dev_authenticated_insert_entrance_exam_questions" ON public.entrance_exam_questions;
DROP POLICY IF EXISTS "dev_authenticated_update_entrance_exam_questions" ON public.entrance_exam_questions;
DROP POLICY IF EXISTS "dev_authenticated_delete_entrance_exam_questions" ON public.entrance_exam_questions;
DROP POLICY IF EXISTS "teacher_authenticated_select_entrance_exam_questions" ON public.entrance_exam_questions;
DROP POLICY IF EXISTS "teacher_authenticated_insert_entrance_exam_questions" ON public.entrance_exam_questions;
DROP POLICY IF EXISTS "teacher_authenticated_update_entrance_exam_questions" ON public.entrance_exam_questions;
DROP POLICY IF EXISTS "teacher_authenticated_delete_entrance_exam_questions" ON public.entrance_exam_questions;

-- authenticated 강사만 CRUD 허용 (anon 정책 없음)
CREATE POLICY "teacher_authenticated_select_entrance_exam_questions"
  ON public.entrance_exam_questions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teacher_authenticated_insert_entrance_exam_questions"
  ON public.entrance_exam_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "teacher_authenticated_update_entrance_exam_questions"
  ON public.entrance_exam_questions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "teacher_authenticated_delete_entrance_exam_questions"
  ON public.entrance_exam_questions
  FOR DELETE
  TO authenticated
  USING (true);
