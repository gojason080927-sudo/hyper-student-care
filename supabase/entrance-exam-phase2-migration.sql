-- =============================================================================
-- 신입생 평가 — Phase 2 (시험지 저장 + 응시 결과) additive migration only
-- =============================================================================
-- 적용: Supabase Dashboard → SQL Editor → Run
-- 기존 테이블 DROP/TRUNCATE/파괴적 ALTER 없음.
-- 기존 entrance_exam_questions / students / RLS 정책은 변경하지 않음.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) 저장된 시험지 (문제 ID 순서 포함)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entrance_exam_papers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL DEFAULT '',
  subject         TEXT NOT NULL,
  target_grade    TEXT NOT NULL DEFAULT '',
  question_ids    UUID[] NOT NULL DEFAULT '{}',
  question_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT entrance_exam_papers_subject_check
    CHECK (subject IN ('수학', '영어')),
  CONSTRAINT entrance_exam_papers_question_count_check
    CHECK (question_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_papers_subject
  ON public.entrance_exam_papers (subject);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_papers_created_at
  ON public.entrance_exam_papers (created_at DESC);

DROP TRIGGER IF EXISTS trg_entrance_exam_papers_updated_at ON public.entrance_exam_papers;
CREATE TRIGGER trg_entrance_exam_papers_updated_at
  BEFORE UPDATE ON public.entrance_exam_papers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.entrance_exam_papers IS
  '신입생 평가 저장된 시험지. question_ids 순서가 출력/채점 문항 순서.';

ALTER TABLE public.entrance_exam_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_authenticated_select_entrance_exam_papers" ON public.entrance_exam_papers;
DROP POLICY IF EXISTS "teacher_authenticated_insert_entrance_exam_papers" ON public.entrance_exam_papers;
DROP POLICY IF EXISTS "teacher_authenticated_update_entrance_exam_papers" ON public.entrance_exam_papers;
DROP POLICY IF EXISTS "teacher_authenticated_delete_entrance_exam_papers" ON public.entrance_exam_papers;

CREATE POLICY "teacher_authenticated_select_entrance_exam_papers"
  ON public.entrance_exam_papers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teacher_authenticated_insert_entrance_exam_papers"
  ON public.entrance_exam_papers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "teacher_authenticated_update_entrance_exam_papers"
  ON public.entrance_exam_papers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "teacher_authenticated_delete_entrance_exam_papers"
  ON public.entrance_exam_papers
  FOR DELETE
  TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- 2) 응시 결과 (신입생 임시 응시자 정보 포함 — students FK 강제 없음)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entrance_exam_attempts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id          UUID NOT NULL REFERENCES public.entrance_exam_papers(id) ON DELETE RESTRICT,
  paper_title       TEXT NOT NULL DEFAULT '',
  subject           TEXT NOT NULL,
  school            TEXT NOT NULL DEFAULT '',
  student_name      TEXT NOT NULL DEFAULT '',
  grade             TEXT NOT NULL DEFAULT '',
  exam_date         DATE,
  linked_student_id UUID NULL REFERENCES public.students(id) ON DELETE SET NULL,
  answers           JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_count     INTEGER NOT NULL DEFAULT 0,
  total_count       INTEGER NOT NULL DEFAULT 0,
  total_score       NUMERIC(5,1) NOT NULL DEFAULT 0,
  area_scores       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT entrance_exam_attempts_subject_check
    CHECK (subject IN ('수학', '영어')),
  CONSTRAINT entrance_exam_attempts_counts_check
    CHECK (correct_count >= 0 AND total_count >= 0 AND correct_count <= total_count)
);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_attempts_paper_id
  ON public.entrance_exam_attempts (paper_id);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_attempts_exam_date
  ON public.entrance_exam_attempts (exam_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_entrance_exam_attempts_created_at
  ON public.entrance_exam_attempts (created_at DESC);

DROP TRIGGER IF EXISTS trg_entrance_exam_attempts_updated_at ON public.entrance_exam_attempts;
CREATE TRIGGER trg_entrance_exam_attempts_updated_at
  BEFORE UPDATE ON public.entrance_exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.entrance_exam_attempts IS
  '신입생 평가 응시 결과. 응시자 정보는 임시 입력 가능(students 강제 등록 없음).';

ALTER TABLE public.entrance_exam_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_authenticated_select_entrance_exam_attempts" ON public.entrance_exam_attempts;
DROP POLICY IF EXISTS "teacher_authenticated_insert_entrance_exam_attempts" ON public.entrance_exam_attempts;
DROP POLICY IF EXISTS "teacher_authenticated_update_entrance_exam_attempts" ON public.entrance_exam_attempts;
DROP POLICY IF EXISTS "teacher_authenticated_delete_entrance_exam_attempts" ON public.entrance_exam_attempts;

CREATE POLICY "teacher_authenticated_select_entrance_exam_attempts"
  ON public.entrance_exam_attempts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "teacher_authenticated_insert_entrance_exam_attempts"
  ON public.entrance_exam_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "teacher_authenticated_update_entrance_exam_attempts"
  ON public.entrance_exam_attempts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "teacher_authenticated_delete_entrance_exam_attempts"
  ON public.entrance_exam_attempts
  FOR DELETE
  TO authenticated
  USING (true);
