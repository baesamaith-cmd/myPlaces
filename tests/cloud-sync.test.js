import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSupabaseRows,
  hydratePlacesFromRows,
  isBlockedPlaceId,
  mergePlacesByUpdatedAt,
  normalizePlaceTimestamps,
} from '../cloud-sync.js';

test('normalizePlaceTimestamps backfills createdAt and updatedAt for legacy records', () => {
  const before = Date.now();
  const normalized = normalizePlaceTimestamps({
    id: 'legacy-1',
    name: 'Legacy Place',
    lat: 1.3,
    lng: 103.8,
  });
  const after = Date.now();

  assert.equal(normalized.id, 'legacy-1');
  assert.ok(normalized.createdAt >= before && normalized.createdAt <= after);
  assert.equal(normalized.updatedAt, normalized.createdAt);
});

test('isBlockedPlaceId recognizes the three quarantined OCR junk records', () => {
  assert.equal(isBlockedPlaceId('combo-105-is-a-halal-certified-eatery-1778317305824'), true);
  assert.equal(isBlockedPlaceId('2-richardlau-co-olla-s42-ft-1777994764037'), true);
  assert.equal(isBlockedPlaceId('4nzhe-he-bt-1777993010178'), true);
  assert.equal(isBlockedPlaceId('combo-105-1778545287766'), false);
});

test('buildSupabaseRows maps saved places into shared upsert rows', () => {
  const rows = buildSupabaseRows([
    {
      cloudPending: true,
      id: 'place-1',
      name: 'JJ Sarawak Noodle',
      lat: 1.3381,
      lng: 103.7192,
      reason: '면이 맛있어서 다시 가고 싶음',
      createdAt: 1700000000000,
      updatedAt: 1700000005000,
    },
  ]);

  assert.deepEqual(rows, [
    {
      id: 'place-1',
      created_at: 1700000000000,
      updated_at: 1700000005000,
      payload: {
        id: 'place-1',
        name: 'JJ Sarawak Noodle',
        lat: 1.3381,
        lng: 103.7192,
        reason: '면이 맛있어서 다시 가고 싶음',
        createdAt: 1700000000000,
        updatedAt: 1700000005000,
      },
    },
  ]);
});

test('buildSupabaseRows skips quarantined OCR junk ids so they cannot be re-uploaded', () => {
  const rows = buildSupabaseRows([
    {
      id: 'combo-105-is-a-halal-certified-eatery-1778317305824',
      name: 'blocked',
      lat: 1.3,
      lng: 103.8,
      reason: 'blocked',
      createdAt: 1,
      updatedAt: 2,
    },
    {
      id: 'safe-1',
      name: 'safe',
      lat: 1.31,
      lng: 103.81,
      reason: 'safe',
      createdAt: 3,
      updatedAt: 4,
    },
  ]);

  assert.deepEqual(rows.map((row) => row.id), ['safe-1']);
});

test('hydratePlacesFromRows restores payloads sorted by newest update first', () => {
  const places = hydratePlacesFromRows([
    {
      id: 'older-1',
      created_at: 1700000000000,
      updated_at: 1700000001000,
      payload: { id: 'older-1', name: 'Older', lat: 1.3, lng: 103.8, reason: 'older reason' },
    },
    {
      id: 'newer-1',
      created_at: 1700000000000,
      updated_at: 1700000009000,
      payload: { id: 'newer-1', name: 'Newer', lat: 1.31, lng: 103.81, reason: 'newer reason' },
    },
  ]);

  assert.deepEqual(places, [
    {
      cloudPending: false,
      id: 'newer-1',
      name: 'Newer',
      lat: 1.31,
      lng: 103.81,
      reason: 'newer reason',
      createdAt: 1700000000000,
      updatedAt: 1700000009000,
    },
    {
      cloudPending: false,
      id: 'older-1',
      name: 'Older',
      lat: 1.3,
      lng: 103.8,
      reason: 'older reason',
      createdAt: 1700000000000,
      updatedAt: 1700000001000,
    },
  ]);
});

test('hydratePlacesFromRows filters quarantined OCR junk ids from remote rows', () => {
  const places = hydratePlacesFromRows([
    {
      id: 'combo-105-is-a-halal-certified-eatery-1778317305824',
      created_at: 1,
      updated_at: 2,
      payload: { id: 'combo-105-is-a-halal-certified-eatery-1778317305824', name: 'blocked', lat: 1.3, lng: 103.8 },
    },
    {
      id: 'safe-1',
      created_at: 3,
      updated_at: 4,
      payload: { id: 'safe-1', name: 'safe', lat: 1.31, lng: 103.81 },
    },
  ]);

  assert.deepEqual(places.map((place) => place.id), ['safe-1']);
});

test('mergePlacesByUpdatedAt keeps the freshest record per id and retains unique records', () => {
  const merged = mergePlacesByUpdatedAt(
    [
      {
        id: 'shared-1',
        name: 'Local Draft',
        lat: 1.3,
        lng: 103.8,
        reason: 'local',
        createdAt: 1700000000000,
        updatedAt: 1700000001000,
      },
      {
        id: 'local-only-1',
        name: 'Local Only',
        lat: 1.31,
        lng: 103.81,
        reason: 'local only',
        createdAt: 1700000000000,
        updatedAt: 1700000002000,
      },
    ],
    [
      {
        id: 'shared-1',
        name: 'Remote Fresh',
        lat: 1.32,
        lng: 103.82,
        reason: 'remote fresh',
        createdAt: 1700000000000,
        updatedAt: 1700000009000,
      },
      {
        id: 'remote-only-1',
        name: 'Remote Only',
        lat: 1.33,
        lng: 103.83,
        reason: 'remote only',
        createdAt: 1700000000000,
        updatedAt: 1700000003000,
      },
    ]
  );

  assert.deepEqual(merged, [
    {
      cloudPending: false,
      id: 'shared-1',
      name: 'Remote Fresh',
      lat: 1.32,
      lng: 103.82,
      reason: 'remote fresh',
      createdAt: 1700000000000,
      updatedAt: 1700000009000,
    },
    {
      cloudPending: false,
      id: 'remote-only-1',
      name: 'Remote Only',
      lat: 1.33,
      lng: 103.83,
      reason: 'remote only',
      createdAt: 1700000000000,
      updatedAt: 1700000003000,
    },
    {
      cloudPending: false,
      id: 'local-only-1',
      name: 'Local Only',
      lat: 1.31,
      lng: 103.81,
      reason: 'local only',
      createdAt: 1700000000000,
      updatedAt: 1700000002000,
    },
  ]);
});
