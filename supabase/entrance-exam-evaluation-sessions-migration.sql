-- =============================================================================
-- 신입생 평가 — 통합 평가 세션 (additive migration only)
-- =============================================================================
-- 적용: Supabase Dashboard → SQL Editor → Run
-- 기존 테이블 DROP/TRUNCATE/파괴적 ALTER 없음.
-- entrance_exam_questions / papers / attempts / learning_surveys / 기존 RLS 미변경.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.entrance_exam_evaluation_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name         TEXT NOT NULL DEFAULT '',
  school               TEXT NOT NULL DEFAULT '',
  grade                TEXT NOT NULL DEFAULT '',
  evaluation_date      DATE,
  math_attempt_id      UUID NULL REFERENCES public.entrance_exam_attempts(id) ON DELETE SET NULL,
  english_attempt_id   UUID NULL REFERENCES public.entrance_exam_attempts(id) ON DELETE SET NULL,
  learning_survey_id   UUID NULL REFERENCES public.entrance_exam_learning_surveys(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_evaluation_sessions_eval_date
  ON public.entrance_exam_evaluation_sessions (evaluation_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_evaluation_sessions_created_at
  ON public.entrance_exam_evaluation_sessions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_evaluation_sessions_math_attempt
  ON public.entrance_exam_evaluation_sessions (math_attempt_id);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_evaluation_sessions_english_attempt
  ON public.entrance_exam_evaluation_sessions (english_attempt_id);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_evaluation_sessions_survey
  ON public.entrance_exam_evaluation_sessions (learning_survey_id);

DROP TRIGGER IF EXISTS trg_entrance_exam_evaluation_sessions_updated_at
  ON public.entrance_exam_evaluation_sessions;
CREATE TRIGGER trg_entrance_exam_evaluation_sessions_updated_at
  BEFORE UPDATE ON public.entrance_exam_evaluation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.entrance_exam_evaluation_sessions IS
  '신입생 통합 종합진단용 평가 세션. 기존 수학/영어 attempt·학습성향 survey를 참조만 함.';

ALTER TABLE public.entrance_exam_evaluation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_authenticated_select_entrance_exam_evaluation_sessions"
  ON public.entrance_exam_evaluation_sessions;
DROP POLICY IF EXISTS "teacher_authenticated_insert_entrance_exam_evaluation_sessions"
  ON public.entrance_exam_evaluation_sessions;
DROP POLICY IF EXISTS "teacher_authenticated_update_entrance_exam_evaluation_sessions"
  ON public.entrance_exam_evaluation_sessions;
DROP POLICY IF EXISTS "teacher_authenticated_delete_entrance_exam_evaluation_sessions"
  ON public.entrance_exam_evaluation_sessions;

CREATE POLICY "teacher_authenticated_select_entrance_exam_evaluation_sessions"
  ON public.entrance_exam_evaluation_sessions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teacher_authenticated_insert_entrance_exam_evaluation_sessions"
  ON public.entrance_exam_evaluation_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "teacher_authenticated_update_entrance_exam_evaluation_sessions"
  ON public.entrance_exam_evaluation_sessions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "teacher_authenticated_delete_entrance_exam_evaluation_sessions"
  ON public.entrance_exam_evaluation_sessions
  FOR DELETE
  TO authenticated
  USING (true);
