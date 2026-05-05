import { buildPlaceRecord, parseRestaurantFields } from './parser.js';

const STORAGE_KEY = 'myPlaces.userPlaces.v1';
const DEFAULT_CENTER = [1.3521, 103.8198];
const DEFAULT_ZOOM = 12;

const map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

const categoryFilter = document.getElementById('categoryFilter');
const placeList = document.getElementById('placeList');
const placeCount = document.getElementById('placeCount');
const imageUpload = document.getElementById('imageUpload');
const runOcrButton = document.getElementById('runOcrButton');
const previewButton = document.getElementById('previewButton');
const saveParsedPlaceButton = document.getElementById('saveParsedPlace');
const ocrStatus = document.getElementById('ocrStatus');
const selectedFileName = document.getElementById('selectedFileName');
const sourceTextPreview = document.getElementById('sourceTextPreview');
const geocodeCandidates = document.getElementById('geocodeCandidates');

const fieldRefs = {
  name: document.getElementById('parsedName'),
  address: document.getElementById('parsedAddress'),
  hours: document.getElementById('parsedHours'),
  category: document.getElementById('parsedCategory'),
  nearestLandmark: document.getElementById('parsedLandmark'),
  distanceNote: document.getElementById('parsedDistanceNote'),
  priceNote: document.getElementById('parsedPriceNote'),
  area: document.getElementById('parsedArea'),
  description: document.getElementById('parsedDescription'),
};

const markers = [];
let allPlaces = [];
let seedPlaces = [];
let userPlaces = [];
let activeCard = null;
let previewMarker = null;
let latestSourceText = '';
let latestParsedData = null;
let latestGeocodeCandidates = [];
let selectedGeocodeCandidate = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugCategory(text) {
  const value = `${text || ''}`.trim();
  return value || '기타';
}

function inferCategoryFromForm(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  if (/mee|noodle|ramen|면/.test(text)) return '면요리';
  if (/coffee|cafe|bakery|카페/.test(text)) return '카페';
  if (/bbq|bar|cocktail|bar\//.test(text)) return '바/다이닝';
  return '맛집';
}

function buildDescription(place) {
  const fragments = [place.description];
  if (place.address) fragments.push(`주소: ${place.address}`);
  if (place.hours) fragments.push(`영업시간: ${place.hours}`);
  if (place.priceNote) fragments.push(`가격: ${place.priceNote}`);
  return fragments.filter(Boolean).join(' · ');
}

function setStatus(message, variant = 'default') {
  ocrStatus.textContent = message;
  ocrStatus.className = 'status-message';
  if (variant !== 'default') {
    ocrStatus.classList.add(variant);
  }
}

function setActiveCard(cardElement) {
  if (activeCard) activeCard.classList.remove('active');
  activeCard = cardElement;
  if (activeCard) activeCard.classList.add('active');
}

function clearMarkers() {
  markers.forEach((marker) => marker.remove());
  markers.length = 0;
}

function renderCategories(places) {
  const currentValue = categoryFilter.value;
  const categories = [...new Set(places.map((place) => slugCategory(place.category)))].sort();
  categoryFilter.innerHTML = '<option value="all">전체</option>';

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });

  if (categories.includes(currentValue)) {
    categoryFilter.value = currentValue;
  }
}

function clearPreviewMarker() {
  if (previewMarker) {
    previewMarker.remove();
    previewMarker = null;
  }
}

