-- Hyper Student Care — 교재명 category(homework/progress) 분리
-- textbook-slots-migration.sql 실행 후 Supabase SQL Editor에서 수동 실행하세요.

-- 1. category 컬럼 추가 (기존 행은 homework로 간주)
ALTER TABLE public.student_textbook_slots
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'homework';

UPDATE public.student_textbook_slots
SET category = 'homework'
WHERE category IS NULL OR trim(category) = '';

ALTER TABLE public.student_textbook_slots
  DROP CONSTRAINT IF EXISTS student_textbook_slots_unique;

ALTER TABLE public.student_textbook_slots
  ADD CONSTRAINT student_textbook_slots_unique
  UNIQUE (student_id, category, subject, slot_number);

ALTER TABLE public.student_textbook_slots
  DROP CONSTRAINT IF EXISTS student_textbook_slots_category_check;

ALTER TABLE public.student_textbook_slots
  ADD CONSTRAINT student_textbook_slots_category_check
  CHECK (category IN ('homework', 'progress'));

-- 2. 기존 progress 테이블 교재명 → progress category 슬롯 1 (삭제/덮어쓰기 없음)
INSERT INTO public.student_textbook_slots (student_id, category, subject, slot_number, textbook_name)
SELECT DISTINCT ON (p.student_id, p.subject)
  p.student_id,
  'progress',
  p.subject,
  coalesce(nullif(p.slot_number, 0), 1),
  trim(p.textbook_name)
FROM public.progress p
WHERE trim(coalesce(p.textbook_name, '')) <> ''
ORDER BY p.student_id, p.subject, p.updated_at DESC
ON CONFLICT (student_id, category, subject, slot_number) DO UPDATE
  SET textbook_name = EXCLUDED.textbook_name
  WHERE trim(public.student_textbook_slots.textbook_name) = '';

-- 3. parent-access-rpc.sql 전체 재실행 필요 (student_textbook_slots 조회는 동일)
