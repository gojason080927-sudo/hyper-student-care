-- =============================================================================
-- HYPER Student Care — 학교 시험 개인 분석 리포트 v1 (추가 전용)
-- =============================================================================
-- 적용: 원장이 Supabase Dashboard → SQL Editor 에서 직접 실행. 앱이 자동 실행하지 않음.
-- 기존 표·함수는 수정/삭제하지 않는다 (math_monthly_*, get_parent_care_bundle 등 미변경).
-- 선행 조건: students, public.set_updated_at(), public._parent_active_student_id() (기존)
--
-- 구성
--   1) school_exams          : 시험 1건 (학년·학교·시험명·과목·시험일) + 분석 패키지(문항·단원·1등급 완성 문제)
--   2) school_exam_images    : 문항 캡처 (JPEG 800px·품질 70, base64) — 공개 URL 없음, RPC로만 읽음
--   3) school_exam_results   : 학생별 입력 (임시 저장 draft → 발송 sent)
--   4) publish_school_exam_report(exam_id, student_id?)   : 강사 전용 발송
--   5) list_school_exam_push_recipients(exam_id)          : 푸시 수신자 (강사/service_role)
--   6) get_parent_school_exam_reports(access_key)         : 학부모용 — 자기 자녀의 발송된 리포트만
--   7) get_parent_school_exam_images(access_key, exam_id, nos) : 학부모용 — 허용된 캡처만
--
-- 개인정보·이미지 원칙
--   - 세 표는 authenticated(강사)만 접근. anon(학부모)은 표를 직접 읽을 수 없다.
--   - 문항 캡처에는 시험지를 낸 학생의 필기·채점 흔적이 있을 수 있다.
--     school_exams.source_student_id(어느 학생 시험지에서 잘랐는가) / images_clean(필기 없는 깨끗한 원본인가)
--     로 공개 범위를 정한다. 기본값은 "비공개"(images_clean=false, source_student_id=null).
--     학부모에게는 images_clean=true 이거나 source_student_id = 본인 일 때만 이미지를 내려준다.
--   - 이 리포트는 반 평균 등 집계를 학부모에게 반환하지 않는다 (다른 학생 정보 노출 없음).
--   - 학부모 RPC는 자기 자녀의 sent 결과만 반환. 오답 번호 중 + 1등급 완성 문제 캡처만 내려준다.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) 시험
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_exams (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  grade               text          NOT NULL,
  school_name         text          NOT NULL DEFAULT '',          -- 학원 자체 시험이면 빈 문자열
  title               text          NOT NULL,
  subject             text          NOT NULL DEFAULT '수학',
  exam_date           date          NOT NULL,
  author              text          NOT NULL DEFAULT '',          -- 출제/담당 선생님
  range_text          text          NOT NULL DEFAULT '',          -- 시험 범위
  total_points        numeric(7,2)  NOT NULL DEFAULT 100,
  -- [{ "no":1, "kind":"객관식|주관식", "answer":"④", "points":3.33, "difficulty":"하|중|상|최상",
  --    "unit":"...", "type":"...", "key_idea":"...", "common_error":"...", "recommended_cause":"concept|apply|calc|time|" }]
  items               jsonb         NOT NULL DEFAULT '[]'::jsonb,
  -- ["경우의 수", "확률", ...]  (패키지 units 순서)
  units               jsonb         NOT NULL DEFAULT '[]'::jsonb,
  -- [{ "no":14, "why":"...", "idea":"...", "steps":["...", ...] }]
  top_problems        jsonb         NOT NULL DEFAULT '[]'::jsonb,
  source_student_id   uuid          REFERENCES public.students (id) ON DELETE SET NULL,
  images_clean        boolean       NOT NULL DEFAULT false,
  package_imported_at timestamptz,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT school_exams_total_points_check CHECK (total_points > 0)
);

CREATE INDEX IF NOT EXISTS idx_school_exams_date ON public.school_exams (exam_date DESC);

-- ---------------------------------------------------------------------------
-- 2) 문항 캡처 (비공개 — 표 직접 접근은 강사만, 학부모는 RPC로만)
--    Supabase Storage 대신 DB 표에 둔 이유: 학부모는 로그인 없이 access key RPC로만 접근하므로
--    비공개 버킷의 서명 URL을 발급할 주체가 없다. 800px/JPEG 70 압축이라 문항당 약 30~80KB.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_exam_images (
  exam_id     uuid        NOT NULL REFERENCES public.school_exams (id) ON DELETE CASCADE,
  no          integer     NOT NULL,
  data        text        NOT NULL,           -- base64 JPEG (data: 접두어 없음)
  width       integer     NOT NULL,
  height      integer     NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_id, no),
  CONSTRAINT school_exam_images_size_check CHECK (width > 0 AND height > 0)
);

