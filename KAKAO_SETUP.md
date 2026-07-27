# 카카오톡 HYPER CARE 공유 설정 가이드

Hyper Student Care에서 학생별 카카오톡 공유를 사용하려면 아래 순서대로 설정하세요.

## 1. 카카오디벨로퍼스 접속

1. [카카오디벨로퍼스](https://developers.kakao.com/)에 로그인합니다.
2. **내 애플리케이션** 메뉴로 이동합니다.

## 2. 애플리케이션 추가

1. **애플리케이션 추가하기**를 클릭합니다.
2. 앱 이름: **HYPER STUDENT CARE**
3. 사업자명 등 필수 정보를 입력하고 저장합니다.

## 3. JavaScript 키 확인

1. 생성한 앱을 선택합니다.
2. **앱 키** 메뉴에서 **JavaScript 키**를 복사합니다.
3. **REST API 키는 사용하지 않습니다.**

## 4. .env 파일 작성

프로젝트 루트에 `.env` 파일을 만듭니다. (`.env.example` 참고)

```env
VITE_KAKAO_JAVASCRIPT_KEY=여기에_JavaScript_키_입력
VITE_PUBLIC_APP_URL=https://실제배포도메인.vercel.app
```

- `VITE_PUBLIC_APP_URL`은 운영 배포 주소입니다. 끝에 `/`를 붙이지 않습니다.
- 로컬 개발만 할 때는 `VITE_PUBLIC_APP_URL`을 비워 두면 `http://localhost:5173` 등 현재 주소를 사용합니다.

## 5. 웹 도메인 등록

1. 카카오디벨로퍼스 → 해당 앱 → **플랫폼** → **Web**
2. **사이트 도메인**에 다음을 등록합니다.

개발 예시:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

운영 예시 (Vercel):

- `https://your-app.vercel.app`

## 6. 개발 서버 재시작

환경변수를 수정한 후에는 **반드시** 개발 서버를 재시작해야 합니다.

```bash
npm run dev
```

## 7. 카카오톡 공유 테스트

1. 강사용 **학생관리** 화면으로 이동합니다.
2. 학생 행의 **카카오톡 공유** 버튼을 클릭합니다.
3. 공유 카드에서 다음을 확인합니다.
   - 제목: **HYPER STUDENT CARE**
   - 설명: `{학생이름} 학생의 학습관리 페이지입니다...`
   - 버튼: **HYPER CARE**
   - 링크: `/care/{studentAccessKey}`

## 8. 4019 도메인 오류가 날 때

- 카카오디벨로퍼스 **Web 플랫폼**에 현재 접속 중인 도메인이 등록되어 있는지 확인합니다.
- `VITE_PUBLIC_APP_URL`과 실제 배포 도메인이 일치하는지 확인합니다.
- `.env` 수정 후 개발 서버를 재시작했는지 확인합니다.

## 9. 배포 도메인이 바뀌었을 때

1. `VITE_PUBLIC_APP_URL`을 새 도메인으로 변경
2. Vercel(또는 사용 중인 호스팅) 환경변수도 동일하게 변경
3. 카카오디벨로퍼스 Web 도메인에 새 URL 등록
4. 재배포 후 공유 테스트

## 10. 공유 이미지

- 경로: `public/hyper-care-share.png`
- 공유 URL: `{VITE_PUBLIC_APP_URL}/hyper-care-share.png`
- PNG가 없으면 `public/hyper-care-share.svg`를 참고해 PNG로 교체할 수 있습니다.

## 11. SDK 미설정 시

JavaScript 키가 없으면 앱은 정상 동작하며, **개인 링크 복사** 기능은 계속 사용할 수 있습니다. 카카오톡 공유만 설정 안내 메시지가 표시됩니다.
