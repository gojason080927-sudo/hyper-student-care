-- Additive: 상담생(guest) 진로검사. students에 가짜 재원생을 만들지 않는다.
-- DROP / TRUNCATE / 기존 세션·결과 삭제 금지.

CREATE TABLE IF NOT EXISTS public.career_assessment_guests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  school             TEXT NOT NULL,
  grade              TEXT NOT NULL,
  consultation_date  DATE,
  memo               TEXT,
  linked_student_id  UUID REFERENCES public.students(id) ON DELETE SET NULL,
  created_by         UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_guests_linked_student
  ON public.career_assessment_guests (linked_student_id);

CREATE INDEX IF NOT EXISTS idx_career_guests_created
  ON public.career_assessment_guests (created_at DESC);

ALTER TABLE public.career_assessment_sessions
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE public.career_assessment_sessions
  ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES public.career_assessment_guests(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_career_sessions_guest
  ON public.career_assessment_sessions (guest_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'career_sessions_subject_chk'
      AND conrelid = 'public.career_assessment_sessions'::regclass
  ) THEN
    ALTER TABLE public.career_assessment_sessions
      ADD CONSTRAINT career_sessions_subject_chk CHECK (
        (student_id IS NOT NULL AND guest_id IS NULL)
        OR (student_id IS NULL AND guest_id IS NOT NULL)
      );
  END IF;
END $$;

ALTER TABLE public.career_assessment_results
  ALTER COLUMN student_id DROP NOT NULL;

ALTER TABLE public.career_assessment_results
  ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES public.career_assessment_guests(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_career_results_guest
  ON public.career_assessment_results (guest_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'career_results_subject_chk'
      AND conrelid = 'public.career_assessment_results'::regclass
  ) THEN
    ALTER TABLE public.career_assessment_results
      ADD CONSTRAINT career_results_subject_chk CHECK (
        (student_id IS NOT NULL AND guest_id IS NULL)
        OR (student_id IS NULL AND guest_id IS NOT NULL)
      );
  END IF;
END $$;

ALTER TABLE public.career_assessment_guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_select_career_assessment_guests ON public.career_assessment_guests;
CREATE POLICY teacher_select_career_assessment_guests
  ON public.career_assessment_guests FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.career_assessment_guests FROM PUBLIC;
REVOKE ALL ON public.career_assessment_guests FROM anon;
GRANT SELECT ON public.career_assessment_guests TO authenticated;
GRANT ALL ON public.career_assessment_guests TO service_role;

CREATE OR REPLACE FUNCTION public.complete_career_assessment(
  p_session_id uuid,
  p_result jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session public.career_assessment_sessions;
  v_result public.career_assessment_results;
  v_student public.students;
  v_guest public.career_assessment_guests;
  v_notice_id uuid;
  v_answered integer;
BEGIN
  SELECT * INTO v_session
  FROM public.career_assessment_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  IF v_session.student_id IS NOT NULL THEN
    SELECT * INTO v_student FROM public.students WHERE id = v_session.student_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'student_not_found';
    END IF;
  ELSIF v_session.guest_id IS NOT NULL THEN
    SELECT * INTO v_guest FROM public.career_assessment_guests WHERE id = v_session.guest_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'guest_not_found';
    END IF;
  ELSE
    RAISE EXCEPTION 'session_subject_missing';
  END IF;

  SELECT COUNT(*) INTO v_answered
  FROM public.career_assessment_responses
  WHERE session_id = p_session_id;

  IF v_answered < 88 THEN
    RAISE EXCEPTION 'incomplete_answers';
  END IF;

  IF v_session.status = 'completed' THEN
    SELECT * INTO v_result
    FROM public.career_assessment_results
    WHERE session_id = p_session_id;
    IF FOUND THEN
      RETURN jsonb_build_object('status', 'already_completed', 'result', to_jsonb(v_result));
    END IF;
  END IF;

  INSERT INTO public.career_assessment_results (
    session_id,
    student_id,
    guest_id,
    riasec_scores,
    strength_scores,
    value_scores,
    behavior_scores,
    problem_solving_scores,
    career_efficacy,
    career_readiness,
    major_group_scores,
    detailed_major_scores,
    result_payload,
    result_version
  ) VALUES (
    p_session_id,
    v_session.student_id,
    v_session.guest_id,
    p_result->'riasecScores',
    p_result->'strengthScores',
    p_result->'valueScores',
    p_result->'behaviorScores',
    p_result->'problemSolvingScores',
    (p_result->>'careerEfficacy')::numeric,
    (p_result->>'careerReadiness')::numeric,
    p_result->'majorGroupScores',
    p_result->'detailedMajorScores',
    p_result,
    coalesce(p_result->>'resultVersion', 'HYPER_CAREER_V1')
  )
  ON CONFLICT (session_id) DO UPDATE
    SET student_id = EXCLUDED.student_id,
        guest_id = EXCLUDED.guest_id
  RETURNING * INTO v_result;

  UPDATE public.career_assessment_sessions
  SET status = 'completed',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  WHERE id = p_session_id;

  -- 재원생만 학부모 공지. 상담생(guest)은 notice를 만들지 않는다.
  IF v_session.student_id IS NOT NULL AND v_session.guest_id IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.career_assessment_result_notices n
      WHERE n.session_id = p_session_id
    ) THEN
      SELECT id INTO v_notice_id
      FROM public.notices
      WHERE career_assessment_result_id = v_result.id
      LIMIT 1;

      IF v_notice_id IS NULL THEN
        INSERT INTO public.notices (
          category,
          title,
          content,
          summary,
          source_name,
          original_article_title,
          author_name,
          is_pinned,
          is_published,
          published_at,
          audience_type,
          target_student_id,
          is_important,
          career_assessment_result_id
        ) VALUES (
          '공지사항',
          '[진로·학과 적성검사 결과] ' || v_student.name || ' 학생의 진로·학과 적성검사 결과가 등록되었습니다.',
          '진로·학과 적성검사 결과를 확인하세요.',
          '검사 결과가 등록되었습니다.',
          '',
          '',
          'HYPER ACADEMY',
          false,
          true,
          CURRENT_DATE,
          'student',
          v_student.id,
          true,
          v_result.id
        )
        RETURNING id INTO v_notice_id;
      END IF;

      IF v_notice_id IS NOT NULL THEN
        INSERT INTO public.career_assessment_result_notices (session_id, result_id, notice_id)
        VALUES (p_session_id, v_result.id, v_notice_id)
        ON CONFLICT (session_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('status', 'completed', 'result', to_jsonb(v_result));
END;
$$;

REVOKE ALL ON FUNCTION public.complete_career_assessment(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_career_assessment(uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_career_assessment(uuid, jsonb) TO service_role;

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
      s.guest_id,
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
      ) AS latest_result_id,
      g.name AS guest_name,
      g.school AS guest_school,
      g.grade AS guest_grade,
      g.consultation_date,
      g.memo AS guest_memo,
      g.linked_student_id
    FROM public.career_assessment_sessions s
    LEFT JOIN public.career_assessment_guests g ON g.id = s.guest_id
    ORDER BY s.created_at DESC
  ) x;
$$;

REVOKE ALL ON FUNCTION public.get_career_assessment_session_summaries() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_career_assessment_session_summaries() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_career_assessment_session_summaries() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_career_assessment_session_summaries() TO service_role;

NOTIFY pgrst, 'reload schema';
