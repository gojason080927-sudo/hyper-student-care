-- =============================================================================
-- Hyper Student Care — 학부모 링크 활성화 상태 컬럼
-- =============================================================================
--
-- ⚠️ 이 파일은 자동 실행하지 마세요. Supabase Dashboard → SQL Editor에서
--    내용을 검토한 뒤 실행하세요.
--
-- 앱에서는 students.access_key_active 컬럼을 사용합니다.
-- (요구사항의 student_link_active와 동일 목적 — 기존 코드·RLS와 호환)
--
-- 기존 테이블·데이터를 삭제하지 않으며, 이미 컬럼이 있으면 건너뜁니다.
-- =============================================================================

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS access_key_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.students.access_key_active IS
  'false이면 /care/:studentAccessKey 링크 접근 차단. student_access_key 문자열은 유지.';
