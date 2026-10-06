-- =============================================================================
-- HYPER Student Care — 수학 월말평가 결과 보고서 v1 (추가 전용)
-- =============================================================================
-- 적용: 원장이 Supabase Dashboard → SQL Editor 에서 직접 실행. 앱이 자동 실행하지 않음.
-- 기존 표·함수는 수정/삭제하지 않는다 (get_parent_care_bundle 미변경).
--
-- 구성
--   1) math_monthly_exams    : 반별 월 1회 시험 설정
--   2) math_monthly_results  : 학생별 입력(임시 저장 draft → 발송 sent)
--   3) get_parent_math_monthly_reports(access_key) : 학부모용 (자기 자녀 + 반 평균 집계만)
--   4) publish_math_monthly_exam(exam_id)           : 강사 전용 발송 + monthly_evaluations 반영
--   5) list_math_monthly_push_recipients(exam_id)   : 푸시 수신자 (강사/service_role)
--
-- 개인정보 원칙
--   - 두 표는 authenticated(강사)만 접근. anon(학부모)은 표를 직접 읽을 수 없다.
--   - 학부모 RPC는 반 평균 점수·단원별/난이도별 평균 정답률·응시 인원까지만 반환.
--     문항별 정답 인원, 다른 학생의 점수·오답·이름은 반환하지 않는다.
--   - 응시자(발송·결시 제외)가 3명 미만이면 class_avg = null.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) 시험 설정
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.math_monthly_exams (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  grade          text        NOT NULL,
  class_name     text        NOT NULL,
  exam_date      date        NOT NULL,
  year           integer     NOT NULL,
  month          integer     NOT NULL,
  title          text        NOT NULL DEFAULT '',
  teacher_name   text        NOT NULL DEFAULT '',
  question_count integer     NOT NULL,
  -- [{ "no": 1, "points": 4, "difficulty": "basic|middle|high|highest" }, ...]
  items          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- [{ "name": "다항식의 연산", "from": 1, "to": 5 }, ...]
  units          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT math_monthly_exams_month_range CHECK (month BETWEEN 1 AND 12),
  CONSTRAINT math_monthly_exams_question_count CHECK (question_count BETWEEN 1 AND 100),
  CONSTRAINT math_monthly_exams_class_month_unique UNIQUE (grade, class_name, year, month)
);

-- ---------------------------------------------------------------------------
-- 2) 학생별 결과
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.math_monthly_results (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          uuid        NOT NULL REFERENCES public.math_monthly_exams (id) ON DELETE CASCADE,
  student_id       uuid        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  absent           boolean     NOT NULL DEFAULT false,
  -- [{ "no": 9, "cause": "calc|concept|reading|time" }, ...]
  wrong_items      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  score            integer     NOT NULL DEFAULT 0,
  strengths        text        NOT NULL DEFAULT '',
  improvements     text        NOT NULL DEFAULT '',
  teacher_comment  text        NOT NULL DEFAULT '',
  -- [{ "content": "...", "goal": "..." }, ...]  최대 5개
  next_plan        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  status           text        NOT NULL DEFAULT 'draft',
  sent_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT math_monthly_results_status_check CHECK (status IN ('draft', 'sent')),
  CONSTRAINT math_monthly_results_exam_student_unique UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_math_monthly_results_student ON public.math_monthly_results (student_id);
CREATE INDEX IF NOT EXISTS idx_math_monthly_results_exam ON public.math_monthly_results (exam_id);

DROP TRIGGER IF EXISTS trg_math_monthly_exams_updated_at ON public.math_monthly_exams;
CREATE TRIGGER trg_math_monthly_exams_updated_at
  BEFORE UPDATE ON public.math_monthly_exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_math_monthly_results_updated_at ON public.math_monthly_results;
CREATE TRIGGER trg_math_monthly_results_updated_at
  BEFORE UPDATE ON public.math_monthly_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: authenticated(강사)만. anon 정책 없음.
-- ---------------------------------------------------------------------------
ALTER TABLE public.math_monthly_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.math_monthly_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_math_monthly_exams" ON public.math_monthly_exams;
CREATE POLICY "authenticated_all_math_monthly_exams"
  ON public.math_monthly_exams FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_math_monthly_results" ON public.math_monthly_results;
CREATE POLICY "authenticated_all_math_monthly_results"
  ON public.math_monthly_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON public.math_monthly_exams FROM PUBLIC, anon;
REVOKE ALL ON public.math_monthly_results FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.math_monthly_exams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.math_monthly_results TO authenticated;

-- ---------------------------------------------------------------------------
-- 점수 계산 보조: 시험 설정 + 틀린 문항 → 점수 (서버 기준값)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._math_monthly_score(p_items jsonb, p_wrong jsonb)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(sum((i->>'points')::int), 0)::int
  FROM jsonb_array_elements(p_items) AS i
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_wrong) AS w
    WHERE (w->>'no')::int = (i->>'no')::int
  );
