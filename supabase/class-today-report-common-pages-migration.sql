-- class_today_report_common에 진행률(current/total) 컬럼 추가
-- class-today-report-common-migration.sql 실행 후 Supabase SQL Editor에서 수동 실행하세요.
-- 자동 실행하지 않습니다.

ALTER TABLE public.class_today_report_common
  ADD COLUMN IF NOT EXISTS current_page INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_page INTEGER NOT NULL DEFAULT 0;
