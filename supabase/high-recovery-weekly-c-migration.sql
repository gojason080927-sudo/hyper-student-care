-- 고등 high-recovery-v1 Weekly SUMMARY 후보 C.
-- 새 테이블/컬럼 없음. learning_diagnosis JSONB + 함수 교체만.
-- DROP/TRUNCATE 없음. 이미 저장된 weekly_learning_summaries 행은 재계산하지 않음.
-- _daily_test_attempt_score 는 변경하지 않는다 (high-recovery는 계속 NULL → risk/일반 점수 격리).
-- Production에는 사용자가 SQL Editor에서 승인한 뒤에만 적용한다.

CREATE OR REPLACE FUNCTION public._high_recovery_weekly_first_score(p_row public.daily_tests)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_w1 integer;
  v_end text;
BEGIN
  IF coalesce(p_row.subject, '') NOT LIKE '%수학%' THEN
    RETURN NULL;
  END IF;
  IF coalesce(p_row.learning_diagnosis->>'mathDailyTestFormat', '') <> 'high-recovery-v1' THEN
    RETURN NULL;
  END IF;
  IF (p_row.learning_diagnosis->>'mathHighFirstWrongCount') !~ '^[0-9]+$' THEN
    RETURN NULL;
  END IF;
  v_end := coalesce(p_row.learning_diagnosis->>'mathHighEndSession', '');
  IF v_end NOT IN ('1', '2', '3', '4') THEN
    RETURN NULL;
  END IF;
  v_w1 := (p_row.learning_diagnosis->>'mathHighFirstWrongCount')::integer;
  IF v_w1 < 0 OR v_w1 > 10 THEN
    RETURN NULL;
  END IF;
  RETURN (10 - v_w1) * 10;
END;
$$;

CREATE OR REPLACE FUNCTION public._weekly_daily_test_day_facts(
  p_student_id uuid,
  p_date date
)
RETURNS TABLE(score numeric, passed boolean)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_row public.daily_tests%ROWTYPE;
  v_first numeric;
  v_attempt numeric;
  v_high_scores numeric[] := '{}';
  v_scored_scores numeric[] := '{}';
  v_score numeric;
  v_scored_avg numeric;
