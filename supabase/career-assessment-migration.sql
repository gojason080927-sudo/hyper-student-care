-- HYPER STUDENT CARE — 진로·학과 적성검사 MASTER v1
-- Additive / non-destructive. 기존 테이블 DROP·TRUNCATE·기존 RLS 비활성화 금지.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. questions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.career_assessment_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_number INTEGER NOT NULL UNIQUE CHECK (question_number BETWEEN 1 AND 88),
  text            TEXT NOT NULL,
  domain          TEXT NOT NULL,
  scoring_code    TEXT NOT NULL,
  display_order   INTEGER NOT NULL UNIQUE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.career_assessment_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  access_token  TEXT NOT NULL,
  token_hash    TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed')),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_sessions_student
  ON public.career_assessment_sessions (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_career_sessions_status
  ON public.career_assessment_sessions (status);

-- ---------------------------------------------------------------------------
-- 3. responses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.career_assessment_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES public.career_assessment_sessions(id) ON DELETE CASCADE,
  question_id  UUID NOT NULL REFERENCES public.career_assessment_questions(id),
  answer       INTEGER NOT NULL CHECK (answer BETWEEN 1 AND 5),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_career_responses_session
  ON public.career_assessment_responses (session_id);

-- ---------------------------------------------------------------------------
-- 4. results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.career_assessment_results (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id               UUID NOT NULL UNIQUE REFERENCES public.career_assessment_sessions(id) ON DELETE CASCADE,
  student_id               UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  riasec_scores            JSONB NOT NULL,
  strength_scores          JSONB NOT NULL,
  value_scores             JSONB NOT NULL,
  behavior_scores          JSONB NOT NULL,
  problem_solving_scores   JSONB NOT NULL,
  career_efficacy          NUMERIC NOT NULL,
  career_readiness         NUMERIC NOT NULL,
  major_group_scores       JSONB NOT NULL,
  detailed_major_scores    JSONB NOT NULL,
  result_payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_version           TEXT NOT NULL DEFAULT 'HYPER_CAREER_V1',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_career_results_student
  ON public.career_assessment_results (student_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. major profiles / dictionary / bands
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.career_major_profiles (
  id                    TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  riasec_target         JSONB NOT NULL,
  strength_keys         TEXT[] NOT NULL,
  value_keys            TEXT[] NOT NULL,
  behavior_keys         TEXT[] NOT NULL,
  problem_solving_keys  TEXT[] NOT NULL,
  notes                 TEXT NOT NULL DEFAULT 'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.career_major_dictionary (
  id                     TEXT PRIMARY KEY,
  major_name             TEXT NOT NULL,
  major_group_primary    TEXT NOT NULL REFERENCES public.career_major_profiles(id),
  major_group_secondary  TEXT REFERENCES public.career_major_profiles(id),
  primary_weight         NUMERIC NOT NULL,
  secondary_weight       NUMERIC NOT NULL DEFAULT 0,
  is_active              BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT career_major_dictionary_weight_sum
    CHECK (
      (major_group_secondary IS NULL AND primary_weight = 1 AND secondary_weight = 0)
      OR (major_group_secondary IS NOT NULL AND abs(primary_weight + secondary_weight - 1) < 0.000001)
    )
);

CREATE TABLE IF NOT EXISTS public.career_fit_bands (
  id                      TEXT PRIMARY KEY,
  min_score               NUMERIC NOT NULL,
  max_score               NUMERIC NOT NULL,
  label                   TEXT NOT NULL,
  exclude_from_priority   BOOLEAN NOT NULL DEFAULT false,
  sort_order              INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public.career_assessment_result_notices (
  session_id  UUID PRIMARY KEY REFERENCES public.career_assessment_sessions(id) ON DELETE CASCADE,
  result_id   UUID NOT NULL UNIQUE REFERENCES public.career_assessment_results(id) ON DELETE CASCADE,
  notice_id   UUID NOT NULL UNIQUE REFERENCES public.notices(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. notices: additive reference column only
-- ---------------------------------------------------------------------------
ALTER TABLE public.notices
  ADD COLUMN IF NOT EXISTS career_assessment_result_id UUID
    REFERENCES public.career_assessment_results(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notices_career_result_unique
  ON public.notices (career_assessment_result_id)
  WHERE career_assessment_result_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notices_career_assessment_result_id_key'
  ) THEN
    ALTER TABLE public.notices
      ADD CONSTRAINT notices_career_assessment_result_id_key
      UNIQUE (career_assessment_result_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 7. RLS — authenticated teachers only. No anon table access.
-- ---------------------------------------------------------------------------
ALTER TABLE public.career_assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_major_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_major_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_fit_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_assessment_result_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teacher_select_career_assessment_questions ON public.career_assessment_questions;
DROP POLICY IF EXISTS teacher_select_career_assessment_sessions ON public.career_assessment_sessions;
DROP POLICY IF EXISTS teacher_select_career_assessment_responses ON public.career_assessment_responses;
DROP POLICY IF EXISTS teacher_select_career_assessment_results ON public.career_assessment_results;
DROP POLICY IF EXISTS teacher_select_career_major_profiles ON public.career_major_profiles;
DROP POLICY IF EXISTS teacher_select_career_major_dictionary ON public.career_major_dictionary;
DROP POLICY IF EXISTS teacher_select_career_fit_bands ON public.career_fit_bands;
DROP POLICY IF EXISTS teacher_select_career_assessment_result_notices ON public.career_assessment_result_notices;

CREATE POLICY teacher_select_career_assessment_questions
  ON public.career_assessment_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY teacher_select_career_assessment_sessions
  ON public.career_assessment_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY teacher_select_career_assessment_responses
  ON public.career_assessment_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY teacher_select_career_assessment_results
  ON public.career_assessment_results FOR SELECT TO authenticated USING (true);
CREATE POLICY teacher_select_career_major_profiles
  ON public.career_major_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY teacher_select_career_major_dictionary
  ON public.career_major_dictionary FOR SELECT TO authenticated USING (true);
CREATE POLICY teacher_select_career_fit_bands
  ON public.career_fit_bands FOR SELECT TO authenticated USING (true);
CREATE POLICY teacher_select_career_assessment_result_notices
  ON public.career_assessment_result_notices FOR SELECT TO authenticated USING (true);

REVOKE ALL ON public.career_assessment_questions FROM anon;
REVOKE ALL ON public.career_assessment_sessions FROM anon;
REVOKE ALL ON public.career_assessment_responses FROM anon;
REVOKE ALL ON public.career_assessment_results FROM anon;
REVOKE ALL ON public.career_major_profiles FROM anon;
REVOKE ALL ON public.career_major_dictionary FROM anon;
REVOKE ALL ON public.career_fit_bands FROM anon;
REVOKE ALL ON public.career_assessment_result_notices FROM anon;

GRANT SELECT ON public.career_assessment_questions TO authenticated;
GRANT SELECT ON public.career_assessment_sessions TO authenticated;
GRANT SELECT ON public.career_assessment_responses TO authenticated;
GRANT SELECT ON public.career_assessment_results TO authenticated;
GRANT SELECT ON public.career_major_profiles TO authenticated;
GRANT SELECT ON public.career_major_dictionary TO authenticated;
GRANT SELECT ON public.career_fit_bands TO authenticated;
GRANT SELECT ON public.career_assessment_result_notices TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Parent result RPC — own student only
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_parent_career_assessment_result(
  p_access_key text,
  p_result_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_result public.career_assessment_results;
  v_student public.students;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_result
  FROM public.career_assessment_results r
  WHERE r.id = p_result_id
    AND r.student_id = v_student_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_student FROM public.students s WHERE s.id = v_student_id;

  RETURN jsonb_build_object(
    'result', to_jsonb(v_result),
    'student', jsonb_build_object(
      'id', v_student.id,
      'name', v_student.name,
      'school', v_student.school,
      'grade', v_student.grade
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_career_assessment_result(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_career_assessment_result(text, uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 9. Idempotent complete transaction (service_role / security definer)
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

  SELECT * INTO v_student FROM public.students WHERE id = v_session.student_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'student_not_found';
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
    SET student_id = EXCLUDED.student_id
  RETURNING * INTO v_result;

  UPDATE public.career_assessment_sessions
  SET status = 'completed',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  WHERE id = p_session_id;

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

  RETURN jsonb_build_object('status', 'completed', 'result', to_jsonb(v_result));
END;
$$;

REVOKE ALL ON FUNCTION public.complete_career_assessment(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_career_assessment(uuid, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_career_assessment(uuid, jsonb) TO service_role;

-- ON CONFLICT (career_assessment_result_id) requires a unique constraint, not only a partial unique index.
-- The partial unique index already exists. Postgres ON CONFLICT needs a constraint name.
-- Use unique constraint compatible insert via the partial unique index is not always valid.
-- Fallback path above handles existing notice.

-- ---------------------------------------------------------------------------
-- 10. Public token helpers used only by service_role edge function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hash_career_access_token(p_token text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(digest(p_token, 'sha256'), 'hex');
$$;

REVOKE ALL ON FUNCTION public.hash_career_access_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.hash_career_access_token(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hash_career_access_token(text) TO service_role;
