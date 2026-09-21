-- =============================================================================
-- HYPER Student Care — Parent suggestion category (additive CHECK only)
-- =============================================================================
-- 적용: 사용자 승인 후 Supabase Dashboard → SQL Editor → Run
-- 이 파일은 자동 실행하지 마세요. Production 적용은 사용자 승인 전 금지.
--
-- 목적:
--   학부모 건의사항을 기존 questions 테이블에 category = '건의사항' 으로 저장한다.
--   source 는 기존 parent 기본값을 그대로 사용한다.
--
-- 허용:
--   questions_category_check 에 '건의사항' additive 추가
--
-- 금지:
--   기존 questions 행 UPDATE/DELETE
--   student_hub_inbox 변경
--   submit_parent_question / Candidate C / weekly SUMMARY 함수 변경
-- =============================================================================

ALTER TABLE public.questions DROP CONSTRAINT IF EXISTS questions_category_check;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_category_check
  CHECK (
    category IN ('수업질문', '숙제질문', '시험질문', '상담요청', '기타', '건의사항')
  );

COMMENT ON CONSTRAINT questions_category_check ON public.questions IS
  '학부모/학생 질문 분류. 건의사항 = 학부모 전용 건의. 기존 5개 값은 유지.';
