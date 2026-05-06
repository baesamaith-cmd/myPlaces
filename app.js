import { buildPlaceRecord, parseRestaurantFields } from './parser.js';
import {
  buildSupabaseRows,
  hydratePlacesFromRows,
  mergePlacesByUpdatedAt,
  normalizePlaceTimestamps,
} from './cloud-sync.js';
import { buildPlaceActionLinks } from './map-links.js';
import { parseImportedPlaces, serializePlaces } from './storage-transfer.js';
import { buildCandidateFromPlace, upsertUserPlace } from './user-place-utils.js';

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
const exportJsonButton = document.getElementById('exportJsonButton');
const importJsonInput = document.getElementById('importJsonInput');
const importJsonButton = document.getElementById('importJsonButton');
const syncEmailInput = document.getElementById('syncEmailInput');
const sendMagicLinkButton = document.getElementById('sendMagicLinkButton');
const syncNowButton = document.getElementById('syncNowButton');
const signOutButton = document.getElementById('signOutButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const ocrStatus = document.getElementById('ocrStatus');
const syncStatus = document.getElementById('syncStatus');
const selectedFileName = document.getElementById('selectedFileName');
const sourceTextPreview = document.getElementById('sourceTextPreview');
const geocodeCandidates = document.getElementById('geocodeCandidates');
const editModeHint = document.getElementById('editModeHint');

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
let editingPlaceId = null;
let supabaseClient = null;
let currentSession = null;

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

function setSyncStatus(message, variant = 'default') {
  syncStatus.textContent = message;
  syncStatus.className = 'status-message';
  if (variant !== 'default') {
    syncStatus.classList.add(variant);
  }
}

function getSupabaseConfig() {
  return window.MYPLACES_SUPABASE_CONFIG || {};
}

function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey);
}

function ensureSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!isSupabaseConfigured()) return null;
  if (!window.supabase?.createClient) {
    throw new Error('Supabase SDK를 불러오지 못했습니다.');
  }

  const { url, anonKey } = getSupabaseConfig();
  supabaseClient = window.supabase.createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return supabaseClient;
}

function hasCloudSession() {
  return Boolean(currentSession?.user?.id);
}

function updateSyncControls() {
  const configured = isSupabaseConfigured();
  const signedIn = hasCloudSession();

  syncEmailInput.disabled = !configured || signedIn;
  sendMagicLinkButton.disabled = !configured || signedIn;
  syncNowButton.disabled = !configured || !signedIn;
  signOutButton.disabled = !configured || !signedIn;

  if (signedIn && currentSession?.user?.email) {
    syncEmailInput.value = currentSession.user.email;
  }
}

function updateFormMode() {
  const isEditing = Boolean(editingPlaceId);
  saveParsedPlaceButton.textContent = isEditing ? '수정 저장' : '저장하기';
  cancelEditButton.hidden = !isEditing;
  editModeHint.textContent = isEditing
    ? '저장된 장소를 수정 중입니다. 필요하면 제목/주소를 바꾸고 다시 저장하세요.'
    : '새 장소 저장 모드입니다.';
}

function startEditingPlace(place) {
  editingPlaceId = place.id;
  latestParsedData = { ...place };
  latestSourceText = place.sourceText || '';
  populateForm(place);
  renderCandidateList([buildCandidateFromPlace(place)]);
  updateFormMode();
  setStatus(`'${place.name}' 수정 모드입니다. 필드를 바꾸고 다시 저장하세요.`, 'success');
}

