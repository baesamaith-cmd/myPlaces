# myPlaces

GitHub Pages에서 바로 배포할 수 있는 정적 지도 MVP입니다.

## 구성
- `index.html`: 메인 페이지, OCR 업로드 UI, Supabase 공용 저장 UI
- `style.css`: 지도/리스트/업로드 폼 스타일
- `app.js`: 지도 렌더링, OCR 흐름, geocoding, localStorage 저장, Supabase 공용 sync
- `parser.js`: OCR 텍스트에서 **가게명 / 주소 / 저장 이유**만 추리는 파싱 유틸
- `cloud-sync.js`: Supabase row 변환, 최신 수정본 병합, timestamp 정규화
- `config.js`: 브라우저에서 읽는 Supabase 공개 설정 파일
- `config.example.js`: Supabase 설정 예시
- `supabase/schema.sql`: `shared_places` 테이블 및 공용 RLS 정책
- `tests/*.test.js`: 파서/레이아웃/맵링크/수정/클라우드 동기화 테스트

## 기능
- 이미지 업로드 후 **Tesseract.js OCR** 실행
- OCR 텍스트에서 **가게명 / 주소 / 저장 이유** 추출
- geocoding 결과 후보를 지도에 미리보기
- 확인 후 브라우저 `localStorage`에 저장
- **Supabase 무료 플랜** 기반 공용 저장소
  - 여러 사람이 같은 목록을 함께 사용 가능
  - 로그인 없이 `shared_places` 테이블로 병합/업서트
  - 로컬 저장 + 공용 저장소를 `updatedAt` 기준으로 병합

## 실행
정적 파일 프로젝트라서 다음 중 하나로 확인하면 됩니다.

- 브라우저에서 바로 열기
- 또는 로컬 서버 실행
  - 예: `python3 -m http.server 8000`

## Supabase 설정

### 1) Supabase 프로젝트 생성
- [Supabase](https://supabase.com)에서 새 프로젝트 생성
- 무료 플랜으로 시작 가능

### 2) SQL Editor에서 스키마 실행
`supabase/schema.sql` 내용을 붙여 넣고 실행합니다.

### 3) 브라우저 공개 키 설정
두 가지 방식 중 하나를 쓰면 됩니다.

#### 방식 A) 로컬 개발 / 빠른 테스트
`config.example.js`를 참고해 `config.js`를 직접 채웁니다.

```js
window.MYPLACES_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
};
```

#### 방식 B) GitHub Pages 배포용 권장 방식
이 저장소에는 `.github/workflows/deploy-pages.yml`이 들어 있어서, GitHub Actions가 배포 시 `config.template.js`에서 `config.js`를 자동 생성합니다.

GitHub 저장소 **Settings → Secrets and variables → Actions → Variables** 에 아래 두 개를 추가하세요.
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### 4) 중요한 주의사항
- `anonKey`는 **브라우저에 공개되는 키**라서 정상입니다.
- 대신 **service_role key는 절대 넣으면 안 됩니다.**
- 배포 자동화를 써도 `SUPABASE_ANON_KEY`에는 anon key만 넣으세요.
- 현재 스키마는 **공용 목록**을 전제로 하므로, 링크를 아는 누구나 같은 목록을 보게 됩니다.

### 5) 동작 방식
- 기본: localStorage 저장 사용
- 공용 저장소 설정 후: 로컬 데이터와 Supabase `shared_places` 테이블을 병합
- 저장/수정 후: 공용 저장소에 다시 업서트

## 테스트
```bash
npm test
```

## 문법 체크
```bash
node --check app.js
node --check parser.js
node --check cloud-sync.js
node --check config.js
node --check config.example.js
```

## 배포
GitHub Pages를 켜면 바로 웹으로 공개할 수 있습니다.

배포 전에 확인할 것:
- `supabase/schema.sql` 실행 완료
- GitHub Actions Variables에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 추가
- 필요하면 GitHub Pages source를 **GitHub Actions** 로 전환

## 다음 단계 아이디어
- 저장된 장소 삭제
- 검색 / 태그 / 즐겨찾기
- 모바일 반응형 추가 다듬기
- 공용 목록 읽기 전용 / 편집 전용 모드 분리
