-- Hyper Student Care — Supabase(PostgreSQL) 초기 스키마
-- Supabase SQL Editor에서 한 번에 실행하세요.

-- ---------------------------------------------------------------------------
-- Extensions & helpers
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. students
-- ---------------------------------------------------------------------------

CREATE TABLE public.students (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  student_access_key  TEXT        NOT NULL UNIQUE,
  school              TEXT        NOT NULL DEFAULT '',
  grade               TEXT        NOT NULL,
  student_phone       TEXT        NOT NULL DEFAULT '',
  parent_phone        TEXT        NOT NULL DEFAULT '',
  class_name          TEXT        NOT NULL DEFAULT '',
  subjects            TEXT[]      NOT NULL DEFAULT '{}',
  teacher             TEXT        NOT NULL DEFAULT '',
  enrollment_date     DATE        NOT NULL,
  status              TEXT        NOT NULL DEFAULT '재원',
  memo                TEXT        NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT students_grade_check CHECK (
    grade IN (
      '초1', '초2', '초3', '초4', '초5', '초6',
      '중1', '중2', '중3',
      '고1', '고2', '고3'
    )
  ),
  CONSTRAINT students_status_check CHECK (
    status IN ('재원', '휴원', '퇴원')
  )
);

CREATE INDEX idx_students_status ON public.students (status);
CREATE INDEX idx_students_class_name ON public.students (class_name);
CREATE INDEX idx_students_student_access_key ON public.students (student_access_key);

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. attendance
-- ---------------------------------------------------------------------------

CREATE TABLE public.attendance (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  date        DATE        NOT NULL,
  status      TEXT        NOT NULL,
  reason      TEXT        NOT NULL DEFAULT '',
  memo        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT attendance_status_check CHECK (
    status IN ('출석', '지각', '결석', '조퇴')
  ),
  CONSTRAINT attendance_student_date_unique UNIQUE (student_id, date)
);

CREATE INDEX idx_attendance_student_id ON public.attendance (student_id);
CREATE INDEX idx_attendance_date ON public.attendance (date);

CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. homework
-- ---------------------------------------------------------------------------

CREATE TABLE public.homework (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  date         DATE        NOT NULL,
  title        TEXT        NOT NULL DEFAULT '',
  description  TEXT        NOT NULL DEFAULT '',
  status       TEXT        NOT NULL,
  teacher_memo TEXT        NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT homework_status_check CHECK (
    status IN ('완료', '부분 완료', '미완료')
  )
);

CREATE INDEX idx_homework_student_id ON public.homework (student_id);
CREATE INDEX idx_homework_date ON public.homework (date);
CREATE INDEX idx_homework_student_date ON public.homework (student_id, date);

CREATE TRIGGER trg_homework_updated_at
  BEFORE UPDATE ON public.homework
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. daily_tests
-- ---------------------------------------------------------------------------

CREATE TABLE public.daily_tests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  date             DATE        NOT NULL,
  test_name        TEXT        NOT NULL DEFAULT '',
  subject          TEXT        NOT NULL DEFAULT '',
  score            INTEGER     NOT NULL DEFAULT 0,
  total_score      INTEGER     NOT NULL DEFAULT 0,
  percentage       NUMERIC(5, 2) NOT NULL DEFAULT 0,
  incorrect_count  INTEGER     NOT NULL DEFAULT 0,
  memo             TEXT        NOT NULL DEFAULT '',
  session_results  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT daily_tests_score_nonneg CHECK (score >= 0),
  CONSTRAINT daily_tests_total_score_nonneg CHECK (total_score >= 0),
  CONSTRAINT daily_tests_incorrect_count_nonneg CHECK (incorrect_count >= 0),
  CONSTRAINT daily_tests_percentage_range CHECK (
    percentage >= 0 AND percentage <= 100
  )
);

CREATE INDEX idx_daily_tests_student_id ON public.daily_tests (student_id);
CREATE INDEX idx_daily_tests_date ON public.daily_tests (date);
CREATE INDEX idx_daily_tests_student_date ON public.daily_tests (student_id, date);

CREATE TRIGGER trg_daily_tests_updated_at
  BEFORE UPDATE ON public.daily_tests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. monthly_evaluations
-- ---------------------------------------------------------------------------

