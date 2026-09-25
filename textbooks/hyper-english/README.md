# HYPER ENGLISH — Master Design & Production

인쇄 우선 단일 원본. 디자인은 `tokens.css` + `master.css`에 고정하고,
내용만 `sample-g*.html`에서 교체한다. 이미지 생성물을 최종 파일로 쓰지 않는다.

## 구조

- `tokens.css` — 학년 색상만 바꾼다. 레이아웃은 전 학년 동일.
  - 고1 `body[data-grade="g1"]` 연한 녹색
  - 고2 `body[data-grade="g2"]` 연한 하늘색
  - 고3 `body[data-grade="g3"]` HYPER 연보라
- `master.css` — 목차 / 단원 시작 / 일반 문제 공용 스타일.
- `sample-g3.html` — 고3 견본 6쪽. 모든 지문·문항은 HYPER 자체 제작.
- `build-pdf.mjs` — headless Chrome으로 PDF + 미리보기 PNG 생성.
- `out/` — 생성물. 원본이 아니라 결과물이다.

## 출력

```bash
node textbooks/hyper-english/build-pdf.mjs
```

- `out/hyper-english-g3-sample.pdf` — 인쇄용. A4, 여백 0 `@page`에 페이지 안쪽 여백 포함.
- `out/preview-p1.png` 등 — 화면 미리보기.

DOCX가 필요하면 이 HTML을 원본으로 pandoc 변환을 붙인다.
문단·문항이 페이지 중간에서 잘리지 않도록 `.q`는 `break-inside: avoid`이다.

## 제작기

`studio.html`을 연다. 유형을 고르고 JSON 파일을 넣으면 같은 마스터로 미리보기가 나온다. 인쇄로 PDF를 저장한다.

```bash
node textbooks/hyper-english/generate.mjs textbooks/hyper-english/samples/grammar-g3.json
```

샘플 JSON: `samples/reading-g3.json`, `grammar-g3.json`, `vocab-g3.json`, `writing-g3.json`, `math-g1.json`.
입력은 선택한 유형의 슬롯만 채운다. 자동 분류는 하지 않는다.

텍스트 PDF는 표시줄을 읽어 같은 JSON으로 바꾼다. 표시: `UNIT`, `PASSAGE`/`지문`, `POINT`/`개념`/`공식`, `EXAMPLE`/`예제`, `Q`/`문제`, `①`, `정답`, `WORD`/`단어`, `PROMPT`/`영작`.

```bash
node textbooks/hyper-english/import-file.mjs file.pdf grammar from-file
```

글자가 없는 스캔 PDF는 `텍스트 추출 불가/OCR 필요`만 알린다. DOCX와 수식 엔진은 없다.

## 저작권 규칙

기존 출판사 로고·본문·문항을 복제하지 않는다.
참고하는 것은 정보 배치와 그리드뿐이다.
