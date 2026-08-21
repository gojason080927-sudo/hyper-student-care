-- Hyper Student Care — 추가 테이블 (진도, 과제완성, 오늘의 과제, 수업 특이사항)
-- schema.sql 실행 후 Supabase SQL Editor에서 한 번에 실행하세요.

CREATE TABLE public.assignment_completions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  date             DATE        NOT NULL,
  assignment_name  TEXT        NOT NULL DEFAULT '',
  total_count      INTEGER     NOT NULL DEFAULT 0,
  completed_count  INTEGER     NOT NULL DEFAULT 0,
  completion_rate  NUMERIC(5, 2) NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL,
  memo             TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT assignment_completions_status_check CHECK (
    status IN ('완료', '보충필요')
  )
);

CREATE INDEX idx_assignment_completions_student_id ON public.assignment_completions (student_id);
CREATE INDEX idx_assignment_completions_date ON public.assignment_completions (date);

CREATE TRIGGER trg_assignment_completions_updated_at
  BEFORE UPDATE ON public.assignment_completions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.progress (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  subject          TEXT        NOT NULL DEFAULT '',
  textbook_name    TEXT        NOT NULL DEFAULT '',
  current_progress TEXT        NOT NULL DEFAULT '',
  current_page     INTEGER     NOT NULL DEFAULT 0,
  total_page       INTEGER     NOT NULL DEFAULT 1,
  progress_rate    NUMERIC(5, 2) NOT NULL DEFAULT 0,
  last_study_date  DATE        NOT NULL,
  teacher_memo     TEXT        NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_progress_student_id ON public.progress (student_id);

CREATE TRIGGER trg_progress_updated_at
  BEFORE UPDATE ON public.progress
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.today_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  assignment1 TEXT        NOT NULL DEFAULT '',
  assignment2 TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT today_assignments_student_date_unique UNIQUE (student_id, date)
);

CREATE INDEX idx_today_assignments_student_id ON public.today_assignments (student_id);
CREATE INDEX idx_today_assignments_date ON public.today_assignments (date);

CREATE TRIGGER trg_today_assignments_updated_at
  BEFORE UPDATE ON public.today_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.class_notes (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  date           DATE        NOT NULL,
  has_class_note BOOLEAN     NOT NULL DEFAULT FALSE,
  note           TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT class_notes_student_date_unique UNIQUE (student_id, date)
);

CREATE INDEX idx_class_notes_student_id ON public.class_notes (student_id);
CREATE INDEX idx_class_notes_date ON public.class_notes (date);

CREATE TRIGGER trg_class_notes_updated_at
  BEFORE UPDATE ON public.class_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
