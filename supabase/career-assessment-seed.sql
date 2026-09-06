INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (1, '기계나 전자제품이 어떤 원리로 작동하는지 직접 살펴보는 것이 재미있다.', 'riasec', 'R', 1, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (2, '말로만 설명을 듣는 것보다 직접 만들거나 조립하면서 배우는 것이 좋다.', 'riasec', 'R', 8, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (3, '도구나 장비를 이용해 무언가를 고치거나 만들어 보고 싶다.', 'riasec', 'R', 15, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (4, '책상에 오래 앉아 있는 활동보다 몸을 움직이며 직접 해보는 활동이 좋다.', 'riasec', 'R', 22, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (5, '눈에 보이는 결과물이 만들어지는 활동에서 성취감을 느낀다.', 'riasec', 'R', 29, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (6, '어떤 현상이 왜 일어나는지 원인을 알아내는 과정이 재미있다.', 'riasec', 'I', 35, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (7, '어려운 문제라도 원리를 이해할 때까지 생각해 보는 편이다.', 'riasec', 'I', 41, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (8, '자료나 정보를 분석하여 규칙이나 공통점을 찾아내는 것을 좋아한다.', 'riasec', 'I', 47, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (9, '과학적 현상이나 새로운 기술에 관한 내용을 찾아보는 것이 흥미롭다.', 'riasec', 'I', 53, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (10, '정답을 외우는 것보다 그 답이 나오는 이유를 이해하는 것이 중요하다.', 'riasec', 'I', 57, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (11, '그림·영상·음악·글 등을 통해 내 생각이나 느낌을 표현하는 것을 좋아한다.', 'riasec', 'A', 61, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (12, '정해진 방식보다 나만의 방식으로 과제를 해보고 싶을 때가 많다.', 'riasec', 'A', 64, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (13, '새로운 아이디어를 떠올리고 그것을 구체적인 결과물로 만드는 것이 재미있다.', 'riasec', 'A', 67, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (14, '디자인이나 색상·구성·표현 방식의 차이를 비교해 보는 것이 흥미롭다.', 'riasec', 'A', 69, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (15, '이야기나 콘텐츠를 직접 기획하거나 만들어 보고 싶다.', 'riasec', 'A', 71, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (16, '다른 사람이 어려워하는 내용을 이해하도록 설명해 주는 것이 좋다.', 'riasec', 'S', 73, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (17, '친구가 고민할 때 이야기를 듣고 해결 방법을 함께 찾아주는 편이다.', 'riasec', 'S', 75, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (18, '다른 사람의 성장이나 발전에 도움을 주는 활동에서 보람을 느낀다.', 'riasec', 'S', 76, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (19, '여러 사람과 협력해서 공동의 목표를 이루는 활동을 좋아한다.', 'riasec', 'S', 77, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (20, '사람들의 생각이나 감정을 이해하는 것에 관심이 많다.', 'riasec', 'S', 78, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (21, '여러 사람 앞에서 내 의견을 제시하고 설득하는 것을 해보고 싶다.', 'riasec', 'E', 79, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (22, '내가 아이디어를 내고 사람들을 이끌어 결과를 만들어 내는 활동이 좋다.', 'riasec', 'E', 80, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (23, '새로운 사업이나 서비스를 기획하는 일에 흥미를 느낀다.', 'riasec', 'E', 81, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (24, '경쟁이 있는 상황에서 좋은 결과를 얻기 위해 노력하는 것이 싫지 않다.', 'riasec', 'E', 82, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (25, '사람들과 협상하거나 의견을 조정하여 원하는 결과를 만드는 일에 관심이 있다.', 'riasec', 'E', 83, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (26, '자료나 정보를 일정한 기준에 따라 정확하게 정리하는 것을 좋아한다.', 'riasec', 'C', 84, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (27, '해야 할 일을 순서대로 계획하고 하나씩 처리하는 편이다.', 'riasec', 'C', 85, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (28, '숫자나 기록에서 잘못된 부분을 찾아내는 작업을 비교적 잘 견딘다.', 'riasec', 'C', 86, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (29, '규칙과 기준이 명확한 일을 할 때 편안함을 느낀다.', 'riasec', 'C', 87, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (30, '중요한 자료를 체계적으로 관리하고 정리하는 역할을 맡아도 괜찮다.', 'riasec', 'C', 88, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (31, '글을 읽고 핵심 내용을 비교적 빠르게 파악하는 편이다.', 'strength', 'VER', 2, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (32, '내 생각을 말이나 글로 논리적으로 설명하는 편이다.', 'strength', 'VER', 9, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (33, '숫자나 수량의 관계를 이해하는 것이 비교적 빠르다.', 'strength', 'NUM', 16, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (34, '계산이나 수학적 정보를 다룰 때 실수를 잘 찾아내는 편이다.', 'strength', 'NUM', 23, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (35, '복잡한 문제를 여러 단계로 나누어 생각하는 편이다.', 'strength', 'LOG', 30, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (36, '여러 정보 사이의 원인과 결과 관계를 잘 찾아내는 편이다.', 'strength', 'LOG', 36, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (37, '도형이나 물체의 모양을 머릿속에서 돌려 생각하는 것이 어렵지 않다.', 'strength', 'SPA', 42, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (38, '지도·도면·그래프처럼 시각적으로 표현된 정보를 잘 이해하는 편이다.', 'strength', 'SPA', 48, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (39, '새로운 아이디어나 남들과 다른 해결 방법을 자주 생각해 낸다.', 'strength', 'CRE', 54, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (40, '하나의 문제에 대해 여러 가지 가능성을 생각해 보는 편이다.', 'strength', 'CRE', 58, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (41, '상대방의 표정이나 말투를 보고 기분이나 의도를 비교적 잘 알아차린다.', 'strength', 'INT', 62, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (42, '사람마다 다른 의견을 조정하는 역할을 비교적 잘한다.', 'strength', 'INT', 65, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (43, '관찰한 내용을 세부적인 부분까지 기억하는 편이다.', 'strength', 'OBS', 68, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (44, '작은 차이나 변화도 비교적 잘 발견하는 편이다.', 'strength', 'OBS', 70, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (45, '새로운 사용법이나 작업 방법을 직접 해보면서 빨리 익히는 편이다.', 'strength', 'PRA', 72, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (46, '배운 내용을 실제 상황에 적용하는 방법을 비교적 잘 찾아낸다.', 'strength', 'PRA', 74, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (47, '직업을 선택할 때 안정적으로 오래 일할 수 있는지가 중요하다.', 'value', 'STABILITY', 3, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (48, '노력과 성과에 따라 높은 보상을 받을 수 있는 직업에 끌린다.', 'value', 'REWARD', 10, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (49, '어려운 목표에 도전하여 큰 성취를 이루는 것이 중요하다.', 'value', 'ACHIEVEMENT', 17, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (50, '다른 사람이나 사회에 도움이 되는 일을 하고 싶다.', 'value', 'CONTRIBUTION', 24, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (51, '내가 원하는 방식으로 판단하고 결정할 수 있는 일이 좋다.', 'value', 'AUTONOMY', 31, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (52, '새로운 것을 배우면서 계속 성장할 수 있는 직업을 원한다.', 'value', 'GROWTH', 37, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (53, '사회적으로 전문성을 인정받을 수 있는 일을 하고 싶다.', 'value', 'RECOGNITION', 43, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (54, '일뿐 아니라 개인 생활을 충분히 가질 수 있는 것이 중요하다.', 'value', 'BALANCE', 49, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (55, '새로운 아이디어를 자유롭게 시도할 수 있는 환경에서 일하고 싶다.', 'value', 'CREATIVITY', 55, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (56, '다양한 사람과 함께 일하고 교류할 수 있는 직업이 좋다.', 'value', 'RELATIONSHIP', 59, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (57, '책임과 권한을 가지고 중요한 결정을 내리는 역할을 맡고 싶다.', 'value', 'INFLUENCE', 63, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (58, '사회가 변화하더라도 꾸준히 필요로 하는 전문성을 갖고 싶다.', 'value', 'EXPERTISE', 66, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (59, '해야 할 일이 생기면 먼저 순서와 방법을 정하는 편이다.', 'behavior', 'PLANNING', 4, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (60, '한번 시작한 일은 어려움이 있어도 끝까지 해보려고 한다.', 'behavior', 'PERSISTENCE', 11, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (61, '중요한 일을 마치기 전에 빠뜨린 것이 없는지 확인하는 편이다.', 'behavior', 'CAREFULNESS', 18, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (62, '처음 만나는 사람과도 필요하면 먼저 대화를 시작할 수 있다.', 'behavior', 'SOCIABILITY', 25, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (63, '여러 사람이 함께 일할 때 내 역할을 책임지고 수행한다.', 'behavior', 'COOPERATION', 32, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (64, '예상하지 못한 변화가 생겨도 새로운 방법을 찾아 적응하는 편이다.', 'behavior', 'ADAPTABILITY', 38, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (65, '필요한 상황에서는 다른 사람보다 먼저 나서서 일을 시작한다.', 'behavior', 'INITIATIVE', 44, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (66, '감정이 상하는 일이 있어도 해야 할 일에 다시 집중하려고 한다.', 'behavior', 'SELF_CONTROL', 50, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (67, '중요한 결정을 내리기 전에 여러 가능성을 생각해 보는 편이다.', 'behavior', 'DELIBERATION', 56, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (68, '목표를 정하면 실제 행동으로 옮기려고 노력한다.', 'behavior', 'EXECUTION', 60, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (69, '처음 접하는 과제라도 방법을 찾으면 해낼 수 있다고 생각한다.', 'efficacy', 'SE', 5, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (70, '어려운 문제가 생겨도 해결 방법을 찾아볼 자신이 있다.', 'efficacy', 'SE', 12, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (71, '처음에는 잘하지 못하더라도 연습하면 실력이 좋아질 수 있다고 생각한다.', 'efficacy', 'SE', 19, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (72, '새로운 분야를 배워야 할 때도 충분히 따라갈 수 있다고 생각한다.', 'efficacy', 'SE', 26, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (73, '실패하더라도 원인을 찾아 다시 시도할 수 있다.', 'efficacy', 'SE', 33, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (74, '목표가 생기면 필요한 방법을 찾아 실행할 수 있다고 생각한다.', 'efficacy', 'SE', 39, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (75, '다른 사람의 도움 없이도 내가 할 수 있는 부분부터 시작할 수 있다.', 'efficacy', 'SE', 45, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (76, '예상보다 어려운 일이 생겨도 쉽게 포기하지 않을 자신이 있다.', 'efficacy', 'SE', 51, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (77, '어려운 문제를 만나면 먼저 무엇을 묻는 문제인지 정리한다.', 'problem_solving', 'ANALYSIS', 6, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (78, '한 가지 방법으로 해결되지 않으면 다른 방법을 찾아본다.', 'problem_solving', 'FLEXIBILITY', 13, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (79, '새로운 내용을 배울 때 기존에 알고 있던 내용과 연결해 생각한다.', 'problem_solving', 'CONNECTION', 20, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (80, '문제를 해결한 뒤 내가 사용한 방법이 적절했는지 돌아보는 편이다.', 'problem_solving', 'REFLECTION', 27, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (81, '필요한 정보가 부족하면 책이나 인터넷 등에서 추가 정보를 찾아본다.', 'problem_solving', 'EXPLORATION', 34, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (82, '복잡한 과제는 작은 단계로 나누어 해결하는 편이다.', 'problem_solving', 'STRUCTURING', 40, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (83, '여러 해결 방법이 있다면 각각의 장단점을 비교해 본다.', 'problem_solving', 'COMPARISON', 46, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (84, '틀린 문제는 정답만 확인하기보다 왜 틀렸는지 알아보려고 한다.', 'problem_solving', 'ERROR_ANALYSIS', 52, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (85, '내가 좋아하는 것과 잘하는 것이 무엇인지 어느 정도 알고 있다.', 'career_readiness', 'SELF_UNDERSTANDING', 7, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (86, '관심 있는 학과나 직업에 대해 스스로 정보를 찾아본 경험이 있다.', 'career_readiness', 'CAREER_EXPLORATION', 14, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (87, '진로를 선택할 때 무엇을 중요하게 생각해야 하는지 어느 정도 알고 있다.', 'career_readiness', 'DECISION_CRITERIA', 21, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_assessment_questions
    (question_number, text, domain, scoring_code, display_order, is_active)
    VALUES (88, '아직 진로가 확실하지 않더라도 앞으로 어떻게 탐색해야 할지 알고 있다.', 'career_readiness', 'EXPLORATION_READINESS', 28, true)
    ON CONFLICT (question_number) DO UPDATE
      SET text = EXCLUDED.text,
          domain = EXCLUDED.domain,
          scoring_code = EXCLUDED.scoring_code,
          display_order = EXCLUDED.display_order,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'MED',
      '의학',
      $json${"R":0.25,"I":1,"A":0.25,"S":0.75,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['LOG', 'OBS', 'INT']::text[],
      ARRAY['CONTRIBUTION', 'ACHIEVEMENT', 'EXPERTISE']::text[],
      ARRAY['PERSISTENCE', 'DELIBERATION']::text[],
      ARRAY['ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'DEN',
      '치의학',
      $json${"R":0.75,"I":1,"A":0.25,"S":0.25,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['OBS', 'SPA', 'PRA']::text[],
      ARRAY['EXPERTISE', 'ACHIEVEMENT']::text[],
      ARRAY['CAREFULNESS', 'DELIBERATION']::text[],
      ARRAY['ERROR_ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'KMD',
      '한의학',
      $json${"R":0.25,"I":1,"A":0.25,"S":0.75,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['OBS', 'VER', 'INT']::text[],
      ARRAY['CONTRIBUTION', 'EXPERTISE']::text[],
      ARRAY['DELIBERATION']::text[],
      ARRAY['CONNECTION', 'ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'PHA',
      '약학',
      $json${"R":0.25,"I":1,"A":0.25,"S":0.25,"E":0.25,"C":0.75}$json$::jsonb,
      ARRAY['OBS', 'LOG', 'NUM']::text[],
      ARRAY['EXPERTISE', 'STABILITY']::text[],
      ARRAY['CAREFULNESS']::text[],
      ARRAY['ANALYSIS', 'ERROR_ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'VET',
      '수의학',
      $json${"R":0.55,"I":1,"A":0.25,"S":0.75,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['OBS', 'LOG', 'PRA']::text[],
      ARRAY['CONTRIBUTION', 'EXPERTISE']::text[],
      ARRAY['PERSISTENCE', 'DELIBERATION', 'ADAPTABILITY']::text[],
      ARRAY[]::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'NUR',
      '간호',
      $json${"R":0.25,"I":0.75,"A":0.25,"S":1,"E":0.25,"C":0.55}$json$::jsonb,
      ARRAY['INT', 'OBS', 'PRA']::text[],
      ARRAY['CONTRIBUTION', 'STABILITY']::text[],
      ARRAY['COOPERATION', 'SELF_CONTROL', 'EXECUTION']::text[],
      ARRAY[]::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'HEALTH',
      '보건·재활',
      $json${"R":0.75,"I":0.55,"A":0.25,"S":1,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['INT', 'OBS', 'PRA']::text[],
      ARRAY['CONTRIBUTION', 'RELATIONSHIP']::text[],
      ARRAY['PERSISTENCE', 'COOPERATION', 'ADAPTABILITY']::text[],
      ARRAY[]::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'BIO',
      '생명·생명공학',
      $json${"R":0.75,"I":1,"A":0.25,"S":0.25,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['OBS', 'LOG']::text[],
      ARRAY['GROWTH', 'EXPERTISE']::text[],
      ARRAY['PERSISTENCE']::text[],
      ARRAY['EXPLORATION', 'ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'CHEM',
      '화학·화공',
      $json${"R":0.75,"I":1,"A":0.25,"S":0.25,"E":0.25,"C":0.55}$json$::jsonb,
      ARRAY['NUM', 'LOG', 'OBS']::text[],
      ARRAY['EXPERTISE', 'ACHIEVEMENT']::text[],
      ARRAY['CAREFULNESS']::text[],
      ARRAY['ANALYSIS', 'STRUCTURING']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'PHY',
      '물리·응용과학',
      $json${"R":0.75,"I":1,"A":0.25,"S":0.25,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['NUM', 'LOG', 'SPA']::text[],
      ARRAY['GROWTH', 'EXPERTISE']::text[],
      ARRAY[]::text[],
      ARRAY['ANALYSIS', 'EXPLORATION']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'EARTH',
      '지구·해양',
      $json${"R":0.75,"I":1,"A":0.25,"S":0.25,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['OBS', 'SPA', 'LOG']::text[],
      ARRAY['GROWTH', 'CONTRIBUTION']::text[],
      ARRAY[]::text[],
      ARRAY['EXPLORATION', 'CONNECTION', 'ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'FOOD',
      '식품·농생명',
      $json${"R":0.75,"I":1,"A":0.25,"S":0.55,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['OBS', 'PRA', 'LOG']::text[],
      ARRAY['CONTRIBUTION', 'STABILITY']::text[],
      ARRAY['EXECUTION']::text[],
      ARRAY['ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'MATH',
      '수학·통계',
      $json${"R":0.25,"I":1,"A":0.25,"S":0.25,"E":0.25,"C":0.75}$json$::jsonb,
      ARRAY['NUM', 'LOG']::text[],
      ARRAY['EXPERTISE', 'ACHIEVEMENT']::text[],
      ARRAY[]::text[],
      ARRAY['STRUCTURING', 'COMPARISON', 'ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'CS',
      '컴퓨터·AI',
      $json${"R":0.75,"I":1,"A":0.25,"S":0.25,"E":0.25,"C":0.55}$json$::jsonb,
      ARRAY['LOG', 'NUM', 'CRE']::text[],
      ARRAY['GROWTH', 'AUTONOMY', 'EXPERTISE']::text[],
      ARRAY[]::text[],
      ARRAY['STRUCTURING', 'ERROR_ANALYSIS', 'FLEXIBILITY']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'EE',
      '전기·전자',
      $json${"R":0.75,"I":1,"A":0.25,"S":0.25,"E":0.25,"C":0.55}$json$::jsonb,
      ARRAY['NUM', 'LOG', 'SPA']::text[],
      ARRAY['EXPERTISE', 'ACHIEVEMENT']::text[],
      ARRAY['CAREFULNESS']::text[],
      ARRAY['ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'ME',
      '기계·로봇',
      $json${"R":1,"I":0.75,"A":0.25,"S":0.25,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['SPA', 'PRA', 'LOG']::text[],
      ARRAY['ACHIEVEMENT', 'EXPERTISE']::text[],
      ARRAY['EXECUTION']::text[],
      ARRAY['ANALYSIS', 'ERROR_ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'MAT',
      '신소재·재료',
      $json${"R":0.75,"I":1,"A":0.25,"S":0.25,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['OBS', 'LOG', 'NUM']::text[],
      ARRAY['GROWTH', 'EXPERTISE']::text[],
      ARRAY[]::text[],
      ARRAY['EXPLORATION', 'ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'CIV',
      '토목·도시',
      $json${"R":1,"I":0.75,"A":0.25,"S":0.25,"E":0.25,"C":0.55}$json$::jsonb,
      ARRAY['SPA', 'NUM', 'PRA']::text[],
      ARRAY['STABILITY', 'CONTRIBUTION']::text[],
      ARRAY['PLANNING']::text[],
      ARRAY['STRUCTURING']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'ARCH',
      '건축',
      $json${"R":0.75,"I":0.55,"A":1,"S":0.25,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['SPA', 'CRE', 'PRA']::text[],
      ARRAY['CREATIVITY', 'ACHIEVEMENT']::text[],
      ARRAY['PERSISTENCE', 'EXECUTION']::text[],
      ARRAY['COMPARISON']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'ENV',
      '환경·에너지',
      $json${"R":0.75,"I":1,"A":0.25,"S":0.55,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['LOG', 'OBS']::text[],
      ARRAY['CONTRIBUTION', 'GROWTH']::text[],
      ARRAY[]::text[],
      ARRAY['ANALYSIS', 'CONNECTION']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'BUS',
      '경영',
      $json${"R":0.25,"I":0.25,"A":0.25,"S":0.75,"E":1,"C":0.55}$json$::jsonb,
      ARRAY['INT', 'VER', 'LOG']::text[],
      ARRAY['ACHIEVEMENT', 'REWARD', 'INFLUENCE']::text[],
      ARRAY['INITIATIVE', 'EXECUTION']::text[],
      ARRAY['FLEXIBILITY']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'ECON',
      '경제·금융',
      $json${"R":0.25,"I":1,"A":0.25,"S":0.25,"E":0.75,"C":0.55}$json$::jsonb,
      ARRAY['NUM', 'LOG']::text[],
      ARRAY['REWARD', 'ACHIEVEMENT', 'EXPERTISE']::text[],
      ARRAY[]::text[],
      ARRAY['ANALYSIS', 'COMPARISON']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'ACC',
      '회계·세무',
      $json${"R":0.25,"I":0.75,"A":0.25,"S":0.25,"E":0.55,"C":1}$json$::jsonb,
      ARRAY['NUM', 'LOG', 'OBS']::text[],
      ARRAY['STABILITY', 'EXPERTISE']::text[],
      ARRAY['CAREFULNESS', 'DELIBERATION']::text[],
      ARRAY['ERROR_ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'LAW',
      '법·행정',
      $json${"R":0.25,"I":0.55,"A":0.25,"S":0.75,"E":1,"C":0.25}$json$::jsonb,
      ARRAY['VER', 'LOG']::text[],
      ARRAY['INFLUENCE', 'CONTRIBUTION', 'EXPERTISE']::text[],
      ARRAY['DELIBERATION']::text[],
      ARRAY['COMPARISON', 'STRUCTURING']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'PSY',
      '심리',
      $json${"R":0.25,"I":0.75,"A":0.25,"S":1,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['INT', 'VER', 'OBS']::text[],
      ARRAY['CONTRIBUTION', 'GROWTH']::text[],
      ARRAY['DELIBERATION']::text[],
      ARRAY['REFLECTION', 'ANALYSIS']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'EDU',
      '교육',
      $json${"R":0.25,"I":0.75,"A":0.25,"S":1,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['VER', 'INT']::text[],
      ARRAY['CONTRIBUTION', 'GROWTH']::text[],
      ARRAY['COOPERATION', 'PLANNING']::text[],
      ARRAY['REFLECTION']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'SW',
      '사회복지',
      $json${"R":0.25,"I":0.25,"A":0.25,"S":1,"E":0.75,"C":0.25}$json$::jsonb,
      ARRAY['INT', 'VER']::text[],
      ARRAY['CONTRIBUTION', 'RELATIONSHIP']::text[],
      ARRAY['COOPERATION', 'ADAPTABILITY', 'EXECUTION']::text[],
      ARRAY[]::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'SOC',
      '정치·사회',
      $json${"R":0.25,"I":0.75,"A":0.25,"S":0.55,"E":1,"C":0.25}$json$::jsonb,
      ARRAY['VER', 'LOG', 'INT']::text[],
      ARRAY['INFLUENCE', 'CONTRIBUTION']::text[],
      ARRAY[]::text[],
      ARRAY['ANALYSIS', 'COMPARISON', 'EXPLORATION']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'MEDIA',
      '미디어·광고',
      $json${"R":0.25,"I":0.25,"A":1,"S":0.55,"E":0.75,"C":0.25}$json$::jsonb,
      ARRAY['CRE', 'VER', 'INT']::text[],
      ARRAY['CREATIVITY', 'INFLUENCE', 'ACHIEVEMENT']::text[],
      ARRAY['EXECUTION']::text[],
      ARRAY['FLEXIBILITY']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'LANG',
      '언어·문학',
      $json${"R":0.25,"I":0.75,"A":1,"S":0.55,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['VER', 'CRE']::text[],
      ARRAY['CREATIVITY', 'GROWTH']::text[],
      ARRAY[]::text[],
      ARRAY['REFLECTION', 'CONNECTION']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'HIST',
      '역사·철학',
      $json${"R":0.25,"I":1,"A":0.75,"S":0.25,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['VER', 'LOG']::text[],
      ARRAY['GROWTH', 'EXPERTISE']::text[],
      ARRAY[]::text[],
      ARRAY['ANALYSIS', 'REFLECTION', 'CONNECTION']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'DESIGN',
      '디자인',
      $json${"R":0.75,"I":0.25,"A":1,"S":0.25,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['CRE', 'SPA', 'OBS']::text[],
      ARRAY['CREATIVITY', 'AUTONOMY']::text[],
      ARRAY['EXECUTION']::text[],
      ARRAY['FLEXIBILITY']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'ART',
      '예술·콘텐츠',
      $json${"R":0.25,"I":0.25,"A":1,"S":0.25,"E":0.75,"C":0.25}$json$::jsonb,
      ARRAY['CRE', 'VER', 'OBS']::text[],
      ARRAY['CREATIVITY', 'AUTONOMY', 'RECOGNITION']::text[],
      ARRAY['EXECUTION']::text[],
      ARRAY['FLEXIBILITY']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'SPORT',
      '스포츠',
      $json${"R":1,"I":0.25,"A":0.25,"S":0.75,"E":0.55,"C":0.25}$json$::jsonb,
      ARRAY['PRA', 'INT']::text[],
      ARRAY['ACHIEVEMENT', 'RELATIONSHIP']::text[],
      ARRAY['PERSISTENCE', 'EXECUTION', 'SELF_CONTROL']::text[],
      ARRAY[]::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'TOUR',
      '관광·호텔',
      $json${"R":0.25,"I":0.25,"A":0.25,"S":0.75,"E":1,"C":0.55}$json$::jsonb,
      ARRAY['INT', 'VER']::text[],
      ARRAY['RELATIONSHIP', 'ACHIEVEMENT']::text[],
      ARRAY['SOCIABILITY', 'ADAPTABILITY', 'EXECUTION']::text[],
      ARRAY[]::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_profiles
    (id, name, riasec_target, strength_keys, value_keys, behavior_keys, problem_solving_keys, notes, is_active)
    VALUES (
      'CHILD',
      '아동·가족',
      $json${"R":0.25,"I":0.25,"A":0.75,"S":1,"E":0.25,"C":0.25}$json$::jsonb,
      ARRAY['INT', 'VER', 'OBS']::text[],
      ARRAY['CONTRIBUTION', 'RELATIONSHIP']::text[],
      ARRAY['COOPERATION', 'PERSISTENCE']::text[],
      ARRAY['REFLECTION']::text[],
      'HYPER v1 heuristic profile. Not a nationally validated psychometric standard.',
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name,
          riasec_target = EXCLUDED.riasec_target,
          strength_keys = EXCLUDED.strength_keys,
          value_keys = EXCLUDED.value_keys,
          behavior_keys = EXCLUDED.behavior_keys,
          problem_solving_keys = EXCLUDED.problem_solving_keys,
          is_active = true,
          updated_at = now();
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'med-medicine',
      '의학과',
      'MED',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'med-premed',
      '의예과',
      'MED',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'den-dentistry',
      '치의학과',
      'DEN',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'den-predent',
      '치의예과',
      'DEN',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'kmd-korean',
      '한의학과',
      'KMD',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'pha-pharmacy',
      '약학과',
      'PHA',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'pha-pharm-sci',
      '약학대학',
      'PHA',
      'CHEM',
      0.8,
      0.2,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'vet-veterinary',
      '수의학과',
      'VET',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'nur-nursing',
      '간호학과',
      'NUR',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'health-pt',
      '물리치료학과',
      'HEALTH',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'health-ot',
      '작업치료학과',
      'HEALTH',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'health-radiology',
      '방사선학과',
      'HEALTH',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'health-clinical',
      '임상병리학과',
      'HEALTH',
      'BIO',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'health-emergency',
      '응급구조학과',
      'HEALTH',
      'NUR',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'bio-life',
      '생명과학과',
      'BIO',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'bio-biotech',
      '생명공학과',
      'BIO',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'bio-micro',
      '미생물학과',
      'BIO',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'chem-chemistry',
      '화학과',
      'CHEM',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'chem-eng',
      '화학공학과',
      'CHEM',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'phy-physics',
      '물리학과',
      'PHY',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'phy-applied',
      '응용물리학과',
      'PHY',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'earth-geology',
      '지질학과',
      'EARTH',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'earth-ocean',
      '해양학과',
      'EARTH',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'earth-atmosphere',
      '대기과학과',
      'EARTH',
      'PHY',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'food-science',
      '식품영양학과',
      'FOOD',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'food-agri',
      '식품공학과',
      'FOOD',
      'CHEM',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'food-animal',
      '동물생명과학과',
      'FOOD',
      'BIO',
      0.6,
      0.4,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'math-math',
      '수학과',
      'MATH',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'math-stat',
      '통계학과',
      'MATH',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'math-applied',
      '응용수학과',
      'MATH',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'cs-computer',
      '컴퓨터공학과',
      'CS',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'cs-software',
      '소프트웨어학과',
      'CS',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'cs-ai',
      '인공지능학과',
      'CS',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'cs-data',
      '데이터사이언스학과',
      'CS',
      'MATH',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'cs-info',
      '정보통신공학과',
      'CS',
      'EE',
      0.6,
      0.4,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'cs-cyber',
      '사이버보안전공',
      'CS',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'ee-electrical',
      '전기공학과',
      'EE',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'ee-electronic',
      '전자공학과',
      'EE',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'ee-semicon',
      '반도체공학과',
      'EE',
      'MAT',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'me-mechanical',
      '기계공학과',
      'ME',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'me-robot',
      '로봇공학과',
      'ME',
      'CS',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'me-auto',
      '자동차공학과',
      'ME',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'mat-materials',
      '신소재공학과',
      'MAT',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'mat-metal',
      '재료공학과',
      'MAT',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'civ-civil',
      '토목공학과',
      'CIV',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'civ-urban',
      '도시공학과',
      'CIV',
      'ARCH',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'arch-arch',
      '건축학과',
      'ARCH',
      'DESIGN',
      0.75,
      0.25,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'arch-eng',
      '건축공학과',
      'ARCH',
      'CIV',
      0.6,
      0.4,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'env-env',
      '환경공학과',
      'ENV',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'env-energy',
      '에너지공학과',
      'ENV',
      'PHY',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'bus-business',
      '경영학과',
      'BUS',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'bus-marketing',
      '마케팅학과',
      'BUS',
      'MEDIA',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'bus-intl',
      '국제통상학과',
      'BUS',
      'ECON',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'econ-econ',
      '경제학과',
      'ECON',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'econ-finance',
      '금융학과',
      'ECON',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'econ-global',
      '국제금융학과',
      'ECON',
      'BUS',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'acc-accounting',
      '회계학과',
      'ACC',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'acc-tax',
      '세무학과',
      'ACC',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'law-law',
      '법학과',
      'LAW',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'law-admin',
      '행정학과',
      'LAW',
      'SOC',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'law-police',
      '경찰행정학과',
      'LAW',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'psy-psych',
      '심리학과',
      'PSY',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'psy-counsel',
      '상담심리학과',
      'PSY',
      'SW',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'edu-edu',
      '교육학과',
      'EDU',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'edu-math',
      '수학교육과',
      'EDU',
      'MATH',
      0.6,
      0.4,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'edu-eng',
      '영어교육과',
      'EDU',
      'LANG',
      0.6,
      0.4,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'edu-early',
      '유아교육과',
      'EDU',
      'CHILD',
      0.6,
      0.4,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'sw-welfare',
      '사회복지학과',
      'SW',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'soc-poli',
      '정치외교학과',
      'SOC',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'soc-socio',
      '사회학과',
      'SOC',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'soc-media-poli',
      '언론정보학과',
      'SOC',
      'MEDIA',
      0.6,
      0.4,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'media-media',
      '미디어커뮤니케이션학과',
      'MEDIA',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'media-ad',
      '광고홍보학과',
      'MEDIA',
      'BUS',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'media-content',
      '콘텐츠기획학과',
      'MEDIA',
      'ART',
      0.6,
      0.4,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'lang-korean',
      '국어국문학과',
      'LANG',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'lang-english',
      '영어영문학과',
      'LANG',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'lang-trans',
      '통번역학과',
      'LANG',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'hist-history',
      '사학과',
      'HIST',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'hist-philo',
      '철학과',
      'HIST',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'design-visual',
      '시각디자인학과',
      'DESIGN',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'design-industrial',
      '산업디자인학과',
      'DESIGN',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'design-fashion',
      '패션디자인학과',
      'DESIGN',
      'ART',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'art-fine',
      '미술학과',
      'ART',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'art-music',
      '음악학과',
      'ART',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'art-film',
      '영화영상학과',
      'ART',
      'MEDIA',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'sport-pe',
      '체육학과',
      'SPORT',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'sport-science',
      '스포츠과학과',
      'SPORT',
      'HEALTH',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'tour-tourism',
      '관광학과',
      'TOUR',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'tour-hotel',
      '호텔경영학과',
      'TOUR',
      'BUS',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'child-child',
      '아동학과',
      'CHILD',
      NULL,
      1,
      0,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_major_dictionary
    (id, major_name, major_group_primary, major_group_secondary, primary_weight, secondary_weight, is_active)
    VALUES (
      'child-family',
      '아동가족학과',
      'CHILD',
      'SW',
      0.7,
      0.3,
      true
    )
    ON CONFLICT (id) DO UPDATE
      SET major_name = EXCLUDED.major_name,
          major_group_primary = EXCLUDED.major_group_primary,
          major_group_secondary = EXCLUDED.major_group_secondary,
          primary_weight = EXCLUDED.primary_weight,
          secondary_weight = EXCLUDED.secondary_weight,
          is_active = EXCLUDED.is_active;
INSERT INTO public.career_fit_bands
    (id, min_score, max_score, label, exclude_from_priority, sort_order)
    VALUES ('very_high', 85, 100, '매우 높은 적합', false, 1)
    ON CONFLICT (id) DO UPDATE
      SET min_score = EXCLUDED.min_score,
          max_score = EXCLUDED.max_score,
          label = EXCLUDED.label,
          exclude_from_priority = EXCLUDED.exclude_from_priority,
          sort_order = EXCLUDED.sort_order;
INSERT INTO public.career_fit_bands
    (id, min_score, max_score, label, exclude_from_priority, sort_order)
    VALUES ('high', 75, 84.9, '높은 적합', false, 2)
    ON CONFLICT (id) DO UPDATE
      SET min_score = EXCLUDED.min_score,
          max_score = EXCLUDED.max_score,
          label = EXCLUDED.label,
          exclude_from_priority = EXCLUDED.exclude_from_priority,
          sort_order = EXCLUDED.sort_order;
INSERT INTO public.career_fit_bands
    (id, min_score, max_score, label, exclude_from_priority, sort_order)
    VALUES ('moderate', 65, 74.9, '비교적 적합', false, 3)
    ON CONFLICT (id) DO UPDATE
      SET min_score = EXCLUDED.min_score,
          max_score = EXCLUDED.max_score,
          label = EXCLUDED.label,
          exclude_from_priority = EXCLUDED.exclude_from_priority,
          sort_order = EXCLUDED.sort_order;
INSERT INTO public.career_fit_bands
    (id, min_score, max_score, label, exclude_from_priority, sort_order)
    VALUES ('explore', 55, 64.9, '탐색 가능', false, 4)
    ON CONFLICT (id) DO UPDATE
      SET min_score = EXCLUDED.min_score,
          max_score = EXCLUDED.max_score,
          label = EXCLUDED.label,
          exclude_from_priority = EXCLUDED.exclude_from_priority,
          sort_order = EXCLUDED.sort_order;
INSERT INTO public.career_fit_bands
    (id, min_score, max_score, label, exclude_from_priority, sort_order)
    VALUES ('exclude', 0, 54.999, '우선추천 제외', true, 5)
    ON CONFLICT (id) DO UPDATE
      SET min_score = EXCLUDED.min_score,
          max_score = EXCLUDED.max_score,
          label = EXCLUDED.label,
          exclude_from_priority = EXCLUDED.exclude_from_priority,
          sort_order = EXCLUDED.sort_order;
NOTIFY pgrst, 'reload schema';