function renderPlaces() {
  const selectedCategory = categoryFilter.value;
  const filteredPlaces =
    selectedCategory === 'all'
      ? allPlaces
      : allPlaces.filter((place) => slugCategory(place.category) === selectedCategory);

  placeCount.textContent = `${filteredPlaces.length}개`;
  placeList.innerHTML = '';
  clearMarkers();
  setActiveCard(null);

  const bounds = [];

  filteredPlaces.forEach((place) => {
    const marker = L.marker([place.lat, place.lng]).addTo(map);
    marker.bindPopup(`
      <div>
        <h3 class="popup-title">${escapeHtml(place.name)}</h3>
        <p class="popup-desc">${escapeHtml(buildDescription(place))}</p>
      </div>
    `);
    markers.push(marker);
    bounds.push([place.lat, place.lng]);

    const item = document.createElement('li');
    item.className = 'place-card';
    item.innerHTML = `
      <h3>${escapeHtml(place.name)}</h3>
      <div class="meta-row">
        <span class="badge">${escapeHtml(slugCategory(place.category))}</span>
        <span class="badge">${escapeHtml(place.area || 'Singapore')}</span>
      </div>
      <p>${escapeHtml(buildDescription(place))}</p>
    `;

    item.addEventListener('click', () => {
      setActiveCard(item);
      map.flyTo([place.lat, place.lng], 16, {
        duration: 0.8,
      });
      marker.openPopup();
    });

    marker.on('click', () => setActiveCard(item));
    placeList.appendChild(item);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40] });
  } else {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  }
}

function loadSavedPlaces() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function persistSavedPlaces() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(userPlaces));
}

function updateAllPlaces() {
  allPlaces = [...userPlaces, ...seedPlaces];
  renderCategories(allPlaces);
  renderPlaces();
}

function populateForm(parsed) {
  fieldRefs.name.value = parsed.name || '';
  fieldRefs.address.value = parsed.address || '';
  fieldRefs.hours.value = parsed.hours || '';
  fieldRefs.category.value = parsed.category || inferCategoryFromForm(parsed.name, parsed.description);
  fieldRefs.nearestLandmark.value = parsed.nearestLandmark || '';
  fieldRefs.distanceNote.value = parsed.distanceNote || '';
  fieldRefs.priceNote.value = parsed.priceNote || '';
  fieldRefs.area.value = parsed.area || 'Singapore';
  fieldRefs.description.value = parsed.description || '';
}

function readFormDraft() {
  const name = fieldRefs.name.value.trim();
  const description = fieldRefs.description.value.trim();

  return {
    ...latestParsedData,
    name,
    address: fieldRefs.address.value.trim(),
    hours: fieldRefs.hours.value.trim(),
    category: fieldRefs.category.value.trim() || inferCategoryFromForm(name, description),
    nearestLandmark: fieldRefs.nearestLandmark.value.trim(),
    distanceNote: fieldRefs.distanceNote.value.trim(),
    priceNote: fieldRefs.priceNote.value.trim(),
    area: fieldRefs.area.value.trim() || 'Singapore',
    description,
    sourceText: latestSourceText,
    sourceType: 'image',
  };
}

function renderCandidateList(candidates) {
  latestGeocodeCandidates = candidates;

  if (!candidates.length) {
    geocodeCandidates.className = 'candidate-list empty-state';
    geocodeCandidates.textContent = '위치 후보를 찾지 못했습니다. 주소를 수정한 뒤 다시 시도해보세요.';
    selectedGeocodeCandidate = null;
    clearPreviewMarker();
    return;
  }

  geocodeCandidates.className = 'candidate-list';
  geocodeCandidates.innerHTML = '';

  candidates.forEach((candidate, index) => {
    const label = document.createElement('label');
    label.className = 'candidate-card';
    if (index === 0) label.classList.add('selected');
    label.innerHTML = `
      <div>
        <span class="candidate-title">
          <input type="radio" name="geocodeCandidate" value="${index}" ${index === 0 ? 'checked' : ''} />
          후보 ${index + 1}
        </span>
        <p class="candidate-description">${escapeHtml(candidate.displayName)}</p>
      </div>
    `;

    label.addEventListener('change', () => {
      selectCandidate(index);
    });
    label.addEventListener('click', () => {
      selectCandidate(index);
    });

    geocodeCandidates.appendChild(label);
  });

  selectCandidate(0);
}

