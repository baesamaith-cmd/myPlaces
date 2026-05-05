# myPlaces

GitHub Pages에서 바로 배포할 수 있는 정적 지도 MVP입니다.

## 구성
- `index.html`: 메인 페이지
- `style.css`: UI 스타일
- `app.js`: 지도 렌더링 및 필터 로직
- `data/restaurants.json`: 샘플 맛집 데이터

## 실행
정적 파일 프로젝트라서 다음 중 하나로 확인하면 됩니다.

- 브라우저에서 바로 열기
- 또는 로컬 서버 실행
  - 예: `python3 -m http.server 8000`

## 배포
GitHub Pages를 켜면 바로 웹으로 공개할 수 있습니다.

## 다음 단계 아이디어
- 저장 데이터 추가/수정 UI
- 카테고리 외 지역 필터 추가
- Supabase 연동으로 사용자 저장 기능 확장
- 링크 분석 파이프라인과 연결
