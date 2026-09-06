-- Additive: 강사 목록은 responses 실제 개수를 authoritative progress로 사용한다.
-- 기존 career 테이블/토큰/RLS를 재설계하지 않는다.

CREATE OR REPLACE FUNCTION public.get_career_assessment_session_summaries()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  FROM (
    SELECT
      s.id,
      s.student_id,
      s.access_token,
      s.status,
      s.started_at,
      s.completed_at,
      s.created_at,
      s.updated_at,
      (
        SELECT count(*)::int
        FROM public.career_assessment_responses r
        WHERE r.session_id = s.id
      ) AS answered_count,
      (
        SELECT res.id
        FROM public.career_assessment_results res
        WHERE res.session_id = s.id
        ORDER BY res.created_at DESC
        LIMIT 1
      ) AS latest_result_id
    FROM public.career_assessment_sessions s
    ORDER BY s.created_at DESC
  ) x;
$$;

REVOKE ALL ON FUNCTION public.get_career_assessment_session_summaries() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_career_assessment_session_summaries() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_career_assessment_session_summaries() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_career_assessment_session_summaries() TO service_role;

CREATE OR REPLACE FUNCTION public.trg_career_session_mark_in_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.career_assessment_sessions
  SET status = 'in_progress',
      started_at = coalesce(started_at, now()),
      updated_at = now()
  WHERE id = NEW.session_id
    AND status = 'not_started';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_career_responses_mark_in_progress ON public.career_assessment_responses;
CREATE TRIGGER trg_career_responses_mark_in_progress
  AFTER INSERT ON public.career_assessment_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_career_session_mark_in_progress();

UPDATE public.career_assessment_sessions s
SET status = 'in_progress',
    started_at = coalesce(s.started_at, now()),
    updated_at = now()
WHERE s.status = 'not_started'
  AND EXISTS (
    SELECT 1
    FROM public.career_assessment_responses r
    WHERE r.session_id = s.id
  );

NOTIFY pgrst, 'reload schema';
