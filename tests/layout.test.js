import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('index exposes three primary quick actions at the top of the sidebar', () => {
  const heroSection = html.match(/<section class="hero-card panel">([\s\S]*?)<\/section>/);

  assert.ok(heroSection, 'hero section should exist');
  assert.match(heroSection[1], /class="quick-actions"/, 'quick action row should exist in hero section');
  assert.match(heroSection[1], /for="imageUpload"[^>]*>\s*캡처 이미지 선택\s*</, 'capture select action should be visible at top');
  assert.match(heroSection[1], /id="runOcrButton"[^>]*>\s*OCR 실행\s*</, 'OCR action should be visible at top');
  assert.match(heroSection[1], /id="previewButton"[^>]*>\s*지도에 미리보기\s*</, 'preview action should be visible at top');
});
