import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const appJs = readFileSync(new URL('../app.js', import.meta.url), 'utf8');

test('index starts with upload-first mobile flow and reveals later steps progressively', () => {
  const heroSection = html.match(/<section class="hero-card panel">([\s\S]*?)<\/section>/);

  assert.ok(heroSection, 'hero section should exist');
  assert.match(heroSection[1], /data-i18n-key="heroTitle"/, 'hero title should be localizable');
  assert.match(heroSection[1], /for="imageUpload"[^>]*data-i18n-key="step1Action"/, 'image upload action should stay visible at the top');
  assert.doesNotMatch(heroSection[1], /id="runOcrButton"/, 'OCR button should not stay crowded in the top hero section');
  assert.doesNotMatch(heroSection[1], /id="previewButton"/, 'preview button should not stay crowded in the top hero section');
  assert.doesNotMatch(heroSection[1], /id="saveParsedPlace"/, 'save button should not stay crowded in the top hero section');
  assert.doesNotMatch(heroSection[1], /\|/, 'hero flow should not render bilingual copy side by side');

  assert.match(html, /id="ocrStepSection"[^>]*hidden/, 'OCR step should be hidden initially');
  assert.match(html, /id="reviewStepSection"[^>]*hidden/, 'review step should be hidden initially');
  assert.match(html, /id="saveStepSection"[^>]*hidden/, 'save step should be hidden initially');
  assert.match(html, /id="runOcrButton"[^>]*data-i18n-key="step2Action"/, 'OCR action should exist in its own stage section');
  assert.match(html, /id="previewButton"[^>]*data-i18n-key="step3Action"/, 'address confirmation action should exist in its own stage section');
  assert.match(html, /id="saveParsedPlace"[^>]*data-i18n-key="step4Action"/, 'save action should exist in its own stage section');
});

