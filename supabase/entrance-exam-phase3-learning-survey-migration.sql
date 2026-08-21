-- =============================================================================
-- 신입생 평가 — Phase 3 (학습성향 설문) additive migration only
-- =============================================================================
-- 적용: Supabase Dashboard → SQL Editor → Run
-- 기존 테이블 DROP/TRUNCATE/파괴적 ALTER 없음.
-- entrance_exam_questions / papers / attempts / students / 기존 RLS 미변경.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.entrance_exam_learning_surveys (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id            UUID NOT NULL REFERENCES public.entrance_exam_attempts(id) ON DELETE CASCADE,
  responses             JSONB NOT NULL DEFAULT '{}'::jsonb,
  motivation_score      NUMERIC(5,1) NOT NULL DEFAULT 0,
  self_directed_score   NUMERIC(5,1) NOT NULL DEFAULT 0,
  concentration_score   NUMERIC(5,1) NOT NULL DEFAULT 0,
  planning_score        NUMERIC(5,1) NOT NULL DEFAULT 0,
  persistence_score     NUMERIC(5,1) NOT NULL DEFAULT 0,
  confidence_score      NUMERIC(5,1) NOT NULL DEFAULT 0,
  overall_score         NUMERIC(5,1) NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT entrance_exam_learning_surveys_attempt_unique UNIQUE (attempt_id)
);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_learning_surveys_attempt_id
  ON public.entrance_exam_learning_surveys (attempt_id);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_learning_surveys_created_at
  ON public.entrance_exam_learning_surveys (created_at DESC);

DROP TRIGGER IF EXISTS trg_entrance_exam_learning_surveys_updated_at
  ON public.entrance_exam_learning_surveys;
CREATE TRIGGER trg_entrance_exam_learning_surveys_updated_at
  BEFORE UPDATE ON public.entrance_exam_learning_surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.entrance_exam_learning_surveys IS
  '신입생 학습성향 설문. attempt_id당 1건(UNIQUE). 24문항 Likert 응답 + 영역/종합 점수.';

ALTER TABLE public.entrance_exam_learning_surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_authenticated_select_entrance_exam_learning_surveys"
  ON public.entrance_exam_learning_surveys;
DROP POLICY IF EXISTS "teacher_authenticated_insert_entrance_exam_learning_surveys"
  ON public.entrance_exam_learning_surveys;
DROP POLICY IF EXISTS "teacher_authenticated_update_entrance_exam_learning_surveys"
  ON public.entrance_exam_learning_surveys;
DROP POLICY IF EXISTS "teacher_authenticated_delete_entrance_exam_learning_surveys"
  ON public.entrance_exam_learning_surveys;

CREATE POLICY "teacher_authenticated_select_entrance_exam_learning_surveys"
  ON public.entrance_exam_learning_surveys
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teacher_authenticated_insert_entrance_exam_learning_surveys"
  ON public.entrance_exam_learning_surveys
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "teacher_authenticated_update_entrance_exam_learning_surveys"
  ON public.entrance_exam_learning_surveys
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "teacher_authenticated_delete_entrance_exam_learning_surveys"
  ON public.entrance_exam_learning_surveys
  FOR DELETE
  TO authenticated
  USING (true);
