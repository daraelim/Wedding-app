# 우리의 혼례 — 배포 가능한 Wedding Web App

2026년 11월 14일 18:00 운현궁 / 19:00–21:00 아미드호텔 서울.

## 시작하기

1. Node.js 20+ 설치
2. 터미널에서 `npm install` 실행
3. `npm run dev` 실행 후 표시되는 로컬 주소 접속
4. `src/config.js`에서 사진, 영상, 계좌, 마감일 수정

## 실제 RSVP DB 연결

1. [Supabase](https://supabase.com/) 프로젝트 생성
2. SQL Editor에서 `supabase.sql` 실행
3. Authentication > Users에서 관리자 계정 생성. 이메일/비밀번호 인증 사용
4. 관리자 UUID를 SQL 파일 마지막 주석의 `insert into public.admin_users...` 문으로 추가
5. `.env.example`을 `.env`로 복사하고 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY` 입력 (Supabase의 공개용 publishable/anon 키만 사용, **service_role 키 절대 금지**)
6. 개발 서버 재시작. `/admin` 접속하여 로그인/체크인 테스트
7. 실제 공개 전 개인정보 고지, 봇 방지 및 접수 마감 서버측 제어 구현. 현재 마감일은 **화면에서만** 차단하며 DB 직접 호출을 막지 못합니다.

## Vercel 배포

1. 이 폴더를 GitHub 비공개 저장소에 push
2. Vercel > Add New Project > GitHub 저장소 선택
3. Framework: Vite, Build Command: `npm run build`, Output Directory: `dist`
4. Environment Variables에 위 두 `VITE_` 변수 입력
5. Vercel 프로젝트 설정에서 `/admin` 경로가 index.html로 라우팅되도록 `vercel.json` 사용
6. 생성된 URL을 모바일에서 테스트한 후 공유

## 사진·영상

- 사진은 `public/photos/`에 넣고 `src/config.js`의 `photos`에 경로 추가
- 첫 번째 사진은 표지, 나머지는 갤러리
- `invitationVideo`에는 신뢰할 수 있는 YouTube embed 주소 사용
- 결혼 후 `postWedding: true`로 변경하고 `archiveVideo` 설정
- 계좌번호는 설정 파일에 넣으면 **공개 웹사이트에 그대로 노출**됩니다. 본인 동의 후 등록하세요.

## 개인정보·보안 주의

- 하객 연락처를 받지 않으므로 동명이인/중복 RSVP를 자동으로 판별할 수 없습니다.
- 기본 SQL은 익명 INSERT만 허용하며 익명 SELECT를 금지합니다. 관리자 접근은 `admin_users`에 등록된 인증 사용자에게만 허용됩니다.
- 공개 RSVP를 실제 운영할 때는 CAPTCHA, 속도 제한, 서버측 마감 검증, 중복 접수 처리 정책이 필요합니다.
- 접수자에게는 별도의 인증 계정을 발급하고 `admin_users`에 등록하세요. 현재 구현은 **관리자/접수자 권한이 동일**하며 세부 권한 분리는 추후 구현해야 합니다.
- 체크인은 대표자 단위로 처리됩니다.
- 행사 후 필요한 기록을 백업하고 DB의 RSVP 행과 관리자 계정/권한을 삭제하세요.
- `CSV 다운로드`는 관리자 기기에서만 사용하고 다운로드 파일 보관에 주의하세요.

## 현재 구현 범위

- 실제 모바일 화면/4개 탭/사진 갤러리/초대영상 위치/지도/계좌 복사
- Supabase 연결 후 RSVP INSERT, 관리자 로그인, 명단 검색, 체크인, 현장 등록, CSV 다운로드
- 미구현: 봇 방지, 중복 응답 감지, 서버측 RSVP 마감, 관리자/접수자 권한 분리, QR 이미지 자동 생성
