-- =============================================================================
-- HYPER Student Care — Student Hub assignments from Today Report (additive)
-- =============================================================================
-- 적용: 사용자 승인 후 Supabase Dashboard → SQL Editor → Run
-- 이 파일은 자동 실행하지 마세요. Production 적용은 사용자 승인 전 금지.
--
-- 목적:
--   강사 Today Report 「반 공통 오늘 과제」(class_today_report_common)가
--   학생 Hub 「오늘의 과제」에 자동 표시되도록 get_student_hub_bundle을 보강합니다.
--   오늘의 과제 Push 수신자 RPC도 같은 반 공통 행을 찾도록 확장합니다.
--
-- 하지 않는 것:
--   - class_today_report_common / class_hub_assignments 데이터 삭제
--   - get_parent_care_bundle / Parent Push / weekly SUMMARY 산식 변경
--   - 공지·질문 Push RPC 변경
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_student_hub_bundle(p_access_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_grade text;
  v_class_name text;
  v_active boolean;
  v_today date;
BEGIN
  SELECT s.id, s.grade, trim(s.class_name), coalesce(s.access_key_active, true)
  INTO v_student_id, v_grade, v_class_name, v_active
  FROM public.students s
  WHERE s.student_access_key = trim(p_access_key)
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_active IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'student', public.get_student_hub_identity(p_access_key),
      'inactive', true
    );
  END IF;

  v_today := (timezone('Asia/Seoul', now()))::date;

  RETURN jsonb_build_object(
    'student', public.get_student_hub_identity(p_access_key),
    'inactive', false,
    'weekly_learning_summaries',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(w) ORDER BY w.week_start DESC)
       FROM public.weekly_learning_summaries w
       WHERE w.student_id = v_student_id),
      '[]'::jsonb
    ),
    'daily_tests',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.date DESC, d.updated_at DESC)
       FROM public.daily_tests d
       WHERE d.student_id = v_student_id),
      '[]'::jsonb
    ),
    'assignments',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(listed) ORDER BY listed.published_at DESC NULLS LAST, listed.created_at DESC)
       FROM (
         SELECT DISTINCT ON (src.id)
           src.id,
           src.grade,
           src.class_name,
           src.subject,
           src.textbook_name,
           src.content,
           src.due_date,
           src.student_id,
           src.published,
           src.published_at,
           src.created_at,
           src.updated_at
         FROM (
           SELECT
             a.id,
             a.grade,
             a.class_name,
             a.subject,
             a.textbook_name,
             a.content,
             a.due_date,
             a.student_id,
             a.published,
             a.published_at,
             a.created_at,
             a.updated_at
           FROM public.class_hub_assignments a
           WHERE a.published = true
             AND trim(a.grade) = trim(v_grade)
             AND trim(a.class_name) = v_class_name
             AND (a.student_id IS NULL OR a.student_id = v_student_id)
             AND NOT EXISTS (
               SELECT 1
               FROM public.class_today_report_common c
               WHERE c.id = a.id
                  OR (
                    trim(c.grade) = trim(a.grade)
                    AND trim(c.class_name) = trim(a.class_name)
                    AND c.report_date = v_today
                    AND a.due_date = v_today
                    AND trim(coalesce(c.today_assignment, '')) <> ''
                    AND trim(c.today_assignment) = trim(coalesce(a.content, ''))
                  )
             )
           UNION ALL
           SELECT
             c.id,
             c.grade,
             c.class_name,
             CASE
               WHEN c.subject = '수학' AND c.slot_number = 1 THEN '수학 · 개념교재'
               WHEN c.subject = '수학' AND c.slot_number = 2 THEN '수학 · 유형교재'
               WHEN c.subject = '수학' AND c.slot_number = 3 THEN '수학 · 부교재'
               WHEN c.subject = '영어' AND c.slot_number = 1 THEN '영어 · 문법교재'
               WHEN c.subject = '영어' AND c.slot_number = 2 THEN '영어 · 독해 교재'
               WHEN c.subject = '영어' AND c.slot_number = 3 THEN '영어 · 단어장'
               ELSE coalesce(c.subject, '')
             END,
             NULLIF(trim(coalesce(c.textbook_name, '')), ''),
             trim(c.today_assignment),
             c.report_date,
             NULL::uuid,
             true,
             c.updated_at,
             c.created_at,
             c.updated_at
           FROM public.class_today_report_common c
           WHERE trim(coalesce(c.today_assignment, '')) <> ''
             AND trim(c.grade) = trim(v_grade)
             AND trim(c.class_name) = v_class_name
             AND c.report_date = v_today
         ) src
         ORDER BY src.id, src.published_at DESC NULLS LAST, src.created_at DESC
       ) listed),
      '[]'::jsonb
    ),
    'materials',
    coalesce(
      (SELECT jsonb_agg(listed.item ORDER BY listed.published_at DESC NULLS LAST)
       FROM (
         SELECT jsonb_build_object(
           'id', m.id,
           'title', m.title,
           'description', m.description,
           'kind', m.kind,
           'original_file_name', m.original_file_name,
           'source_file_path', m.source_file_path,
           'mime', m.mime,
           'page_count', coalesce(m.page_count, 0),
           'published_at', m.published_at,
           'pages', coalesce(
             (
               SELECT jsonb_agg(jsonb_build_object(
                 'page_number', p.page_number,
                 'asset_path', p.asset_path,
                 'width', p.width,
                 'height', p.height
               ) ORDER BY p.page_number)
               FROM public.hub_learning_material_pages p
               WHERE p.material_id = m.id
             ),
             '[]'::jsonb
           )
         ) AS item,
         m.published_at
         FROM public.hub_learning_materials m
         WHERE m.status = 'PUBLISHED'
           AND public._hub_audience_visible(
             m.audience_type, m.target_grade, m.target_class_name, m.target_student_id,
             v_student_id, v_grade, v_class_name
           )
       ) listed),
      '[]'::jsonb
    ),
    'videos',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(v) ORDER BY v.published_at DESC NULLS LAST, v.created_at DESC)
       FROM public.hub_videos v
       WHERE v.published = true
         AND public._hub_audience_visible(
           v.audience_type, v.target_grade, v.target_class_name, v.target_student_id,
           v_student_id, v_grade, v_class_name
         )),
      '[]'::jsonb
    ),
    'questions',
    coalesce(
      (SELECT jsonb_agg(
         jsonb_build_object(
           'id', q.id,
           'date', q.date,
           'category', q.category,
           'title', q.title,
           'content', q.content,
           'answer', q.answer,
           'status', q.status,
           'source', q.source,
           'created_at', q.created_at,
           'updated_at', q.updated_at,
           'attachments', coalesce(
             (
               SELECT jsonb_agg(jsonb_build_object(
                 'id', a.id,
                 'kind', a.kind,
                 'storage_path', a.storage_path,
                 'mime', a.mime,
                 'byte_size', a.byte_size,
                 'duration_ms', a.duration_ms,
                 'original_name', a.original_name,
                 'ready', a.ready
               ) ORDER BY a.created_at)
               FROM public.question_attachments a
               WHERE a.question_id = q.id AND a.student_id = v_student_id
             ),
             '[]'::jsonb
           )
         ) ORDER BY q.created_at DESC)
       FROM public.questions q
       WHERE q.student_id = v_student_id AND q.source = 'student'),
      '[]'::jsonb
    ),
    'inbox',
    coalesce(
      (SELECT jsonb_agg(
         jsonb_build_object(
           'id', i.id,
           'kind', i.kind,
           'title', i.title,
           'content', i.content,
           'status', i.status,
           'teacher_reply', i.teacher_reply,
           'teacher_replied_at', i.teacher_replied_at,
           'created_at', i.created_at,
           'attachments', coalesce(
             (
               SELECT jsonb_agg(jsonb_build_object(
                 'id', a.id,
                 'storage_path', a.storage_path,
                 'mime', a.mime,
                 'byte_size', a.byte_size,
                 'original_name', a.original_name,
                 'ready', a.ready
               ) ORDER BY a.created_at)
               FROM public.hub_inbox_attachments a
               WHERE a.inbox_id = i.id AND a.student_id = v_student_id
             ),
             '[]'::jsonb
           )
         ) ORDER BY i.created_at DESC)
       FROM public.student_hub_inbox i
       WHERE i.student_id = v_student_id),
      '[]'::jsonb
    ),
    'class_schedule_grids',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(g) ORDER BY g.class_name)
       FROM public.class_schedule_grids g
       WHERE public._schedule_grid_visible_to_student(g, v_grade, v_class_name)),
      '[]'::jsonb
    ),
    'notices',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(n) ORDER BY n.is_pinned DESC, n.published_at DESC NULLS LAST)
       FROM public.notices n
       WHERE public._notice_visible_to_student(n, v_student_id, v_grade, v_class_name)),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_hub_bundle(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_hub_bundle(text) TO anon;

CREATE OR REPLACE FUNCTION public.list_hub_push_assignment_recipients(p_assignment_id uuid)
RETURNS TABLE(student_id uuid, access_key text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.student_access_key
  FROM public.class_hub_assignments a
  JOIN public.students s
    ON trim(s.grade) = trim(a.grade)
   AND trim(s.class_name) = trim(a.class_name)
   AND (a.student_id IS NULL OR s.id = a.student_id)
  WHERE a.id = p_assignment_id
    AND a.published = true
    AND coalesce(s.access_key_active, true) = true
  UNION
  SELECT s.id, s.student_access_key
  FROM public.class_today_report_common c
  JOIN public.students s
    ON trim(s.grade) = trim(c.grade)
   AND trim(s.class_name) = trim(c.class_name)
  WHERE c.id = p_assignment_id
    AND trim(coalesce(c.today_assignment, '')) <> ''
    AND coalesce(s.access_key_active, true) = true;
$$;

REVOKE ALL ON FUNCTION public.list_hub_push_assignment_recipients(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_hub_push_assignment_recipients(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