test('all non-directions actions share one unified button color treatment', () => {
  assert.match(html, /for="imageUpload"[^>]*class="[^"]*flow-action-button[^"]*primary-button[^"]*"/, 'upload action should use the shared primary button style');
  assert.match(html, /id="runOcrButton"[^>]*class="[^"]*flow-action-button[^"]*primary-button[^"]*"/, 'OCR action should use the shared primary button style');
  assert.match(html, /id="copySourceTextButton"[^>]*class="[^"]*primary-button[^"]*"/, 'copy OCR action should use the shared primary button style');
  assert.match(html, /id="previewButton"[^>]*class="[^"]*flow-action-button[^"]*primary-button[^"]*"/, 'preview action should use the shared primary button style');
  assert.match(html, /id="saveParsedPlace"[^>]*class="[^"]*flow-action-button[^"]*primary-button[^"]*"/, 'save action should use the shared primary button style');
  assert.match(html, /id="cancelEditButton"[^>]*class="[^"]*primary-button[^"]*"/, 'cancel edit action should use the shared primary button style');
  assert.match(html, /id="syncNowButton"[^>]*class="[^"]*primary-button[^"]*"/, 'shared sync action should use the shared primary button style');
  assert.match(appJs, /class=\"place-edit-button primary-button\"/, 'saved-place edit action should use the shared primary button style');
  assert.match(appJs, /class=\"place-action-link primary-button\"/, 'saved-place view action should use the shared primary button style');
  assert.match(appJs, /class=\"place-action-link secondary-button directions-action\"/, 'directions action should remain the only secondary-colored action');
  assert.match(html, /data-i18n-key="stepActionHint"/, 'progressive flow should include a consistent tap hint for the next action');
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

test('index exposes full OCR text in a copy-friendly field', () => {
  assert.match(html, /id="sourceTextPreview"/, 'full OCR text field should exist');
  assert.match(html, /id="sourceTextPreview"[^>]*readonly/, 'full OCR text field should be read-only for easy copying');
  assert.match(html, /id="sourceTextPreview"[^>]*data-i18n-placeholder="sourcePreviewEmpty"/, 'full OCR text field should have a localizable empty placeholder');
  assert.match(html, /id="copySourceTextButton"/, 'copy OCR text button should exist');
});

test('index exposes quick OCR insert actions for name address and reason fields', () => {
  assert.match(html, /id="fillNameFromOcrButton"[^>]*data-i18n-key="fillNameFromOcrButton"/, 'name quick-insert action should exist');
  assert.match(html, /id="fillAddressFromOcrButton"[^>]*data-i18n-key="fillAddressFromOcrButton"/, 'address quick-insert action should exist');
  assert.match(html, /id="fillReasonFromOcrButton"[^>]*data-i18n-key="fillReasonFromOcrButton"/, 'reason quick-insert action should exist');
  assert.match(html, /id="appendSourceTextToggle"/, 'append mode toggle should exist for OCR helper actions');
  assert.match(html, /data-i18n-key="appendSourceTextToggleLabel"/, 'append mode toggle label should be localizable');
  assert.match(html, /class="[^"]*source-preview-actions[^"]*"/, 'quick-insert actions should live with the OCR source preview controls');
});

test('app localizes UI from browser language instead of rendering both languages together', () => {
  assert.match(appJs, /navigator\.languages \?\? \[navigator\.language\]/, 'app should inspect browser language preferences');
  assert.match(appJs, /function detectPreferredLanguage\(/, 'app should detect the preferred UI language');
  assert.match(appJs, /document\.documentElement\.lang = preferredLanguage/, 'app should update the document language');
  assert.match(appJs, /function applyTranslations\(/, 'app should apply localized copy to the DOM');
  assert.match(appJs, /data-i18n-key/, 'app should look for localizable text nodes');
  assert.match(appJs, /data-i18n-placeholder/, 'app should localize placeholders too');
});

test('app keeps full OCR text selectable and supports copying it', () => {
  assert.match(appJs, /const sourceTextPreview = document.getElementById\('sourceTextPreview'\);/, 'app should reference the OCR full text field');
  assert.match(appJs, /const copySourceTextButton = document.getElementById\('copySourceTextButton'\);/, 'app should reference the OCR copy button');
  assert.match(appJs, /sourceTextPreview\.value =/, 'app should write OCR text into the copy-friendly field');
  assert.match(appJs, /navigator\.clipboard\.writeText\(/, 'app should copy OCR text to clipboard when requested');
});

test('app can insert selected OCR text into name address and reason fields', () => {
  assert.match(appJs, /const fillNameFromOcrButton = document.getElementById\('fillNameFromOcrButton'\);/, 'app should reference the OCR-to-name quick action');
  assert.match(appJs, /const fillAddressFromOcrButton = document.getElementById\('fillAddressFromOcrButton'\);/, 'app should reference the OCR-to-address quick action');
  assert.match(appJs, /const fillReasonFromOcrButton = document.getElementById\('fillReasonFromOcrButton'\);/, 'app should reference the OCR-to-reason quick action');
  assert.match(appJs, /const appendSourceTextToggle = document.getElementById\('appendSourceTextToggle'\);/, 'app should reference the append-mode toggle');
  assert.match(appJs, /function getSelectedSourceText\(/, 'app should derive a selected OCR snippet before filling fields');
  assert.match(appJs, /function buildFieldInsertValue\(/, 'app should support append-aware insertion values');
  assert.match(appJs, /appendSourceTextToggle\.checked/, 'quick OCR insert should respect append mode');
  assert.match(appJs, /field\.value = buildFieldInsertValue\(/, 'quick OCR insert should use append-aware field updates');
  assert.match(appJs, /fillNameFromOcrButton\.addEventListener\('click'/, 'name quick action should be wired');
  assert.match(appJs, /fillAddressFromOcrButton\.addEventListener\('click'/, 'address quick action should be wired');
  assert.match(appJs, /fillReasonFromOcrButton\.addEventListener\('click'/, 'reason quick action should be wired');
});

test('app preprocesses screenshots before OCR to improve recognition quality', () => {
  assert.match(appJs, /async function preprocessImageForOcr\(/, 'app should preprocess screenshots before OCR');
  assert.match(appJs, /canvas\.getContext\('2d'/, 'OCR preprocessing should use a canvas context');
  assert.match(appJs, /ctx\.filter = 'grayscale\(1\) contrast\(1\.35\) brightness\(1\.08\)'/, 'OCR preprocessing should increase grayscale contrast and brightness');
  assert.match(appJs, /window\.Tesseract\.recognize\(preparedImage, 'eng'/, 'OCR should run against the preprocessed image when possible');
});

test('app numbers the guided mobile flow buttons so users can follow the order clearly', () => {
  assert.match(appJs, /step1Action: '1\. 이미지 업로드'/, 'Korean upload action should include step number 1');
  assert.match(appJs, /step2Action: '2\. OCR 실행'/, 'Korean OCR action should include step number 2');
  assert.match(appJs, /copySourceTextButton: '3-1\. OCR 전체 복사'/, 'Korean OCR copy action should include a sub-step number');
  assert.match(appJs, /fillNameFromOcrButton: '3-2\. 선택 텍스트 → 가게 이름'/, 'Korean OCR-to-name action should include a sub-step number');
  assert.match(appJs, /fillAddressFromOcrButton: '3-3\. 선택 텍스트 → 주소'/, 'Korean OCR-to-address action should include a sub-step number');
  assert.match(appJs, /fillReasonFromOcrButton: '3-4\. 선택 텍스트 → 저장 이유'/, 'Korean OCR-to-reason action should include a sub-step number');
  assert.match(appJs, /step3Action: '3\. 주소 확인'/, 'Korean address confirmation action should include step number 3');
  assert.match(appJs, /step4Action: '4\. 저장하기'/, 'Korean save action should include step number 4');
  assert.match(appJs, /cancelEditButton: '4-1\. 수정 취소'/, 'Korean cancel edit action should include a sub-step number');
  assert.match(appJs, /step1Action: '1\. Image Upload'/, 'English upload action should include step number 1');
  assert.match(appJs, /step2Action: '2\. Run OCR'/, 'English OCR action should include step number 2');
  assert.match(appJs, /copySourceTextButton: '3-1\. Copy full OCR text'/, 'English OCR copy action should include a sub-step number');
  assert.match(appJs, /fillNameFromOcrButton: '3-2\. Selected text → Place name'/, 'English OCR-to-name action should include a sub-step number');
  assert.match(appJs, /fillAddressFromOcrButton: '3-3\. Selected text → Address'/, 'English OCR-to-address action should include a sub-step number');
  assert.match(appJs, /fillReasonFromOcrButton: '3-4\. Selected text → Why save it'/, 'English OCR-to-reason action should include a sub-step number');
  assert.match(appJs, /step3Action: '3\. Confirm Address'/, 'English address confirmation action should include step number 3');
  assert.match(appJs, /step4Action: '4\. Save Place'/, 'English save action should include step number 4');
  assert.match(appJs, /cancelEditButton: '4-1\. Cancel Edit'/, 'English cancel edit action should include a sub-step number');
});

test('app progressively reveals later ingestion steps and uses smartphone-friendly auto-scroll rules', () => {
  assert.match(appJs, /const ocrStepSection = document.getElementById\('ocrStepSection'\);/, 'app should reference the OCR step section');
  assert.match(appJs, /const reviewStepSection = document.getElementById\('reviewStepSection'\);/, 'app should reference the review step section');
  assert.match(appJs, /const saveStepSection = document.getElementById\('saveStepSection'\);/, 'app should reference the save step section');
  assert.match(appJs, /function setStepVisibility\(/, 'app should control which step panels are visible');
  assert.match(appJs, /function isCompactMobileViewport\(/, 'app should detect smartphone-sized viewports before forcing scroll behavior');
  assert.match(appJs, /function isElementComfortablyVisible\(/, 'app should skip extra scrolling when the next step is already visible enough');
  assert.match(appJs, /function shouldCenterStepOnMobile\(/, 'app should distinguish short mobile sections from tall ones before centering');
  assert.match(appJs, /function buildStepScrollOptions\(section\)/, 'app should centralize tuned scroll behavior for each step reveal');
  assert.match(appJs, /block: shouldCenterStepOnMobile\(section\) \? 'center' : 'start'/, 'mobile auto-scroll should center short sections but top-align tall ones');
  assert.match(appJs, /if \(isElementComfortablyVisible\(section\)\) return;/, 'app should avoid unnecessary scroll jumps when the section is already visible');
  assert.match(appJs, /scrollIntoView\(buildStepScrollOptions\(section\)\)/, 'app should use the tuned scroll options when progressing');
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
