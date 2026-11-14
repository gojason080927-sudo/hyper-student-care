SELECT
  result_version,
  jsonb_array_length(major_group_scores) AS major_groups,
  jsonb_array_length(detailed_major_scores) AS detailed_majors,
  result_payload ? 'riasecScores' AS has_riasec,
  result_payload ? 'strengthScores' AS has_strength,
  result_payload ? 'valueScores' AS has_values,
  result_payload ? 'behaviorScores' AS has_behavior,
  result_payload ? 'careerEfficacy' AS has_efficacy,
  result_payload ? 'careerReadiness' AS has_readiness
FROM public.career_assessment_results
WHERE id = '852c1676-cc3f-401a-84c6-fa13ea74955b';
