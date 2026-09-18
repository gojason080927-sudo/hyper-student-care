-- =============================================================================
-- HYPER Student Care — Hub material/video publish Push recipients (additive)
-- =============================================================================
-- 적용: 사용자 승인 후 Supabase Dashboard → SQL Editor → Run
-- 이 파일은 자동 실행하지 마세요. Production 적용은 사용자 승인 전 금지.
--
-- 목적:
--   문제 자료실·영상 자료실 게시 Push 수신자를
--   기존 _hub_audience_visible 규칙으로 조회합니다.
--
-- 하지 않는 것:
--   - student_push_subscriptions / hub_push_deliveries 스키마 변경
--   - Parent Push / weekly SUMMARY / 공지·과제·질문 RPC 변경
--   - 테이블 DROP / TRUNCATE / DELETE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.list_hub_push_material_recipients(p_material_id uuid)
RETURNS TABLE(student_id uuid, access_key text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.student_access_key
  FROM public.hub_learning_materials m
  JOIN public.students s ON true
  WHERE m.id = p_material_id
    AND m.status = 'PUBLISHED'
    AND coalesce(s.access_key_active, true) = true
    AND public._hub_audience_visible(
      m.audience_type, m.target_grade, m.target_class_name, m.target_student_id,
      s.id, s.grade, trim(s.class_name)
    );
$$;

CREATE OR REPLACE FUNCTION public.list_hub_push_video_recipients(p_video_id uuid)
RETURNS TABLE(student_id uuid, access_key text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.student_access_key
  FROM public.hub_videos v
  JOIN public.students s ON true
  WHERE v.id = p_video_id
    AND v.published = true
    AND coalesce(s.access_key_active, true) = true
    AND public._hub_audience_visible(
      v.audience_type, v.target_grade, v.target_class_name, v.target_student_id,
      s.id, s.grade, trim(s.class_name)
    );
$$;

REVOKE ALL ON FUNCTION public.list_hub_push_material_recipients(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_hub_push_video_recipients(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_hub_push_material_recipients(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_hub_push_video_recipients(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
