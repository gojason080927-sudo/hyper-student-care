-- Hyper Student Care — 교재명 숙제/진도 통합 (category 제거)
-- textbook-slots-migration.sql 실행 후, category 분리 버전을 사용 중이면
-- Supabase SQL Editor에서 수동 실행하세요.

-- 1. (student_id, subject, slot_number)별 중복 행 병합 — 비어 있지 않은 교재명 우선
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY student_id, subject, slot_number
      ORDER BY
        CASE WHEN trim(coalesce(textbook_name, '')) <> '' THEN 0 ELSE 1 END,
        updated_at DESC NULLS LAST
    ) AS rn
  FROM public.student_textbook_slots
)
DELETE FROM public.student_textbook_slots
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. category 기반 unique 제약 → 공통 unique 로 변경
ALTER TABLE public.student_textbook_slots
  DROP CONSTRAINT IF EXISTS student_textbook_slots_unique;

ALTER TABLE public.student_textbook_slots
  DROP CONSTRAINT IF EXISTS student_textbook_slots_category_check;

ALTER TABLE public.student_textbook_slots
  ADD CONSTRAINT student_textbook_slots_unique
  UNIQUE (student_id, subject, slot_number);

-- 3. category 컬럼 제거 (숙제·진도 공통 교재명만 사용)
ALTER TABLE public.student_textbook_slots
  DROP COLUMN IF EXISTS category;
