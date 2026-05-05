# myPlaces

GitHub Pages에서 바로 배포할 수 있는 정적 지도 MVP입니다.

## 구성
- `index.html`: 메인 페이지와 OCR 업로드 UI
- `style.css`: 지도/리스트/업로드 폼 스타일
- `app.js`: 지도 렌더링, OCR 흐름, geocoding, localStorage 저장
- `parser.js`: OCR 텍스트를 구조화하는 파싱 유틸
- `tests/parser.test.js`: 파서 동작 검증 테스트
- `data/restaurants.json`: 샘플 맛집 데이터

## 기능
- 샘플 맛집 데이터를 지도와 리스트에 표시
- 이미지 업로드 후 **Tesseract.js OCR** 실행
- OCR 텍스트에서 장소명/주소/영업시간/가격 등을 파싱
- geocoding 결과 후보를 지도에 미리보기
- 확인 후 브라우저 `localStorage`에 저장

## 실행
정적 파일 프로젝트라서 다음 중 하나로 확인하면 됩니다.

- 브라우저에서 바로 열기
- 또는 로컬 서버 실행
  - 예: `python3 -m http.server 8000`

## 테스트
```bash
npm test
```

## 배포
GitHub Pages를 켜면 바로 웹으로 공개할 수 있습니다.

## 다음 단계 아이디어
- geocoding 후보 다건 비교 UI 개선
- OCR 언어셋 확대(중문/한글)
- 저장 데이터 JSON export/import
- Supabase 연동으로 사용자 저장 기능 확장
- 링크 분석 파이프라인과 연결
