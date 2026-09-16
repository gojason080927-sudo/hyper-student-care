-- =============================================================================
-- HYPER Student Care — Student Learning Hub V1 (STEP A, additive only)
-- =============================================================================
-- 적용: 사용자 승인 후 Supabase Dashboard → SQL Editor → Run
-- 이 파일은 자동 실행하지 마세요. Production 적용은 사용자 승인 전 금지.
--
-- 금지:
--   DROP/TRUNCATE of existing parent/teacher tables
--   CREATE OR REPLACE of get_parent_care_bundle / submit_parent_question
--   admission-strategy bucket 재사용
--   주간 SUMMARY 계산식 변경
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) questions.source (기존 행 = parent)
-- ---------------------------------------------------------------------------

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'parent';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'questions_source_check'
      AND conrelid = 'public.questions'::regclass
  ) THEN
    ALTER TABLE public.questions
      ADD CONSTRAINT questions_source_check
      CHECK (source IN ('parent', 'student'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_questions_student_source_created
  ON public.questions (student_id, source, created_at DESC);

COMMENT ON COLUMN public.questions.source IS
  'parent = 학부모 상담/질문, student = 학생 Hub 학습 질문. 기존 행 default parent.';

-- ---------------------------------------------------------------------------
-- 2) class_hub_assignments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.class_hub_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade           TEXT NOT NULL,
  class_name      TEXT NOT NULL,
  subject         TEXT NOT NULL DEFAULT '',
  textbook_name   TEXT,
  content         TEXT NOT NULL DEFAULT '',
  due_date        DATE,
  student_id      UUID REFERENCES public.students (id) ON DELETE CASCADE,
  published       BOOLEAN NOT NULL DEFAULT false,
  published_at    TIMESTAMPTZ,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_class_hub_assignments_class_published
  ON public.class_hub_assignments (grade, class_name, published, published_at DESC);

COMMENT ON TABLE public.class_hub_assignments IS
  '학생 Hub 반별 오늘의 과제. class_today_report_common.today_assignment 및 homework 수행상태와 분리.';

DROP TRIGGER IF EXISTS trg_class_hub_assignments_updated_at ON public.class_hub_assignments;
CREATE TRIGGER trg_class_hub_assignments_updated_at
  BEFORE UPDATE ON public.class_hub_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) hub learning materials
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hub_learning_materials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  original_file_name TEXT NOT NULL DEFAULT '',
  source_file_path  TEXT,
  mime              TEXT NOT NULL DEFAULT '',
  kind              TEXT NOT NULL DEFAULT 'file',
  status            TEXT NOT NULL DEFAULT 'DRAFT',
  page_count        INTEGER,
  audience_type     TEXT NOT NULL DEFAULT 'all',
  target_grade      TEXT,
  target_class_name TEXT,
  target_student_id UUID REFERENCES public.students (id) ON DELETE SET NULL,
  published_at      TIMESTAMPTZ,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hub_learning_materials_kind_check
    CHECK (kind IN ('pdf', 'image', 'hwp', 'hwpx', 'docx', 'pptx', 'file')),
  CONSTRAINT hub_learning_materials_status_check
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'HIDDEN')),
  CONSTRAINT hub_learning_materials_audience_check
    CHECK (audience_type IN ('all', 'grade', 'class', 'student'))
);

CREATE INDEX IF NOT EXISTS idx_hub_learning_materials_status
  ON public.hub_learning_materials (status, published_at DESC);

CREATE TABLE IF NOT EXISTS public.hub_learning_material_pages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id  UUID NOT NULL REFERENCES public.hub_learning_materials (id) ON DELETE CASCADE,
  page_number  INTEGER NOT NULL,
  asset_path   TEXT NOT NULL,
  width        INTEGER,
  height       INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (material_id, page_number)
);

