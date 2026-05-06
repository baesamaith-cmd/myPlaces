# Supabase Cloud Sync Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** GitHub Pages 정적 프론트에서도 기기 간에 같은 맛집 저장 데이터를 자동 동기화한다.

**Architecture:** 프론트는 기존 `localStorage`를 즉시 반응용 캐시로 계속 사용하고, 클라우드 저장소는 Supabase를 붙인다. 사용자는 이메일 매직링크로 로그인하고, 로그인 후에는 `places` 테이블과 `localStorage`를 `updatedAt` 기준으로 양방향 병합한다.

**Tech Stack:** Vanilla JS, GitHub Pages, Supabase Auth, Supabase Postgres, node:test

---

### Task 1: 순수 동기화 유틸 테스트 추가
- `tests/cloud-sync.test.js`
- `parser.js`에 필요한 메타데이터 필드 테스트 추가
- RED → `npm test`

### Task 2: 동기화 유틸 구현
- `cloud-sync.js` 생성
- `createdAt/updatedAt` 정규화, Supabase row 변환, row → place 변환, 최신 수정본 병합 구현
- GREEN → `npm test`

### Task 3: 앱 저장 레코드에 수정 시각 메타데이터 부여
- `parser.js`
- `storage-transfer.js`
- `app.js`
- 저장/불러오기 시 `createdAt`, `updatedAt` 보존 및 마이그레이션

### Task 4: Supabase 인증/동기화 UI 추가
- `index.html`
- `style.css`
- `config.js`, `config.example.js`
- 이메일 로그인, sync now, 로그아웃, 상태 문구 추가

### Task 5: 앱에 Supabase 연동
- `app.js`
- 세션 복구, auth state listener, remote fetch/upsert, local/cloud 병합, auto-sync 구현

### Task 6: 문서/배포 준비
- `README.md`
- `supabase/schema.sql`
- 설정 절차, 주의사항(service role 금지), GitHub Pages 배포 방법 정리

### Task 7: 전체 검증
- `npm test`
- `node --check app.js parser.js storage-transfer.js cloud-sync.js config.js config.example.js`
- `git diff`, `git status`
