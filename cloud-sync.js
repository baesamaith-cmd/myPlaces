function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const BLOCKED_PLACE_IDS = new Set([
  'combo-105-is-a-halal-certified-eatery-1778317305824',
  '2-richardlau-co-olla-s42-ft-1777994764037',
  '4nzhe-he-bt-1777993010178',
]);

export function isBlockedPlaceId(id) {
  return typeof id === 'string' && BLOCKED_PLACE_IDS.has(id);
}

export function normalizePlaceTimestamps(place = {}, now = Date.now()) {
  const createdAt = toNumberOrNull(place.createdAt) ?? toNumberOrNull(place.updatedAt) ?? now;
  const updatedAt = toNumberOrNull(place.updatedAt) ?? createdAt;

  return {
    ...place,
    createdAt,
    cloudPending: place.cloudPending === true,
    updatedAt,
  };
}

export function buildSupabaseRows(places = []) {
  return places.filter((place) => !isBlockedPlaceId(place?.id)).map((place) => {
    const normalized = normalizePlaceTimestamps(place);
    const { cloudPending: _cloudPending, ...payload } = normalized;

    return {
      id: normalized.id,
      created_at: normalized.createdAt,
      updated_at: normalized.updatedAt,
      payload,
    };
  });
}

export function hydratePlacesFromRows(rows = []) {
  return rows
    .filter((row) => !isBlockedPlaceId(row?.id || row?.payload?.id))
    .map((row) => {
      const payload = row?.payload;
      if (!payload || typeof payload !== 'object') return null;

      return normalizePlaceTimestamps(
        {
          ...payload,
          cloudPending: false,
          id: payload.id || row.id,
          createdAt: payload.createdAt ?? row.created_at,
          updatedAt: payload.updatedAt ?? row.updated_at,
          lat: Number(payload.lat),
          lng: Number(payload.lng),
        },
        toNumberOrNull(row.updated_at) ?? Date.now()
      );
    })
    .filter((place) => place && typeof place.id === 'string' && Number.isFinite(place.lat) && Number.isFinite(place.lng))
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export function mergePlacesByUpdatedAt(...collections) {
  const merged = new Map();

  collections.flat().forEach((place) => {
    if (!place || typeof place.id !== 'string') return;
    const normalized = normalizePlaceTimestamps(place);
    const current = merged.get(normalized.id);

    if (!current || normalized.updatedAt >= current.updatedAt) {
      merged.set(normalized.id, normalized);
    }
  });

  return [...merged.values()].sort((left, right) => right.updatedAt - left.updatedAt);
}