DROP TRIGGER IF EXISTS trg_hub_learning_materials_updated_at ON public.hub_learning_materials;
CREATE TRIGGER trg_hub_learning_materials_updated_at
  BEFORE UPDATE ON public.hub_learning_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4) hub_videos (YouTube unlisted metadata only)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hub_videos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  video_url         TEXT NOT NULL,
  video_id          TEXT NOT NULL,
  audience_type     TEXT NOT NULL DEFAULT 'all',
  target_grade      TEXT,
  target_class_name TEXT,
  target_student_id UUID REFERENCES public.students (id) ON DELETE SET NULL,
  published         BOOLEAN NOT NULL DEFAULT false,
  published_at      TIMESTAMPTZ,
  timestamps        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hub_videos_audience_check
    CHECK (audience_type IN ('all', 'grade', 'class', 'student'))
);

ALTER TABLE public.hub_videos
  ADD COLUMN IF NOT EXISTS timestamps JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_hub_videos_published
  ON public.hub_videos (published, published_at DESC);

DROP TRIGGER IF EXISTS trg_hub_videos_updated_at ON public.hub_videos;
CREATE TRIGGER trg_hub_videos_updated_at
  BEFORE UPDATE ON public.hub_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.hub_videos IS
  '학생 Hub 영상 자료실. YouTube unlisted URL/video_id만 저장. unlisted ≠ ACL.';

-- ---------------------------------------------------------------------------
-- 5) question_attachments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.question_attachments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id    UUID NOT NULL REFERENCES public.questions (id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  kind           TEXT NOT NULL,
  storage_path   TEXT NOT NULL,
  mime           TEXT NOT NULL,
  byte_size      INTEGER NOT NULL,
  duration_ms    INTEGER,
  original_name  TEXT NOT NULL DEFAULT '',
  ready          BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT question_attachments_kind_check
    CHECK (kind IN ('image', 'pdf', 'file', 'video')),
  CONSTRAINT question_attachments_size_check
    CHECK (byte_size > 0 AND byte_size <= 52428800)
);

CREATE INDEX IF NOT EXISTS idx_question_attachments_question
  ON public.question_attachments (question_id, created_at);

-- ---------------------------------------------------------------------------
-- 6) student_hub_inbox (자료요청 + 건의, UI는 분리)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.student_hub_inbox (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT '접수',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT student_hub_inbox_kind_check
    CHECK (kind IN ('material_request', 'suggestion')),
  CONSTRAINT student_hub_inbox_status_check
    CHECK (status IN ('접수', '처리중', '완료'))
);

CREATE INDEX IF NOT EXISTS idx_student_hub_inbox_student_kind
  ON public.student_hub_inbox (student_id, kind, created_at DESC);

DROP TRIGGER IF EXISTS trg_student_hub_inbox_updated_at ON public.student_hub_inbox;
CREATE TRIGGER trg_student_hub_inbox_updated_at
  BEFORE UPDATE ON public.student_hub_inbox
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.hub_inbox_attachments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_id       UUID NOT NULL REFERENCES public.student_hub_inbox (id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  storage_path   TEXT NOT NULL,
  mime           TEXT NOT NULL,
  byte_size      INTEGER NOT NULL,
  original_name  TEXT NOT NULL DEFAULT '',
  ready          BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hub_inbox_attachments_size_check
    CHECK (byte_size > 0 AND byte_size <= 10485760)
);

CREATE INDEX IF NOT EXISTS idx_hub_inbox_attachments_inbox
  ON public.hub_inbox_attachments (inbox_id, created_at);

