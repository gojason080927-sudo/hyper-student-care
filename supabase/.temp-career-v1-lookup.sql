SELECT jsonb_build_object(
  'result_for_current_session', (
    SELECT jsonb_build_object(
      'id', res.id,
      'session_id', res.session_id,
      'result_version', res.result_version,
      'created_at', res.created_at,
      'career_efficacy', res.career_efficacy,
      'career_readiness', res.career_readiness
    )
    FROM public.career_assessment_results res
    WHERE res.session_id = '2623b302-3579-4470-b561-ccf93c68c03e'
  ),
  'results_for_student', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', res.id,
      'session_id', res.session_id,
      'result_version', res.result_version,
      'created_at', res.created_at
    ) ORDER BY res.created_at), '[]'::jsonb)
    FROM public.career_assessment_results res
    WHERE res.student_id = '79cc314e-d252-4161-8b8b-45a3b066310d'
  ),
  'notices_for_student', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', n.id,
      'career_assessment_result_id', n.career_assessment_result_id,
      'created_at', n.created_at,
      'title', n.title
    ) ORDER BY n.created_at), '[]'::jsonb)
    FROM public.notices n
    WHERE n.target_student_id = '79cc314e-d252-4161-8b8b-45a3b066310d'
      AND n.career_assessment_result_id IS NOT NULL
  ),
  'open_sessions_all', (
    SELECT count(*)::int FROM public.career_assessment_sessions WHERE status <> 'completed'
  ),
  'sessions_with_5_answers', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'student_id', s.student_id,
      'status', s.status,
      'assessment_version', s.assessment_version,
      'expected_question_count', s.expected_question_count,
      'response_count', c.n
    )), '[]'::jsonb)
    FROM public.career_assessment_sessions s
    JOIN LATERAL (
      SELECT count(*)::int AS n
      FROM public.career_assessment_responses r
      WHERE r.session_id = s.id
    ) c ON true
    WHERE c.n = 5
  ),
  'v1_session_count', (
    SELECT count(*)::int FROM public.career_assessment_sessions WHERE assessment_version = 'HYPER_CAREER_V1'
  ),
  'v2_session_count', (
    SELECT count(*)::int FROM public.career_assessment_sessions WHERE assessment_version = 'HYPER_CAREER_V2'
  )
) AS payload;
