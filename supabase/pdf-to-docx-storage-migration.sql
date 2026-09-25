-- =============================================================================
-- HYPER Student Care — PDF → DOCX 변환 (강사 전용 스토리지 버킷)
-- =============================================================================
-- 적용: 사용자 승인 후 Supabase Dashboard → SQL Editor → Run
-- 이 파일은 자동 실행하지 마세요. Production 적용/merge는 사용자 승인 전 금지.
--
-- 목적:
--   강사가 업로드한 원본 PDF와, Adobe PDF Services로 변환한 결과 DOCX를
--   같은 버킷에 보관한다. 로그인한 강사만 업로드/열람/삭제 가능.
--
-- 금지:
--   DROP/TRUNCATE of existing parent/teacher/hub tables
--   CREATE OR REPLACE of get_parent_care_bundle / get_student_hub_bundle
--   teacher-content-library / admission-strategy / hub-* bucket 재사용
--   anon GRANT / anon storage policy / parent RPC
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-to-docx',
  'pdf-to-docx',
  false,
  104857600, -- 100MB (Adobe PDF Services 문서 크기 한도와 동일)
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
WHERE id = 'pdf-to-docx';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'pdf_to_docx_storage_teacher_all'
  ) THEN
    CREATE POLICY pdf_to_docx_storage_teacher_all
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (bucket_id = 'pdf-to-docx')
      WITH CHECK (bucket_id = 'pdf-to-docx');
  END IF;
END
$$;

-- 참고: 변환된 파일을 무기한 보관할 필요는 없다.
-- 스토리지 용량 관리가 필요해지면, Supabase Dashboard → Storage →
-- pdf-to-docx 버킷에 수명주기(lifecycle) 정책을 추가하거나
-- 주기적으로 오래된 객체를 수동/스케줄 작업으로 정리한다.
