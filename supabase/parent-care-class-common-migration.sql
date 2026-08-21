-- Parent care RPC: include class_today_report_common for student's class
-- Run in Supabase SQL Editor after class-today-report-common-migration.sql
-- Does NOT auto-run from the app.

CREATE OR REPLACE FUNCTION public.get_parent_care_bundle(p_access_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'student',
    (SELECT to_jsonb(s) FROM public.students s WHERE s.id = v_student_id),
    'attendance',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.date DESC)
       FROM public.attendance a WHERE a.student_id = v_student_id),
      '[]'::jsonb
    ),
    'progress',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(p) ORDER BY p.last_study_date DESC)
       FROM public.progress p WHERE p.student_id = v_student_id),
      '[]'::jsonb
    ),
    'homework',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(h) ORDER BY h.date DESC)
       FROM public.homework h WHERE h.student_id = v_student_id),
      '[]'::jsonb
    ),
    'daily_tests',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.date DESC)
       FROM public.daily_tests d WHERE d.student_id = v_student_id),
      '[]'::jsonb
    ),
    'monthly_evaluations',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(m) ORDER BY m.evaluation_date DESC)
       FROM public.monthly_evaluations m WHERE m.student_id = v_student_id),
      '[]'::jsonb
    ),
    'makeup_plans',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(mp) ORDER BY mp.scheduled_date DESC)
       FROM public.makeup_plans mp WHERE mp.student_id = v_student_id),
      '[]'::jsonb
    ),
    'questions',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(q) ORDER BY q.date DESC, q.created_at DESC)
       FROM public.questions q WHERE q.student_id = v_student_id),
      '[]'::jsonb
    ),
    'today_assignments',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(ta) ORDER BY ta.date DESC)
       FROM public.today_assignments ta WHERE ta.student_id = v_student_id),
      '[]'::jsonb
    ),
    'homework_textbook_entries',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(h) ORDER BY h.date DESC, h.subject, h.slot_number)
       FROM public.homework_textbook_entries h WHERE h.student_id = v_student_id),
      '[]'::jsonb
    ),
    'student_textbook_slots',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.subject, s.slot_number)
       FROM public.student_textbook_slots s WHERE s.student_id = v_student_id),
      '[]'::jsonb
    ),
    'class_notes',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(cn) ORDER BY cn.date DESC)
       FROM public.class_notes cn WHERE cn.student_id = v_student_id),
      '[]'::jsonb
    ),
    'class_today_report_common',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.report_date DESC, c.subject, c.slot_number)
       FROM public.class_today_report_common c
       INNER JOIN public.students s ON s.id = v_student_id
       WHERE c.grade = s.grade
         AND c.class_name = trim(s.class_name)),
      '[]'::jsonb
    ),
    'notices',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(n) ORDER BY n.is_pinned DESC, n.published_at DESC NULLS LAST)
       FROM public.notices n WHERE n.is_published = true),
      '[]'::jsonb
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_parent_today_report(p_access_key text, p_date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'attendance',
    (SELECT to_jsonb(a)
     FROM public.attendance a
     WHERE a.student_id = v_student_id AND a.date = p_date
     LIMIT 1),
    'progress',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(p))
       FROM public.progress p
       WHERE p.student_id = v_student_id AND p.last_study_date = p_date),
      '[]'::jsonb
    ),
    'homework',
    (SELECT to_jsonb(h)
     FROM public.homework h
     WHERE h.student_id = v_student_id AND h.date = p_date
     LIMIT 1),
    'today_assignment',
    (SELECT to_jsonb(ta)
     FROM public.today_assignments ta
     WHERE ta.student_id = v_student_id AND ta.date = p_date
     LIMIT 1),
    'homework_textbook_entries',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(h) ORDER BY h.subject, h.slot_number)
       FROM public.homework_textbook_entries h
       WHERE h.student_id = v_student_id AND h.date = p_date),
      '[]'::jsonb
    ),
    'student_textbook_slots',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(s) ORDER BY s.subject, s.slot_number)
       FROM public.student_textbook_slots s WHERE s.student_id = v_student_id),
      '[]'::jsonb
    ),
    'class_note',
    (SELECT to_jsonb(cn)
     FROM public.class_notes cn
     WHERE cn.student_id = v_student_id AND cn.date = p_date
     LIMIT 1),
    'daily_test',
    (SELECT to_jsonb(d)
     FROM public.daily_tests d
     WHERE d.student_id = v_student_id AND d.date = p_date
     LIMIT 1),
    'class_today_report_common',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.subject, c.slot_number)
       FROM public.class_today_report_common c
       INNER JOIN public.students s ON s.id = v_student_id
       WHERE c.grade = s.grade
         AND c.class_name = trim(s.class_name)
         AND c.report_date IN (p_date, (p_date - interval '1 day')::date)),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_care_bundle(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_care_bundle(text) TO anon;

REVOKE ALL ON FUNCTION public.get_parent_today_report(text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_today_report(text, date) TO anon;