$$;

REVOKE ALL ON FUNCTION public._math_monthly_score(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._math_monthly_score(jsonb, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) 발송 (강사 전용)
--    - 반의 임시 저장(draft) 결과를 sent 로 바꾸고, 이미 발송된 결과도 점수를 다시 계산한다.
--    - monthly_evaluations(subject='수학')에 점수를 upsert → 성적 추이가 이어진다.
--    - 반환: { "newly_sent": [student_id...], "sent_total": n }
--      newly_sent = 이번 호출로 처음 발송된 학생 (푸시 알림 대상)
--    - 결시(absent) 학생은 발송·평가 기록 대상이 아니다.
--    - p_student_id 를 주면 이미 발송된 그 학생 1명만 다시 계산·반영한다 (발송 후 수정 저장용, 다른 학생은 건드리지 않음).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_math_monthly_exam(p_exam_id uuid, p_student_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam public.math_monthly_exams%ROWTYPE;
  v_total integer;
  v_newly uuid[] := '{}';
  v_sent integer := 0;
  r record;
  v_score integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_exam FROM public.math_monthly_exams WHERE id = p_exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam_not_found';
  END IF;

  SELECT coalesce(sum((i->>'points')::int), 0) INTO v_total
  FROM jsonb_array_elements(v_exam.items) AS i;
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'invalid_total_score';
  END IF;

  FOR r IN
    SELECT * FROM public.math_monthly_results
    WHERE exam_id = p_exam_id AND absent = false
      AND (p_student_id IS NULL OR (student_id = p_student_id AND status = 'sent'))
  LOOP
    v_score := public._math_monthly_score(v_exam.items, r.wrong_items);

    IF r.status <> 'sent' THEN
      v_newly := array_append(v_newly, r.student_id);
    END IF;

    UPDATE public.math_monthly_results
       SET score = v_score,
           status = 'sent',
           sent_at = coalesce(sent_at, now())
     WHERE id = r.id;

    INSERT INTO public.monthly_evaluations (
      student_id, evaluation_date, year, month, subject,
      score, total_score, percentage,
      teacher_comment, strengths, improvements
    ) VALUES (
      r.student_id, v_exam.exam_date, v_exam.year, v_exam.month, '수학',
      v_score, v_total, round(v_score * 100.0 / v_total, 2),
      r.teacher_comment, r.strengths, r.improvements
    )
    ON CONFLICT (student_id, year, month, subject) DO UPDATE SET
      evaluation_date = EXCLUDED.evaluation_date,
      score = EXCLUDED.score,
      total_score = EXCLUDED.total_score,
      percentage = EXCLUDED.percentage,
      teacher_comment = EXCLUDED.teacher_comment,
      strengths = EXCLUDED.strengths,
      improvements = EXCLUDED.improvements,
      updated_at = now();

    v_sent := v_sent + 1;
  END LOOP;

  RETURN jsonb_build_object('newly_sent', to_jsonb(v_newly), 'sent_total', v_sent);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_math_monthly_exam(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_math_monthly_exam(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) 푸시 수신자 (강사 또는 Edge Function(service_role)만)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_math_monthly_push_recipients(p_exam_id uuid)
RETURNS TABLE(student_id uuid, access_key text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL AND coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  RETURN QUERY
  SELECT s.id, s.student_access_key
  FROM public.math_monthly_results r
  JOIN public.students s ON s.id = r.student_id
  WHERE r.exam_id = p_exam_id
    AND r.status = 'sent'
    AND r.absent = false
    AND coalesce(s.access_key_active, true) = true;
END;
$$;

REVOKE ALL ON FUNCTION public.list_math_monthly_push_recipients(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_math_monthly_push_recipients(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) 학부모용 — 자기 자녀의 발송된 보고서 + 반 평균 집계
--    access key 확인·비활성 키 차단은 기존 _parent_active_student_id 와 동일.
--    반 평균(class_avg)은 응시자(발송·결시 제외) 3명 미만이면 null.
--    class_avg 에는 평균 점수·단원별/난이도별 평균 정답률·응시 인원만 담는다.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_parent_math_monthly_reports(p_access_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_out jsonb := '[]'::jsonb;
  r record;
  v_n integer;
  v_avg jsonb;
  v_units jsonb;
  v_diffs jsonb;
  v_total integer;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  FOR r IN
    SELECT e.id AS exam_id, e.grade, e.class_name, e.exam_date, e.year, e.month,
           e.title, e.teacher_name, e.question_count, e.items, e.units,
           m.wrong_items, m.score, m.strengths, m.improvements, m.teacher_comment,
           m.next_plan, m.sent_at
    FROM public.math_monthly_results m
    JOIN public.math_monthly_exams e ON e.id = m.exam_id
    WHERE m.student_id = v_student_id
      AND m.status = 'sent'
      AND m.absent = false
    ORDER BY e.year DESC, e.month DESC
  LOOP
    SELECT count(*) INTO v_n
    FROM public.math_monthly_results c
    WHERE c.exam_id = r.exam_id AND c.status = 'sent' AND c.absent = false;

    v_avg := NULL;
    IF v_n >= 3 THEN
      SELECT coalesce(sum((i->>'points')::int), 0) INTO v_total
      FROM jsonb_array_elements(r.items) AS i;

      -- 단원별 반 평균 정답률 (%)
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', u.name, 'rate', u.rate) ORDER BY u.ord), '[]'::jsonb)
      INTO v_units
      FROM (
        SELECT un.ord, un.u->>'name' AS name,
               CASE WHEN qcnt.q = 0 THEN NULL
                    ELSE round(100.0 * (v_n * qcnt.q - wr.w) / (v_n * qcnt.q), 1) END AS rate
        FROM jsonb_array_elements(r.units) WITH ORDINALITY AS un(u, ord)
        CROSS JOIN LATERAL (
          SELECT count(*) AS q
          FROM jsonb_array_elements(r.items) AS i
          WHERE (i->>'no')::int BETWEEN (un.u->>'from')::int AND (un.u->>'to')::int
        ) AS qcnt
        CROSS JOIN LATERAL (
          SELECT count(*) AS w
          FROM public.math_monthly_results c
          CROSS JOIN LATERAL jsonb_array_elements(c.wrong_items) AS wi
          WHERE c.exam_id = r.exam_id AND c.status = 'sent' AND c.absent = false
            AND (wi->>'no')::int BETWEEN (un.u->>'from')::int AND (un.u->>'to')::int
        ) AS wr
      ) AS u;

      -- 난이도별 반 평균 정답률 (%)
      SELECT coalesce(jsonb_agg(jsonb_build_object('difficulty', d.diff, 'rate', d.rate) ORDER BY d.ord), '[]'::jsonb)
      INTO v_diffs
      FROM (
        SELECT dd.ord, dd.diff,
               CASE WHEN qcnt.q = 0 THEN NULL
                    ELSE round(100.0 * (v_n * qcnt.q - wr.w) / (v_n * qcnt.q), 1) END AS rate
        FROM (VALUES (1, 'basic'), (2, 'middle'), (3, 'high'), (4, 'highest')) AS dd(ord, diff)
        CROSS JOIN LATERAL (
          SELECT count(*) AS q
          FROM jsonb_array_elements(r.items) AS i
          WHERE i->>'difficulty' = dd.diff
        ) AS qcnt
        CROSS JOIN LATERAL (
          SELECT count(*) AS w
          FROM public.math_monthly_results c
          CROSS JOIN LATERAL jsonb_array_elements(c.wrong_items) AS wi
          JOIN LATERAL (
            SELECT i FROM jsonb_array_elements(r.items) AS i
            WHERE (i->>'no')::int = (wi->>'no')::int LIMIT 1
          ) AS it ON true
          WHERE c.exam_id = r.exam_id AND c.status = 'sent' AND c.absent = false
            AND it.i->>'difficulty' = dd.diff
        ) AS wr
        WHERE qcnt.q > 0
      ) AS d;

      v_avg := jsonb_build_object(
        'n', v_n,
        'avg_score', (
          SELECT round(avg(c.score)::numeric, 1)
          FROM public.math_monthly_results c
          WHERE c.exam_id = r.exam_id AND c.status = 'sent' AND c.absent = false
        ),
        'total_score', v_total,
        'unit_rates', v_units,
        'difficulty_rates', v_diffs
      );
    END IF;

    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'exam', jsonb_build_object(
        'id', r.exam_id, 'grade', r.grade, 'class_name', r.class_name,
        'exam_date', r.exam_date, 'year', r.year, 'month', r.month,
        'title', r.title, 'teacher_name', r.teacher_name,
        'question_count', r.question_count, 'items', r.items, 'units', r.units
      ),
      'result', jsonb_build_object(
        'score', r.score, 'wrong_items', r.wrong_items,
        'strengths', r.strengths, 'improvements', r.improvements,
        'teacher_comment', r.teacher_comment, 'next_plan', r.next_plan,
        'sent_at', r.sent_at
      ),
      'class_avg', v_avg
    ));
  END LOOP;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_math_monthly_reports(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_math_monthly_reports(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
