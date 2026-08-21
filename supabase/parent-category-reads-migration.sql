-- 학부모 앱 메뉴별 읽음 상태 (access key 단위 — 개인 학부모 계정 없음)
-- Supabase SQL Editor에서 수동 실행 필요

CREATE TABLE IF NOT EXISTS public.parent_category_reads (
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  category text NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parent_category_reads_pkey PRIMARY KEY (student_id, category),
  CONSTRAINT parent_category_reads_category_check CHECK (
    category IN (
      'today-report',
      'monthly-evaluation',
      'makeup-plans',
      'learning-notices',
      'questions'
    )
  )
);

CREATE INDEX IF NOT EXISTS parent_category_reads_student_id_idx
  ON public.parent_category_reads (student_id);

ALTER TABLE public.parent_category_reads ENABLE ROW LEVEL SECURITY;

-- anon/authenticated 직접 접근 차단 — SECURITY DEFINER RPC만 사용

CREATE OR REPLACE FUNCTION public._parent_category_read_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parent_category_reads_set_updated_at ON public.parent_category_reads;
CREATE TRIGGER parent_category_reads_set_updated_at
  BEFORE UPDATE ON public.parent_category_reads
  FOR EACH ROW
  EXECUTE FUNCTION public._parent_category_read_touch();

CREATE OR REPLACE FUNCTION public.get_parent_category_reads(p_access_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN coalesce(
    (
      SELECT jsonb_object_agg(r.category, r.last_read_at)
      FROM public.parent_category_reads r
      WHERE r.student_id = v_student_id
    ),
    '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_category_reads(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_category_reads(text) TO anon;

CREATE OR REPLACE FUNCTION public.mark_parent_category_read(p_access_key text, p_category text)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_category text;
  v_last_read_at timestamptz;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_category := trim(p_category);
  IF v_category NOT IN (
    'today-report',
    'monthly-evaluation',
    'makeup-plans',
    'learning-notices',
    'questions'
  ) THEN
    RETURN NULL;
  END IF;

  v_last_read_at := now();

  INSERT INTO public.parent_category_reads (student_id, category, last_read_at)
  VALUES (v_student_id, v_category, v_last_read_at)
  ON CONFLICT (student_id, category)
  DO UPDATE SET last_read_at = EXCLUDED.last_read_at;

  RETURN v_last_read_at;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_parent_category_read(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_parent_category_read(text, text) TO anon;
