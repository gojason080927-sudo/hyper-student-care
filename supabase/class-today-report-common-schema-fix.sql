-- Hyper Student Care — class_today_report_common 스키마 진단 및 textbook_name 추가
-- Production project ref: pwuswjauzdxewmtgoitf
-- Supabase SQL Editor에서 실행하세요.
-- 기존 테이블·데이터·제약조건은 삭제/변경하지 않습니다.

-- ============================================================
-- 1) 진단: 컬럼 목록
-- ============================================================
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'class_today_report_common'
order by ordinal_position;

-- ============================================================
-- 2) 진단: 제약조건
-- ============================================================
select
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.table_schema = kcu.table_schema
where tc.table_schema = 'public'
  and tc.table_name = 'class_today_report_common'
order by tc.constraint_name, kcu.ordinal_position;

-- ============================================================
-- 3) 누락 컬럼 추가 (존재하면 건너뜀)
--    student_textbook_slots 와 동일한 교재명 컬럼명: textbook_name
-- ============================================================
begin;

alter table public.class_today_report_common
  add column if not exists textbook_name text not null default '';

-- current_page / total_page 는 pages 마이그레이션으로 이미 추가됨
-- grade, class_name, report_date, subject, slot_number,
-- current_progress, previous_assignment, today_assignment,
-- created_at, updated_at 는 초기 마이그레이션에 포함됨

commit;

-- ============================================================
-- 4) PostgREST 스키마 캐시 갱신
-- ============================================================
notify pgrst, 'reload schema';

-- ============================================================
-- 5) 확인: textbook_name 컬럼 존재 여부
-- ============================================================
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'class_today_report_common'
  and column_name = 'textbook_name';
