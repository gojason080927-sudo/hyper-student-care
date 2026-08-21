-- 일일테스트 session_results JSON에 복수 '합격' 차시가 있는 행을 찾는 진단 쿼리
-- Supabase SQL Editor에서 수동 실행하세요. 자동 실행하지 않습니다.

-- 1) 복수 합격 차시가 있는 daily_tests 행 조회
SELECT
  id,
  student_id,
  date,
  subject,
  session_results,
  updated_at
FROM public.daily_tests
WHERE session_results IS NOT NULL
  AND (
    SELECT COUNT(*)
    FROM jsonb_array_elements(session_results) AS elem
    WHERE elem->>'status' = '합격'
  ) > 1
ORDER BY date DESC, updated_at DESC;

-- 2) 복수 합격이 있는 경우: 가장 높은 session 번호 하나만 '합격'으로 남기고
--    그 이전 차시는 '불합격', 이후 차시는 '미응시'로 정리하는 예시 (백업 후 수동 검토 권장)
--
-- UPDATE 전 반드시 SELECT 결과를 확인하고, 필요하면 해당 id만 대상으로 실행하세요.
--
-- WITH multi_pass AS (
--   SELECT id, session_results
--   FROM public.daily_tests
--   WHERE (
--     SELECT COUNT(*)
--     FROM jsonb_array_elements(session_results) AS elem
--     WHERE elem->>'status' = '합격'
--   ) > 1
-- ),
-- final_pass AS (
--   SELECT
--     id,
--     MAX((elem->>'session')::int) AS pass_session
--   FROM multi_pass,
--        jsonb_array_elements(session_results) AS elem
--   WHERE elem->>'status' = '합격'
--   GROUP BY id
-- )
-- UPDATE public.daily_tests dt
-- SET session_results = (
--   SELECT jsonb_agg(
--     CASE
--       WHEN (elem->>'session')::int < fp.pass_session THEN
--         jsonb_set(elem, '{status}', '"불합격"')
--       WHEN (elem->>'session')::int = fp.pass_session THEN
--         jsonb_set(elem, '{status}', '"합격"')
--       ELSE
--         jsonb_build_object('session', (elem->>'session')::int, 'status', '미응시')
--     END
--     ORDER BY (elem->>'session')::int
--   )
--   FROM jsonb_array_elements(dt.session_results) AS elem
-- ),
-- updated_at = NOW()
-- FROM final_pass fp
-- WHERE dt.id = fp.id;
