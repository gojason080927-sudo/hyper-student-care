-- Hyper Student Care — 과목별 교재 3슬롯 (숙제·진도)
-- schema.sql + schema-extension.sql 실행 후 Supabase SQL Editor에서 수동 실행하세요.
-- 자동 실행하지 않습니다.

-- ---------------------------------------------------------------------------
-- 1. 학생별·과목별·슬롯별 고정 교재명 (숙제·진도 공통)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_textbook_slots (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  subject       TEXT        NOT NULL,
  slot_number   INTEGER     NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
  textbook_name TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT student_textbook_slots_unique UNIQUE (student_id, subject, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_student_textbook_slots_student_id
  ON public.student_textbook_slots (student_id);

CREATE TRIGGER trg_student_textbook_slots_updated_at
  BEFORE UPDATE ON public.student_textbook_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. 교재별 일일 숙제 (과목·슬롯별)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homework_textbook_entries (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id          UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  date                DATE        NOT NULL,
  subject             TEXT        NOT NULL,
  slot_number         INTEGER     NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
  previous_assignment TEXT        NOT NULL DEFAULT '',
  today_assignment    TEXT        NOT NULL DEFAULT '',
  status              TEXT        NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT homework_textbook_entries_status_check CHECK (
    status IN ('', '완료', '부분 완료', '미완료')
  ),
  CONSTRAINT homework_textbook_entries_unique UNIQUE (student_id, date, subject, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_homework_textbook_entries_student_date
  ON public.homework_textbook_entries (student_id, date);

CREATE TRIGGER trg_homework_textbook_entries_updated_at
  BEFORE UPDATE ON public.homework_textbook_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. progress 테이블에 슬롯 번호 추가
-- ---------------------------------------------------------------------------
ALTER TABLE public.progress
  ADD COLUMN IF NOT EXISTS slot_number INTEGER NOT NULL DEFAULT 1
  CHECK (slot_number BETWEEN 1 AND 3);

-- ---------------------------------------------------------------------------
-- 4. 기존 데이터 마이그레이션 (삭제 없음, 슬롯 1로 매핑)
-- ---------------------------------------------------------------------------

-- 4a. 기존 progress 교재명 → student_textbook_slots 슬롯 1
INSERT INTO public.student_textbook_slots (student_id, subject, slot_number, textbook_name)
SELECT DISTINCT ON (p.student_id, p.subject)
  p.student_id,
  p.subject,
  1,
  trim(p.textbook_name)
FROM public.progress p
WHERE trim(coalesce(p.textbook_name, '')) <> ''
ORDER BY p.student_id, p.subject, p.updated_at DESC
ON CONFLICT (student_id, subject, slot_number) DO UPDATE
  SET textbook_name = EXCLUDED.textbook_name
  WHERE trim(public.student_textbook_slots.textbook_name) = '';

-- 4b. 기존 homework + today_assignments → homework_textbook_entries 슬롯 1 (수학)
INSERT INTO public.homework_textbook_entries (
  student_id,
  date,
  subject,
  slot_number,
  previous_assignment,
  today_assignment,
  status
)
SELECT
  h.student_id,
  h.date,
  '수학',
  1,
  trim(coalesce(h.description, '')),
  trim(coalesce(ta.assignment2, ta.assignment1, '')),
  h.status
FROM public.homework h
LEFT JOIN public.today_assignments ta
  ON ta.student_id = h.student_id AND ta.date = h.date
WHERE trim(coalesce(h.description, '')) <> ''
   OR trim(coalesce(h.status, '')) <> ''
   OR trim(coalesce(ta.assignment2, ta.assignment1, '')) <> ''
ON CONFLICT (student_id, date, subject, slot_number) DO NOTHING;

-- 4c. homework 없이 today_assignments만 있는 날 → 슬롯 1
INSERT INTO public.homework_textbook_entries (
  student_id,
  date,
  subject,
  slot_number,
  previous_assignment,
  today_assignment,
  status
)
SELECT
  ta.student_id,
  ta.date,
  '수학',
  1,
  '',
  trim(coalesce(ta.assignment2, ta.assignment1, '')),
  ''
FROM public.today_assignments ta
WHERE NOT EXISTS (
  SELECT 1 FROM public.homework h
  WHERE h.student_id = ta.student_id AND h.date = ta.date
)
AND trim(coalesce(ta.assignment2, ta.assignment1, '')) <> ''
ON CONFLICT (student_id, date, subject, slot_number) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. 학부모 RPC 갱신 (parent-access-rpc.sql 전체를 다시 실행하세요)
-- ---------------------------------------------------------------------------
-- textbook-slots-migration.sql 실행 후
-- supabase/parent-access-rpc.sql 파일 내용을 SQL Editor에서 한 번 더 실행해야
-- homework_textbook_entries / student_textbook_slots가 학부모 RPC에 포함됩니다.

ALTER TABLE public.student_textbook_slots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_textbook_entries ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['student_textbook_slots', 'homework_textbook_entries']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl || '_authenticated_all', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dev_anon_select_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dev_anon_insert_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dev_anon_update_' || tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'dev_anon_delete_' || tbl, tbl);

    -- authenticated (로그인 강사)
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl || '_authenticated_all',
      tbl
    );

    -- anon (개발·anon key 직접 사용 — rls-policies.sql과 동일 패턴)
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
      'dev_anon_select_' || tbl,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO anon, authenticated WITH CHECK (true)',
      'dev_anon_insert_' || tbl,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true)',
      'dev_anon_update_' || tbl,
      tbl
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO anon, authenticated USING (true)',
      'dev_anon_delete_' || tbl,
      tbl
    );
  END LOOP;
END $$;
