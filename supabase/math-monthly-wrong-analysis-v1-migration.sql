-- =============================================================================
-- 수학 월말평가 — 틀린 문제 사진 (추가형, 여러 번 실행해도 안전)
--   1) math_monthly_result_images : 학생별 틀린 문제 사진 (JPEG base64, 공개 URL 없음)
--   2) get_parent_math_monthly_images(access_key, exam_id, nos) : 학부모용 — 발송된 결과의 틀린 번호 사진만
--   * 문항별 단원·유형·분석은 기존 math_monthly_results.wrong_items(jsonb) 항목의 unit/type/note 에 저장한다.
--     get_parent_math_monthly_reports 는 wrong_items 를 그대로 내보내므로 수정하지 않는다.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.math_monthly_result_images (
  exam_id     uuid        NOT NULL REFERENCES public.math_monthly_exams (id) ON DELETE CASCADE,
  student_id  uuid        NOT NULL,
  no          integer     NOT NULL,
  data        text        NOT NULL,           -- base64 JPEG (data: 접두어 없음)
  mime        text        NOT NULL DEFAULT 'image/jpeg',
  width       integer     NOT NULL DEFAULT 1,
  height      integer     NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, student_id, no)
);

ALTER TABLE public.math_monthly_result_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_math_monthly_result_images" ON public.math_monthly_result_images;
CREATE POLICY "authenticated_all_math_monthly_result_images"
  ON public.math_monthly_result_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON public.math_monthly_result_images FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.math_monthly_result_images TO authenticated;

-- 학부모용: 본인 자녀의, 발송(sent)된 결과의, 틀린 번호 사진만
CREATE OR REPLACE FUNCTION public.get_parent_math_monthly_images(p_access_key text, p_exam_id uuid, p_nos integer[])
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_result public.math_monthly_results%ROWTYPE;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_result FROM public.math_monthly_results
   WHERE exam_id = p_exam_id AND student_id = v_student_id AND status = 'sent' AND absent = false;
  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(
             jsonb_build_object('no', g.no, 'data', g.data, 'mime', g.mime, 'width', g.width, 'height', g.height)
             ORDER BY g.no)
    FROM public.math_monthly_result_images g
    WHERE g.exam_id = p_exam_id
      AND g.student_id = v_student_id
      AND g.no = ANY (coalesce(p_nos, '{}'::int[]))
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_result.wrong_items) w WHERE (w->>'no')::int = g.no)
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_math_monthly_images(text, uuid, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_math_monthly_images(text, uuid, integer[]) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
