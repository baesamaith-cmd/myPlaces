import test from 'node:test';
import assert from 'node:assert/strict';
import { serializePlaces, parseImportedPlaces } from '../storage-transfer.js';

const samplePlaces = [
  {
    id: 'jj-sarawak-noodle-1',
    name: 'JJ Sarawak Noodle',
    category: '면요리',
    area: 'Jurong',
    lat: 1.3346,
    lng: 103.7216,
    description: 'Jurong best sarawak mee',
    address: '3 Yung Sheng Rd, Singapore 618499',
    hours: '7AM - 7.30PM',
    sourceType: 'image',
    sourceText: 'raw ocr text',
    nearestLandmark: 'Lakeside MRT Station',
    distanceNote: '1.6km',
    priceNote: '$4.50',
    geocodeSource: 'photon',
  },
];

test('serializePlaces creates pretty JSON for download', () => {
  const output = serializePlaces(samplePlaces);
  const parsed = JSON.parse(output);

  assert.deepEqual(parsed, samplePlaces);
  assert.match(output, /\n  \{/);
});

test('parseImportedPlaces accepts valid array payloads', () => {
  const parsed = parseImportedPlaces(JSON.stringify(samplePlaces));
  assert.deepEqual(parsed, samplePlaces);
});

test('parseImportedPlaces rejects invalid JSON structures', () => {
  assert.throws(() => parseImportedPlaces('{"foo":1}'), /배열/);
  assert.throws(() => parseImportedPlaces('not-json'), /JSON/);
});

test('parseImportedPlaces filters out malformed place records', () => {
  const payload = JSON.stringify([
    samplePlaces[0],
    { name: 'Broken place' },
    { ...samplePlaces[0], id: 'bad-lat', lat: 'abc' },
  ]);

  const parsed = parseImportedPlaces(payload);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].id, samplePlaces[0].id);
});