-- ---------------------------------------------------------------------------
-- 3) 학생별 결과
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_exam_results (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          uuid        NOT NULL REFERENCES public.school_exams (id) ON DELETE CASCADE,
  student_id       uuid        NOT NULL REFERENCES public.students (id) ON DELETE CASCADE,
  absent           boolean     NOT NULL DEFAULT false,
  -- [{ "no": 9, "cause": "concept|apply|calc|time", "note": "강사 분석 한 줄" }]
  wrong_items      jsonb       NOT NULL DEFAULT '[]'::jsonb,
  -- 오답 원인·강사 분석(패키지 초안)을 강사가 확인했는가. false 이면 발송되지 않는다.
  cause_confirmed  boolean     NOT NULL DEFAULT false,
  score            integer     NOT NULL DEFAULT 0,
  score_manual     boolean     NOT NULL DEFAULT false,   -- true 이면 강사가 직접 입력한 점수를 유지
  teacher_comment  text        NOT NULL DEFAULT '',
  -- ["경우의 수: 순열·조합 구분 문제 매일 10개", ...]  최대 8개
  next_plan        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  status           text        NOT NULL DEFAULT 'draft',
  sent_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_exam_results_status_check CHECK (status IN ('draft', 'sent')),
  CONSTRAINT school_exam_results_exam_student_unique UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_school_exam_results_student ON public.school_exam_results (student_id);
CREATE INDEX IF NOT EXISTS idx_school_exam_results_exam ON public.school_exam_results (exam_id);

DROP TRIGGER IF EXISTS trg_school_exams_updated_at ON public.school_exams;
CREATE TRIGGER trg_school_exams_updated_at
  BEFORE UPDATE ON public.school_exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_school_exam_results_updated_at ON public.school_exam_results;
CREATE TRIGGER trg_school_exam_results_updated_at
  BEFORE UPDATE ON public.school_exam_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: authenticated(강사)만. anon 정책 없음.
-- ---------------------------------------------------------------------------
ALTER TABLE public.school_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_exam_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_exam_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_school_exams" ON public.school_exams;
CREATE POLICY "authenticated_all_school_exams"
  ON public.school_exams FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_school_exam_images" ON public.school_exam_images;
CREATE POLICY "authenticated_all_school_exam_images"
  ON public.school_exam_images FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all_school_exam_results" ON public.school_exam_results;
CREATE POLICY "authenticated_all_school_exam_results"
  ON public.school_exam_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON public.school_exams FROM PUBLIC, anon;
REVOKE ALL ON public.school_exam_images FROM PUBLIC, anon;
REVOKE ALL ON public.school_exam_results FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_exams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_exam_images TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_exam_results TO authenticated;

-- ---------------------------------------------------------------------------
-- 점수 계산 보조: 맞힌 문항 배점 합계 (소수 배점 → 반올림 정수)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._school_exam_score(p_items jsonb, p_wrong jsonb)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT round(coalesce(sum((i->>'points')::numeric), 0))::int
  FROM jsonb_array_elements(p_items) AS i
  WHERE NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_wrong) AS w
    WHERE (w->>'no')::int = (i->>'no')::int
  );
$$;

