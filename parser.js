const AREA_KEYWORDS = ['Jurong', 'Bugis', 'Chinatown', 'Tiong Bahru', 'CBD', 'Dempsey', 'Orchard'];

export function normalizeOcrText(text = '') {
  return String(text)
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

function findFirstMatch(lines, matcher) {
  for (const line of lines) {
    const match = matcher(line);
    if (match) return match;
  }
  return null;
}

function extractPrice(text) {
  const match = text.match(/\$\s?\d+(?:\.\d{1,2})?/i);
  return match ? match[0].replace(/\s+/g, '') : '';
}

function extractAddress(lines) {
  return (
    lines.find((line) => /Singapore\s*\d{6}/i.test(line) || /\b(?:Rd|Road|St|Street|Ave|Avenue|Dr|Drive|Lane|Lor|Jln)\b/i.test(line)) ||
    ''
  );
}

function extractHours(lines) {
  return (
    lines.find((line) => /\b\d{1,2}(?::|\.)?\d{0,2}\s?(?:AM|PM)\b/i.test(line) && /[-–]/.test(line)) ||
    ''
  );
}

function extractLandmark(lines) {
  const line = lines.find((value) => /MRT/i.test(value));
  if (!line) return { nearestLandmark: '', distanceNote: '' };

  const distanceMatch = line.match(/\(([^)]+km)\)/i);
  const cleaned = line
    .replace(/^.*?Nearby\s+/i, '')
    .replace(/\([^)]*\)/g, '')
    .trim();

  return {
    nearestLandmark: cleaned,
    distanceNote: distanceMatch ? distanceMatch[1] : '',
  };
}

function extractDescription(lines) {
  const line = lines.find((value) => /best|authentic|famous|must-try|추천|맛집/i.test(value));
  if (!line) return '';
  return line.replace(/\s+at\s+\$\d+(?:\.\d{1,2})?/i, '').trim();
}

function extractName(lines, address, hours, landmarkLine) {
  const blocked = new Set([address, hours, landmarkLine].filter(Boolean));
  const candidates = lines.filter((line) => {
    if (!line || blocked.has(line)) return false;
    if (/^foodstamp/i.test(line)) return false;
    if (/Singapore/i.test(line) && line.split(' ').length <= 3) return false;
    if (/\$\d/.test(line)) return false;
    if (/Nearby\b/i.test(line)) return false;
    return /[A-Za-z]{2,}/.test(line) && line.length <= 40;
  });

  return candidates.length ? candidates[candidates.length - 1] : '';
}

function inferArea(text) {
  for (const keyword of AREA_KEYWORDS) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(text)) {
      return keyword;
    }
  }
  return 'Singapore';
}

function inferCategory(parsed) {
  const text = `${parsed.name} ${parsed.description} ${parsed.dish}`.toLowerCase();
  if (/mee|noodle|noodles|ramen|면/.test(text)) return '면요리';
  if (/bakery|coffee|cafe|카페/.test(text)) return '카페';
  if (/hawker|food centre|호커/.test(text)) return '호커센터';
  return '맛집';
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function parseRestaurantFields(rawText = '') {
  const sourceText = normalizeOcrText(rawText);
  const lines = sourceText.split('\n').map((line) => line.trim()).filter(Boolean);
  const address = extractAddress(lines);
  const hours = extractHours(lines);
  const landmarkData = extractLandmark(lines);
  const landmarkLine = findFirstMatch(lines, (line) => (/MRT/i.test(line) ? line : null));
  const description = extractDescription(lines);
  const priceNote = extractPrice(sourceText);
  const name = extractName(lines, address, hours, landmarkLine);
  const dishMatch = sourceText.match(/Sarawak Mee|Chicken Rice|Laksa|Bak Kut Teh|Nasi Lemak/i);

  return {
    name,
    address,
    hours,
    nearestLandmark: landmarkData.nearestLandmark,
    distanceNote: landmarkData.distanceNote,
    dish: dishMatch ? dishMatch[0] : '',
    description,
    priceNote,
    area: inferArea(sourceText),
    sourceText,
  };
}

export function buildPlaceRecord(parsed) {
  const timestamp = Date.now();
  return {
    id: `${slugify(parsed.name || 'place')}-${timestamp}`,
    name: parsed.name || '이름 미확인 장소',
    category: parsed.category || inferCategory(parsed),
    area: parsed.area || 'Singapore',
    lat: Number(parsed.lat),
    lng: Number(parsed.lng),
    description: parsed.description || parsed.dish || 'OCR에서 추출한 장소',
    address: parsed.address || '',
    hours: parsed.hours || '',
    sourceType: parsed.sourceType || 'image',
    sourceText: parsed.sourceText || '',
    nearestLandmark: parsed.nearestLandmark || '',
    distanceNote: parsed.distanceNote || '',
    priceNote: parsed.priceNote || '',
    geocodeSource: parsed.geocodeSource || '',
  };
}
