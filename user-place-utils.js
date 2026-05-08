function normalizeComparisonText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function upsertUserPlace(places, nextPlace) {
  const remaining = places.filter((place) => place.id !== nextPlace.id);
  return [nextPlace, ...remaining];
}

export function removeUserPlace(places, placeId) {
  return places.filter((place) => place.id !== placeId);
}

export function findDuplicatePlace(places, candidatePlace) {
  const candidateName = normalizeComparisonText(candidatePlace?.name);
  const candidateAddress = normalizeComparisonText(candidatePlace?.address);
  if (!candidateName || !candidateAddress) return null;

  return (
    places.find((place) => {
      if (!place || place.id === candidatePlace?.id) return false;
      return (
        normalizeComparisonText(place.name) === candidateName
        && normalizeComparisonText(place.address) === candidateAddress
      );
    }) || null
  );
}

export function buildCandidateFromPlace(place) {
  return {
    lat: Number(place.lat),
    lng: Number(place.lng),
    displayName: place.address || place.name || '저장된 장소',
    geocodeSource: place.geocodeSource || 'saved-place',
  };
}
