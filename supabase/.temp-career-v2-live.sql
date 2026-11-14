
  SELECT
    (SELECT count(*)::int FROM public.career_assessment_results WHERE result_version = 'HYPER_CAREER_V1') AS v1_results,
    (SELECT count(*)::int FROM public.career_assessment_sessions WHERE assessment_version = 'HYPER_CAREER_V1') AS v1_sessions,
    (SELECT count(*)::int FROM public.career_assessment_questions) AS questions
