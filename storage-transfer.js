function isValidPlaceRecord(place) {
  return (
    place &&
    typeof place.id === 'string' &&
    typeof place.name === 'string' &&
    Number.isFinite(Number(place.lat)) &&
    Number.isFinite(Number(place.lng))
  );
}

export function serializePlaces(places = []) {
  return JSON.stringify(places, null, 2);
}

export function parseImportedPlaces(text = '') {
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error('올바른 JSON 파일이 아닙니다.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('불러온 JSON은 장소 배열이어야 합니다.');
  }

  return parsed
    .filter(isValidPlaceRecord)
    .map((place) => {
      const createdAt = Number.isFinite(Number(place.createdAt))
        ? Number(place.createdAt)
        : Number.isFinite(Number(place.updatedAt))
          ? Number(place.updatedAt)
          : Date.now();
      const updatedAt = Number.isFinite(Number(place.updatedAt)) ? Number(place.updatedAt) : createdAt;

      return {
        ...place,
        lat: Number(place.lat),
        lng: Number(place.lng),
        createdAt,
        updatedAt,
      };
    });
}
