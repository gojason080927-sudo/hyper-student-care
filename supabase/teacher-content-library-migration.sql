-- =============================================================================
-- HYPER Student Care — Teacher content library (강사 전용 영상·콘텐츠 자료 보관함)
-- =============================================================================
-- 적용: 사용자 승인 후 Supabase Dashboard → SQL Editor → Run
-- 이 파일은 자동 실행하지 마세요. Production 적용/merge는 사용자 승인 전 금지.
--
-- 목적:
--   강사가 Instagram/YouTube/웹 자료를 URL 또는 직접 파일로 저장하고,
--   로그인한 강사(및 동일 계정으로 접속한 Work)만 검색·열람한다.
--
-- 금지:
--   DROP/TRUNCATE of existing parent/teacher/hub tables
--   CREATE OR REPLACE of get_parent_care_bundle / get_student_hub_bundle
--   admission-strategy / hub-* bucket 재사용
--   anon GRANT / anon storage policy / parent RPC
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_content_library_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  source_url text,
  content_kind text NOT NULL DEFAULT 'link',
  category text NOT NULL DEFAULT '기타',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  memo text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT '미사용',
  file_path text,
  file_name text,
  file_mime text,
  file_size bigint,
  created_by uuid,
  created_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_content_library_items_kind_check
    CHECK (content_kind IN ('link', 'file', 'mixed')),
  CONSTRAINT teacher_content_library_items_category_check
    CHECK (category IN (
      '입시정보',
      '학원운영',
      '공부법',
      '학부모공감',
      'HYPER홍보',
      '블로그후보',
      '릴스/쇼츠 아이디어',
      '기타'
    )),
  CONSTRAINT teacher_content_library_items_status_check
    CHECK (status IN ('미사용', '콘텐츠 제작중', '사용완료')),
  CONSTRAINT teacher_content_library_items_title_check
    CHECK (char_length(trim(title)) > 0),
  CONSTRAINT teacher_content_library_items_payload_check
    CHECK (
      coalesce(nullif(trim(source_url), ''), '') <> ''
      OR coalesce(nullif(trim(file_path), ''), '') <> ''
    )
);

CREATE INDEX IF NOT EXISTS teacher_content_library_items_updated_at_idx
  ON public.teacher_content_library_items (updated_at DESC);

CREATE INDEX IF NOT EXISTS teacher_content_library_items_category_idx
  ON public.teacher_content_library_items (category, status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_teacher_content_library_items_updated_at'
  ) THEN
    CREATE TRIGGER trg_teacher_content_library_items_updated_at
      BEFORE UPDATE ON public.teacher_content_library_items
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

ALTER TABLE public.teacher_content_library_items ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.teacher_content_library_items FROM PUBLIC;
REVOKE ALL ON TABLE public.teacher_content_library_items FROM anon;
REVOKE ALL ON TABLE public.teacher_content_library_items FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.teacher_content_library_items TO authenticated;
GRANT ALL ON TABLE public.teacher_content_library_items TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'teacher_content_library_items'
      AND policyname = 'teacher_content_library_items_authenticated_crud'
  ) THEN
    CREATE POLICY teacher_content_library_items_authenticated_crud
      ON public.teacher_content_library_items
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'teacher-content-library',
  'teacher-content-library',
  false,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
WHERE id = 'teacher-content-library';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'teacher_content_library_storage_teacher_all'
  ) THEN
    CREATE POLICY teacher_content_library_storage_teacher_all
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (bucket_id = 'teacher-content-library')
      WITH CHECK (bucket_id = 'teacher-content-library');
  END IF;
END
$$;