function selectCandidate(index) {
  selectedGeocodeCandidate = latestGeocodeCandidates[index] || null;

  [...geocodeCandidates.querySelectorAll('.candidate-card')].forEach((node, nodeIndex) => {
    node.classList.toggle('selected', nodeIndex === index);
    const radio = node.querySelector('input[type="radio"]');
    if (radio) radio.checked = nodeIndex === index;
  });

  if (!selectedGeocodeCandidate) {
    clearPreviewMarker();
    return;
  }

  const lat = Number(selectedGeocodeCandidate.lat);
  const lng = Number(selectedGeocodeCandidate.lng);
  clearPreviewMarker();
  previewMarker = L.circleMarker([lat, lng], {
    radius: 10,
    weight: 3,
    color: '#be123c',
    fillColor: '#fb7185',
    fillOpacity: 0.8,
  }).addTo(map);

  const draft = readFormDraft();
  previewMarker.bindPopup(`
    <div>
      <h3 class="popup-title">${escapeHtml(draft.name || '미리보기 장소')}</h3>
      <p class="popup-desc">${escapeHtml(draft.address || selectedGeocodeCandidate.displayName)}</p>
    </div>
  `);
  previewMarker.openPopup();
  map.flyTo([lat, lng], 16, { duration: 0.8 });
}

