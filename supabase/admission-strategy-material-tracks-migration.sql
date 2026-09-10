-- Additive: 입시자료 고입/대입 track + 학부모 자료 확인(view) 상태
-- Production 적용: Supabase SQL Editor에서 이 파일 전체를 한 번 실행한다.
-- DROP/TRUNCATE 없음. 기존 학생/학부모/출결/진도/과제/일일테스트/전략 글 데이터는 변경하지 않음.
-- 기존 get_parent_care_bundle / Storage / RLS / parent access-key 는 유지하고 parent materials RPC만 확장한다.

ALTER TABLE public.admission_strategy_materials
  ADD COLUMN IF NOT EXISTS track TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'admission_strategy_materials_track_check'
  ) THEN
    ALTER TABLE public.admission_strategy_materials
      ADD CONSTRAINT admission_strategy_materials_track_check
      CHECK (track IS NULL OR track IN ('고입', '대입'));
  END IF;
END
$$;

-- 현재 Production에 게시된 기존 1건만 명시적으로 대입으로 지정한다. 제목 문자열 분석으로 다른 row는 분류하지 않는다.
UPDATE public.admission_strategy_materials
SET track = '대입'
WHERE id = '9ad41270-8078-41a1-87bf-95dc3e8c6046'
  AND (track IS NULL OR track NOT IN ('고입', '대입'));

CREATE INDEX IF NOT EXISTS admission_strategy_materials_track_idx
  ON public.admission_strategy_materials (track, status, display_order);

CREATE TABLE IF NOT EXISTS public.admission_strategy_material_views (
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.admission_strategy_materials(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admission_strategy_material_views_pkey PRIMARY KEY (student_id, material_id)
);

CREATE INDEX IF NOT EXISTS admission_strategy_material_views_material_idx
  ON public.admission_strategy_material_views (material_id);

ALTER TABLE public.admission_strategy_material_views ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admission_strategy_material_views FROM PUBLIC;
REVOKE ALL ON TABLE public.admission_strategy_material_views FROM anon;
REVOKE ALL ON TABLE public.admission_strategy_material_views FROM authenticated;
GRANT ALL ON TABLE public.admission_strategy_material_views TO service_role;

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
          'track', m.track,
          'title', m.title,
          'description', coalesce(m.description, ''),
          'page_count', coalesce(m.page_count, 0),
          'display_order', m.display_order,
          'published_at', m.published_at,
          'is_unread',
            v.viewed_at IS NULL
            OR (m.published_at IS NOT NULL AND m.published_at > v.viewed_at),
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
        LEFT JOIN public.admission_strategy_material_views v
          ON v.material_id = m.id
         AND v.student_id = v_student_id
        WHERE m.status = 'PUBLISHED'
          AND m.conversion_status = 'ready'
          AND coalesce(m.page_count, 0) > 0
          AND m.track IN ('고입', '대입')
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
    'track', m.track,
    'title', m.title,
    'description', coalesce(m.description, ''),
    'page_count', coalesce(m.page_count, 0),
    'display_order', m.display_order,
    'published_at', m.published_at,
    'is_unread',
      v.viewed_at IS NULL
      OR (m.published_at IS NOT NULL AND m.published_at > v.viewed_at),
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
  LEFT JOIN public.admission_strategy_material_views v
    ON v.material_id = m.id
   AND v.student_id = v_student_id
  WHERE m.id = p_material_id
    AND m.status = 'PUBLISHED'
    AND m.conversion_status = 'ready'
    AND coalesce(m.page_count, 0) > 0
    AND m.track IN ('고입', '대입');

  RETURN v_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_parent_admission_strategy_material_viewed(
  p_access_key text,
  p_material_id uuid
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_viewed_at timestamptz;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.admission_strategy_materials m
    WHERE m.id = p_material_id
      AND m.status = 'PUBLISHED'
      AND m.conversion_status = 'ready'
      AND coalesce(m.page_count, 0) > 0
      AND m.track IN ('고입', '대입')
  ) THEN
    RETURN NULL;
  END IF;

  v_viewed_at := now();

  INSERT INTO public.admission_strategy_material_views (student_id, material_id, viewed_at)
  VALUES (v_student_id, p_material_id, v_viewed_at)
  ON CONFLICT (student_id, material_id)
  DO UPDATE SET viewed_at = EXCLUDED.viewed_at;

  RETURN v_viewed_at;
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_admission_strategy_materials(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_admission_strategy_materials(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_parent_admission_strategy_materials(text) TO authenticated;

REVOKE ALL ON FUNCTION public.get_parent_admission_strategy_material(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_admission_strategy_material(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_parent_admission_strategy_material(text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_parent_admission_strategy_material_viewed(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_parent_admission_strategy_material_viewed(text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_parent_admission_strategy_material_viewed(text, uuid) TO authenticated;
