-- Additive V2 question seed. V1 1-88 text/display_order are not updated.
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (1, '기계나 전자제품이 어떤 원리로 작동하는지 직접 살펴보는 것이 재미있다.', 'riasec', 'R', 1, 1, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (2, '말로만 설명을 듣는 것보다 직접 만들거나 조립하면서 배우는 것이 좋다.', 'riasec', 'R', 8, 8, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (3, '도구나 장비를 이용해 무언가를 고치거나 만들어 보고 싶다.', 'riasec', 'R', 15, 15, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (4, '책상에 오래 앉아 있는 활동보다 몸을 움직이며 직접 해보는 활동이 좋다.', 'riasec', 'R', 22, 22, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (5, '눈에 보이는 결과물이 만들어지는 활동에서 성취감을 느낀다.', 'riasec', 'R', 29, 29, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (6, '어떤 현상이 왜 일어나는지 원인을 알아내는 과정이 재미있다.', 'riasec', 'I', 35, 36, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (7, '어려운 문제라도 원리를 이해할 때까지 생각해 보는 편이다.', 'riasec', 'I', 41, 43, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (8, '자료나 정보를 분석하여 규칙이나 공통점을 찾아내는 것을 좋아한다.', 'riasec', 'I', 47, 50, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (9, '과학적 현상이나 새로운 기술에 관한 내용을 찾아보는 것이 흥미롭다.', 'riasec', 'I', 53, 57, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (10, '정답을 외우는 것보다 그 답이 나오는 이유를 이해하는 것이 중요하다.', 'riasec', 'I', 57, 64, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (11, '그림·영상·음악·글 등을 통해 내 생각이나 느낌을 표현하는 것을 좋아한다.', 'riasec', 'A', 61, 71, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (12, '정해진 방식보다 나만의 방식으로 과제를 해보고 싶을 때가 많다.', 'riasec', 'A', 64, 78, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (13, '새로운 아이디어를 떠올리고 그것을 구체적인 결과물로 만드는 것이 재미있다.', 'riasec', 'A', 67, 85, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (14, '디자인이나 색상·구성·표현 방식의 차이를 비교해 보는 것이 흥미롭다.', 'riasec', 'A', 69, 90, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (15, '이야기나 콘텐츠를 직접 기획하거나 만들어 보고 싶다.', 'riasec', 'A', 71, 95, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (16, '다른 사람이 어려워하는 내용을 이해하도록 설명해 주는 것이 좋다.', 'riasec', 'S', 73, 100, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (17, '친구가 고민할 때 이야기를 듣고 해결 방법을 함께 찾아주는 편이다.', 'riasec', 'S', 75, 105, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (18, '다른 사람의 성장이나 발전에 도움을 주는 활동에서 보람을 느낀다.', 'riasec', 'S', 76, 108, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (19, '여러 사람과 협력해서 공동의 목표를 이루는 활동을 좋아한다.', 'riasec', 'S', 77, 111, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (20, '사람들의 생각이나 감정을 이해하는 것에 관심이 많다.', 'riasec', 'S', 78, 113, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (21, '여러 사람 앞에서 내 의견을 제시하고 설득하는 것을 해보고 싶다.', 'riasec', 'E', 79, 115, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (22, '내가 아이디어를 내고 사람들을 이끌어 결과를 만들어 내는 활동이 좋다.', 'riasec', 'E', 80, 117, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (23, '새로운 사업이나 서비스를 기획하는 일에 흥미를 느낀다.', 'riasec', 'E', 81, 119, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (24, '경쟁이 있는 상황에서 좋은 결과를 얻기 위해 노력하는 것이 싫지 않다.', 'riasec', 'E', 82, 121, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (25, '사람들과 협상하거나 의견을 조정하여 원하는 결과를 만드는 일에 관심이 있다.', 'riasec', 'E', 83, 123, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (26, '자료나 정보를 일정한 기준에 따라 정확하게 정리하는 것을 좋아한다.', 'riasec', 'C', 84, 124, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (27, '해야 할 일을 순서대로 계획하고 하나씩 처리하는 편이다.', 'riasec', 'C', 85, 125, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (28, '숫자나 기록에서 잘못된 부분을 찾아내는 작업을 비교적 잘 견딘다.', 'riasec', 'C', 86, 126, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (29, '규칙과 기준이 명확한 일을 할 때 편안함을 느낀다.', 'riasec', 'C', 87, 127, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (30, '중요한 자료를 체계적으로 관리하고 정리하는 역할을 맡아도 괜찮다.', 'riasec', 'C', 88, 128, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (31, '글을 읽고 핵심 내용을 비교적 빠르게 파악하는 편이다.', 'strength', 'VER', 2, 2, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (32, '내 생각을 말이나 글로 논리적으로 설명하는 편이다.', 'strength', 'VER', 9, 9, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (33, '숫자나 수량의 관계를 이해하는 것이 비교적 빠르다.', 'strength', 'NUM', 16, 16, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (34, '계산이나 수학적 정보를 다룰 때 실수를 잘 찾아내는 편이다.', 'strength', 'NUM', 23, 23, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (35, '복잡한 문제를 여러 단계로 나누어 생각하는 편이다.', 'strength', 'LOG', 30, 30, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (36, '여러 정보 사이의 원인과 결과 관계를 잘 찾아내는 편이다.', 'strength', 'LOG', 36, 37, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (37, '도형이나 물체의 모양을 머릿속에서 돌려 생각하는 것이 어렵지 않다.', 'strength', 'SPA', 42, 44, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (38, '지도·도면·그래프처럼 시각적으로 표현된 정보를 잘 이해하는 편이다.', 'strength', 'SPA', 48, 51, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (39, '새로운 아이디어나 남들과 다른 해결 방법을 자주 생각해 낸다.', 'strength', 'CRE', 54, 58, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (40, '하나의 문제에 대해 여러 가지 가능성을 생각해 보는 편이다.', 'strength', 'CRE', 58, 65, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (41, '상대방의 표정이나 말투를 보고 기분이나 의도를 비교적 잘 알아차린다.', 'strength', 'INT', 62, 72, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (42, '사람마다 다른 의견을 조정하는 역할을 비교적 잘한다.', 'strength', 'INT', 65, 79, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (43, '관찰한 내용을 세부적인 부분까지 기억하는 편이다.', 'strength', 'OBS', 68, 86, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (44, '작은 차이나 변화도 비교적 잘 발견하는 편이다.', 'strength', 'OBS', 70, 91, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (45, '새로운 사용법이나 작업 방법을 직접 해보면서 빨리 익히는 편이다.', 'strength', 'PRA', 72, 96, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (46, '배운 내용을 실제 상황에 적용하는 방법을 비교적 잘 찾아낸다.', 'strength', 'PRA', 74, 101, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (47, '직업을 선택할 때 안정적으로 오래 일할 수 있는지가 중요하다.', 'value', 'STABILITY', 3, 3, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (48, '노력과 성과에 따라 높은 보상을 받을 수 있는 직업에 끌린다.', 'value', 'REWARD', 10, 10, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (49, '어려운 목표에 도전하여 큰 성취를 이루는 것이 중요하다.', 'value', 'ACHIEVEMENT', 17, 17, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (50, '다른 사람이나 사회에 도움이 되는 일을 하고 싶다.', 'value', 'CONTRIBUTION', 24, 24, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (51, '내가 원하는 방식으로 판단하고 결정할 수 있는 일이 좋다.', 'value', 'AUTONOMY', 31, 31, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (52, '새로운 것을 배우면서 계속 성장할 수 있는 직업을 원한다.', 'value', 'GROWTH', 37, 38, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (53, '사회적으로 전문성을 인정받을 수 있는 일을 하고 싶다.', 'value', 'RECOGNITION', 43, 45, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (54, '일뿐 아니라 개인 생활을 충분히 가질 수 있는 것이 중요하다.', 'value', 'BALANCE', 49, 52, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (55, '새로운 아이디어를 자유롭게 시도할 수 있는 환경에서 일하고 싶다.', 'value', 'CREATIVITY', 55, 59, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (56, '다양한 사람과 함께 일하고 교류할 수 있는 직업이 좋다.', 'value', 'RELATIONSHIP', 59, 66, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (57, '책임과 권한을 가지고 중요한 결정을 내리는 역할을 맡고 싶다.', 'value', 'INFLUENCE', 63, 73, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (58, '사회가 변화하더라도 꾸준히 필요로 하는 전문성을 갖고 싶다.', 'value', 'EXPERTISE', 66, 80, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (59, '해야 할 일이 생기면 먼저 순서와 방법을 정하는 편이다.', 'behavior', 'PLANNING', 4, 4, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (60, '한번 시작한 일은 어려움이 있어도 끝까지 해보려고 한다.', 'behavior', 'PERSISTENCE', 11, 11, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (61, '중요한 일을 마치기 전에 빠뜨린 것이 없는지 확인하는 편이다.', 'behavior', 'CAREFULNESS', 18, 18, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (62, '처음 만나는 사람과도 필요하면 먼저 대화를 시작할 수 있다.', 'behavior', 'SOCIABILITY', 25, 25, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (63, '여러 사람이 함께 일할 때 내 역할을 책임지고 수행한다.', 'behavior', 'COOPERATION', 32, 32, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (64, '예상하지 못한 변화가 생겨도 새로운 방법을 찾아 적응하는 편이다.', 'behavior', 'ADAPTABILITY', 38, 39, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (65, '필요한 상황에서는 다른 사람보다 먼저 나서서 일을 시작한다.', 'behavior', 'INITIATIVE', 44, 46, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (66, '감정이 상하는 일이 있어도 해야 할 일에 다시 집중하려고 한다.', 'behavior', 'SELF_CONTROL', 50, 53, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (67, '중요한 결정을 내리기 전에 여러 가능성을 생각해 보는 편이다.', 'behavior', 'DELIBERATION', 56, 60, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (68, '목표를 정하면 실제 행동으로 옮기려고 노력한다.', 'behavior', 'EXECUTION', 60, 67, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (69, '처음 접하는 과제라도 방법을 찾으면 해낼 수 있다고 생각한다.', 'efficacy', 'SE', 5, 5, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (70, '어려운 문제가 생겨도 해결 방법을 찾아볼 자신이 있다.', 'efficacy', 'SE', 12, 12, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (71, '처음에는 잘하지 못하더라도 연습하면 실력이 좋아질 수 있다고 생각한다.', 'efficacy', 'SE', 19, 19, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (72, '새로운 분야를 배워야 할 때도 충분히 따라갈 수 있다고 생각한다.', 'efficacy', 'SE', 26, 26, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (73, '실패하더라도 원인을 찾아 다시 시도할 수 있다.', 'efficacy', 'SE', 33, 33, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (74, '목표가 생기면 필요한 방법을 찾아 실행할 수 있다고 생각한다.', 'efficacy', 'SE', 39, 40, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (75, '다른 사람의 도움 없이도 내가 할 수 있는 부분부터 시작할 수 있다.', 'efficacy', 'SE', 45, 47, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (76, '예상보다 어려운 일이 생겨도 쉽게 포기하지 않을 자신이 있다.', 'efficacy', 'SE', 51, 54, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (77, '어려운 문제를 만나면 먼저 무엇을 묻는 문제인지 정리한다.', 'problem_solving', 'ANALYSIS', 6, 6, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (78, '한 가지 방법으로 해결되지 않으면 다른 방법을 찾아본다.', 'problem_solving', 'FLEXIBILITY', 13, 13, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (79, '새로운 내용을 배울 때 기존에 알고 있던 내용과 연결해 생각한다.', 'problem_solving', 'CONNECTION', 20, 20, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (80, '문제를 해결한 뒤 내가 사용한 방법이 적절했는지 돌아보는 편이다.', 'problem_solving', 'REFLECTION', 27, 27, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (81, '필요한 정보가 부족하면 책이나 인터넷 등에서 추가 정보를 찾아본다.', 'problem_solving', 'EXPLORATION', 34, 34, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (82, '복잡한 과제는 작은 단계로 나누어 해결하는 편이다.', 'problem_solving', 'STRUCTURING', 40, 41, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (83, '여러 해결 방법이 있다면 각각의 장단점을 비교해 본다.', 'problem_solving', 'COMPARISON', 46, 48, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (84, '틀린 문제는 정답만 확인하기보다 왜 틀렸는지 알아보려고 한다.', 'problem_solving', 'ERROR_ANALYSIS', 52, 55, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (85, '내가 좋아하는 것과 잘하는 것이 무엇인지 어느 정도 알고 있다.', 'career_readiness', 'SELF_UNDERSTANDING', 7, 7, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (86, '관심 있는 학과나 직업에 대해 스스로 정보를 찾아본 경험이 있다.', 'career_readiness', 'CAREER_EXPLORATION', 14, 14, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (87, '진로를 선택할 때 무엇을 중요하게 생각해야 하는지 어느 정도 알고 있다.', 'career_readiness', 'DECISION_CRITERIA', 21, 21, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (88, '아직 진로가 확실하지 않더라도 앞으로 어떻게 탐색해야 할지 알고 있다.', 'career_readiness', 'EXPLORATION_READINESS', 28, 28, 'HYPER_CAREER_V1', true)
      ON CONFLICT (question_number) DO UPDATE
        SET display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (89, '설계도나 설명서를 보고 실제로 조립하거나 설치해 보는 활동에 흥미가 있다.', 'riasec', 'R', 89, 129, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (90, '기계나 장비가 제대로 움직이는지 직접 조작해 보며 확인하는 일이 재미있다.', 'riasec', 'R', 90, 130, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (91, '서로 다른 자료를 나란히 놓고 공통점이나 원인을 찾아내는 과정이 흥미롭다.', 'riasec', 'I', 91, 131, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (92, '예상과 다른 결과가 나오면 왜 그런 결과가 나왔는지 알아보고 싶어진다.', 'riasec', 'I', 92, 132, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (93, '평범한 아이디어를 새로운 방식으로 바꾸어 표현하는 활동이 재미있다.', 'riasec', 'A', 93, 133, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (94, '분위기나 느낌을 살릴 수 있도록 구성이나 연출을 고민하는 것을 좋아한다.', 'riasec', 'A', 94, 134, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (95, '친구가 이해하지 못한 내용을 설명해 주었을 때 보람을 느낀다.', 'riasec', 'S', 95, 135, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (96, '여러 사람이 함께 잘할 수 있도록 옆에서 돕는 역할에 관심이 있다.', 'riasec', 'S', 96, 136, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (97, '팀 활동에서 목표를 정하거나 방향을 제안하는 역할을 맡는 것이 싫지 않다.', 'riasec', 'E', 97, 137, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (98, '내가 생각한 아이디어의 장점을 다른 사람에게 설명하고 설득하는 것을 좋아한다.', 'riasec', 'E', 98, 138, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (99, '복잡한 자료를 기준에 맞게 분류하고 정리하는 활동이 잘 맞는 편이다.', 'riasec', 'C', 99, 139, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (100, '해야 할 일이나 정보를 빠뜨리지 않도록 체계적으로 관리하는 것을 좋아한다.', 'riasec', 'C', 100, 140, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (101, '복잡한 내용을 다른 사람이 이해하기 쉽게 말이나 글로 정리하는 편이다.', 'strength', 'VER', 101, 106, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (102, '숫자로 제시된 자료에서 변화나 규칙을 비교적 잘 찾아내는 편이다.', 'strength', 'NUM', 102, 109, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (103, '여러 조건이 주어지면 서로 어떤 관계가 있는지 따져보는 편이다.', 'strength', 'LOG', 103, 112, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (104, '그림이나 도형을 보고 위치나 구조가 어떻게 연결되는지 파악하는 편이다.', 'strength', 'SPA', 104, 114, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (105, '한 가지 방법이 잘 되지 않으면 다른 방법을 새롭게 생각해 보는 편이다.', 'strength', 'CRE', 105, 116, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (106, '서로 의견이 다른 사람들 사이에서 각자의 입장을 이해하는 편이다.', 'strength', 'INT', 106, 118, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (107, '여러 대상이 섞여 있을 때 세부적인 차이를 비교적 잘 구분한다.', 'strength', 'OBS', 107, 120, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (108, '글로 된 설명보다 직접 조작해 보면서 익히는 것이 더 빠른 편이다.', 'strength', 'PRA', 108, 122, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (109, '노력한 만큼 뚜렷한 결과나 성과를 확인할 수 있는 일을 하고 싶다.', 'value', 'ACHIEVEMENT', 109, 87, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (110, '내가 하는 일이 다른 사람이나 사회에 실제 도움이 되는 것이 중요하다.', 'value', 'CONTRIBUTION', 110, 92, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (111, '세부적인 방법을 모두 지시받기보다 스스로 판단할 수 있는 일을 선호한다.', 'value', 'AUTONOMY', 111, 97, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (112, '익숙한 일만 반복하기보다 새로운 지식과 기술을 계속 배울 수 있는 직업을 원한다.', 'value', 'GROWTH', 112, 102, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (113, '일을 잘하면서도 휴식과 개인 시간을 지킬 수 있는 것이 중요하다.', 'value', 'BALANCE', 113, 107, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (114, '한 분야를 깊이 공부하여 전문적인 지식이나 기술을 갖추고 싶다.', 'value', 'EXPERTISE', 114, 110, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (115, '해야 할 일이 여러 개라면 우선순위를 정한 뒤 시작하는 편이다.', 'behavior', 'PLANNING', 115, 74, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (116, '처음 생각한 방법이 실패해도 다른 방법을 찾아 다시 시도하는 편이다.', 'behavior', 'PERSISTENCE', 116, 81, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (117, '팀 활동에서는 내 역할뿐 아니라 전체 진행 상황도 살피는 편이다.', 'behavior', 'COOPERATION', 117, 88, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (118, '계획이 바뀌어도 새로운 조건에 맞춰 다시 정리한 뒤 움직이는 편이다.', 'behavior', 'ADAPTABILITY', 118, 93, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (119, '해야 할 일이 있을 때 하고 싶은 일을 잠시 미룰 수 있는 편이다.', 'behavior', 'SELF_CONTROL', 119, 98, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (120, '좋은 생각이 떠오르면 생각만 하기보다 실제 행동으로 옮기는 편이다.', 'behavior', 'EXECUTION', 120, 103, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (121, '어려운 과제가 주어져도 필요한 방법을 새로 배우면 해결할 수 있다고 생각한다.', 'efficacy', 'SE', 121, 61, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (122, '아직 익숙하지 않은 일이라도 반복해서 연습하면 점점 잘할 수 있다고 생각한다.', 'efficacy', 'SE', 122, 68, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (123, '진로와 관련해 새로운 활동에 도전할 수 있다고 생각한다.', 'efficacy', 'SE', 123, 75, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (124, '예상하지 못한 문제가 생겨도 해결 방법을 찾아볼 수 있다고 생각한다.', 'efficacy', 'SE', 124, 82, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (125, '복잡한 문제에서는 주어진 조건과 구해야 할 것을 먼저 구분하는 편이다.', 'problem_solving', 'ANALYSIS', 125, 62, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (126, '처음 생각한 풀이가 막히면 문제의 다른 측면부터 다시 살펴보는 편이다.', 'problem_solving', 'FLEXIBILITY', 126, 69, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (127, '수업에서 배운 내용을 다른 과목이나 일상 상황에 연결해 이해하려고 한다.', 'problem_solving', 'CONNECTION', 127, 76, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (128, '과제를 마친 뒤 내가 사용한 방법이 효율적이었는지 돌아보는 편이다.', 'problem_solving', 'REFLECTION', 128, 83, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (129, '모르는 내용이 생기면 필요한 정보를 어디에서 찾을지 먼저 생각한다.', 'problem_solving', 'EXPLORATION', 129, 89, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (130, '많은 정보를 접하면 중요한 내용과 세부 내용을 구분해서 정리한다.', 'problem_solving', 'STRUCTURING', 130, 94, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (131, '여러 방법이 있을 때 시간과 정확도를 기준으로 더 나은 쪽을 고르는 편이다.', 'problem_solving', 'COMPARISON', 131, 99, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (132, '틀린 부분은 어느 단계에서 잘못 생각했는지 표시해 두는 편이다.', 'problem_solving', 'ERROR_ANALYSIS', 132, 104, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (133, '어떤 활동을 할 때 내가 가장 몰입하는지 어느 정도 알고 있다.', 'career_readiness', 'SELF_UNDERSTANDING', 133, 35, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (134, '내가 중요하게 생각하는 가치가 진로 선택에 어떤 영향을 주는지 생각해 본 적이 있다.', 'career_readiness', 'SELF_UNDERSTANDING', 134, 42, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (135, '관심 있는 학과에서 실제 무엇을 배우는지 찾아본 경험이 있다.', 'career_readiness', 'CAREER_EXPLORATION', 135, 49, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (136, '관심 직업이 실제로 어떤 일을 하는지 알아본 경험이 있다.', 'career_readiness', 'CAREER_EXPLORATION', 136, 56, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (137, '진로를 선택할 때 흥미뿐 아니라 나의 강점과 가치도 함께 고려해야 한다고 생각한다.', 'career_readiness', 'DECISION_CRITERIA', 137, 63, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (138, '여러 진로가 마음에 들 때 무엇을 기준으로 비교할지 생각해 본 적이 있다.', 'career_readiness', 'DECISION_CRITERIA', 138, 70, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (139, '관심 분야를 더 알아보기 위해 앞으로 해볼 활동을 생각해 둔 것이 있다.', 'career_readiness', 'EXPLORATION_READINESS', 139, 77, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();
INSERT INTO public.career_assessment_questions
      (question_number, text, domain, scoring_code, display_order, display_order_v2, introduced_in, is_active)
      VALUES (140, '진로가 바뀌더라도 다시 정보를 찾아보고 계획을 조정할 수 있다고 생각한다.', 'career_readiness', 'EXPLORATION_READINESS', 140, 84, 'HYPER_CAREER_V2', true)
      ON CONFLICT (question_number) DO UPDATE
        SET text = EXCLUDED.text,
            domain = EXCLUDED.domain,
            scoring_code = EXCLUDED.scoring_code,
            display_order = EXCLUDED.display_order,
            display_order_v2 = EXCLUDED.display_order_v2,
            introduced_in = EXCLUDED.introduced_in,
            is_active = true,
            updated_at = now();