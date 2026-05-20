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
  assert.match(heroSection[1], /id="languageToggleButton"/, 'language toggle button should stay visible in the hero section');
  assert.doesNotMatch(heroSection[1], /id="runOcrButton"/, 'OCR button should not stay crowded in the top hero section');
  assert.doesNotMatch(heroSection[1], /id="previewButton"/, 'preview button should not stay crowded in the top hero section');
  assert.doesNotMatch(heroSection[1], /id="saveParsedPlace"/, 'save button should not stay crowded in the top hero section');
  assert.doesNotMatch(heroSection[1], /\|/, 'hero flow should not render bilingual copy side by side');

  assert.doesNotMatch(html, /data-i18n-key="captureKicker">캡처 저장</, 'capture-save section label should be removed from the screen');
  assert.doesNotMatch(html, /data-i18n-key="uploadPanelTitle">위에서 아래로 4단계만 따라가세요</, 'top-to-bottom 4-step guidance label should be removed from the screen');
  assert.doesNotMatch(html, /data-i18n-key="mvpBadge">MVP</, 'MVP badge should be removed from the screen');
  assert.doesNotMatch(html, /data-i18n-key="browseKicker">둘러보기</, 'browse section kicker should be removed from the screen');
  assert.doesNotMatch(html, /data-i18n-key="filterPanelTitle">저장된 장소 필터</, 'saved-place filter title should be removed from the screen');
  assert.doesNotMatch(html, /data-i18n-key="categoryFilterLabel">카테고리</, 'category label should be removed from the screen');
  assert.doesNotMatch(appJs, /\bcaptureKicker:\s*['"]/,'removed capture-save translation key should be deleted from app.js');
  assert.doesNotMatch(appJs, /\buploadPanelTitle:\s*['"]/,'removed upload-panel title key should be deleted from app.js');
  assert.doesNotMatch(appJs, /\bmvpBadge:\s*['"]/,'removed MVP badge key should be deleted from app.js');
  assert.doesNotMatch(appJs, /\bbrowseKicker:\s*['"]/,'removed browse kicker key should be deleted from app.js');
  assert.doesNotMatch(appJs, /\bfilterPanelTitle:\s*['"]/,'removed filter panel title key should be deleted from app.js');
  assert.doesNotMatch(appJs, /\bcategoryFilterLabel:\s*['"]/,'removed category filter label key should be deleted from app.js');
  assert.doesNotMatch(appJs, /\bcategoryAllOption:\s*['"]/,'removed category filter option key should be deleted from app.js');
  assert.doesNotMatch(html, /id="categoryFilter"/, 'category dropdown should be removed from the screen');
  assert.doesNotMatch(appJs, /const categoryFilter = document.getElementById\('categoryFilter'\);/, 'category dropdown DOM lookup should be removed from app.js');
  assert.doesNotMatch(appJs, /function renderCategories\(/, 'category dropdown rendering helper should be removed from app.js');
  assert.doesNotMatch(appJs, /categoryFilter\.addEventListener\('change', renderPlaces\);/, 'category dropdown event listener should be removed from app.js');

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
  assert.match(html, /id="previewButton"[^>]*class="[^"]*flow-action-button[^"]*primary-button[^"]*"/, 'preview action should use the shared primary button style');
  assert.match(html, /id="saveParsedPlace"[^>]*class="[^"]*flow-action-button[^"]*primary-button[^"]*"/, 'save action should use the shared primary button style');
  assert.match(html, /id="cancelEditButton"[^>]*class="[^"]*primary-button[^"]*"/, 'cancel edit action should use the shared primary button style');
  assert.match(html, /id="syncNowButton"[^>]*class="[^"]*primary-button[^"]*"/, 'shared sync action should use the shared primary button style');
  assert.match(appJs, /class=\"place-edit-button primary-button\"/, 'saved-place edit action should use the shared primary button style');
  assert.match(appJs, /class=\"place-action-link primary-button\"/, 'saved-place view action should use the shared primary button style');
  assert.match(appJs, /class=\"place-action-link secondary-button directions-action\"/, 'directions action should remain the only secondary-colored action');
  assert.match(html, /data-i18n-key="stepActionHint"/, 'progressive flow should include a consistent tap hint for the next action');
  assert.match(html, /data-i18n-key="ocrStatusIdle"/, 'idle OCR guidance should be localized through a translation key');
});

test('capture-save MVP flow no longer shows a separate change-image panel copy', () => {
  assert.doesNotMatch(html, /data-i18n-key="uploadLabel"/, 'separate change-image label should be removed for the MVP flow');
  assert.doesNotMatch(html, /data-i18n-key="uploadDropzoneTitle"/, 'change-image dropzone title should be removed for the MVP flow');
  assert.doesNotMatch(html, /data-i18n-key="uploadDropzoneBody"/, 'change-image helper copy should be removed for the MVP flow');
  assert.doesNotMatch(appJs, /uploadLabel:\s*'Change image'/, 'legacy change-image translation copy should be removed from app code too');
  assert.doesNotMatch(appJs, /uploadDropzoneTitle:\s*'Pick another screenshot'/, 'legacy reselect-screenshot title should be removed from app code too');
  assert.doesNotMatch(appJs, /uploadDropzoneBody:\s*'Change the file to rerun OCR and address confirmation\.'/,'legacy change-image helper copy should be removed from app code too');
  assert.match(html, /<input id="imageUpload" type="file" accept="image\/\*" hidden \/>/, 'file input should still exist for the top upload action');
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

test('index no longer exposes raw OCR text controls and instead keeps only the normal review fields', () => {
  assert.doesNotMatch(html, /id="sourceTextPreview"/, 'raw OCR text field should be removed');
  assert.doesNotMatch(html, /id="copySourceTextButton"/, 'copy OCR text button should be removed');
  assert.doesNotMatch(html, /id="fillNameFromOcrButton"/, 'OCR-to-name helper should be removed');
  assert.doesNotMatch(html, /id="fillAddressFromOcrButton"/, 'OCR-to-address helper should be removed');
  assert.doesNotMatch(html, /id="fillReasonFromOcrButton"/, 'OCR-to-reason helper should be removed');
  assert.doesNotMatch(html, /id="appendSourceTextToggle"/, 'append OCR helper toggle should be removed');
  assert.doesNotMatch(html, /id="ocrLineSuggestionList"/, 'OCR line suggestion chips should be removed with the raw OCR view');
});

test('app localizes UI from browser language and lets users override it with a visible toggle button', () => {
  assert.match(appJs, /navigator\.languages \?\? \[navigator\.language\]/, 'app should inspect browser language preferences');
  assert.match(appJs, /function detectPreferredLanguage\(/, 'app should detect the preferred UI language');
  assert.match(appJs, /const LANGUAGE_STORAGE_KEY = 'myPlaces\.uiLanguage\.v1';/, 'app should persist a manual language choice');
  assert.match(appJs, /function loadSavedLanguage\(/, 'app should restore a previously chosen language');
  assert.match(appJs, /let currentLanguage = loadSavedLanguage\(\) \|\| detectPreferredLanguage\(\);/, 'app should prefer a saved language override before browser detection');
  assert.match(appJs, /document\.documentElement\.lang = currentLanguage/, 'app should update the document language');
  assert.match(appJs, /function applyTranslations\(/, 'app should apply localized copy to the DOM');
  assert.match(appJs, /function updateLanguageToggleButton\(/, 'app should keep the language toggle label in sync');
  assert.match(appJs, /function setLanguage\(/, 'app should expose a language switcher');
  assert.match(appJs, /localStorage\.setItem\(LANGUAGE_STORAGE_KEY, nextLanguage\)/, 'app should persist the chosen language');
  assert.match(appJs, /languageToggleButton\?\.addEventListener\('click', \(\) => setLanguage\(currentLanguage === 'ko' \? 'en' : 'ko'\)\)/, 'language toggle button should switch between Korean and English');
  assert.match(appJs, /data-i18n-key/, 'app should look for localizable text nodes');
  assert.match(appJs, /data-i18n-placeholder/, 'app should localize placeholders too');
});

test('OCR completion now auto-fills the save reason with the OCR text instead of exposing raw-text helpers', () => {
  assert.doesNotMatch(appJs, /const sourceTextPreview = document.getElementById\('sourceTextPreview'\);/, 'app should stop referencing a raw OCR text field');
  assert.doesNotMatch(appJs, /const copySourceTextButton = document.getElementById\('copySourceTextButton'\);/, 'app should stop referencing the copy OCR helper');
  assert.doesNotMatch(appJs, /const fillNameFromOcrButton = document.getElementById\('fillNameFromOcrButton'\);/, 'app should stop referencing OCR helper buttons');
  assert.doesNotMatch(appJs, /const fillAddressFromOcrButton = document.getElementById\('fillAddressFromOcrButton'\);/, 'app should stop referencing OCR helper buttons');
  assert.doesNotMatch(appJs, /const fillReasonFromOcrButton = document.getElementById\('fillReasonFromOcrButton'\);/, 'app should stop referencing OCR helper buttons');
  assert.doesNotMatch(appJs, /function getSelectedSourceText\(/, 'app should remove selected-snippet helper logic');
  assert.doesNotMatch(appJs, /function buildFieldInsertValue\(/, 'app should remove append-helper insertion logic');
  assert.match(appJs, /fieldRefs\.reason\.value = latestSourceText \|\| parsed\.reason \|\| '';/, 'OCR completion should fill the save reason with the raw OCR text first');
});

test('app preprocesses screenshots before OCR to improve recognition quality', () => {
  assert.match(appJs, /async function preprocessImageForOcr\(/, 'app should preprocess screenshots before OCR');
  assert.match(appJs, /canvas\.getContext\('2d'/, 'OCR preprocessing should use a canvas context');
  assert.match(appJs, /ctx\.filter = 'grayscale\(1\) contrast\(1\.35\) brightness\(1\.08\)'/, 'OCR preprocessing should increase grayscale contrast and brightness');
  assert.match(appJs, /window\.Tesseract\.recognize\(preparedImage, 'eng'/, 'OCR should run against the preprocessed image when possible');
});

test('app no longer renders OCR line chips when raw OCR helpers are removed', () => {
  assert.doesNotMatch(appJs, /buildOcrLineSuggestions/, 'app should stop using OCR line suggestion helper output in the UI');
  assert.doesNotMatch(appJs, /const ocrLineSuggestionList = document.getElementById\('ocrLineSuggestionList'\);/, 'app should stop referencing the OCR line suggestion container');
  assert.doesNotMatch(appJs, /function renderOcrLineSuggestions\(/, 'app should remove tappable OCR line chips');
  assert.doesNotMatch(appJs, /applySuggestedOcrLine\(/, 'app should remove one-tap OCR chip insertion');
});

test('app numbers the guided mobile flow buttons so users can follow the order clearly', () => {
  assert.match(appJs, /step1Action: '1\. 이미지 업로드'/, 'Korean upload action should include step number 1');
  assert.match(appJs, /step2Action: '2\. OCR 실행'/, 'Korean OCR action should include step number 2');
  assert.match(appJs, /step3Action: '3\. 주소 확인'/, 'Korean address confirmation action should include step number 3');
  assert.match(appJs, /step4Action: '4\. 저장하기'/, 'Korean save action should include step number 4');
  assert.match(appJs, /cancelEditButton: '4-1\. 수정 취소'/, 'Korean cancel edit action should include a sub-step number');
  assert.match(appJs, /step1Action: '1\. Image Upload'/, 'English upload action should include step number 1');
  assert.match(appJs, /step2Action: '2\. Run OCR'/, 'English OCR action should include step number 2');
  assert.match(appJs, /step3Action: '3\. Check Address'/, 'English address check action should include step number 3');
  assert.match(appJs, /mapBadgeAddress: 'Address Check'/, 'English map badge should use the shorter address check label');
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
