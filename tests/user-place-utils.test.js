import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidateFromPlace, upsertUserPlace } from '../user-place-utils.js';

test('upsertUserPlace prepends new records', () => {
  const places = [{ id: 'old-1', name: 'Old Place' }];
  const next = upsertUserPlace(places, { id: 'new-1', name: 'New Place' });

  assert.deepEqual(next, [
    { id: 'new-1', name: 'New Place' },
    { id: 'old-1', name: 'Old Place' },
  ]);
});

test('upsertUserPlace replaces an existing record with the same id', () => {
  const places = [
    { id: 'same-1', name: 'Old Title', area: 'Jurong' },
    { id: 'other-1', name: 'Another Place' },
  ];

  const next = upsertUserPlace(places, {
    id: 'same-1',
    name: 'Updated Title',
    area: 'Tiong Bahru',
  });

  assert.deepEqual(next, [
    { id: 'same-1', name: 'Updated Title', area: 'Tiong Bahru' },
    { id: 'other-1', name: 'Another Place' },
  ]);
});

test('buildCandidateFromPlace creates a reusable preview candidate from a saved place', () => {
  assert.deepEqual(
    buildCandidateFromPlace({
      name: 'JJ Sarawak Noodle',
      address: '3 Yung Sheng Rd, Singapore 618499',
      lat: 1.3381,
      lng: 103.7192,
      geocodeSource: 'photon',
    }),
    {
      lat: 1.3381,
      lng: 103.7192,
      displayName: '3 Yung Sheng Rd, Singapore 618499',
      geocodeSource: 'photon',
    }
  );
});

test('buildCandidateFromPlace falls back to the place name when address is missing', () => {
  assert.deepEqual(
    buildCandidateFromPlace({
      name: 'Named Place',
      lat: 1.3,
      lng: 103.8,
    }),
    {
      lat: 1.3,
      lng: 103.8,
      displayName: 'Named Place',
      geocodeSource: 'saved-place',
    }
  );
});
