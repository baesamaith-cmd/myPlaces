import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appJs = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('index exposes a single-language four-step ingestion flow that JS can localize by browser language', () => {
  const heroSection = html.match(/<section class="hero-card panel">([\s\S]*?)<\/section>/);

  assert.ok(heroSection, 'hero section should exist');
  assert.match(heroSection[1], /1\. 이미지 업로드/, 'step 1 should default to Korean in the HTML');
  assert.match(heroSection[1], /2\. OCR/, 'step 2 should default to Korean in the HTML');
  assert.match(heroSection[1], /3\. 주소 확인/, 'step 3 should default to Korean in the HTML');
  assert.match(heroSection[1], /4\. 저장/, 'step 4 should default to Korean in the HTML');
  assert.doesNotMatch(heroSection[1], /\|/, 'hero flow should not render bilingual copy side by side');
  assert.match(heroSection[1], /data-i18n-key="heroTitle"/, 'hero title should be localizable');
  assert.match(heroSection[1], /data-i18n-key="heroSubtitle"/, 'hero subtitle should be localizable');
  assert.match(heroSection[1], /data-i18n-key="step1Title"/, 'step 1 title should be localizable');
  assert.match(heroSection[1], /for="imageUpload"[^>]*data-i18n-key="step1Action"/, 'image upload action should be localizable');
  assert.match(heroSection[1], /id="runOcrButton"[^>]*data-i18n-key="step2Action"/, 'OCR action should be localizable');
  assert.match(heroSection[1], /id="previewButton"[^>]*data-i18n-key="step3Action"/, 'address confirmation action should be localizable');
  assert.match(heroSection[1], /id="saveParsedPlace"[^>]*data-i18n-key="step4Action"/, 'save action should be localizable');
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
  assert.match(html, /id="parsedName"[^>]*data-i18n-placeholder="parsedNamePlaceholder"/, 'name placeholder should be localizable');
  assert.match(html, /id="parsedAddress"[^>]*data-i18n-placeholder="parsedAddressPlaceholder"/, 'address placeholder should be localizable');
  assert.match(html, /id="parsedReason"[^>]*data-i18n-placeholder="parsedReasonPlaceholder"/, 'reason placeholder should be localizable');
  assert.doesNotMatch(html, /id="parsedHours"/, 'hours field should be removed');
  assert.doesNotMatch(html, /id="parsedCategory"/, 'category field should be removed');
});

test('app localizes UI from browser language instead of rendering both languages together', () => {
  assert.match(appJs, /navigator\.languages \?\? \[navigator\.language\]/, 'app should inspect browser language preferences');
  assert.match(appJs, /function detectPreferredLanguage\(/, 'app should detect the preferred UI language');
  assert.match(appJs, /document\.documentElement\.lang = preferredLanguage/, 'app should update the document language');
  assert.match(appJs, /function applyTranslations\(/, 'app should apply localized copy to the DOM');
  assert.match(appJs, /data-i18n-key/, 'app should look for localizable text nodes');
  assert.match(appJs, /data-i18n-placeholder/, 'app should localize placeholders too');
});

test('saved place cards keep edit and map actions but no delete action', () => {
  assert.match(appJs, /placeActionView/, 'saved place card should expose a localized Google Maps view action');
  assert.match(appJs, /placeActionDirections/, 'saved place card should expose a localized directions action');
  assert.match(appJs, /placeActionEdit/, 'saved place card should expose a localized edit action');
  assert.doesNotMatch(appJs, /삭제하기/, 'saved place card should not expose delete action text');
  assert.doesNotMatch(appJs, /place-delete-button/, 'saved place card should not render a delete button');
  assert.match(appJs, /google-maps-icon/, 'saved place card should render a Google Maps icon');
  assert.match(appJs, /place-card-glow/, 'saved place card should use the upgraded premium card shell');
});

test('saved place cards protect edit and map actions from parent card click handling', () => {
  assert.match(appJs, /closest\('\.place-edit-button, \.place-action-link'\)/, 'card click handler should ignore action targets');
});
