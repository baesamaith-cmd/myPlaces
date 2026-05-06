# myPlaces

GitHub Pages에서 바로 배포할 수 있는 정적 지도 MVP입니다.

## 구성
- `index.html`: 메인 페이지, OCR 업로드 UI, JSON 백업, Supabase 동기화 UI
- `style.css`: 지도/리스트/업로드 폼 스타일
- `app.js`: 지도 렌더링, OCR 흐름, geocoding, localStorage 저장, Supabase sync
- `parser.js`: OCR 텍스트를 구조화하는 파싱 유틸
- `cloud-sync.js`: Supabase row 변환, 최신 수정본 병합, timestamp 정규화
- `storage-transfer.js`: JSON export/import 유틸
- `config.js`: 브라우저에서 읽는 Supabase 공개 설정 파일
- `config.example.js`: Supabase 설정 예시
- `supabase/schema.sql`: `places` 테이블 및 RLS 정책
- `tests/*.test.js`: 파서/레이아웃/백업/맵링크/수정/클라우드 동기화 테스트
- `data/restaurants.json`: 샘플 맛집 데이터

## 기능
- 샘플 맛집 데이터를 지도와 리스트에 표시
- 이미지 업로드 후 **Tesseract.js OCR** 실행
- OCR 텍스트에서 장소명/주소/영업시간/가격 등을 파싱
- geocoding 결과 후보를 지도에 미리보기
- 확인 후 브라우저 `localStorage`에 저장
- JSON export/import로 백업 및 복원
- **Supabase Auth + Postgres** 기반 기기 간 동기화
  - 이메일 매직링크 로그인
  - 로그인 후 로컬/클라우드 데이터를 `updatedAt` 기준으로 병합
  - 같은 계정이면 다른 기기에서도 같은 목록 사용 가능

## 실행
정적 파일 프로젝트라서 다음 중 하나로 확인하면 됩니다.

- 브라우저에서 바로 열기
- 또는 로컬 서버 실행
  - 예: `python3 -m http.server 8000`

## Supabase 설정

### 1) Supabase 프로젝트 생성
- [Supabase](https://supabase.com)에서 새 프로젝트 생성
- **Authentication > Providers > Email** 활성화

### 2) SQL Editor에서 스키마 실행
`supabase/schema.sql` 내용을 붙여 넣고 실행합니다.

### 3) 브라우저 공개 키 설정
`config.example.js`를 참고해 `config.js`를 실제 값으로 채웁니다.

```js
window.MYPLACES_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_REF.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
};
```

### 4) 중요한 주의사항
- `anonKey`는 **브라우저에 공개되는 키**라서 정상입니다.
- 대신 **service_role key는 절대 넣으면 안 됩니다.**
- GitHub Pages에 올릴 때도 `config.js`에는 `anonKey`만 넣으세요.

### 5) 동작 방식
- 로그인 전: 기존처럼 localStorage 저장만 사용
- 로그인 후: 로컬 데이터와 Supabase `places` 테이블을 병합
- 저장/수정/JSON import 후: 클라우드에 다시 업서트

## 테스트
```bash
npm test
```

## 문법 체크
```bash
node --check app.js
node --check parser.js
node --check storage-transfer.js
node --check cloud-sync.js
node --check config.js
node --check config.example.js
```

## 배포
GitHub Pages를 켜면 바로 웹으로 공개할 수 있습니다.

배포 전에 확인할 것:
- `config.js`에 실제 Supabase URL / anon key 반영
- `supabase/schema.sql` 실행 완료
- 이메일 로그인 공급자 활성화

## 다음 단계 아이디어
- 저장된 장소 삭제
- 카드 이미지/썸네일 저장
- 모바일 반응형 추가 다듬기
- 다중 사용자 공유 컬렉션
- 태그/즐겨찾기/검색
