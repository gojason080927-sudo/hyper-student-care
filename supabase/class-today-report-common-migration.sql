-- Hyper Student Care — 반별 Today Report 공통 진도·과제
-- schema.sql + textbook-slots-migration.sql 실행 후 Supabase SQL Editor에서 수동 실행하세요.
-- 자동 실행하지 않습니다.
--
-- 반 식별: students.class_name + students.grade (별도 class_id 테이블 없음)

CREATE TABLE IF NOT EXISTS public.class_today_report_common (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  grade               TEXT        NOT NULL,
  class_name          TEXT        NOT NULL,
  report_date         DATE        NOT NULL,
  subject             TEXT        NOT NULL,
  slot_number         INTEGER     NOT NULL CHECK (slot_number BETWEEN 1 AND 3),
  current_progress    TEXT        NOT NULL DEFAULT '',
  current_page        INTEGER     NOT NULL DEFAULT 0,
  total_page          INTEGER     NOT NULL DEFAULT 0,
  previous_assignment TEXT        NOT NULL DEFAULT '',
  today_assignment    TEXT        NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT class_today_report_common_unique
    UNIQUE (grade, class_name, report_date, subject, slot_number)
);

CREATE INDEX IF NOT EXISTS idx_class_today_report_common_lookup
  ON public.class_today_report_common (grade, class_name, report_date);

CREATE TRIGGER trg_class_today_report_common_updated_at
  BEFORE UPDATE ON public.class_today_report_common
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS (개발용 — rls-policies.sql과 동일 패턴)
ALTER TABLE public.class_today_report_common ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dev_anon_select_class_today_report_common" ON public.class_today_report_common;
DROP POLICY IF EXISTS "dev_anon_insert_class_today_report_common" ON public.class_today_report_common;
DROP POLICY IF EXISTS "dev_anon_update_class_today_report_common" ON public.class_today_report_common;
DROP POLICY IF EXISTS "dev_anon_delete_class_today_report_common" ON public.class_today_report_common;

CREATE POLICY "dev_anon_select_class_today_report_common"
  ON public.class_today_report_common FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "dev_anon_insert_class_today_report_common"
  ON public.class_today_report_common FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "dev_anon_update_class_today_report_common"
  ON public.class_today_report_common FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "dev_anon_delete_class_today_report_common"
  ON public.class_today_report_common FOR DELETE TO anon, authenticated USING (true);
