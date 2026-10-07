-- =============================================================================
-- 수학 월말평가 — 학생별 시험지 보관 (추가형, 여러 번 실행해도 안전)
--   math_monthly_result_papers : 학생 시험지 쪽별 사진(JPEG base64). 강사 전용, 학부모에게는 절대 나가지 않음.
--   발송이 끝난 학생의 시험지는 앱이 자동으로 지운다(저장 공간 절약).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.math_monthly_result_papers (
  exam_id     uuid        NOT NULL REFERENCES public.math_monthly_exams (id) ON DELETE CASCADE,
  student_id  uuid        NOT NULL,
  page        integer     NOT NULL,
  data        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, student_id, page)
);

ALTER TABLE public.math_monthly_result_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_math_monthly_result_papers" ON public.math_monthly_result_papers;
CREATE POLICY "authenticated_all_math_monthly_result_papers"
  ON public.math_monthly_result_papers FOR ALL TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON public.math_monthly_result_papers FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.math_monthly_result_papers TO authenticated;

NOTIFY pgrst, 'reload schema';
