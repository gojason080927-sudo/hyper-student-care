-- 중2 수학 반 → "중2 수학A"로 이름 변경 + "중2 수학B" 반 추가
-- Supabase 대시보드 > SQL Editor 에서 실행. 여러 번 실행해도 안전합니다(이미 처리된 것은 건너뜀).
--
-- ★ 실행 전 백업: Supabase 대시보드 > Database > Backups 에서 백업을 확인하거나,
--   아래 BACKUP 블록(주석 해제)을 먼저 실행해 두세요.
--
-- 이 앱은 반을 별도 테이블이 아니라 "반 이름 문자열(class_name)"로 관리합니다.
--   · 이름 변경: students 등에서 '중2 수학' → '중2 수학A' (학생·출결·성적 기록은 학생 id에 붙어 있어 그대로 유지)
--   · B반 생성: 반별 설정(시간표)만 A와 같은 값으로 복사. 학생·기록은 복사하지 않음.
--
-- /* BACKUP (필요하면 주석 해제 후 먼저 실행)
-- CREATE TABLE IF NOT EXISTS public._bak_students_20261019 AS SELECT * FROM public.students;
-- CREATE TABLE IF NOT EXISTS public._bak_class_schedules_20261019 AS SELECT * FROM public.class_schedules;
-- CREATE TABLE IF NOT EXISTS public._bak_class_schedule_grids_20261019 AS SELECT * FROM public.class_schedule_grids;
-- CREATE TABLE IF NOT EXISTS public._bak_class_today_report_common_20261019 AS SELECT * FROM public.class_today_report_common;
-- */

BEGIN;

DO $$
BEGIN
  -- 1) 이름 변경: 중2 수학 → 중2 수학A (있는 테이블만)
  IF to_regclass('public.students') IS NOT NULL THEN
    UPDATE public.students SET class_name = '중2 수학A' WHERE class_name = '중2 수학';
  END IF;

  IF to_regclass('public.class_today_report_common') IS NOT NULL THEN
    UPDATE public.class_today_report_common SET class_name = '중2 수학A'
     WHERE grade = '중2' AND class_name = '중2 수학';
  END IF;

  IF to_regclass('public.class_schedules') IS NOT NULL THEN
    UPDATE public.class_schedules SET class_name = '중2 수학A'
     WHERE grade = '중2' AND class_name = '중2 수학';
  END IF;

  IF to_regclass('public.class_schedule_grids') IS NOT NULL THEN
    UPDATE public.class_schedule_grids SET class_name = '중2 수학A'
     WHERE grade = '중2' AND class_name = '중2 수학';
  END IF;

  IF to_regclass('public.notices') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'notices' AND column_name = 'target_class_name') THEN
    UPDATE public.notices SET target_class_name = '중2 수학A' WHERE target_class_name = '중2 수학';
  END IF;

  -- 2) B반 설정 복사 (A의 시간표 설정만; 학생·출결·성적·일일 리포트 기록은 복사하지 않음)
  IF to_regclass('public.class_schedule_grids') IS NOT NULL THEN
    INSERT INTO public.class_schedule_grids (grade, class_name, template_type, time_labels, cells, is_active)
    SELECT grade, '중2 수학B', template_type, time_labels, cells, is_active
      FROM public.class_schedule_grids
     WHERE grade = '중2' AND class_name = '중2 수학A'
    ON CONFLICT (grade, class_name) DO NOTHING;
  END IF;

  IF to_regclass('public.class_schedules') IS NOT NULL THEN
    INSERT INTO public.class_schedules
      (grade, class_name, subject, day_of_week, start_time, end_time, teacher_name, classroom, effective_from, note, is_active)
    SELECT grade, '중2 수학B', subject, day_of_week, start_time, end_time, teacher_name, classroom, effective_from, note, is_active
      FROM public.class_schedules a
     WHERE a.grade = '중2' AND a.class_name = '중2 수학A'
       AND NOT EXISTS (SELECT 1 FROM public.class_schedules b
                        WHERE b.grade = '중2' AND b.class_name = '중2 수학B');
  END IF;
END
$$;

COMMIT;

-- 확인용 (결과가 보이면 정상)
SELECT class_name, count(*) AS 학생수 FROM public.students WHERE class_name LIKE '중2 수학%' GROUP BY class_name ORDER BY class_name;
