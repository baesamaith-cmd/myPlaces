export function upsertUserPlace(places, nextPlace) {
  const remaining = places.filter((place) => place.id !== nextPlace.id);
  return [nextPlace, ...remaining];
}

export function buildCandidateFromPlace(place) {
  return {
    lat: Number(place.lat),
    lng: Number(place.lng),
    displayName: place.address || place.name || '저장된 장소',
    geocodeSource: place.geocodeSource || 'saved-place',
  };
}
