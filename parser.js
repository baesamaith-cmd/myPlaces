const AREA_KEYWORDS = ['Jurong', 'Bugis', 'Chinatown', 'Tiong Bahru', 'CBD', 'Dempsey', 'Orchard'];

export function normalizeOcrText(text = '') {
  return String(text)
    .replace(/[?？]+/g, ' ')
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
    lines.find(
      (line) =>
        /Singapore\s*\d{6}/i.test(line) ||
        (/\b(?:Rd|Road|St|Street|Ave|Avenue|Dr|Drive|Lane|Lor|Jln)\b/i.test(line) && /\d/.test(line))
    ) ||
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
  const line = lines.find((value) => /best|authentic|famous|must-try|추천|맛집|signature|special|why/i.test(value));
  if (!line) return '';
  return line.replace(/\s+at\s+\$\d+(?:\.\d{1,2})?/i, '').trim();
}

function scoreNameCandidate(line, index, addressIndex) {
  let score = 0;
  const wordCount = line.split(/\s+/).filter(Boolean).length;
  const upperOnly = line.replace(/[^A-Z]/g, '').length;
  const lettersOnly = line.replace(/[^A-Za-z]/g, '').length;

  if (!/\d/.test(line)) score += 4;
  if (wordCount >= 1 && wordCount <= 4) score += 3;
  if (wordCount >= 5 && wordCount <= 6) score += 1;
  if (lettersOnly > 0 && upperOnly / lettersOnly >= 0.75) score += 3;
  if (addressIndex > 0 && index === addressIndex - 1) score += 4;
  if (/&|'/i.test(line)) score += 1;

  if (/best|authentic|famous|must-try|featured|open|daily|nearby|station|recommended|signature|special|why/i.test(line)) score -= 5;
  if (/[,.:]/.test(line)) score -= 2;
  if (wordCount >= 7) score -= 3;
  if (line.length > 40) score -= 2;

  return score;
}

function extractName(lines, address, hours, landmarkLine) {
  const blocked = new Set([address, hours, landmarkLine].filter(Boolean));
  const addressIndex = address ? lines.indexOf(address) : -1;
  const candidates = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => {
      if (!line || blocked.has(line)) return false;
      if (/^foodstamp/i.test(line)) return false;
      if (/Singapore/i.test(line) && line.split(' ').length <= 3) return false;
      if (/\$\d/.test(line)) return false;
      if (/Nearby\b/i.test(line)) return false;
      return /[A-Za-z가-힣]{2,}/.test(line) && line.length <= 50;
    })
    .map(({ line, index }) => ({ line, index, score: scoreNameCandidate(line, index, addressIndex) }))
    .sort((a, b) => b.score - a.score || b.index - a.index);

  return candidates.length ? candidates[0].line : '';
}

function inferArea(text) {
  for (const keyword of AREA_KEYWORDS) {
    if (new RegExp(`\\b${keyword}\\b`, 'i').test(text)) {
      return keyword;
    }
  }
  return 'Singapore';
}

function inferReason(parsed) {
  const fragments = [parsed.description, parsed.dish, parsed.priceNote, parsed.nearestLandmark]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  if (!fragments.length) {
    return '다시 가보고 싶은 맛집';
  }

  return fragments.join(' · ');
}

export function buildOcrLineSuggestions(rawText = '') {
  const sourceText = normalizeOcrText(rawText);
  const lines = sourceText.split('\n').map((line) => line.trim()).filter(Boolean);
  const parsed = parseRestaurantFields(sourceText);
  const suggestions = [];

  const pushSuggestion = (text, field) => {
    const normalized = String(text || '').trim();
    if (!normalized) return;
    if (suggestions.some((item) => item.text === normalized)) return;
    suggestions.push({ text: normalized, field });
  };

  pushSuggestion(parsed.name, 'name');
  pushSuggestion(parsed.address, 'address');
  if (lines.includes(parsed.reason)) {
    pushSuggestion(parsed.reason, 'reason');
  }

  lines.forEach((line) => {
    if (suggestions.length >= 6) return;
    if (line === parsed.name || line === parsed.address || line === parsed.reason) return;
    if (/^foodstamp/i.test(line)) return;
    if (/best|authentic|famous|must-try|featured|open|daily|nearby|station|recommended|signature|special|why/i.test(line) && line !== parsed.reason) return;
    if (/\$\d/.test(line) && !/best|authentic|famous|must-try|signature|special|추천|맛집/i.test(line)) return;

    let field = 'reason';
    if (line === parsed.name) field = 'name';
    else if (line === parsed.address || /Singapore\s*\d{6}/i.test(line) || (/\b(?:Rd|Road|St|Street|Ave|Avenue|Dr|Drive|Lane|Lor|Jln)\b/i.test(line) && /\d/.test(line))) {
      field = 'address';
    } else if (!/\d/.test(line) && line.split(/\s+/).length <= 4 && !/best|authentic|famous|must-try|featured|open|daily|nearby|station|recommended|signature|special|why/i.test(line)) {
      field = 'name';
    }

    pushSuggestion(line, field);
  });

  return suggestions.slice(0, 6);
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

  const parsed = {
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

  return {
    name: parsed.name,
    address: parsed.address,
    reason: inferReason(parsed),
    sourceText: parsed.sourceText,
  };
}

export function buildPlaceRecord(parsed) {
  const timestamp = Date.now();
  const createdAt = Number.isFinite(Number(parsed.createdAt)) ? Number(parsed.createdAt) : timestamp;
  const updatedAt = Number.isFinite(Number(parsed.updatedAt)) ? Number(parsed.updatedAt) : createdAt;

  return {
    id: parsed.id || `${slugify(parsed.name || 'place')}-${timestamp}`,
    name: parsed.name || '이름 미확인 장소',
    address: parsed.address || '',
    reason: parsed.reason || '다시 가보고 싶은 맛집',
    lat: Number(parsed.lat),
    lng: Number(parsed.lng),
    sourceType: parsed.sourceType || 'image',
    sourceText: parsed.sourceText || '',
    geocodeSource: parsed.geocodeSource || '',
    createdAt,
    updatedAt,
  };
}