function stopEditingPlace() {
  editingPlaceId = null;
  latestGeocodeCandidates = [];
  selectedGeocodeCandidate = null;
  clearPreviewMarker();
  geocodeCandidates.className = 'candidate-list empty-state';
  geocodeCandidates.textContent = '아직 위치 후보가 없습니다.';
  updateFormMode();
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

function isPlaceCardActionTarget(target) {
  return Boolean(target?.closest('.place-edit-button, .place-action-link'));
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
    const actionLinks = buildPlaceActionLinks(place);
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
      <div class="place-card-glow"></div>
      <div class="place-card-head">
        <div>
          <h3>${escapeHtml(place.name)}</h3>
          <p class="place-card-address">${escapeHtml(place.address || '주소 정보 없음')}</p>
        </div>
        <button type="button" class="place-edit-button">수정하기</button>
      </div>
      <div class="meta-row place-meta-row">
        <span class="badge">${escapeHtml(slugCategory(place.category))}</span>
        <span class="badge">${escapeHtml(place.area || 'Singapore')}</span>
      </div>
      <p>${escapeHtml(buildDescription(place))}</p>
      <div class="place-actions">
        <a
          class="place-action-link"
          href="${escapeHtml(actionLinks.viewUrl)}"
          target="_blank"
          rel="noreferrer noopener"
        >
          <span class="google-maps-icon" aria-hidden="true">
            <span class="gm-pin-head"></span>
            <span class="gm-pin-tail"></span>
          </span>
          <span>구글맵에서 보기</span>
        </a>
        <a
          class="place-action-link secondary"
          href="${escapeHtml(actionLinks.directionsUrl)}"
          target="_blank"
          rel="noreferrer noopener"
        >
          <span class="google-maps-icon route" aria-hidden="true">
            <span class="gm-pin-head"></span>
            <span class="gm-pin-tail"></span>
          </span>
          <span>길찾기</span>
        </a>
      </div>
    `;

    const editButton = item.querySelector('.place-edit-button');
    editButton?.addEventListener('click', (event) => {
      event.stopPropagation();
      startEditingPlace(place);
    });

    item.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    });

    item.addEventListener('click', (event) => {
      if (isPlaceCardActionTarget(event.target)) {
        return;
      }
      setActiveCard(item);
      map.flyTo([place.lat, place.lng], 16, {
        duration: 0.8,
      });
      marker.openPopup();
    });

    marker.on('click', () => setActiveCard(item));
    placeList.appendChild(item);
  });

  if (!filteredPlaces.length) {
    const item = document.createElement('li');
    item.className = 'place-card empty-place-card';
    item.innerHTML = `
      <h3>아직 저장된 장소가 없습니다</h3>
      <p>OCR로 새 맛집을 추가하면 이 리스트와 지도에 바로 나타납니다.</p>
    `;
    placeList.appendChild(item);
  }

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
    return Array.isArray(parsed) ? parsed.map((place) => normalizePlaceTimestamps(place)) : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function persistSavedPlaces() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(userPlaces.map((place) => normalizePlaceTimestamps(place)))
  );
}

async function fetchRemotePlaces(userId) {
  const client = ensureSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('places')
    .select('id, created_at, updated_at, payload')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`클라우드 장소를 불러오지 못했습니다: ${error.message}`);
  }

  return hydratePlacesFromRows(data || []);
}

async function pushPlacesToCloud(userId, places) {
  const client = ensureSupabaseClient();
  if (!client || !places.length) return;

  const { error } = await client.from('places').upsert(buildSupabaseRows(userId, places), {
    onConflict: 'user_id,id',
  });

  if (error) {
    throw new Error(`클라우드 저장에 실패했습니다: ${error.message}`);
  }
}

async function syncPlacesWithCloud(options = {}) {
  const { announce = true } = options;
  const client = ensureSupabaseClient();
  const userId = currentSession?.user?.id;

  if (!client || !userId) {
    updateSyncControls();
    if (announce) {
      setSyncStatus('로그인하면 Supabase와 기기 간 자동 동기화를 시작할 수 있어요.');
    }
    return;
  }

  syncNowButton.disabled = true;
  if (announce) {
    setSyncStatus('클라우드 동기화 중… 다른 기기 데이터와 병합하고 있어요.');
  }

  try {
    const remotePlaces = await fetchRemotePlaces(userId);
    userPlaces = mergePlacesByUpdatedAt(userPlaces, remotePlaces);
    persistSavedPlaces();
    updateAllPlaces();
    await pushPlacesToCloud(userId, userPlaces);
    setSyncStatus(`클라우드 동기화 완료. ${userPlaces.length}개 장소가 모든 기기에서 같아졌어요.`, 'success');
  } catch (error) {
    console.error(error);
    setSyncStatus(`클라우드 동기화 실패: ${error.message}`, 'error');
  } finally {
    updateSyncControls();
  }
}

async function restoreCloudSession() {
  updateSyncControls();

  if (!isSupabaseConfigured()) {
    setSyncStatus('config.js에 Supabase URL과 anon key를 넣으면 기기 간 자동 동기화를 켤 수 있어요.');
    return;
  }

  const client = ensureSupabaseClient();
  if (!client) {
    setSyncStatus('Supabase 클라이언트를 만들지 못했습니다.', 'error');
    return;
  }

  const { data, error } = await client.auth.getSession();
  if (error) {
    throw new Error(`세션을 확인하지 못했습니다: ${error.message}`);
  }

  currentSession = data.session;
  updateSyncControls();

  client.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    updateSyncControls();
    if (session?.user) {
      setSyncStatus(`${session.user.email || '로그인한 계정'}으로 연결됨. 클라우드와 자동 동기화합니다.`, 'success');
      void syncPlacesWithCloud();
    } else {
      setSyncStatus('로그아웃 상태입니다. 로컬 저장은 계속 되지만 기기 간 동기화는 멈춰 있어요.');
    }
  });

  if (currentSession?.user) {
    setSyncStatus(`${currentSession.user.email || '로그인한 계정'}으로 연결됨. 클라우드와 자동 동기화합니다.`, 'success');
    await syncPlacesWithCloud({ announce: false });
    return;
  }

  setSyncStatus('이메일을 입력하고 매직링크를 받으면 다른 기기에서도 같은 맛집 목록을 바로 불러올 수 있어요.');
}

function buildExportFileName() {
  const date = new Date().toISOString().slice(0, 10);
  return `myplaces-export-${date}.json`;
}

function mergeImportedPlaces(importedPlaces) {
  return mergePlacesByUpdatedAt(userPlaces, importedPlaces);
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
    sourceText: latestSourceText || latestParsedData?.sourceText || '',
    sourceType: latestParsedData?.sourceType || 'image',
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
    stopEditingPlace();
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

  const saveTimestamp = Date.now();
  const placeRecord = buildPlaceRecord({
    ...draft,
    id: editingPlaceId || draft.id,
    lat: selectedGeocodeCandidate.lat,
    lng: selectedGeocodeCandidate.lng,
    geocodeSource: selectedGeocodeCandidate.geocodeSource,
    createdAt: draft.createdAt,
    updatedAt: saveTimestamp,
  });

  userPlaces = upsertUserPlace(userPlaces, placeRecord).map((place) => normalizePlaceTimestamps(place));
  persistSavedPlaces();
  updateAllPlaces();
  const message = editingPlaceId
    ? `'${placeRecord.name}' 수정 완료. 저장된 장소 정보를 업데이트했어요.`
    : `'${placeRecord.name}' 저장 완료. 이 기기에 바로 보관했어요.`;
  stopEditingPlace();
  setStatus(message, 'success');

  if (hasCloudSession()) {
    void syncPlacesWithCloud({ announce: true });
  }
}

function handleExportJson() {
  const payload = serializePlaces(userPlaces);
  const blob = new Blob([payload], { type: 'application/json' });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = buildExportFileName();
  link.click();
  URL.revokeObjectURL(blobUrl);
  setStatus(`JSON 내보내기 완료. 현재 ${userPlaces.length}개 장소를 파일로 저장했어요.`, 'success');
}

async function handleImportJson() {
  const [file] = importJsonInput.files;
  if (!file) {
    setStatus('먼저 불러올 JSON 파일을 선택해주세요.', 'error');
    return;
  }

  try {
    importJsonButton.disabled = true;
    const text = await file.text();
    const importedPlaces = parseImportedPlaces(text);
    userPlaces = mergeImportedPlaces(importedPlaces).map((place) => normalizePlaceTimestamps(place));
    persistSavedPlaces();
    updateAllPlaces();
    setStatus(`JSON 불러오기 완료. ${importedPlaces.length}개 장소를 반영했어요.`, 'success');
    importJsonInput.value = '';

    if (hasCloudSession()) {
      void syncPlacesWithCloud({ announce: true });
    }
  } catch (error) {
    console.error(error);
    setStatus(`JSON 불러오기 실패: ${error.message}`, 'error');
  } finally {
    importJsonButton.disabled = false;
  }
}

async function handleSendMagicLink() {
  const email = syncEmailInput.value.trim();
  if (!email) {
    setSyncStatus('먼저 로그인할 이메일 주소를 입력해주세요.', 'error');
    return;
  }

  try {
    const client = ensureSupabaseClient();
    if (!client) {
      setSyncStatus('config.js에 Supabase URL과 anon key를 먼저 넣어주세요.', 'error');
      return;
    }

    sendMagicLinkButton.disabled = true;
    const redirectTo = window.location.href.split('#')[0];
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    setSyncStatus('매직링크를 이메일로 보냈어요. 링크를 연 기기에서 바로 같은 맛집 목록을 불러옵니다.', 'success');
  } catch (error) {
    console.error(error);
    setSyncStatus(`매직링크 전송 실패: ${error.message}`, 'error');
  } finally {
    updateSyncControls();
  }
}

async function handleSyncNow() {
  await syncPlacesWithCloud({ announce: true });
}

async function handleSignOut() {
  try {
    const client = ensureSupabaseClient();
    if (!client) {
      setSyncStatus('아직 Supabase가 설정되지 않았어요.');
      return;
    }

    signOutButton.disabled = true;
    const { error } = await client.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }

    currentSession = null;
    updateSyncControls();
    setSyncStatus('로그아웃했어요. 현재 기기 localStorage는 남아 있고 클라우드 동기화만 멈췄어요.');
  } catch (error) {
    console.error(error);
    setSyncStatus(`로그아웃 실패: ${error.message}`, 'error');
  } finally {
    updateSyncControls();
  }
}

async function init() {
  try {
    const response = await fetch('./data/restaurants.json');
    if (!response.ok) {
      throw new Error(`데이터를 불러오지 못했습니다: ${response.status}`);
    }

    seedPlaces = await response.json();
    userPlaces = loadSavedPlaces();
    updateFormMode();
    updateAllPlaces();
  } catch (error) {
    console.error(error);
    placeList.innerHTML = '<li class="place-card">데이터를 불러오지 못했습니다.</li>';
    setStatus('초기 데이터를 불러오지 못했습니다.', 'error');
    setSyncStatus('로컬 데이터 초기화가 먼저 실패했어요.', 'error');
    return;
  }

  try {
    await restoreCloudSession();
  } catch (error) {
    console.error(error);
    setSyncStatus('클라우드 초기화에 실패했어요. README의 Supabase 설정을 다시 확인해주세요.', 'error');
  }
}

imageUpload.addEventListener('change', () => {
  const [file] = imageUpload.files;
  selectedFileName.textContent = file ? `선택된 파일: ${file.name}` : '선택된 파일이 없습니다.';
});

cancelEditButton.addEventListener('click', () => {
  stopEditingPlace();
  setStatus('수정 모드를 종료했어요. 새 장소를 저장하거나 다른 장소를 다시 선택할 수 있어요.');
});

runOcrButton.addEventListener('click', handleRunOcr);
previewButton.addEventListener('click', handlePreview);
saveParsedPlaceButton.addEventListener('click', handleSave);
exportJsonButton.addEventListener('click', handleExportJson);
importJsonButton.addEventListener('click', handleImportJson);
sendMagicLinkButton.addEventListener('click', handleSendMagicLink);
syncNowButton.addEventListener('click', handleSyncNow);
signOutButton.addEventListener('click', handleSignOut);
categoryFilter.addEventListener('change', renderPlaces);

init();
