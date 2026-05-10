import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appJs = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('index exposes the bilingual four-step ingestion flow in order at the top of the sidebar', () => {
  const heroSection = html.match(/<section class="hero-card panel">([\s\S]*?)<\/section>/);

  assert.ok(heroSection, 'hero section should exist');
  assert.match(heroSection[1], /1\. 이미지 업로드 \| Image Upload/, 'step 1 should be bilingual');
  assert.match(heroSection[1], /2\. OCR \| OCR/, 'step 2 should be bilingual');
  assert.match(heroSection[1], /3\. 주소 확인 \| Confirm Address/, 'step 3 should be bilingual');
  assert.match(heroSection[1], /4\. 저장 \| Save/, 'step 4 should be bilingual');
  assert.match(
    heroSection[1],
    /1\. 이미지 업로드 \| Image Upload[\s\S]*2\. OCR \| OCR[\s\S]*3\. 주소 확인 \| Confirm Address[\s\S]*4\. 저장 \| Save/,
    'top flow should present the bilingual four steps in order'
  );
  assert.match(heroSection[1], /for="imageUpload"[^>]*>[\s\S]*이미지 업로드[\s\S]*Image Upload[\s\S]*</, 'image upload action should be bilingual at top');
  assert.match(heroSection[1], /id="runOcrButton"[^>]*>[\s\S]*OCR 실행[\s\S]*Run OCR[\s\S]*</, 'OCR action should be bilingual at top');
  assert.match(heroSection[1], /id="previewButton"[^>]*>[\s\S]*주소 확인[\s\S]*Confirm Address[\s\S]*</, 'address confirmation action should be bilingual at top');
  assert.match(heroSection[1], /id="saveParsedPlace"[^>]*>[\s\S]*저장하기[\s\S]*Save Place[\s\S]*</, 'save action should be bilingual at top');
});

test('index exposes simplified shared Supabase controls', () => {
  assert.match(html, /Shared cloud/, 'shared cloud title should exist');
  assert.match(html, /무료 Supabase 공용 저장소/, 'shared cloud section should describe the free shared store');
  assert.match(html, /id="syncNowButton"/, 'manual shared sync button should exist');
  assert.doesNotMatch(html, /exportJsonButton/, 'JSON export button should be removed');
  assert.doesNotMatch(html, /importJsonButton/, 'JSON import button should be removed');
  assert.doesNotMatch(html, /importJsonInput/, 'JSON import input should be removed');
  assert.doesNotMatch(html, /JSON/, 'JSON backup/import copy should be removed from the UI');
  assert.doesNotMatch(html, /id="syncEmailInput"/, 'email auth input should be removed');
  assert.doesNotMatch(html, /id="sendMagicLinkButton"/, 'magic link button should be removed');
  assert.doesNotMatch(html, /id="signOutButton"/, 'sign out button should be removed');
  assert.match(html, /src="\.\/config\.js"/, 'config.js should load before app.js');
});

test('index keeps only name address and reason input fields', () => {
  assert.match(html, /id="parsedName"/, 'name field should exist');
  assert.match(html, /id="parsedAddress"/, 'address field should exist');
  assert.match(html, /id="parsedReason"/, 'reason field should exist');
  assert.doesNotMatch(html, /id="parsedHours"/, 'hours field should be removed');
  assert.doesNotMatch(html, /id="parsedCategory"/, 'category field should be removed');
});

test('saved place cards include Google Maps view, directions, and edit actions but no delete action', () => {
  assert.match(appJs, /구글맵에서 보기/, 'saved place card should expose Google Maps view action');
  assert.match(appJs, /길찾기/, 'saved place card should expose directions action');
  assert.match(appJs, /수정하기/, 'saved place card should expose edit action');
  assert.doesNotMatch(appJs, /삭제하기/, 'saved place card should not expose delete action');
  assert.doesNotMatch(appJs, /place-delete-button/, 'saved place card should not render a delete button');
  assert.match(appJs, /google-maps-icon/, 'saved place card should render a Google Maps icon');
  assert.match(appJs, /place-card-glow/, 'saved place card should use the upgraded premium card shell');
});

test('saved place cards protect edit and map actions from parent card click handling', () => {
  assert.match(appJs, /closest\('\.place-edit-button, \.place-action-link'\)/, 'card click handler should ignore action targets');
});
