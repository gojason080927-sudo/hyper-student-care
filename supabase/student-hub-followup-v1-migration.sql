-- =============================================================================
-- HYPER Student Care — Student Hub follow-up V1 (additive only)
-- =============================================================================
-- 적용: 사용자 승인 후 Supabase Dashboard → SQL Editor → Run
-- 이 파일은 자동 실행하지 마세요. Production 적용은 사용자 승인 전 금지.
--
-- 포함:
--   1) class_hub_assignments 학생 가시성 수정 (반 공통 + 본인 지정)
--   2) student_hub_inbox 교사 답변 컬럼
--   3) 학생 본인 글 수정/삭제 RPC
--   4) get_student_hub_bundle: 답변 · 본인 일일테스트 포함
--
-- 이 파일은 기존 parent/teacher 원본 테이블을 지우지 않습니다.
-- 주간 SUMMARY 100점 산식은 변경하지 않습니다.
-- =============================================================================

ALTER TABLE public.student_hub_inbox
  ADD COLUMN IF NOT EXISTS teacher_reply TEXT NOT NULL DEFAULT '';

ALTER TABLE public.student_hub_inbox
  ADD COLUMN IF NOT EXISTS teacher_replied_at TIMESTAMPTZ;

COMMENT ON COLUMN public.student_hub_inbox.teacher_reply IS
  '교사 답변. 자료 요청/건의 공통. 빈 문자열 = 미답변.';

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
      (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC)
       FROM public.class_hub_assignments a
       WHERE a.published = true
         AND trim(a.grade) = trim(v_grade)
         AND trim(a.class_name) = v_class_name
         AND (a.student_id IS NULL OR a.student_id = v_student_id)),
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

CREATE OR REPLACE FUNCTION public.update_student_hub_inbox(
  p_access_key text,
  p_id uuid,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_row public.student_hub_inbox;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;
  IF trim(coalesce(p_content, '')) = '' THEN
    RAISE EXCEPTION 'content_required';
  END IF;

  UPDATE public.student_hub_inbox
  SET content = trim(p_content)
  WHERE id = p_id AND student_id = v_student_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'inbox_not_found';
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.update_student_hub_inbox(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_student_hub_inbox(text, uuid, text) TO anon;

CREATE OR REPLACE FUNCTION public.delete_student_hub_inbox(
  p_access_key text,
  p_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_row public.student_hub_inbox;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;

  DELETE FROM public.student_hub_inbox
  WHERE id = p_id AND student_id = v_student_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'inbox_not_found';
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_student_hub_inbox(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_student_hub_inbox(text, uuid) TO anon;
