-- =============================================================================
-- HYPER Student Care — Student Hub follow-up (inbox reply/edit + daily tests read)
-- =============================================================================
-- 적용: 사용자 승인 후 Supabase Dashboard → SQL Editor → Run
-- 이 파일은 자동 실행하지 마세요. Production 적용은 사용자 승인 전 금지.
--
-- 추가만 수행:
--   student_hub_inbox.teacher_reply / teacher_replied_at
--   list/update/delete inbox RPCs
--   get_student_hub_daily_tests RPC
--
-- 금지:
--   DROP/TRUNCATE of existing parent/teacher tables
--   CREATE OR REPLACE of get_parent_care_bundle / submit_parent_question
--   CREATE OR REPLACE of get_student_hub_bundle / get_student_hub_identity
--   주간 SUMMARY 계산식 변경
-- =============================================================================

ALTER TABLE public.student_hub_inbox
  ADD COLUMN IF NOT EXISTS teacher_reply TEXT NOT NULL DEFAULT '';

ALTER TABLE public.student_hub_inbox
  ADD COLUMN IF NOT EXISTS teacher_replied_at TIMESTAMPTZ;

COMMENT ON COLUMN public.student_hub_inbox.teacher_reply IS
  '강사 텍스트 답변. 학생은 본인 글만 list/update/delete RPC로 접근.';

-- ---------------------------------------------------------------------------
-- list_student_hub_inbox — 본인 글 + 강사 답변
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_student_hub_inbox(p_access_key text)
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
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;

  RETURN coalesce(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', i.id,
          'kind', i.kind,
          'title', i.title,
          'content', i.content,
          'status', i.status,
          'teacher_reply', i.teacher_reply,
          'teacher_replied_at', i.teacher_replied_at,
          'created_at', i.created_at,
          'student_id', i.student_id,
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
        )
        ORDER BY i.created_at DESC
      )
      FROM public.student_hub_inbox i
      WHERE i.student_id = v_student_id
    ),
    '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.list_student_hub_inbox(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_student_hub_inbox(text) TO anon;

-- ---------------------------------------------------------------------------
-- update_student_hub_inbox — 본인 글 내용만 수정
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- delete_student_hub_inbox — 본인 글 철회
-- ---------------------------------------------------------------------------

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
  v_id uuid;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;

  DELETE FROM public.student_hub_inbox
  WHERE id = p_id AND student_id = v_student_id
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'inbox_not_found';
  END IF;
  RETURN jsonb_build_object('id', v_id, 'deleted', true);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_student_hub_inbox(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_student_hub_inbox(text, uuid) TO anon;

-- ---------------------------------------------------------------------------
-- get_student_hub_daily_tests — 본인 일일테스트만 (주간 흐름 시각화)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_student_hub_daily_tests(p_access_key text)
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
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;

  RETURN coalesce(
    (
      SELECT jsonb_agg(to_jsonb(t) ORDER BY t.date DESC, t.updated_at DESC, t.created_at DESC)
      FROM public.daily_tests t
      WHERE t.student_id = v_student_id
    ),
    '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_hub_daily_tests(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_hub_daily_tests(text) TO anon;
