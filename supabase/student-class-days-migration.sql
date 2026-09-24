-- 학생별 과목별 정규 수업요일.
-- 적용: Supabase SQL Editor에서 이 파일만 실행. 앱 배포 전에 적용한다.
-- 기존 행은 NULL 그대로 둔다. 요일을 추측해 채우지 않는다.

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS math_class_days text[],
  ADD COLUMN IF NOT EXISTS english_class_days text[];

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_math_class_days_check;

ALTER TABLE public.students
  ADD CONSTRAINT students_math_class_days_check
  CHECK (
    math_class_days IS NULL
    OR math_class_days <@ ARRAY['월', '화', '수', '목', '금', '토']::text[]
  );

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_english_class_days_check;

ALTER TABLE public.students
  ADD CONSTRAINT students_english_class_days_check
  CHECK (
    english_class_days IS NULL
    OR english_class_days <@ ARRAY['월', '화', '수', '목', '금', '토']::text[]
  );

ALTER TABLE public.students
  DROP CONSTRAINT IF EXISTS students_class_days_no_overlap_check;

ALTER TABLE public.students
  ADD CONSTRAINT students_class_days_no_overlap_check
  CHECK (
    math_class_days IS NULL
    OR english_class_days IS NULL
    OR NOT (math_class_days && english_class_days)
  );

COMMENT ON COLUMN public.students.math_class_days IS
  '수학 정규 수업요일. NULL이면 미설정. 월~토만.';

COMMENT ON COLUMN public.students.english_class_days IS
  '영어 정규 수업요일. NULL이면 미설정. 월~토만. 수학 요일과 겹칠 수 없다.';
