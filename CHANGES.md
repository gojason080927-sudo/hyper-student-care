# PDF → DOCX 변환 기능 추가

## 새로 추가된 파일
- api/pdf-to-docx.ts               — Adobe PDF Services 연동 서버리스 함수
- src/lib/pdfToDocxClient.ts        — 프론트엔드에서 업로드+변환 호출하는 헬퍼
- src/components/teacher/PdfToDocxConverter.tsx — 업로드/변환/다운로드 UI
- src/pages/teacher/TeacherPdfToDocxPage.tsx     — 페이지 래퍼
- supabase/pdf-to-docx-storage-migration.sql     — 스토리지 버킷 + RLS (수동 실행)

## 수정된 파일
- src/components/Sidebar.tsx   — "PDF → DOCX 변환" 메뉴 추가
- src/App.tsx                  — /teacher/pdf-to-docx 라우트 추가
- .env.example                 — Adobe / Supabase service role 환경변수 안내 추가
- package.json                 — @adobe/pdfservices-node-sdk 의존성 추가

## 적용 순서
1. 이 zip의 파일들을 프로젝트 루트에 그대로 덮어쓰기(병합).
2. `npm install` (adobe SDK 설치).
3. Supabase Dashboard → SQL Editor에서 `supabase/pdf-to-docx-storage-migration.sql` 직접 실행.
   (다른 마이그레이션 파일들처럼 자동 실행되지 않음 — 프로젝트 컨벤션)
4. developer.adobe.com/document-services 에서 무료 크리덴셜(Client ID / Secret) 발급.
5. Vercel 프로젝트 설정 → Environment Variables 에 추가:
   - PDF_SERVICES_CLIENT_ID
   - PDF_SERVICES_CLIENT_SECRET
   - SUPABASE_SERVICE_ROLE_KEY (hub-storage 기능에서 이미 설정했다면 그대로 재사용 가능)
6. 재배포 후 사이드바 "PDF → DOCX 변환" 메뉴에서 테스트.

## 알아둘 점
- Adobe 무료 한도: 월 500 Document Transaction. 변환은 50페이지당 1건으로 계산되어
  150~180페이지 교재는 건당 약 3~4건 소모 (한 달에 대략 120~150권 분량 무료).
- 표·이미지가 복잡한 PDF는 서식이 100% 일치하지 않을 수 있음. 글자 없는 스캔본은 변환 불가.
- 다운로드 링크(서명된 URL)는 발급 후 10분간만 유효.
- Vercel 서버리스 함수 실행 시간을 300초로 늘려뒀음(대용량 PDF 처리 대비).
  Vercel 요금제에 따라 최대 실행시간 제한이 다를 수 있으니, Hobby 플랜이라면
  Pro로 올려야 할 수도 있음 — 실제 배포 후 큰 파일로 한 번 확인 권장.
- 이 컨테이너는 네트워크가 차단돼 있어 `npm install` / 빌드를 직접 돌려서 검증하지
  못했음. 코드는 Adobe 공식 Node SDK 샘플 패턴을 그대로 따랐지만, 실제 배포 전에
  로컬에서 `npm install && npm run build`로 한 번 확인해 보는 걸 권장.