REVOKE ALL ON FUNCTION public._school_exam_score(jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._school_exam_score(jsonb, jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) 발송 (강사 전용)
--    - 임시 저장(draft) 중 "오답 원인 확인(cause_confirmed)"이 끝난 결과만 sent 로 바꾼다.
--      확인되지 않은 draft 는 발송하지 않고 skipped_unconfirmed 로 센다.
--    - 이미 발송된 결과는 점수만 다시 계산한다 (score_manual 이면 강사 점수 유지).
--    - p_student_id 를 주면 이미 발송된 그 학생 1명만 다시 반영한다 (발송 후 수정 저장용).
--    - 반환: { "newly_sent": [student_id...], "sent_total": n, "skipped_unconfirmed": n }
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.publish_school_exam_report(p_exam_id uuid, p_student_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam public.school_exams%ROWTYPE;
  v_newly uuid[] := '{}';
  v_sent integer := 0;
  v_skipped integer := 0;
  r record;
  v_score integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_exam FROM public.school_exams WHERE id = p_exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'exam_not_found';
  END IF;
  IF jsonb_array_length(v_exam.items) = 0 THEN
    RAISE EXCEPTION 'exam_has_no_items';
  END IF;

  FOR r IN
    SELECT * FROM public.school_exam_results
    WHERE exam_id = p_exam_id AND absent = false
      AND (p_student_id IS NULL OR (student_id = p_student_id AND status = 'sent'))
  LOOP
    IF r.status <> 'sent' AND NOT r.cause_confirmed THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_score := CASE WHEN r.score_manual THEN r.score
                    ELSE public._school_exam_score(v_exam.items, r.wrong_items) END;

    IF r.status <> 'sent' THEN
      v_newly := array_append(v_newly, r.student_id);
    END IF;

    UPDATE public.school_exam_results
       SET score = v_score,
           status = 'sent',
           sent_at = coalesce(sent_at, now())
     WHERE id = r.id;

    v_sent := v_sent + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'newly_sent', to_jsonb(v_newly),
    'sent_total', v_sent,
    'skipped_unconfirmed', v_skipped
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_school_exam_report(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_school_exam_report(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) 푸시 수신자 (강사 또는 Edge Function(service_role)만)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_school_exam_push_recipients(p_exam_id uuid)
RETURNS TABLE(student_id uuid, access_key text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL AND coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  RETURN QUERY
  SELECT s.id, s.student_access_key
  FROM public.school_exam_results r
  JOIN public.students s ON s.id = r.student_id
  WHERE r.exam_id = p_exam_id
    AND r.status = 'sent'
    AND r.absent = false
    AND coalesce(s.access_key_active, true) = true;
END;
$$;

REVOKE ALL ON FUNCTION public.list_school_exam_push_recipients(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_school_exam_push_recipients(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) 학부모용 — 자기 자녀의 발송된 리포트
--    access key 확인·비활성 키 차단은 기존 _parent_active_student_id 와 동일.
--    이미지는 이 응답에 포함하지 않는다 (images_visible 플래그만). 반 평균·타 학생 정보 없음.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_parent_school_exam_reports(p_access_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_out jsonb := '[]'::jsonb;
  r record;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  FOR r IN
    SELECT e.id AS exam_id, e.grade, e.school_name, e.title, e.subject, e.exam_date,
           e.author, e.range_text, e.total_points, e.items, e.units, e.top_problems,
           (e.images_clean OR e.source_student_id = v_student_id) AS images_visible,
           m.wrong_items, m.score, m.teacher_comment, m.next_plan, m.sent_at
    FROM public.school_exam_results m
    JOIN public.school_exams e ON e.id = m.exam_id
    WHERE m.student_id = v_student_id
      AND m.status = 'sent'
      AND m.absent = false
    ORDER BY e.exam_date DESC, m.sent_at DESC
  LOOP
    v_out := v_out || jsonb_build_array(jsonb_build_object(
      'exam', jsonb_build_object(
        'id', r.exam_id, 'grade', r.grade, 'school_name', r.school_name,
        'title', r.title, 'subject', r.subject, 'exam_date', r.exam_date,
        'author', r.author, 'range_text', r.range_text, 'total_points', r.total_points,
        'items', r.items, 'units', r.units, 'top_problems', r.top_problems,
        'images_visible', r.images_visible
      ),
      'result', jsonb_build_object(
        'score', r.score, 'wrong_items', r.wrong_items,
        'teacher_comment', r.teacher_comment, 'next_plan', r.next_plan,
        'sent_at', r.sent_at
      )
    ));
  END LOOP;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_school_exam_reports(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_school_exam_reports(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7) 학부모용 — 문항 캡처
--    조건: (a) 자기 자녀의 발송된 결과가 있는 시험일 것
--          (b) images_clean = true 이거나 source_student_id = 본인
--          (c) 요청 번호 중 자녀의 오답 번호 + 1등급 완성 문제 번호만
--    조건에 맞지 않으면 빈 배열을 돌려준다 (앱은 "문제 이미지 준비 중" 카드를 보여줌).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_parent_school_exam_images(p_access_key text, p_exam_id uuid, p_nos integer[])
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_exam public.school_exams%ROWTYPE;
  v_result public.school_exam_results%ROWTYPE;
BEGIN
  v_student_id := public._parent_active_student_id(p_access_key);
  IF v_student_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_result FROM public.school_exam_results
   WHERE exam_id = p_exam_id AND student_id = v_student_id AND status = 'sent' AND absent = false;
  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT * INTO v_exam FROM public.school_exams WHERE id = p_exam_id;
  IF NOT FOUND OR NOT (v_exam.images_clean OR v_exam.source_student_id = v_student_id) THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN coalesce((
    SELECT jsonb_agg(jsonb_build_object('no', g.no, 'data', g.data, 'width', g.width, 'height', g.height) ORDER BY g.no)
    FROM public.school_exam_images g
    WHERE g.exam_id = p_exam_id
      AND g.no = ANY (coalesce(p_nos, '{}'::int[]))
      AND (
        EXISTS (SELECT 1 FROM jsonb_array_elements(v_result.wrong_items) w WHERE (w->>'no')::int = g.no)
        OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_exam.top_problems) t WHERE (t->>'no')::int = g.no)
      )
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_parent_school_exam_images(text, uuid, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parent_school_exam_images(text, uuid, integer[]) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
