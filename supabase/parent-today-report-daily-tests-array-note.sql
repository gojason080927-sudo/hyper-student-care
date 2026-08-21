-- Hyper Student Care
-- 학부모 Today Report: 같은 날짜 일일테스트 복수 과목 반환
--
-- 문제: get_parent_today_report 가 daily_test 를 LIMIT 1 로만 반환하면
-- 수학/영어 중 한 과목만 학부모 화면에 보일 수 있습니다.
-- (앱 코드는 daily_tests 배열도 읽도록 수정됨. 아래 SQL 적용 시 완전 호환)
--
-- ※ Supabase SQL Editor에서 직접 실행하세요. 이 채팅에서 자동 실행하지 않습니다.
-- ※ DROP / TRUNCATE / 기존 컬럼 삭제 없음. 함수 본문만 교체(additive).

-- 현재 함수 정의를 확인한 뒤, daily_test 단일 SELECT 부분을 아래처럼 확장하세요.
-- 핵심 변경: daily_tests jsonb_agg 추가 + daily_test 는 호환용으로 유지

/*
예시 (함수 전체는 프로젝트의 최신 parent-*-migration.sql 정의를 기준으로 맞출 것):

    'daily_tests',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.subject)
       FROM public.daily_tests d
       WHERE d.student_id = v_student_id AND d.date = p_date),
      '[]'::jsonb
    ),
    'daily_test',
    (SELECT to_jsonb(d)
     FROM public.daily_tests d
     WHERE d.student_id = v_student_id AND d.date = p_date
     ORDER BY d.subject
     LIMIT 1),

get_parent_care_bundle 의 daily_tests 는 이미 전체 목록을 반환하므로
Today Report 초기 로드에는 보통 영향이 적습니다.
날짜 단위 refresh(get_parent_today_report) 사용 시에만 위 수정이 필요합니다.
*/
