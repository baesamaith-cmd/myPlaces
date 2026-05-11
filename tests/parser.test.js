import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeOcrText,
  parseRestaurantFields,
  buildPlaceRecord,
} from '../parser.js';

const sampleText = `foodstamp.sg Singapore
Jurong's best authentic Sarawak Mee at $4.50
Nearby Lakeside MRT Station (1.6km)
JJ Sarawak Noodle
3 Yung Sheng Rd, 03-127, Singapore 618499
7AM - 7.30PM`;

test('normalizeOcrText collapses repeated whitespace and blank lines', () => {
  const normalized = normalizeOcrText(' A   B ?\n\n\n C  ');
  assert.equal(normalized, 'A B\n\nC');
});

test('normalizeOcrText removes OCR question-mark noise from mixed text', () => {
  const normalized = normalizeOcrText('JJ ? Sarawak？？ Noodle\n3 Yung Sheng Rd ? Singapore 618499');
  assert.equal(normalized, 'JJ Sarawak Noodle\n3 Yung Sheng Rd Singapore 618499');
});

test('parseRestaurantFields extracts simplified restaurant fields from screenshot text', () => {
  const parsed = parseRestaurantFields(sampleText);

  assert.equal(parsed.name, 'JJ Sarawak Noodle');
  assert.equal(parsed.address, '3 Yung Sheng Rd, 03-127, Singapore 618499');
  assert.match(parsed.reason, /Jurong's best authentic Sarawak Mee/);
  assert.match(parsed.reason, /\$4.50/);
});

test('parseRestaurantFields prefers a likely single-line shop name over marketing copy', () => {
  const parsed = parseRestaurantFields(`foodstamp.sg Singapore
Best brunch in Bugis
Seng House
12 Liang Seah Street, Singapore 189033
Open daily 8AM - 8PM`);

  assert.equal(parsed.name, 'Seng House');
  assert.equal(parsed.address, '12 Liang Seah Street, Singapore 189033');
});

test('parseRestaurantFields prefers uppercase single-line venue names before longer description lines', () => {
  const parsed = parseRestaurantFields(`featured by foodies
AMOY STREET NASI LEMAK
crispy chicken wing, sambal and otah
7 Maxwell Road, Singapore 069111`);

  assert.equal(parsed.name, 'AMOY STREET NASI LEMAK');
  assert.equal(parsed.address, '7 Maxwell Road, Singapore 069111');
});

test('buildPlaceRecord creates a map-ready place object with simplified fields', () => {
  const before = Date.now();
  const record = buildPlaceRecord({
    ...parseRestaurantFields(sampleText),
    lat: 1.3381,
    lng: 103.7192,
    geocodeSource: 'mock',
  });
  const after = Date.now();

  assert.equal(record.name, 'JJ Sarawak Noodle');
  assert.equal(record.reason.includes('Sarawak Mee'), true);
  assert.equal(record.sourceType, 'image');
  assert.equal(record.lat, 1.3381);
  assert.equal(record.lng, 103.7192);
  assert.match(record.id, /^jj-sarawak-noodle-/);
  assert.equal(record.address, '3 Yung Sheng Rd, 03-127, Singapore 618499');
  assert.ok(record.createdAt >= before && record.createdAt <= after);
  assert.equal(record.updatedAt, record.createdAt);
});

test('buildPlaceRecord preserves existing sync metadata for saved-place edits', () => {
  const record = buildPlaceRecord({
    id: 'saved-place-1',
    name: 'Edited Place',
    reason: '좋아서 다시 저장',
    lat: 1.3,
    lng: 103.8,
    createdAt: 1700000000000,
    updatedAt: 1700000009999,
  });

  assert.equal(record.id, 'saved-place-1');
  assert.equal(record.createdAt, 1700000000000);
  assert.equal(record.updatedAt, 1700000009999);
});
