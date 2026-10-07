-- 월말평가: 난이도 6단계(하·중하·중·중상·상·최상) 반 평균 지원 + 소수점 배점 패치 (소수점 패치 포함, 다시 실행해도 안전)
-- 점수·만점은 합산 후 반올림한 정수로 저장합니다. 기존 데이터는 바뀌지 않습니다.
-- 함수 3개만 교체합니다(_math_monthly_score, publish_math_monthly_exam, get_parent_math_monthly_reports).

CREATE OR REPLACE FUNCTION public._math_monthly_score(p_items jsonb, p_wrong jsonb)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT round(coalesce(sum((i->>'points')::numeric), 0))::int::int
  FROM jsonb_array_elements(p_items) AS i
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_wrong) AS w
    WHERE (w->>'no')::int = (i->>'no')::int
  );
$$;

REVOKE ALL ON FUNCTION public._math_monthly_score(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._math_monthly_score(jsonb, jsonb) TO authenticated, service_role;

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

  SELECT round(coalesce(sum((i->>'points')::numeric), 0))::int INTO v_total
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
      SELECT round(coalesce(sum((i->>'points')::numeric), 0))::int INTO v_total
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
        FROM (VALUES (1, 'basic'), (2, 'midlow'), (3, 'middle'), (4, 'midhigh'), (5, 'high'), (6, 'highest')) AS dd(ord, diff)
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
