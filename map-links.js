function buildQueryValue(place) {
  const lat = Number(place?.lat);
  const lng = Number(place?.lng);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `${lat},${lng}`;
  }

  const fallback = `${place?.address || place?.name || ''}`.trim();
  if (!fallback) {
    throw new Error('Place must include coordinates or an address.');
  }

  return fallback;
}

export function buildGoogleMapsPlaceUrl(place) {
  const query = encodeURIComponent(buildQueryValue(place));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function buildGoogleMapsDirectionsUrl(place) {
  const destination = encodeURIComponent(buildQueryValue(place));
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function buildPlaceActionLinks(place) {
  return {
    viewUrl: buildGoogleMapsPlaceUrl(place),
    directionsUrl: buildGoogleMapsDirectionsUrl(place),
  };
}
