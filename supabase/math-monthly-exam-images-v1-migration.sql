-- =============================================================================
-- 수학 월말평가 — 시험지 문항 캡처 (시험 1회분을 한 번에 가져오기, 추가형·여러 번 실행해도 안전)
--   1) math_monthly_exams 에 이미지 공개 범위 2칸 추가
--      images_clean = true            : 필기·채점 흔적 없는 깨끗한 원본 → 반 전체 학부모에게 공개
--      images_source_student_id = 학생 : 그 학생 시험지에서 잘랐음 → 그 학생 학부모에게만 공개
--   2) math_monthly_exam_images : 시험 문항별 캡처 (JPEG base64)
--   3) get_parent_math_monthly_images 교체 : 학생이 직접 올린 사진이 있으면 그것을, 없으면 공개 가능한 시험지 캡처를 돌려줌
-- =============================================================================

ALTER TABLE public.math_monthly_exams ADD COLUMN IF NOT EXISTS images_clean boolean NOT NULL DEFAULT false;
ALTER TABLE public.math_monthly_exams ADD COLUMN IF NOT EXISTS images_source_student_id uuid;

CREATE TABLE IF NOT EXISTS public.math_monthly_exam_images (
  exam_id     uuid        NOT NULL REFERENCES public.math_monthly_exams (id) ON DELETE CASCADE,
  no          integer     NOT NULL,
  data        text        NOT NULL,
  mime        text        NOT NULL DEFAULT 'image/jpeg',
  width       integer     NOT NULL DEFAULT 1,
  height      integer     NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, no)
);

ALTER TABLE public.math_monthly_exam_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_math_monthly_exam_images" ON public.math_monthly_exam_images;
CREATE POLICY "authenticated_all_math_monthly_exam_images"
  ON public.math_monthly_exam_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON public.math_monthly_exam_images FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.math_monthly_exam_images TO authenticated;

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
  v_exam public.math_monthly_exams%ROWTYPE;
  v_exam_ok boolean;
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

  SELECT * INTO v_exam FROM public.math_monthly_exams WHERE id = p_exam_id;
  v_exam_ok := v_exam.images_clean OR v_exam.images_source_student_id = v_student_id;

  RETURN coalesce((
    SELECT jsonb_agg(
             jsonb_build_object('no', n.no, 'data', n.data, 'mime', n.mime, 'width', n.width, 'height', n.height)
             ORDER BY n.no)
    FROM (
      SELECT g.no, g.data, g.mime, g.width, g.height
        FROM public.math_monthly_result_images g
       WHERE g.exam_id = p_exam_id AND g.student_id = v_student_id
      UNION ALL
      SELECT e.no, e.data, e.mime, e.width, e.height
        FROM public.math_monthly_exam_images e
       WHERE v_exam_ok AND e.exam_id = p_exam_id
         AND NOT EXISTS (
           SELECT 1 FROM public.math_monthly_result_images g2
            WHERE g2.exam_id = p_exam_id AND g2.student_id = v_student_id AND g2.no = e.no)
    ) n
    WHERE n.no = ANY (coalesce(p_nos, '{}'::int[]))
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_result.wrong_items) w WHERE (w->>'no')::int = n.no)
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_math_monthly_images(text, uuid, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_math_monthly_images(text, uuid, integer[]) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
