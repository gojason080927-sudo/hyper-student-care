-- =============================================================================
-- Hyper Student Care — 비활성 링크 안내 화면용 RLS 보완
-- =============================================================================
--
-- ⚠️ 이 파일은 자동 실행하지 마세요. production-rls-policies.sql 적용 후
--    비활성 링크 접속 시 "현재 사용할 수 없는 학생 링크" 안내가 필요하면 실행하세요.
--
-- 문제: prod_anon_select_students 정책이 access_key_active = true 일 때만 SELECT 허용
--       → anon 사용자가 비활성 링크로 접속하면 학생 row 조회 불가 → 잘못된 링크로 표시됨
--
-- 해결: students 테이블 anon SELECT는 키 일치만 확인 (활성 여부는 앱에서 처리)
--       하위 학습 데이터는 anon_student_id_for_access_key() 가 여전히 활성 키만 허용
-- =============================================================================

DROP POLICY IF EXISTS "prod_anon_select_students" ON public.students;

CREATE POLICY "prod_anon_select_students"
  ON public.students
  FOR SELECT
  TO anon
  USING (
    student_access_key = public.request_student_access_key()
  );

COMMENT ON POLICY "prod_anon_select_students" ON public.students IS
  'anon: 접근 키 일치 학생 1명 조회 (비활성 링크 안내 화면용). 학습 데이터는 anon_student_id_for_access_key()로 활성 키만 허용.';
