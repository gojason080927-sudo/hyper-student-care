
  SELECT r.id, r.student_id, r.guest_id, r.created_at, r.result_payload,
         s.name AS student_name, s.school AS student_school, s.grade AS student_grade,
         g.name AS guest_name, g.school AS guest_school, g.grade AS guest_grade
  FROM public.career_assessment_results r
  LEFT JOIN public.students s ON s.id = r.student_id
  LEFT JOIN public.career_assessment_guests g ON g.id = r.guest_id
  WHERE r.id IN ('3ea14427-be55-4234-8793-40e9c6b1d812', '21a01db9-cab6-491d-a00c-1ea7e8811be4')
  ORDER BY r.id;