CREATE TABLE public.monthly_evaluations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id            UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  evaluation_date       DATE        NOT NULL,
  year                  INTEGER     NOT NULL,
  month                 INTEGER     NOT NULL,
  subject               TEXT        NOT NULL DEFAULT '',
  score                 INTEGER     NOT NULL DEFAULT 0,
  total_score           INTEGER     NOT NULL DEFAULT 0,
  percentage            NUMERIC(5, 2) NOT NULL DEFAULT 0,
  difficulty_breakdown  JSONB       NOT NULL DEFAULT '{"highest":0,"high":0,"middle":0,"basic":0}'::jsonb,
  teacher_comment       TEXT        NOT NULL DEFAULT '',
  strengths             TEXT        NOT NULL DEFAULT '',
  improvements          TEXT        NOT NULL DEFAULT '',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT monthly_evaluations_month_range CHECK (month >= 1 AND month <= 12),
  CONSTRAINT monthly_evaluations_score_nonneg CHECK (score >= 0),
  CONSTRAINT monthly_evaluations_total_score_nonneg CHECK (total_score >= 0),
  CONSTRAINT monthly_evaluations_percentage_range CHECK (
    percentage >= 0 AND percentage <= 100
  ),
  CONSTRAINT monthly_evaluations_student_period_unique UNIQUE (student_id, year, month, subject)
);

CREATE INDEX idx_monthly_evaluations_student_id ON public.monthly_evaluations (student_id);
CREATE INDEX idx_monthly_evaluations_year_month ON public.monthly_evaluations (year, month);

CREATE TRIGGER trg_monthly_evaluations_updated_at
  BEFORE UPDATE ON public.monthly_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. makeup_plans
-- ---------------------------------------------------------------------------

CREATE TABLE public.makeup_plans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  scheduled_date  DATE        NOT NULL,
  scheduled_time  TEXT        NOT NULL DEFAULT '',
  method          TEXT        NOT NULL,
  subject         TEXT        NOT NULL DEFAULT '',
  reason          TEXT        NOT NULL DEFAULT '',
  memo            TEXT        NOT NULL DEFAULT '',
  status          TEXT        NOT NULL DEFAULT '예정',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT makeup_plans_method_check CHECK (
    method IN ('학원 보강', '영상 대체')
  ),
  CONSTRAINT makeup_plans_status_check CHECK (
    status IN ('예정', '완료', '취소')
  )
);

CREATE INDEX idx_makeup_plans_student_id ON public.makeup_plans (student_id);
CREATE INDEX idx_makeup_plans_scheduled_date ON public.makeup_plans (scheduled_date);
CREATE INDEX idx_makeup_plans_status ON public.makeup_plans (status);

CREATE TRIGGER trg_makeup_plans_updated_at
  BEFORE UPDATE ON public.makeup_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. questions
-- ---------------------------------------------------------------------------

CREATE TABLE public.questions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  date            DATE        NOT NULL,
  category        TEXT        NOT NULL,
  title           TEXT        NOT NULL DEFAULT '',
  content         TEXT        NOT NULL DEFAULT '',
  answer          TEXT        NOT NULL DEFAULT '',
  question_images JSONB       NOT NULL DEFAULT '[]'::jsonb,
  answer_images   JSONB       NOT NULL DEFAULT '[]'::jsonb,
  status          TEXT        NOT NULL DEFAULT '답변대기',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT questions_category_check CHECK (
    category IN ('수업질문', '숙제질문', '시험질문', '상담요청', '기타')
  ),
  CONSTRAINT questions_status_check CHECK (
    status IN ('답변대기', '답변완료')
  )
);

CREATE INDEX idx_questions_student_id ON public.questions (student_id);
CREATE INDEX idx_questions_date ON public.questions (date);
CREATE INDEX idx_questions_status ON public.questions (status);

CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. notices (학원 공지 / 학습정보 — 학생별 연결 없음)
-- ---------------------------------------------------------------------------

CREATE TABLE public.notices (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category               TEXT        NOT NULL,
  title                  TEXT        NOT NULL,
  content                TEXT        NOT NULL DEFAULT '',
  summary                TEXT        NOT NULL DEFAULT '',
  source_name            TEXT        NOT NULL DEFAULT '',
  original_article_title TEXT        NOT NULL DEFAULT '',
  author_name            TEXT        NOT NULL DEFAULT '',
  is_pinned              BOOLEAN     NOT NULL DEFAULT FALSE,
  is_published           BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at           DATE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT notices_category_check CHECK (
    category IN ('학습정보', '공지사항')
  )
);

CREATE INDEX idx_notices_category ON public.notices (category);
CREATE INDEX idx_notices_is_published ON public.notices (is_published);
CREATE INDEX idx_notices_published_at ON public.notices (published_at DESC);
CREATE INDEX idx_notices_is_pinned ON public.notices (is_pinned);

CREATE TRIGGER trg_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
