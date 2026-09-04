-- Additive only: 고입·대입 입시전략 게시글
-- 기존 notices / makeup_plans / get_parent_care_bundle / 기존 RLS 정책은 변경하지 않음.

CREATE TABLE IF NOT EXISTS public.admission_strategy_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  published_at DATE NOT NULL DEFAULT CURRENT_DATE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admission_strategy_posts_track_check CHECK (track IN ('고입', '대입'))
);

CREATE INDEX IF NOT EXISTS admission_strategy_posts_track_idx
  ON public.admission_strategy_posts (track);

CREATE INDEX IF NOT EXISTS admission_strategy_posts_published_idx
  ON public.admission_strategy_posts (is_published, published_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_admission_strategy_posts_updated_at'
  ) THEN
    CREATE TRIGGER trg_admission_strategy_posts_updated_at
      BEFORE UPDATE ON public.admission_strategy_posts
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

ALTER TABLE public.admission_strategy_posts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admission_strategy_posts FROM PUBLIC;
REVOKE ALL ON TABLE public.admission_strategy_posts FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admission_strategy_posts TO authenticated;
GRANT ALL ON TABLE public.admission_strategy_posts TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admission_strategy_posts'
      AND policyname = 'admission_strategy_posts_authenticated_crud'
  ) THEN
    CREATE POLICY admission_strategy_posts_authenticated_crud
      ON public.admission_strategy_posts
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.get_parent_admission_strategy_posts(p_access_key text)
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
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'track', p.track,
          'title', p.title,
          'content', p.content,
          'published_at', p.published_at,
          'author_name', coalesce(p.author_name, '')
        )
        ORDER BY p.published_at DESC, p.updated_at DESC
      )
      FROM public.admission_strategy_posts p
      WHERE p.is_published = true
    ),
    '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_admission_strategy_posts(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_admission_strategy_posts(text) TO anon;
