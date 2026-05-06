import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appJs = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('index exposes three primary quick actions at the top of the sidebar', () => {
  const heroSection = html.match(/<section class="hero-card panel">([\s\S]*?)<\/section>/);

  assert.ok(heroSection, 'hero section should exist');
  assert.match(heroSection[1], /class="quick-actions"/, 'quick action row should exist in hero section');
  assert.match(heroSection[1], /for="imageUpload"[^>]*>\s*캡처 이미지 선택\s*</, 'capture select action should be visible at top');
  assert.match(heroSection[1], /id="runOcrButton"[^>]*>\s*OCR 실행\s*</, 'OCR action should be visible at top');
  assert.match(heroSection[1], /id="previewButton"[^>]*>\s*지도에 미리보기\s*</, 'preview action should be visible at top');
});

test('index exposes Supabase sync controls for cross-device saving', () => {
  assert.match(html, /Cloud sync/, 'sync panel title should exist');
  assert.match(html, /id="syncEmailInput"/, 'email input should exist for magic link sign-in');
  assert.match(html, /id="sendMagicLinkButton"/, 'magic link button should exist');
  assert.match(html, /id="syncNowButton"/, 'manual sync button should exist');
  assert.match(html, /id="signOutButton"/, 'sign out button should exist');
  assert.match(html, /src="\.\/config\.js"/, 'config.js should load before app.js');
});

test('saved place cards include Google Maps view, directions, and edit actions', () => {
  assert.match(appJs, /구글맵에서 보기/, 'saved place card should expose Google Maps view action');
  assert.match(appJs, /길찾기/, 'saved place card should expose directions action');
  assert.match(appJs, /수정하기/, 'saved place card should expose edit action');
  assert.match(appJs, /google-maps-icon/, 'saved place card should render a Google Maps icon');
  assert.match(appJs, /place-card-glow/, 'saved place card should use the upgraded premium card shell');
});

test('saved place cards protect edit and map actions from parent card click handling', () => {
  assert.match(appJs, /closest\('\.place-edit-button, \.place-action-link'\)/, 'card click handler should ignore action targets');
});