function uniqueQueries(values) {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = String(value || '').trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function buildGeocodeQueries(draft) {
  const normalizedAddress = String(draft.address || '')
    .replace(/,\s*#?\d{1,3}-\d{1,4}(?=,|\s|$)/g, '')
    .replace(/\bRd\b/g, 'Road')
    .replace(/\bSt\b/g, 'Street')
    .replace(/\bAve\b/g, 'Avenue')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const postcodeMatch = normalizedAddress.match(/\b(\d{6})\b/);
  const postcode = postcodeMatch ? postcodeMatch[1] : '';

  return uniqueQueries([
    draft.address,
    normalizedAddress,
    postcode ? `${postcode} Singapore` : '',
    [draft.name, normalizedAddress, 'Singapore'].filter(Boolean).join(', '),
    [draft.name, draft.area, 'Singapore'].filter(Boolean).join(', '),
    [draft.name, 'Singapore'].filter(Boolean).join(', '),
  ]);
}

async function requestPhotonGeocode(query) {
  const url = new URL('https://photon.komoot.io/api/');
  url.searchParams.set('limit', '3');
  url.searchParams.set('q', query);

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Photon 지오코딩 실패: ${response.status}`);
  }

  const payload = await response.json();
  const features = Array.isArray(payload.features) ? payload.features : [];

  return features
    .map((feature) => {
      const coordinates = feature?.geometry?.coordinates || [];
      const props = feature?.properties || {};
      const lng = Number(coordinates[0]);
      const lat = Number(coordinates[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

      const displayName = [
        props.name,
        props.street && props.housenumber ? `${props.housenumber} ${props.street}` : props.street,
        props.locality,
        props.district,
        props.city,
        props.postcode,
      ]
        .filter(Boolean)
        .join(', ');

      return {
        lat,
        lng,
        displayName: displayName || query,
        geocodeSource: 'photon',
      };
    })
    .filter(Boolean);
}

async function geocodeDraft(draft) {
  const queries = buildGeocodeQueries(draft);
  const seen = new Set();
  const results = [];
  const providerErrors = [];

  for (const query of queries) {
    try {
      const candidates = await requestPhotonGeocode(query);
      candidates.forEach((item) => {
        const key = `${item.lat}:${item.lng}:${item.displayName}`;
        if (seen.has(key)) return;
        seen.add(key);
        results.push(item);
      });
      if (results.length) break;
    } catch (error) {
      providerErrors.push(error.message);
    }
  }

  if (!results.length && providerErrors.length) {
    throw new Error(providerErrors[providerErrors.length - 1]);
  }

  return results.slice(0, 3);
}

async function runOcr(file) {
  if (!window.Tesseract) {
    throw new Error('Tesseract.js를 불러오지 못했습니다.');
  }

  const result = await window.Tesseract.recognize(file, 'eng');
  return result.data.text;
}

async function handleRunOcr() {
  const [file] = imageUpload.files;
  if (!file) {
    setStatus('먼저 이미지를 선택해주세요.', 'error');
    return;
  }

  try {
    setStatus('OCR 실행 중… 이미지에서 텍스트를 읽고 있어요. 첫 실행은 10~30초 정도 걸릴 수 있어요.');
    runOcrButton.disabled = true;
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    const rawText = await runOcr(file);
    latestSourceText = rawText.trim();
    const parsed = parseRestaurantFields(rawText);
    parsed.category = inferCategoryFromForm(parsed.name, parsed.description);
    latestParsedData = parsed;
    populateForm(parsed);
    sourceTextPreview.textContent = parsed.sourceText || '텍스트를 추출하지 못했습니다.';
    renderCandidateList([]);
    setStatus('OCR 완료. 추출된 필드를 확인하고 지도 미리보기를 눌러주세요.', 'success');
  } catch (error) {
    console.error(error);
    setStatus(`OCR 실패: ${error.message}`, 'error');
  } finally {
    runOcrButton.disabled = false;
  }
}

async function handlePreview() {
  const draft = readFormDraft();
  if (!draft.name) {
    setStatus('가게 이름이 비어 있습니다. OCR 결과를 확인하거나 직접 입력해주세요.', 'error');
    return;
  }

  try {
    previewButton.disabled = true;
    setStatus('위치 후보를 찾는 중…');
    const candidates = await geocodeDraft(draft);
    renderCandidateList(candidates);
    if (candidates.length) {
      setStatus('위치 후보를 찾았습니다. 후보를 확인한 뒤 저장할 수 있어요.', 'success');
    } else {
      setStatus('후보를 찾지 못했습니다. 주소나 이름을 조금 더 구체적으로 수정해보세요.', 'error');
    }
  } catch (error) {
    console.error(error);
    setStatus(`미리보기 실패: ${error.message}`, 'error');
  } finally {
    previewButton.disabled = false;
  }
}

function handleSave() {
  const draft = readFormDraft();
  if (!draft.name) {
    setStatus('저장하려면 가게 이름이 필요합니다.', 'error');
    return;
  }
  if (!selectedGeocodeCandidate) {
    setStatus('먼저 지도에 미리보기로 위치 후보를 선택해주세요.', 'error');
    return;
  }

  const placeRecord = buildPlaceRecord({
    ...draft,
    lat: selectedGeocodeCandidate.lat,
    lng: selectedGeocodeCandidate.lng,
    geocodeSource: selectedGeocodeCandidate.geocodeSource,
  });

  userPlaces = [placeRecord, ...userPlaces];
  persistSavedPlaces();
  updateAllPlaces();
  setStatus(`'${placeRecord.name}' 저장 완료. localStorage에 보관했어요.`, 'success');
}

async function init() {
  try {
    const response = await fetch('./data/restaurants.json');
    if (!response.ok) {
      throw new Error(`데이터를 불러오지 못했습니다: ${response.status}`);
    }

    seedPlaces = await response.json();
    userPlaces = loadSavedPlaces();
    updateAllPlaces();
  } catch (error) {
    console.error(error);
    placeList.innerHTML = '<li class="place-card">데이터를 불러오지 못했습니다.</li>';
    setStatus('초기 데이터를 불러오지 못했습니다.', 'error');
  }
}

imageUpload.addEventListener('change', () => {
  const [file] = imageUpload.files;
  selectedFileName.textContent = file ? `선택된 파일: ${file.name}` : '선택된 파일이 없습니다.';
});

runOcrButton.addEventListener('click', handleRunOcr);
previewButton.addEventListener('click', handlePreview);
saveParsedPlaceButton.addEventListener('click', handleSave);
categoryFilter.addEventListener('change', renderPlaces);

init();