-- ---------------------------------------------------------------------------
-- 7) RLS — anon 직접 테이블 접근 차단, 강사 authenticated CRUD
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'class_hub_assignments',
    'hub_learning_materials',
    'hub_learning_material_pages',
    'hub_videos',
    'question_attachments',
    'student_hub_inbox',
    'hub_inbox_attachments'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authenticated_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t || '_authenticated_all',
      t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 8) audience helper (notices 함수를 REPLACE하지 않음)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._hub_audience_visible(
  p_audience_type text,
  p_target_grade text,
  p_target_class_name text,
  p_target_student_id uuid,
  p_student_id uuid,
  p_grade text,
  p_class_name text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_trimmed text := trim(p_class_name);
  v_target text := trim(coalesce(p_target_class_name, ''));
BEGIN
  IF coalesce(p_audience_type, 'all') = 'all' THEN
    RETURN true;
  END IF;
  IF p_audience_type = 'grade' THEN
    RETURN p_target_grade = p_grade;
  END IF;
  IF p_audience_type = 'student' THEN
    RETURN p_target_student_id = p_student_id;
  END IF;
  IF p_audience_type = 'class' THEN
    IF v_target = v_trimmed THEN
      RETURN true;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM pg_proc
      WHERE proname = '_math_shared_group'
        AND pg_function_is_visible(oid)
    ) AND public._math_shared_group(p_grade, p_target_class_name) IS NOT NULL
      AND public._math_shared_group(p_grade, p_target_class_name)
          = public._math_shared_group(p_grade, v_trimmed)
      AND coalesce(p_target_class_name, '') LIKE '% 수학%'
    THEN
      RETURN true;
    END IF;
    RETURN false;
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public._hub_audience_visible(text, text, text, uuid, uuid, text, text) FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 9) Student Hub RPCs (access_key → student_id, never client student_id)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_student_hub_identity(p_access_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student public.students%ROWTYPE;
BEGIN
  SELECT s.* INTO v_student
  FROM public.students s
  WHERE s.student_access_key = trim(p_access_key)
  LIMIT 1;

  IF v_student.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_student.id,
    'name', v_student.name,
    'school', v_student.school,
    'grade', v_student.grade,
    'class_name', v_student.class_name,
    'access_key_active', coalesce(v_student.access_key_active, true)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_hub_identity(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_hub_identity(text) TO anon;

CREATE OR REPLACE FUNCTION public.get_student_hub_bundle(p_access_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_grade text;
  v_class_name text;
  v_active boolean;
BEGIN
  SELECT s.id, s.grade, trim(s.class_name), coalesce(s.access_key_active, true)
  INTO v_student_id, v_grade, v_class_name, v_active
  FROM public.students s
  WHERE s.student_access_key = trim(p_access_key)
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_active IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'student', public.get_student_hub_identity(p_access_key),
      'inactive', true
    );
  END IF;

  RETURN jsonb_build_object(
    'student', public.get_student_hub_identity(p_access_key),
    'inactive', false,
    'weekly_learning_summaries',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(w) ORDER BY w.week_start DESC)
       FROM public.weekly_learning_summaries w
       WHERE w.student_id = v_student_id),
      '[]'::jsonb
    ),
    'assignments',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(a) ORDER BY a.published_at DESC NULLS LAST, a.created_at DESC)
       FROM public.class_hub_assignments a
       WHERE a.published = true
         AND a.grade = v_grade
         AND trim(a.class_name) = v_class_name
         AND a.student_id IS NULL),
      '[]'::jsonb
    ),
    'materials',
    coalesce(
      (SELECT jsonb_agg(listed.item ORDER BY listed.published_at DESC NULLS LAST)
       FROM (
         SELECT jsonb_build_object(
           'id', m.id,
           'title', m.title,
           'description', m.description,
           'kind', m.kind,
           'original_file_name', m.original_file_name,
           'source_file_path', m.source_file_path,
           'mime', m.mime,
           'page_count', coalesce(m.page_count, 0),
           'published_at', m.published_at,
           'pages', coalesce(
             (
               SELECT jsonb_agg(jsonb_build_object(
                 'page_number', p.page_number,
                 'asset_path', p.asset_path,
                 'width', p.width,
                 'height', p.height
               ) ORDER BY p.page_number)
               FROM public.hub_learning_material_pages p
               WHERE p.material_id = m.id
             ),
             '[]'::jsonb
           )
         ) AS item,
         m.published_at
         FROM public.hub_learning_materials m
         WHERE m.status = 'PUBLISHED'
           AND public._hub_audience_visible(
             m.audience_type, m.target_grade, m.target_class_name, m.target_student_id,
             v_student_id, v_grade, v_class_name
           )
       ) listed),
      '[]'::jsonb
    ),
    'videos',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(v) ORDER BY v.published_at DESC NULLS LAST, v.created_at DESC)
       FROM public.hub_videos v
       WHERE v.published = true
         AND public._hub_audience_visible(
           v.audience_type, v.target_grade, v.target_class_name, v.target_student_id,
           v_student_id, v_grade, v_class_name
         )),
      '[]'::jsonb
    ),
    'questions',
    coalesce(
      (SELECT jsonb_agg(
         jsonb_build_object(
           'id', q.id,
           'date', q.date,
           'category', q.category,
           'title', q.title,
           'content', q.content,
           'answer', q.answer,
           'status', q.status,
           'source', q.source,
           'created_at', q.created_at,
           'updated_at', q.updated_at,
           'attachments', coalesce(
             (
               SELECT jsonb_agg(jsonb_build_object(
                 'id', a.id,
                 'kind', a.kind,
                 'storage_path', a.storage_path,
                 'mime', a.mime,
                 'byte_size', a.byte_size,
                 'duration_ms', a.duration_ms,
                 'original_name', a.original_name,
                 'ready', a.ready
               ) ORDER BY a.created_at)
               FROM public.question_attachments a
               WHERE a.question_id = q.id AND a.student_id = v_student_id
             ),
             '[]'::jsonb
           )
         ) ORDER BY q.created_at DESC)
       FROM public.questions q
       WHERE q.student_id = v_student_id AND q.source = 'student'),
      '[]'::jsonb
    ),
    'inbox',
    coalesce(
      (SELECT jsonb_agg(
         jsonb_build_object(
           'id', i.id,
           'kind', i.kind,
           'title', i.title,
           'content', i.content,
           'status', i.status,
           'created_at', i.created_at,
           'attachments', coalesce(
             (
               SELECT jsonb_agg(jsonb_build_object(
                 'id', a.id,
                 'storage_path', a.storage_path,
                 'mime', a.mime,
                 'byte_size', a.byte_size,
                 'original_name', a.original_name,
                 'ready', a.ready
               ) ORDER BY a.created_at)
               FROM public.hub_inbox_attachments a
               WHERE a.inbox_id = i.id AND a.student_id = v_student_id
             ),
             '[]'::jsonb
           )
         ) ORDER BY i.created_at DESC)
       FROM public.student_hub_inbox i
       WHERE i.student_id = v_student_id),
      '[]'::jsonb
    ),
    'class_schedule_grids',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(g) ORDER BY g.class_name)
       FROM public.class_schedule_grids g
       WHERE public._schedule_grid_visible_to_student(g, v_grade, v_class_name)),
      '[]'::jsonb
    ),
    'notices',
    coalesce(
      (SELECT jsonb_agg(to_jsonb(n) ORDER BY n.is_pinned DESC, n.published_at DESC NULLS LAST)
       FROM public.notices n
       WHERE public._notice_visible_to_student(n, v_student_id, v_grade, v_class_name)),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_student_hub_bundle(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_hub_bundle(text) TO anon;

CREATE OR REPLACE FUNCTION public.submit_student_question(
  p_access_key text,
  p_date date,
  p_category text,
  p_title text,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_row public.questions;
  v_recent integer;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;

  IF trim(coalesce(p_title, '')) = '' OR trim(coalesce(p_content, '')) = '' THEN
    RAISE EXCEPTION 'title and content are required';
  END IF;

  IF trim(coalesce(p_category, '')) NOT IN ('수업질문', '숙제질문', '시험질문', '기타') THEN
    RAISE EXCEPTION 'invalid category';
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.questions q
  WHERE q.student_id = v_student_id
    AND q.source = 'student'
    AND q.created_at > now() - interval '10 minutes';
  IF v_recent >= 10 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  INSERT INTO public.questions (
    id, student_id, date, category, title, content, answer,
    question_images, answer_images, status, source, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_student_id,
    p_date,
    trim(p_category),
    trim(p_title),
    trim(p_content),
    '',
    '[]'::jsonb,
    '[]'::jsonb,
    '답변대기',
    'student',
    now(),
    now()
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_student_question(text, date, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_student_question(text, date, text, text, text) TO anon;

CREATE OR REPLACE FUNCTION public.prepare_hub_question_attachment(
  p_access_key text,
  p_question_id uuid,
  p_kind text,
  p_mime text,
  p_byte_size integer,
  p_original_name text,
  p_duration_ms integer,
  p_ext text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_count integer;
  v_video_count integer;
  v_id uuid;
  v_path text;
  v_ext text;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.questions q
    WHERE q.id = p_question_id AND q.student_id = v_student_id AND q.source = 'student'
  ) THEN
    RAISE EXCEPTION 'question_not_found';
  END IF;

  IF p_kind NOT IN ('image', 'pdf', 'file', 'video') THEN
    RAISE EXCEPTION 'invalid_kind';
  END IF;

  IF p_byte_size IS NULL OR p_byte_size <= 0 THEN
    RAISE EXCEPTION 'invalid_size';
  END IF;

  IF p_kind = 'image' AND p_byte_size > 5242880 THEN
    RAISE EXCEPTION 'file_too_large';
  END IF;
  IF p_kind IN ('pdf', 'file') AND p_byte_size > 10485760 THEN
    RAISE EXCEPTION 'file_too_large';
  END IF;
  IF p_kind = 'video' AND p_byte_size > 41943040 THEN
    RAISE EXCEPTION 'file_too_large';
  END IF;
  IF p_kind = 'video' AND coalesce(p_duration_ms, 0) > 60000 THEN
    RAISE EXCEPTION 'video_too_long';
  END IF;

  IF p_kind = 'image' AND p_mime NOT IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif') THEN
    RAISE EXCEPTION 'invalid_mime';
  END IF;
  IF p_kind = 'pdf' AND p_mime <> 'application/pdf' THEN
    RAISE EXCEPTION 'invalid_mime';
  END IF;
  IF p_kind = 'video' AND p_mime NOT IN ('video/mp4', 'video/quicktime', 'video/webm') THEN
    RAISE EXCEPTION 'invalid_mime';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.question_attachments a
  WHERE a.question_id = p_question_id;
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'too_many_attachments';
  END IF;

  IF p_kind = 'video' THEN
    SELECT count(*) INTO v_video_count
    FROM public.question_attachments a
    WHERE a.question_id = p_question_id AND a.kind = 'video';
    IF v_video_count >= 1 THEN
      RAISE EXCEPTION 'video_limit';
    END IF;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.question_attachments a
  WHERE a.student_id = v_student_id
    AND a.created_at > now() - interval '10 minutes';
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  v_ext := lower(regexp_replace(coalesce(p_ext, ''), '[^a-z0-9]', '', 'g'));
  IF v_ext = '' THEN
    v_ext := 'bin';
  END IF;
  IF char_length(v_ext) > 8 THEN
    RAISE EXCEPTION 'invalid_ext';
  END IF;

  v_id := gen_random_uuid();
  v_path := v_student_id::text || '/' || p_question_id::text || '/' || v_id::text || '.' || v_ext;

  INSERT INTO public.question_attachments (
    id, question_id, student_id, kind, storage_path, mime, byte_size,
    duration_ms, original_name, ready
  ) VALUES (
    v_id, p_question_id, v_student_id, p_kind, v_path, p_mime, p_byte_size,
    p_duration_ms, left(trim(coalesce(p_original_name, '')), 200), false
  );

  RETURN jsonb_build_object(
    'id', v_id,
    'storage_path', v_path,
    'bucket', 'hub-question-attachments'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_hub_question_attachment(text, uuid, text, text, integer, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_hub_question_attachment(text, uuid, text, text, integer, text, integer, text) TO anon;

CREATE OR REPLACE FUNCTION public.finalize_hub_question_attachment(
  p_access_key text,
  p_attachment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_row public.question_attachments;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;

  UPDATE public.question_attachments
  SET ready = true
  WHERE id = p_attachment_id AND student_id = v_student_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'attachment_not_found';
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_hub_question_attachment(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_hub_question_attachment(text, uuid) TO anon;

CREATE OR REPLACE FUNCTION public.submit_student_hub_inbox(
  p_access_key text,
  p_kind text,
  p_title text,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_row public.student_hub_inbox;
  v_recent integer;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;

  IF p_kind NOT IN ('material_request', 'suggestion') THEN
    RAISE EXCEPTION 'invalid_kind';
  END IF;
  IF trim(coalesce(p_content, '')) = '' THEN
    RAISE EXCEPTION 'content_required';
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.student_hub_inbox i
  WHERE i.student_id = v_student_id
    AND i.created_at > now() - interval '10 minutes';
  IF v_recent >= 5 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  INSERT INTO public.student_hub_inbox (
    id, student_id, kind, title, content, status
  ) VALUES (
    gen_random_uuid(),
    v_student_id,
    p_kind,
    left(trim(coalesce(p_title, '')), 200),
    trim(p_content),
    '접수'
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_student_hub_inbox(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_student_hub_inbox(text, text, text, text) TO anon;

CREATE OR REPLACE FUNCTION public.prepare_hub_inbox_attachment(
  p_access_key text,
  p_inbox_id uuid,
  p_mime text,
  p_byte_size integer,
  p_original_name text,
  p_ext text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_kind text;
  v_count integer;
  v_id uuid;
  v_path text;
  v_ext text;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;

  SELECT i.kind INTO v_kind
  FROM public.student_hub_inbox i
  WHERE i.id = p_inbox_id AND i.student_id = v_student_id;
  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'inbox_not_found';
  END IF;
  IF v_kind <> 'material_request' THEN
    RAISE EXCEPTION 'images_not_allowed';
  END IF;
  IF p_mime NOT IN ('image/jpeg', 'image/png', 'image/webp', 'image/gif') THEN
    RAISE EXCEPTION 'invalid_mime';
  END IF;
  IF p_byte_size IS NULL OR p_byte_size <= 0 OR p_byte_size > 5242880 THEN
    RAISE EXCEPTION 'file_too_large';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.hub_inbox_attachments a
  WHERE a.inbox_id = p_inbox_id;
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'too_many_attachments';
  END IF;

  v_ext := lower(regexp_replace(coalesce(p_ext, ''), '[^a-z0-9]', '', 'g'));
  IF v_ext = '' THEN v_ext := 'jpg'; END IF;

  v_id := gen_random_uuid();
  v_path := v_student_id::text || '/inbox/' || p_inbox_id::text || '/' || v_id::text || '.' || v_ext;

  INSERT INTO public.hub_inbox_attachments (
    id, inbox_id, student_id, storage_path, mime, byte_size, original_name, ready
  ) VALUES (
    v_id, p_inbox_id, v_student_id, v_path, p_mime, p_byte_size,
    left(trim(coalesce(p_original_name, '')), 200), false
  );

  RETURN jsonb_build_object(
    'id', v_id,
    'storage_path', v_path,
    'bucket', 'hub-question-attachments'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_hub_inbox_attachment(text, uuid, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_hub_inbox_attachment(text, uuid, text, integer, text, text) TO anon;

CREATE OR REPLACE FUNCTION public.finalize_hub_inbox_attachment(
  p_access_key text,
  p_attachment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_row public.hub_inbox_attachments;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'invalid or inactive access key';
  END IF;

  UPDATE public.hub_inbox_attachments
  SET ready = true
  WHERE id = p_attachment_id AND student_id = v_student_id
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'attachment_not_found';
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_hub_inbox_attachment(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_hub_inbox_attachment(text, uuid) TO anon;

CREATE OR REPLACE FUNCTION public.authorize_hub_storage_path(
  p_access_key text,
  p_bucket text,
  p_path text,
  p_mode text
)
RETURNS boolean
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
    RETURN false;
  END IF;
  IF p_mode NOT IN ('upload', 'download') THEN
    RETURN false;
  END IF;
  IF p_bucket = 'hub-question-attachments' THEN
    IF p_mode = 'upload' THEN
      RETURN EXISTS (
        SELECT 1 FROM public.question_attachments a
        WHERE a.student_id = v_student_id AND a.storage_path = p_path
      ) OR EXISTS (
        SELECT 1 FROM public.hub_inbox_attachments a
        WHERE a.student_id = v_student_id AND a.storage_path = p_path
      );
    END IF;
    RETURN EXISTS (
      SELECT 1 FROM public.question_attachments a
      WHERE a.student_id = v_student_id AND a.storage_path = p_path AND a.ready = true
    ) OR EXISTS (
      SELECT 1 FROM public.hub_inbox_attachments a
      WHERE a.student_id = v_student_id AND a.storage_path = p_path AND a.ready = true
    );
  END IF;
  IF p_bucket = 'hub-learning-materials' AND p_mode = 'download' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.hub_learning_materials m
      JOIN public.students s ON s.id = v_student_id
      WHERE m.status = 'PUBLISHED'
        AND (
          m.source_file_path = p_path
          OR EXISTS (
            SELECT 1 FROM public.hub_learning_material_pages p
            WHERE p.material_id = m.id AND p.asset_path = p_path
          )
        )
        AND public._hub_audience_visible(
          m.audience_type, m.target_grade, m.target_class_name, m.target_student_id,
          v_student_id, s.grade, trim(s.class_name)
        )
    );
  END IF;
  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.authorize_hub_storage_path(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authorize_hub_storage_path(text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.authorize_hub_storage_path(text, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 10) Storage buckets (admission-strategy 와 분리)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hub-learning-materials',
  'hub-learning-materials',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/x-hwp',
    'application/haansofthwp',
    'application/vnd.hancom.hwp',
    'application/vnd.hancom.hwpx',
    'application/hwpx',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 52428800
WHERE id = 'hub-learning-materials';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hub-question-attachments',
  'hub-question-attachments',
  false,
  52428800,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/x-hwp',
    'application/haansofthwp',
    'application/vnd.hancom.hwp',
    'application/vnd.hancom.hwpx',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 52428800
WHERE id = 'hub-question-attachments';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'hub_learning_materials_teacher_all'
  ) THEN
    CREATE POLICY hub_learning_materials_teacher_all
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (bucket_id = 'hub-learning-materials')
      WITH CHECK (bucket_id = 'hub-learning-materials');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'hub_question_attachments_teacher_all'
  ) THEN
    CREATE POLICY hub_question_attachments_teacher_all
      ON storage.objects
      FOR ALL
      TO authenticated
      USING (bucket_id = 'hub-question-attachments')
      WITH CHECK (bucket_id = 'hub-question-attachments');
  END IF;

  -- 학생 anon INSERT 없음. published 자료 pages 만 SELECT (signed URL용)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'hub_learning_materials_student_published_pages'
  ) THEN
    CREATE POLICY hub_learning_materials_student_published_pages
      ON storage.objects
      FOR SELECT
      TO anon
      USING (
        bucket_id = 'hub-learning-materials'
        AND name LIKE '%/pages/%'
        AND EXISTS (
          SELECT 1 FROM public.hub_learning_materials m
          WHERE m.status = 'PUBLISHED'
            AND m.id::text = split_part(name, '/', 1)
        )
      );
  END IF;
END $$;