BEGIN
  FOR v_row IN
    SELECT * FROM public.daily_tests t
    WHERE t.student_id = p_student_id AND t.date = p_date
  LOOP
    v_first := public._high_recovery_weekly_first_score(v_row);
    IF v_first IS NOT NULL THEN
      v_high_scores := array_append(v_high_scores, v_first);
      CONTINUE;
    END IF;
    v_attempt := public._daily_test_attempt_score(v_row);
    IF v_attempt IS NOT NULL THEN
      v_scored_scores := array_append(v_scored_scores, v_attempt);
    END IF;
  END LOOP;

  IF coalesce(array_length(v_high_scores, 1), 0) = 0
     AND coalesce(array_length(v_scored_scores, 1), 0) = 0 THEN
    RETURN;
  END IF;

  v_score := (SELECT avg(x) FROM unnest(v_high_scores || v_scored_scores) AS x);

  IF coalesce(array_length(v_high_scores, 1), 0) > 0
     AND coalesce(array_length(v_scored_scores, 1), 0) > 0 THEN
    v_scored_avg := (SELECT avg(x) FROM unnest(v_scored_scores) AS x);
    score := v_score;
    passed := v_scored_avg >= 85;
    RETURN NEXT;
    RETURN;
  END IF;

  IF coalesce(array_length(v_high_scores, 1), 0) > 0 THEN
    score := v_score;
    passed := true;
    RETURN NEXT;
    RETURN;
  END IF;

  score := v_score;
  passed := v_score >= 85;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public._build_weekly_learning_summary(
  p_student_id uuid,
  p_week_start date,
  p_period_end date,
  p_as_of timestamptz
)
RETURNS TABLE (
  period_start date,
  period_end date,
  total_score numeric,
  grade text,
  scores jsonb,
  good_text text,
  check_text text,
  teacher_comment text
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_dates date[] := '{}';
  v_date date;
  v_att public.attendance%ROWTYPE;
  v_att_idx numeric;
  v_att_vals numeric[] := '{}';
  v_present int := 0;
  v_unexcused_late int := 0;
  v_unexcused_absent int := 0;
  v_excused_late int := 0;
  v_excused_absent int := 0;
  v_mat_vals numeric[] := '{}';
  v_brought int := 0;
  v_partial_mat int := 0;
  v_hw_vals numeric[] := '{}';
  v_hw_complete int := 0;
  v_hw_partial int := 0;
  v_hw_incomplete int := 0;
  v_test_vals numeric[] := '{}';
  v_test_pass int := 0;
  v_att_issue_count int := 0;
  v_sleep int := 0;
  v_focus int := 0;
  v_chat int := 0;
  v_disrupt int := 0;
  v_bad int := 0;
  v_att_vals_idx numeric[] := '{}';
  v_notes text[] := '{}';
  v_care public.student_daily_care%ROWTYPE;
  v_hw_cat text;
  v_test_score numeric;
  v_test_day_passed boolean;
  v_avg numeric;
  v_area jsonb;
  v_att_area jsonb;
  v_mat_area jsonb;
  v_hw_area jsonb;
  v_test_area jsonb;
  v_attitude_area jsonb;
  v_total numeric := 0;
  v_available numeric := 0;
  v_grade_score numeric;
  v_grade text;
  v_good text;
  v_check text;
  v_comment text;
  v_period_start date;
  v_period_end_out date;
  v_issue text;
  v_vocab_deduction integer := 0;
BEGIN
  FOR v_date IN
    SELECT d::date
    FROM generate_series(p_week_start, p_period_end, interval '1 day') d
    WHERE EXISTS (
      SELECT 1 FROM public.attendance a WHERE a.student_id = p_student_id AND a.date = d::date
      UNION ALL
      SELECT 1 FROM public.homework h WHERE h.student_id = p_student_id AND h.date = d::date AND coalesce(h.status, '') <> ''
      UNION ALL
      SELECT 1 FROM public.homework_textbook_entries h
      WHERE h.student_id = p_student_id AND h.date = d::date AND coalesce(h.status, '') <> ''
      UNION ALL
      SELECT 1 FROM public.daily_tests t WHERE t.student_id = p_student_id AND t.date = d::date
      UNION ALL
      SELECT 1 FROM public.student_daily_care c
      WHERE c.student_id = p_student_id AND c.date = d::date
        AND (c.material_prep IS NOT NULL OR coalesce(array_length(c.attitude_issues, 1), 0) > 0 OR coalesce(c.attitude_note, '') <> '')
      UNION ALL
      SELECT 1 FROM public.progress p WHERE p.student_id = p_student_id AND p.last_study_date = d::date
      UNION ALL
      SELECT 1 FROM public.class_notes n WHERE n.student_id = p_student_id AND n.date = d::date
    )
  LOOP
    v_dates := array_append(v_dates, v_date);
  END LOOP;

  IF array_length(v_dates, 1) IS NOT NULL THEN
    v_period_start := v_dates[1];
    v_period_end_out := v_dates[array_length(v_dates, 1)];
  ELSE
    v_period_start := p_week_start;
    v_period_end_out := p_period_end;
  END IF;

  FOREACH v_date IN ARRAY coalesce(v_dates, ARRAY[]::date[])
  LOOP
    SELECT * INTO v_att FROM public.attendance
    WHERE student_id = p_student_id AND date = v_date;
    IF FOUND THEN
      v_att_idx := public._attendance_index(v_att.status, v_att.excuse_kind);
      IF v_att_idx IS NOT NULL THEN
        v_att_vals := array_append(v_att_vals, v_att_idx);
        IF v_att.status = '출석' THEN v_present := v_present + 1; END IF;
        IF v_att.status = '지각' AND v_att.excuse_kind = '무단' THEN v_unexcused_late := v_unexcused_late + 1; END IF;
        IF v_att.status = '결석' AND v_att.excuse_kind = '무단' THEN v_unexcused_absent := v_unexcused_absent + 1; END IF;
        IF v_att.status = '지각' AND v_att.excuse_kind = '인정' THEN v_excused_late := v_excused_late + 1; END IF;
        IF v_att.status = '결석' AND v_att.excuse_kind = '인정' THEN v_excused_absent := v_excused_absent + 1; END IF;
      END IF;
    END IF;

    SELECT * INTO v_care FROM public.student_daily_care
    WHERE student_id = p_student_id AND date = v_date;
    IF FOUND THEN
      IF v_care.material_prep = '지참' THEN
        v_mat_vals := array_append(v_mat_vals, 100);
        v_brought := v_brought + 1;
      ELSIF v_care.material_prep = '부분 지참' THEN
        v_mat_vals := array_append(v_mat_vals, 50);
        v_partial_mat := v_partial_mat + 1;
      END IF;
      v_att_vals_idx := array_append(
        v_att_vals_idx,
        greatest(60, 100 - coalesce(array_length(v_care.attitude_issues, 1), 0) * 20)
      );
      IF v_care.attitude_issues IS NOT NULL THEN
        FOREACH v_issue IN ARRAY v_care.attitude_issues
        LOOP
          v_att_issue_count := v_att_issue_count + 1;
          IF v_issue = '졸음' THEN v_sleep := v_sleep + 1; END IF;
          IF v_issue = '집중 저하' THEN v_focus := v_focus + 1; END IF;
          IF v_issue = '잡담' THEN v_chat := v_chat + 1; END IF;
          IF v_issue = '수업방해' THEN v_disrupt := v_disrupt + 1; END IF;
          IF v_issue = '태도 불량' THEN v_bad := v_bad + 1; END IF;
        END LOOP;
      END IF;
      IF coalesce(v_care.attitude_note, '') <> '' THEN
        v_notes := array_append(v_notes, v_care.attitude_note);
      END IF;
    ELSE
      v_att_vals_idx := array_append(v_att_vals_idx, 100);
    END IF;

    v_hw_cat := NULL;
    IF EXISTS (
      SELECT 1 FROM public.homework_textbook_entries h
      WHERE h.student_id = p_student_id AND h.date = v_date AND coalesce(h.status, '') <> ''
    ) THEN
      IF EXISTS (
        SELECT 1 FROM public.homework_textbook_entries h
        WHERE h.student_id = p_student_id AND h.date = v_date AND h.status IN ('미완료', '미 완료', '미제출')
      ) THEN
        v_hw_cat := 'incomplete';
      ELSIF EXISTS (
        SELECT 1 FROM public.homework_textbook_entries h
        WHERE h.student_id = p_student_id AND h.date = v_date AND h.status IN ('부분 완료', '부분완료')
      ) THEN
        v_hw_cat := 'partial';
      ELSIF EXISTS (
        SELECT 1 FROM public.homework_textbook_entries h
        WHERE h.student_id = p_student_id AND h.date = v_date AND h.status = '완료'
      ) THEN
        v_hw_cat := 'complete';
      END IF;
    ELSE
      IF EXISTS (
        SELECT 1 FROM public.homework h
        WHERE h.student_id = p_student_id AND h.date = v_date AND h.status IN ('미완료', '미 완료', '미제출')
      ) THEN
        v_hw_cat := 'incomplete';
      ELSIF EXISTS (
        SELECT 1 FROM public.homework h
        WHERE h.student_id = p_student_id AND h.date = v_date AND h.status IN ('부분 완료', '부분완료')
      ) THEN
        v_hw_cat := 'partial';
      ELSIF EXISTS (
        SELECT 1 FROM public.homework h
        WHERE h.student_id = p_student_id AND h.date = v_date AND h.status = '완료'
      ) THEN
        v_hw_cat := 'complete';
      END IF;
    END IF;
    IF v_hw_cat = 'complete' THEN
      v_hw_vals := array_append(v_hw_vals, 100); v_hw_complete := v_hw_complete + 1;
    ELSIF v_hw_cat = 'partial' THEN
      v_hw_vals := array_append(v_hw_vals, 50); v_hw_partial := v_hw_partial + 1;
    ELSIF v_hw_cat = 'incomplete' THEN
      v_hw_vals := array_append(v_hw_vals, 0); v_hw_incomplete := v_hw_incomplete + 1;
    END IF;

    SELECT d.score, d.passed INTO v_test_score, v_test_day_passed
    FROM public._weekly_daily_test_day_facts(p_student_id, v_date) d;
    IF v_test_score IS NOT NULL THEN
      v_test_vals := array_append(v_test_vals, v_test_score);
      IF v_test_day_passed THEN v_test_pass := v_test_pass + 1; END IF;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.class_notes n
      WHERE n.student_id = p_student_id AND n.date = v_date AND n.has_class_note AND coalesce(n.note, '') <> ''
    ) THEN
      v_notes := array_append(
        v_notes,
        (SELECT n.note FROM public.class_notes n
         WHERE n.student_id = p_student_id AND n.date = v_date LIMIT 1)
      );
    END IF;
  END LOOP;

  v_att_area := public._weekly_area_payload(v_att_vals, 20, jsonb_build_object(
    'presentCount', v_present,
    'unexcusedLateCount', v_unexcused_late,
    'unexcusedAbsentCount', v_unexcused_absent,
    'excusedLateCount', v_excused_late,
    'excusedAbsentCount', v_excused_absent,
    'lessonCount', coalesce(array_length(v_att_vals, 1), 0)
  ));
  v_mat_area := public._weekly_area_payload(v_mat_vals, 10, jsonb_build_object(
    'broughtCount', v_brought,
    'partialCount', v_partial_mat,
    'lessonCount', coalesce(array_length(v_mat_vals, 1), 0)
  ));
  v_hw_area := public._weekly_area_payload(v_hw_vals, 25, jsonb_build_object(
    'completeCount', v_hw_complete,
    'partialCount', v_hw_partial,
    'incompleteCount', v_hw_incomplete,
    'lessonCount', coalesce(array_length(v_hw_vals, 1), 0)
  ));
  IF array_length(v_test_vals, 1) IS NULL THEN
    v_test_area := public._weekly_area_payload(NULL, 30, jsonb_build_object(
      'averageScore', NULL, 'passCount', 0, 'attemptCount', 0
    ));
  ELSE
    v_avg := (SELECT avg(x) FROM unnest(v_test_vals) AS x);
    v_test_area := public._weekly_area_payload(
      ARRAY[(v_avg * 0.7) + ((v_test_pass::numeric / array_length(v_test_vals, 1)) * 100 * 0.3)],
      30,
      jsonb_build_object(
        'averageScore', round(v_avg::numeric, 2),
        'passCount', v_test_pass,
        'attemptCount', array_length(v_test_vals, 1)
      )
    );
  END IF;
  v_attitude_area := public._weekly_area_payload(v_att_vals_idx, 15, jsonb_build_object(
    'issueCount', v_att_issue_count,
    '졸음', v_sleep,
    '집중 저하', v_focus,
    '잡담', v_chat,
    '수업방해', v_disrupt,
    '태도 불량', v_bad,
    'lessonCount', coalesce(array_length(v_att_vals_idx, 1), 0)
  ));

  v_area := jsonb_build_object(
    'attendance', v_att_area,
    'material', v_mat_area,
    'homework', v_hw_area,
    'dailyTest', v_test_area,
    'attitude', v_attitude_area
  );

  v_total := 0;
  v_available := 0;
  IF (v_att_area->>'score') IS NOT NULL THEN
    v_total := v_total + (v_att_area->>'score')::numeric; v_available := v_available + 20;
  END IF;
  IF (v_mat_area->>'score') IS NOT NULL THEN
    v_total := v_total + (v_mat_area->>'score')::numeric; v_available := v_available + 10;
  END IF;
  IF (v_hw_area->>'score') IS NOT NULL THEN
    v_total := v_total + (v_hw_area->>'score')::numeric; v_available := v_available + 25;
  END IF;
  IF (v_test_area->>'score') IS NOT NULL THEN
    v_total := v_total + (v_test_area->>'score')::numeric; v_available := v_available + 30;
  END IF;
  IF (v_attitude_area->>'score') IS NOT NULL THEN
    v_total := v_total + (v_attitude_area->>'score')::numeric; v_available := v_available + 15;
  END IF;

  IF v_available <= 0 THEN
    v_total := NULL;
    v_grade := NULL;
  ELSE
    v_total := round(v_total, 2);
    v_grade_score := CASE WHEN v_available = 100 THEN v_total ELSE round(v_total / v_available * 100, 2) END;
    SELECT coalesce(sum(public._english_vocab_weekly_deduction(
      CASE
        WHEN (t.learning_diagnosis->>'englishVocabWrongWords') ~ '^[0-9]+$'
          THEN (t.learning_diagnosis->>'englishVocabWrongWords')::integer
        ELSE NULL
      END
    )), 0)
    INTO v_vocab_deduction
    FROM public.daily_tests t
    WHERE t.student_id = p_student_id
      AND t.date = ANY (v_dates)
      AND coalesce(t.subject, '') LIKE '%영어%'
      AND coalesce(t.learning_diagnosis->>'englishVocabTestFormat', '') = 'cumulative';
    v_grade_score := greatest(0, v_grade_score - v_vocab_deduction);
    IF v_available = 100 THEN
      v_total := v_grade_score;
    END IF;
    v_grade := CASE
      WHEN v_grade_score >= 90 THEN '우수'
      WHEN v_grade_score >= 80 THEN '양호'
      WHEN v_grade_score >= 70 THEN '보통'
      ELSE '미흡'
    END;
  END IF;

  v_good := concat_ws(', ',
    CASE WHEN v_present > 0 THEN '출석 ' || v_present || '회' END,
    CASE WHEN v_brought > 0 THEN '교재 지참 ' || v_brought || '회' END,
    CASE WHEN v_hw_complete > 0 THEN '숙제 완료 ' || v_hw_complete || '회' END,
    CASE WHEN v_test_pass > 0 THEN '일일테스트 합격 ' || v_test_pass || '/' || coalesce(array_length(v_test_vals, 1), 0) || '회' END,
    CASE WHEN v_att_issue_count = 0 AND coalesce(array_length(v_dates, 1), 0) > 0 THEN '수업태도 문제 기록 없음' END
  );
  IF v_good IS NULL OR v_good = '' THEN
    v_good := '이번 주 기록된 학습 사실이 아직 충분하지 않습니다.';
  END IF;

  v_check := concat_ws(', ',
    CASE WHEN v_unexcused_late > 0 THEN '무단지각 ' || v_unexcused_late || '회' END,
    CASE WHEN v_unexcused_absent > 0 THEN '무단결석 ' || v_unexcused_absent || '회' END,
    CASE WHEN v_partial_mat > 0 THEN '교재 부분지참 ' || v_partial_mat || '회' END,
    CASE WHEN v_hw_partial > 0 THEN '숙제 부분완료 ' || v_hw_partial || '회' END,
    CASE WHEN v_hw_incomplete > 0 THEN '숙제 미완료 ' || v_hw_incomplete || '회' END,
    CASE WHEN v_sleep > 0 THEN '졸음 ' || v_sleep || '회' END,
    CASE WHEN v_focus > 0 THEN '집중 저하 ' || v_focus || '회' END,
    CASE WHEN v_chat > 0 THEN '잡담 ' || v_chat || '회' END,
    CASE WHEN v_disrupt > 0 THEN '수업방해 ' || v_disrupt || '회' END,
    CASE WHEN v_bad > 0 THEN '태도 불량 ' || v_bad || '회' END
  );
  IF v_check IS NULL OR v_check = '' THEN
    v_check := '이번 주 따로 확인할 기록은 없습니다.';
  END IF;

  IF array_length(v_notes, 1) IS NULL THEN
    v_comment := '이번 주 저장된 강사 메모는 없습니다.';
  ELSE
    v_comment := array_to_string(v_notes, ' / ');
  END IF;

  period_start := v_period_start;
  period_end := v_period_end_out;
  total_score := v_total;
  grade := v_grade;
  scores := v_area;
  good_text := v_good;
  check_text := v_check;
  teacher_comment := v_comment;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public._high_recovery_weekly_first_score(public.daily_tests) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._high_recovery_weekly_first_score(public.daily_tests) FROM anon;
REVOKE ALL ON FUNCTION public._high_recovery_weekly_first_score(public.daily_tests) FROM authenticated;
REVOKE ALL ON FUNCTION public._weekly_daily_test_day_facts(uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._weekly_daily_test_day_facts(uuid, date) FROM anon;
REVOKE ALL ON FUNCTION public._weekly_daily_test_day_facts(uuid, date) FROM authenticated;
REVOKE ALL ON FUNCTION public._build_weekly_learning_summary(uuid, date, date, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._build_weekly_learning_summary(uuid, date, date, timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public._build_weekly_learning_summary(uuid, date, date, timestamptz) FROM authenticated;
