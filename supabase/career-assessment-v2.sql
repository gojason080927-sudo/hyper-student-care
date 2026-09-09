-- HYPER 진로·학과 적성검사 MASTER v2
-- Additive / non-destructive.
-- 기존 1~88 문항 PK, 응답 FK, 진행 중/완료 V1 세션·결과는 수정·삭제하지 않는다.
-- DROP / TRUNCATE 금지.

-- ---------------------------------------------------------------------------
-- 1. questions: 번호 상한 140, V2 display_order, introduced_in
-- ---------------------------------------------------------------------------
ALTER TABLE public.career_assessment_questions
  DROP CONSTRAINT IF EXISTS career_assessment_questions_question_number_check;

ALTER TABLE public.career_assessment_questions
  ADD CONSTRAINT career_assessment_questions_question_number_check
  CHECK (question_number BETWEEN 1 AND 140);

ALTER TABLE public.career_assessment_questions
  ADD COLUMN IF NOT EXISTS display_order_v2 INTEGER;

ALTER TABLE public.career_assessment_questions
  ADD COLUMN IF NOT EXISTS introduced_in TEXT NOT NULL DEFAULT 'HYPER_CAREER_V1';

UPDATE public.career_assessment_questions
SET introduced_in = 'HYPER_CAREER_V1'
WHERE question_number BETWEEN 1 AND 88
  AND (introduced_in IS NULL OR introduced_in = '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_career_questions_display_order_v2
  ON public.career_assessment_questions (display_order_v2)
  WHERE display_order_v2 IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. sessions: 기존 행은 V1/88로 보존. 신규 insert 기본값은 V2/140.
-- ---------------------------------------------------------------------------
ALTER TABLE public.career_assessment_sessions
  ADD COLUMN IF NOT EXISTS assessment_version TEXT;

ALTER TABLE public.career_assessment_sessions
  ADD COLUMN IF NOT EXISTS expected_question_count INTEGER;

UPDATE public.career_assessment_sessions
SET assessment_version = coalesce(nullif(assessment_version, ''), 'HYPER_CAREER_V1')
WHERE assessment_version IS NULL OR assessment_version = '';

UPDATE public.career_assessment_sessions
SET expected_question_count = CASE
  WHEN assessment_version = 'HYPER_CAREER_V2' THEN 140
  ELSE 88
END
WHERE expected_question_count IS NULL;

ALTER TABLE public.career_assessment_sessions
  ALTER COLUMN assessment_version SET DEFAULT 'HYPER_CAREER_V2';

ALTER TABLE public.career_assessment_sessions
  ALTER COLUMN expected_question_count SET DEFAULT 140;

ALTER TABLE public.career_assessment_sessions
  ALTER COLUMN assessment_version SET NOT NULL;

ALTER TABLE public.career_assessment_sessions
  ALTER COLUMN expected_question_count SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'career_sessions_assessment_version_chk'
      AND conrelid = 'public.career_assessment_sessions'::regclass
  ) THEN
    ALTER TABLE public.career_assessment_sessions
      ADD CONSTRAINT career_sessions_assessment_version_chk
      CHECK (assessment_version IN ('HYPER_CAREER_V1', 'HYPER_CAREER_V2'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'career_sessions_expected_count_chk'
      AND conrelid = 'public.career_assessment_sessions'::regclass
  ) THEN
    ALTER TABLE public.career_assessment_sessions
      ADD CONSTRAINT career_sessions_expected_count_chk
      CHECK (expected_question_count IN (88, 140));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. complete: 세션 expected_question_count 기준으로만 완료 허용
-- ---------------------------------------------------------------------------
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
  v_expected integer;
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

  v_expected := coalesce(v_session.expected_question_count, 88);
  IF v_answered < v_expected THEN
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
    coalesce(p_result->>'resultVersion', v_session.assessment_version, 'HYPER_CAREER_V1')
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

-- ---------------------------------------------------------------------------
-- 4. summaries: version-aware progress
-- ---------------------------------------------------------------------------
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
      s.assessment_version,
      s.expected_question_count,
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
