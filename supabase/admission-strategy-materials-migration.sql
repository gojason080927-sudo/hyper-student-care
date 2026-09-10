-- Additive only: 고입·대입 입시전략 자료(CMS) + Storage + parent RPC
-- 기존 admission_strategy_posts / notices / makeup_plans / get_parent_care_bundle
-- / 학생·학부모·출결·진도·과제 데이터는 변경하지 않음.

CREATE TABLE IF NOT EXISTS public.admission_strategy_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  material_type TEXT NOT NULL DEFAULT 'pdf',
  source_file_path TEXT,
  original_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  conversion_status TEXT NOT NULL DEFAULT 'pending',
  conversion_error TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  page_count INTEGER,
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admission_strategy_materials_type_check
    CHECK (material_type IN ('pdf', 'pptx')),
  CONSTRAINT admission_strategy_materials_status_check
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'HIDDEN')),
  CONSTRAINT admission_strategy_materials_conversion_check
    CHECK (conversion_status IN ('pending', 'converting', 'ready', 'failed', 'needs_pdf'))
);

CREATE TABLE IF NOT EXISTS public.admission_strategy_material_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.admission_strategy_materials(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  asset_path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admission_strategy_material_pages_number_check CHECK (page_number > 0),
  CONSTRAINT admission_strategy_material_pages_unique UNIQUE (material_id, page_number)
);

CREATE INDEX IF NOT EXISTS admission_strategy_materials_status_order_idx
  ON public.admission_strategy_materials (status, display_order, published_at DESC);

CREATE INDEX IF NOT EXISTS admission_strategy_materials_created_at_idx
  ON public.admission_strategy_materials (created_at DESC);

CREATE INDEX IF NOT EXISTS admission_strategy_material_pages_material_idx
  ON public.admission_strategy_material_pages (material_id, page_number);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_admission_strategy_materials_updated_at'
  ) THEN
    CREATE TRIGGER trg_admission_strategy_materials_updated_at
      BEFORE UPDATE ON public.admission_strategy_materials
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

ALTER TABLE public.admission_strategy_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_strategy_material_pages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admission_strategy_materials FROM PUBLIC;
REVOKE ALL ON TABLE public.admission_strategy_materials FROM anon;
REVOKE ALL ON TABLE public.admission_strategy_material_pages FROM PUBLIC;
REVOKE ALL ON TABLE public.admission_strategy_material_pages FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admission_strategy_materials TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admission_strategy_material_pages TO authenticated;
GRANT ALL ON TABLE public.admission_strategy_materials TO service_role;
GRANT ALL ON TABLE public.admission_strategy_material_pages TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admission_strategy_materials'
      AND policyname = 'admission_strategy_materials_authenticated_crud'
  ) THEN
    CREATE POLICY admission_strategy_materials_authenticated_crud
      ON public.admission_strategy_materials
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'admission_strategy_material_pages'
      AND policyname = 'admission_strategy_material_pages_authenticated_crud'
  ) THEN
    CREATE POLICY admission_strategy_material_pages_authenticated_crud
      ON public.admission_strategy_material_pages
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'admission-strategy',
  'admission-strategy',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/webp',
    'image/jpeg',
    'image/png'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/webp',
    'image/jpeg',
    'image/png'
  ]::text[]
WHERE id = 'admission-strategy';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'admission_strategy_storage_teacher_all'
  ) THEN
    CREATE POLICY admission_strategy_storage_teacher_all
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (bucket_id = 'admission-strategy')
      WITH CHECK (bucket_id = 'admission-strategy');
  END IF;
END
$$;

-- 학부모(anon): PUBLISHED 자료의 pages/ 이미지만 읽기. source/ 원본과 DRAFT/HIDDEN 차단.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'admission_strategy_storage_parent_published_pages'
  ) THEN
    CREATE POLICY admission_strategy_storage_parent_published_pages
      ON storage.objects
      FOR SELECT
      TO anon
      USING (
        bucket_id = 'admission-strategy'
        AND name LIKE '%/pages/%'
        AND EXISTS (
          SELECT 1
          FROM public.admission_strategy_materials m
          WHERE m.status = 'PUBLISHED'
            AND m.id::text = split_part(name, '/', 1)
        )
      );
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.get_parent_admission_strategy_materials(p_access_key text)
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
      SELECT jsonb_agg(listed.item ORDER BY listed.display_order ASC, listed.published_at DESC NULLS LAST)
      FROM (
        SELECT jsonb_build_object(
          'id', m.id,
          'title', m.title,
          'description', coalesce(m.description, ''),
          'page_count', coalesce(m.page_count, 0),
          'display_order', m.display_order,
          'published_at', m.published_at,
          'pages', coalesce(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'page_number', p.page_number,
                  'asset_path', p.asset_path,
                  'width', p.width,
                  'height', p.height
                )
                ORDER BY p.page_number ASC
              )
              FROM public.admission_strategy_material_pages p
              WHERE p.material_id = m.id
            ),
            '[]'::jsonb
          )
        ) AS item,
        m.display_order,
        m.published_at
        FROM public.admission_strategy_materials m
        WHERE m.status = 'PUBLISHED'
          AND m.conversion_status = 'ready'
          AND coalesce(m.page_count, 0) > 0
      ) listed
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_parent_admission_strategy_material(
  p_access_key text,
  p_material_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_payload jsonb;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', m.id,
    'title', m.title,
    'description', coalesce(m.description, ''),
    'page_count', coalesce(m.page_count, 0),
    'display_order', m.display_order,
    'published_at', m.published_at,
    'pages', coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'page_number', p.page_number,
            'asset_path', p.asset_path,
            'width', p.width,
            'height', p.height
          )
          ORDER BY p.page_number ASC
        )
        FROM public.admission_strategy_material_pages p
        WHERE p.material_id = m.id
      ),
      '[]'::jsonb
    )
  )
  INTO v_payload
  FROM public.admission_strategy_materials m
  WHERE m.id = p_material_id
    AND m.status = 'PUBLISHED'
    AND m.conversion_status = 'ready'
    AND coalesce(m.page_count, 0) > 0;

  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_admission_strategy_materials(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_admission_strategy_materials(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_parent_admission_strategy_materials(text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_parent_admission_strategy_material(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_admission_strategy_material(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_parent_admission_strategy_material(text, uuid) TO authenticated;
