import { buildPlaceRecord, parseRestaurantFields } from './parser.js';
import {
  buildSupabaseRows,
  hydratePlacesFromRows,
  mergePlacesByUpdatedAt,
  normalizePlaceTimestamps,
} from './cloud-sync.js';
import { buildPlaceActionLinks } from './map-links.js';
import { buildCandidateFromPlace, findDuplicatePlace, upsertUserPlace } from './user-place-utils.js';

const STORAGE_KEY = 'myPlaces.userPlaces.v1';
const DEFAULT_CENTER = [1.3521, 103.8198];
const DEFAULT_ZOOM = 12;

const translations = {
  ko: {
    heroChip: '싱가포르 맛집 지도',
    heroTitle: '맛집 캡처를 바로 지도에 올리기',
    heroSubtitle: '이미지 업로드부터 차례대로 진행하는 모바일 친화 흐름',
    captureKicker: '캡처 저장',
    mvpBadge: 'MVP',
    stepFlowAriaLabel: '맛집 저장 4단계',
    step1Title: '1. 이미지 업로드',
    step1Action: '1. 이미지 업로드',
    step2Title: '2. OCR',
    step2Action: '2. OCR 실행',
    step3Title: '3. 주소 확인',
    step3Action: '3. 주소 확인',
    step4Title: '4. 저장',
    step4Action: '4. 저장하기',
    step4ActionEdit: '수정 저장',
    selectedFileNone: '선택된 파일이 없습니다.',
    selectedFileChosen: '선택된 파일: {fileName}',
    uploadPanelTitle: '한 단계씩 아래로 진행하세요',
    step2Kicker: '2단계',
    step2Body: '이미지를 고른 뒤 OCR을 실행해서 텍스트를 읽어오세요.',
    step3Kicker: '3단계',
    step4Kicker: '4단계',
    stepActionHint: '아래 큰 버튼을 누르면 다음으로 진행됩니다.',
    uploadLabel: '이미지 바꾸기',
    uploadDropzoneTitle: '다른 캡처로 다시 선택',
    uploadDropzoneBody: '파일을 바꾸면 OCR과 주소 확인을 다시 실행할 수 있어요.',
    parsedNameLabel: '가게 이름',
    parsedNamePlaceholder: '예: JJ Sarawak Noodle',
    parsedAddressLabel: '주소',
    parsedAddressPlaceholder: '예: 3 Yung Sheng Rd, 03-127, Singapore 618499',
    parsedReasonLabel: '저장하는 이유',
    parsedReasonPlaceholder: '예: 면이 쫄깃하고 가격이 좋아서 다시 가고 싶음',
    candidateSectionTitle: '위치 후보',
    candidateHelper: '지오코딩 결과',
    candidateListEmpty: '아직 위치 후보가 없습니다.',
    candidateListNotFound: '위치 후보를 찾지 못했습니다. 주소를 수정한 뒤 다시 시도해보세요.',
    candidateLabel: '후보 {index}',
    editModeHintNew: '새 장소 저장 모드입니다.',
    editModeHintEditing: '저장된 장소를 수정 중입니다. 필요하면 제목/주소를 바꾸고 다시 저장하세요.',
    cancelEditButton: '4-1. 수정 취소',
    browseKicker: '둘러보기',
    filterPanelTitle: '저장된 장소 필터',
    categoryFilterLabel: '카테고리',
    categoryAllOption: '전체',
    sharedCloudKicker: '공용 클라우드',
    sharedStorageTitle: '무료 Supabase 공용 저장소',
    syncNowButton: '공용 저장소 새로고침',
    syncStatusConfigHint: 'config.js에 Supabase 정보를 넣으면 여러 사람이 같은 맛집 목록을 함께 볼 수 있어요.',
    syncStatusConfigHintDetailed: 'config.js에 Supabase URL과 anon key를 넣으면 여러 사람이 함께 쓰는 공용 저장소를 켤 수 있어요.',
    syncStatusRunning: '공용 저장소와 동기화 중… 다른 사람이 저장한 장소를 합치고 있어요.',
    syncStatusSuccess: '공용 저장소 동기화 완료. 현재 {count}개 장소가 함께 공유되고 있어요.',
    syncStatusError: '공용 저장소 동기화 실패: {message}',
    syncStatusConnected: '공용 저장소에 연결했어요. 페이지를 열면 자동으로 최신 목록을 받아옵니다.',
    syncStatusClientError: 'Supabase 클라이언트를 만들지 못했습니다.',
    syncStatusInitError: '공용 저장소 초기화에 실패했어요. README의 Supabase 설정을 다시 확인해주세요.',
    collectionKicker: '모음',
    savedPlacesTitle: '저장된 장소',
    placeCount: '{count}개',
    placeActionEdit: '수정하기',
    placeActionView: '구글맵에서 보기',
    placeActionDirections: '길찾기',
    placeAddressMissing: '주소 정보 없음',
    placeReasonMissing: '저장 이유 없음',
    emptyPlacesTitle: '아직 저장된 장소가 없습니다',
    emptyPlacesBody: 'OCR로 새 맛집을 추가하면 이 리스트와 지도에 바로 나타납니다.',
    buildDescriptionAddressPrefix: '주소: {address}',
    previewPlaceFallback: '미리보기 장소',
    candidateSearchInProgress: '주소 후보를 확인하는 중…',
    candidateSearchSuccess: '주소 후보를 찾았습니다. 위치를 확인한 뒤 4단계 저장을 누르세요.',
    candidateSearchNeedInput: '먼저 OCR을 실행하거나 이름/주소를 입력해주세요.',
    candidateSearchNoResult: '후보를 찾지 못했습니다. 주소나 이름을 조금 더 구체적으로 수정해보세요.',
    candidateSearchError: '주소 확인 실패: {message}',
    candidateSearchProviderError: 'Photon 지오코딩 실패: {status}',
    ocrMissingFile: '먼저 이미지를 선택해주세요.',
    ocrRunning: 'OCR 실행 중… 이미지에서 텍스트를 읽고 있어요. 첫 실행은 10~30초 정도 걸릴 수 있어요.',
    ocrSuccess: 'OCR 완료. 추출된 필드를 확인한 뒤 3단계 주소 확인을 눌러주세요.',
    ocrError: 'OCR 실패: {message}',
    tesseractLoadError: 'Tesseract.js를 불러오지 못했습니다.',
    supabaseLoadError: 'Supabase SDK를 불러오지 못했습니다.',
    cloudFetchError: '공용 저장소를 불러오지 못했습니다: {message}',
    cloudPushError: '공용 저장소 저장에 실패했습니다: {message}',
    saveNeedsName: '저장하려면 가게 이름이 필요합니다.',
    saveNeedsCandidate: '먼저 지도에 미리보기로 위치 후보를 선택해주세요.',
    duplicatePlace: "이미 저장된 장소예요: '{name}'. 기존 항목을 수정해주세요.",
    saveSuccessNew: "'{name}' 저장 완료. 이 기기와 공용 목록에 반영할게요.",
    saveSuccessEdit: "'{name}' 수정 완료. 공용 목록에 반영할 준비가 됐어요.",
    editModeStarted: "'{name}' 수정 모드입니다. 필드를 바꾸고 다시 저장하세요.",
    editModeClosed: '수정 모드를 종료했어요. 새 장소를 저장하거나 다른 장소를 다시 선택할 수 있어요.',
    initialDataError: '초기 데이터를 불러오지 못했습니다.',
    localDataInitError: '로컬 데이터 초기화가 먼저 실패했어요.',
    dataLoadFailed: '데이터를 불러오지 못했습니다.',
    liveMapKicker: '실시간 지도',
    mapPanelTitle: '싱가포르 맛집 보기',
    mapBadgeOcr: 'OCR 가져오기',
    mapBadgeAddress: '주소 확인',
    mapAriaLabel: '맛집 지도',
  },
  en: {
    heroChip: 'Singapore Food Map',
    heroTitle: 'Save food finds from screenshots',
    heroSubtitle: 'A mobile-first flow that reveals each step as you go.',
    captureKicker: 'Capture ingestion',
    mvpBadge: 'MVP',
    stepFlowAriaLabel: '4-step place save flow',
    step1Title: '1. Image Upload',
    step1Action: '1. Image Upload',
    step2Title: '2. OCR',
    step2Action: '2. Run OCR',
    step3Title: '3. Confirm Address',
    step3Action: '3. Confirm Address',
    step4Title: '4. Save',
    step4Action: '4. Save Place',
    step4ActionEdit: 'Save Changes',
    selectedFileNone: 'No file selected yet.',
    selectedFileChosen: 'Selected file: {fileName}',
    uploadPanelTitle: 'Move downward one step at a time',
    step2Kicker: 'Step 2',
    step2Body: 'After choosing an image, run OCR to read the text.',
    step3Kicker: 'Step 3',
    step4Kicker: 'Step 4',
    stepActionHint: 'Tap the large button below to move to the next step.',
    uploadLabel: 'Change image',
    uploadDropzoneTitle: 'Pick another screenshot',
    uploadDropzoneBody: 'Change the file to rerun OCR and address confirmation.',
    parsedNameLabel: 'Place name',
    parsedNamePlaceholder: 'e.g. JJ Sarawak Noodle',
    parsedAddressLabel: 'Address',
    parsedAddressPlaceholder: 'e.g. 3 Yung Sheng Rd, 03-127, Singapore 618499',
    parsedReasonLabel: 'Why save it',
    parsedReasonPlaceholder: 'e.g. chewy noodles and good value, want to come back',
    candidateSectionTitle: 'Address candidates',
    candidateHelper: 'Geocoding result',
    candidateListEmpty: 'No address candidates yet.',
    candidateListNotFound: 'No address candidates found. Update the address and try again.',
    candidateLabel: 'Candidate {index}',
    editModeHintNew: 'New place save mode.',
    editModeHintEditing: 'Editing a saved place. Update the name or address, then save again.',
    cancelEditButton: '4-1. Cancel Edit',
    browseKicker: 'Browse',
    filterPanelTitle: 'Filter saved places',
    categoryFilterLabel: 'Category',
    categoryAllOption: 'All',
    sharedCloudKicker: 'Shared cloud',
    sharedStorageTitle: 'Free shared Supabase storage',
    syncNowButton: 'Refresh shared storage',
    syncStatusConfigHint: 'Add Supabase config to share one list with everyone.',
    syncStatusConfigHintDetailed: 'Add the Supabase URL and anon key in config.js to enable a shared place list for everyone.',
    syncStatusRunning: 'Syncing with shared storage… merging places saved by everyone.',
    syncStatusSuccess: 'Shared storage sync complete. {count} places are now shared.',
    syncStatusError: 'Shared storage sync failed: {message}',
    syncStatusConnected: 'Connected to shared storage. The page will pull the latest list automatically.',
    syncStatusClientError: 'Could not create the Supabase client.',
    syncStatusInitError: 'Shared storage initialization failed. Please review the Supabase setup in the README.',
    collectionKicker: 'Collection',
    savedPlacesTitle: 'Saved places',
    placeCount: '{count} places',
    placeActionEdit: 'Edit',
    placeActionView: 'View on Google Maps',
    placeActionDirections: 'Directions',
    placeAddressMissing: 'No address provided',
    placeReasonMissing: 'No note provided',
    emptyPlacesTitle: 'No saved places yet',
    emptyPlacesBody: 'Add a new place with OCR and it will appear here and on the map.',
    buildDescriptionAddressPrefix: 'Address: {address}',
    previewPlaceFallback: 'Preview place',
    candidateSearchInProgress: 'Checking address candidates…',
    candidateSearchSuccess: 'Address candidates found. Confirm the location, then use step 4 to save.',
    candidateSearchNeedInput: 'Run OCR first, or enter a name and address.',
    candidateSearchNoResult: 'No candidates found. Try making the name or address more specific.',
    candidateSearchError: 'Address confirmation failed: {message}',
    candidateSearchProviderError: 'Photon geocoding failed: {status}',
    ocrMissingFile: 'Choose an image first.',
    ocrRunning: 'Running OCR… reading text from the image. The first run may take 10–30 seconds.',
    ocrSuccess: 'OCR complete. Review the fields, then run step 3 to confirm the address.',
    ocrError: 'OCR failed: {message}',
    tesseractLoadError: 'Could not load Tesseract.js.',
    supabaseLoadError: 'Could not load the Supabase SDK.',
    cloudFetchError: 'Could not load shared storage: {message}',
    cloudPushError: 'Failed to save to shared storage: {message}',
    saveNeedsName: 'A place name is required before saving.',
    saveNeedsCandidate: 'Select an address candidate on the map preview first.',
    duplicatePlace: "This place is already saved: '{name}'. Edit the existing item instead.",
    saveSuccessNew: "'{name}' saved. It will be reflected on this device and in the shared list.",
    saveSuccessEdit: "'{name}' updated. It is ready to sync to the shared list.",
    editModeStarted: "Editing '{name}'. Update the fields and save again.",
    editModeClosed: 'Edit mode closed. Save a new place or select another saved place again.',
    initialDataError: 'Could not load the initial data.',
    localDataInitError: 'Local data initialization failed first.',
    dataLoadFailed: 'Could not load the data.',
    liveMapKicker: 'Live map',
    mapPanelTitle: 'Singapore restaurant view',
    mapBadgeOcr: 'OCR import',
    mapBadgeAddress: 'Address confirm',
    mapAriaLabel: 'Restaurant map',
  },
};

function detectPreferredLanguage(languages = navigator.languages ?? [navigator.language]) {
  const preferred = Array.isArray(languages) ? languages : [languages];
  return preferred.some((value) => String(value || '').toLowerCase().startsWith('ko')) ? 'ko' : 'en';
}

const preferredLanguage = detectPreferredLanguage();
document.documentElement.lang = preferredLanguage;

function t(key, params = {}) {
  const locale = translations[preferredLanguage] || translations.ko;
  const template = locale[key] ?? translations.ko[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n-key]').forEach((node) => {
    node.textContent = t(node.dataset.i18nKey);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    node.setAttribute('placeholder', t(node.dataset.i18nPlaceholder));
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
    node.setAttribute('aria-label', t(node.dataset.i18nAriaLabel));
  });
}

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
const syncNowButton = document.getElementById('syncNowButton');
const cancelEditButton = document.getElementById('cancelEditButton');
const ocrStepSection = document.getElementById('ocrStepSection');
const reviewStepSection = document.getElementById('reviewStepSection');
const saveStepSection = document.getElementById('saveStepSection');
const ocrStatus = document.getElementById('ocrStatus');
const syncStatus = document.getElementById('syncStatus');
const selectedFileName = document.getElementById('selectedFileName');
const geocodeCandidates = document.getElementById('geocodeCandidates');
const editModeHint = document.getElementById('editModeHint');

const fieldRefs = {
  name: document.getElementById('parsedName'),
  address: document.getElementById('parsedAddress'),
  reason: document.getElementById('parsedReason'),
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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDescription(place) {
  const fragments = [];
  if (place.reason) fragments.push(place.reason);
  if (place.address) fragments.push(t('buildDescriptionAddressPrefix', { address: place.address }));
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

function setStepVisibility({
  showOcr = false,
  showReview = false,
  showSave = false,
} = {}) {
  ocrStepSection.hidden = !showOcr;
  reviewStepSection.hidden = !showReview;
  saveStepSection.hidden = !showSave;
}

function isCompactMobileViewport() {
  if (window.matchMedia) {
    return window.matchMedia('(max-width: 768px)').matches;
  }
  return window.innerWidth <= 768;
}

function isElementComfortablyVisible(section) {
  if (!section || typeof section.getBoundingClientRect !== 'function') return false;

  const rect = section.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  if (!viewportHeight) return false;

  const topPadding = isCompactMobileViewport() ? 72 : 24;
  const bottomPadding = isCompactMobileViewport() ? Math.max(140, Math.round(viewportHeight * 0.24)) : 24;

  return rect.top >= topPadding && rect.bottom <= viewportHeight - bottomPadding;
}

function shouldCenterStepOnMobile(section) {
  if (!isCompactMobileViewport()) return false;
  if (!section || typeof section.getBoundingClientRect !== 'function') return true;

  const rect = section.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  if (!viewportHeight) return true;

  return rect.height <= viewportHeight * 0.78;
}

function buildStepScrollOptions(section) {
  return {
    behavior: 'smooth',
    block: shouldCenterStepOnMobile(section) ? 'center' : 'start',
    inline: 'nearest',
  };
}

function revealStep(section) {
  if (!section) return;
  section.hidden = false;
  if (isElementComfortablyVisible(section)) return;
  section.scrollIntoView(buildStepScrollOptions(section));
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
    throw new Error(t('supabaseLoadError'));
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

function updateSyncControls() {
  const configured = isSupabaseConfigured();
  syncNowButton.disabled = !configured;
}

function updateFormMode() {
  const isEditing = Boolean(editingPlaceId);
  saveParsedPlaceButton.textContent = isEditing ? t('step4ActionEdit') : t('step4Action');
  cancelEditButton.hidden = !isEditing;
  editModeHint.textContent = isEditing ? t('editModeHintEditing') : t('editModeHintNew');
}

function startEditingPlace(place) {
  editingPlaceId = place.id;
  latestParsedData = { ...place };
  latestSourceText = '';
  populateForm(place);
  renderCandidateList([buildCandidateFromPlace(place)]);
  setStepVisibility({ showOcr: true, showReview: true, showSave: true });
  updateFormMode();
  setStatus(t('editModeStarted', { name: place.name }), 'success');
  revealStep(reviewStepSection);
}

function stopEditingPlace() {
  editingPlaceId = null;
  latestGeocodeCandidates = [];
  selectedGeocodeCandidate = null;
  clearPreviewMarker();
  geocodeCandidates.className = 'candidate-list empty-state';
  geocodeCandidates.textContent = t('candidateListEmpty');
  setStepVisibility({ showOcr: Boolean(imageUpload.files?.length), showReview: false, showSave: false });
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
  categoryFilter.innerHTML = `<option value="all">${escapeHtml(t('categoryAllOption'))}</option>`;
  categoryFilter.value = 'all';
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
  const filteredPlaces = allPlaces;

  placeCount.textContent = t('placeCount', { count: filteredPlaces.length });
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
          <p class="place-card-address">${escapeHtml(place.address || t('placeAddressMissing'))}</p>
        </div>
        <div class="place-card-head-actions">
          <button type="button" class="place-edit-button primary-button">${escapeHtml(t('placeActionEdit'))}</button>
        </div>
      </div>
      <p>${escapeHtml(place.reason || t('placeReasonMissing'))}</p>
      <div class="place-actions">
        <a
          class="place-action-link primary-button"
          href="${escapeHtml(actionLinks.viewUrl)}"
          target="_blank"
          rel="noreferrer noopener"
        >
          <span class="google-maps-icon" aria-hidden="true">
            <span class="gm-pin-head"></span>
            <span class="gm-pin-tail"></span>
          </span>
          <span>${escapeHtml(t('placeActionView'))}</span>
        </a>
        <a
          class="place-action-link secondary-button directions-action"
          href="${escapeHtml(actionLinks.directionsUrl)}"
          target="_blank"
          rel="noreferrer noopener"
        >
          <span class="google-maps-icon route" aria-hidden="true">
            <span class="gm-pin-head"></span>
            <span class="gm-pin-tail"></span>
          </span>
          <span>${escapeHtml(t('placeActionDirections'))}</span>
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
      <h3>${escapeHtml(t('emptyPlacesTitle'))}</h3>
      <p>${escapeHtml(t('emptyPlacesBody'))}</p>
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

async function fetchRemotePlaces() {
  const client = ensureSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('shared_places')
    .select('id, created_at, updated_at, payload')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(t('cloudFetchError', { message: error.message }));
  }

  return hydratePlacesFromRows(data || []);
}

async function pushPlacesToCloud(places) {
  const client = ensureSupabaseClient();
  if (!client || !places.length) return;

  const { error } = await client.from('shared_places').upsert(buildSupabaseRows(places), {
    onConflict: 'id',
  });

  if (error) {
    throw new Error(t('cloudPushError', { message: error.message }));
  }
}

async function syncPlacesWithCloud(options = {}) {
  const { announce = true } = options;
  const client = ensureSupabaseClient();

  if (!client) {
    updateSyncControls();
    if (announce) {
      setSyncStatus(t('syncStatusConfigHintDetailed'));
    }
    return;
  }

  syncNowButton.disabled = true;
  if (announce) {
    setSyncStatus(t('syncStatusRunning'));
  }

  try {
    const remotePlaces = await fetchRemotePlaces();
    userPlaces = mergePlacesByUpdatedAt(userPlaces, remotePlaces);
    persistSavedPlaces();
    updateAllPlaces();
    await pushPlacesToCloud(userPlaces);
    setSyncStatus(t('syncStatusSuccess', { count: userPlaces.length }), 'success');
  } catch (error) {
    console.error(error);
    setSyncStatus(t('syncStatusError', { message: error.message }), 'error');
  } finally {
    updateSyncControls();
  }
}

async function restoreCloudSession() {
  updateSyncControls();

  if (!isSupabaseConfigured()) {
    setSyncStatus(t('syncStatusConfigHintDetailed'));
    return;
  }

  const client = ensureSupabaseClient();
  if (!client) {
    setSyncStatus(t('syncStatusClientError'), 'error');
    return;
  }

  setSyncStatus(t('syncStatusConnected'), 'success');
  await syncPlacesWithCloud({ announce: false });
}

function updateAllPlaces() {
  allPlaces = [...userPlaces, ...seedPlaces];
  renderCategories(allPlaces);
  renderPlaces();
}

function populateForm(parsed) {
  fieldRefs.name.value = parsed.name || '';
  fieldRefs.address.value = parsed.address || '';
  fieldRefs.reason.value = latestSourceText || parsed.reason || '';
}

function readFormDraft() {
  return {
    ...latestParsedData,
    name: fieldRefs.name.value.trim(),
    address: fieldRefs.address.value.trim(),
    reason: fieldRefs.reason.value.trim(),
    sourceText: latestSourceText || latestParsedData?.sourceText || '',
    sourceType: latestParsedData?.sourceType || 'image',
  };
}

function renderCandidateList(candidates) {
  latestGeocodeCandidates = candidates;

  if (!candidates.length) {
    geocodeCandidates.className = 'candidate-list empty-state';
    geocodeCandidates.textContent = t('candidateListNotFound');
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
          ${escapeHtml(t('candidateLabel', { index: index + 1 }))}
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
      <h3 class="popup-title">${escapeHtml(draft.name || t('previewPlaceFallback'))}</h3>
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
    throw new Error(t('candidateSearchProviderError', { status: response.status }));
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

async function preprocessImageForOcr(file) {
  if (typeof document === 'undefined' || !document.createElement) {
    return file;
  }

  const createObjectUrl = URL?.createObjectURL ? URL.createObjectURL.bind(URL) : null;
  const revokeObjectUrl = URL?.revokeObjectURL ? URL.revokeObjectURL.bind(URL) : null;
  if (!createObjectUrl) return file;

  const objectUrl = createObjectUrl(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('image-load-failed'));
      img.src = objectUrl;
    });

    const maxDimension = 2200;
    const minWidth = 1600;
    const sourceWidth = Math.max(image.naturalWidth || image.width || 1, 1);
    const sourceHeight = Math.max(image.naturalHeight || image.height || 1, 1);
    const upscaleRatio = sourceWidth < minWidth ? minWidth / sourceWidth : 1;
    const downscaleRatio = Math.max(sourceWidth, sourceHeight) > maxDimension ? maxDimension / Math.max(sourceWidth, sourceHeight) : 1;
    const ratio = Math.min(Math.max(upscaleRatio, downscaleRatio), 2);
    const targetWidth = Math.max(1, Math.round(sourceWidth * ratio));
    const targetHeight = Math.max(1, Math.round(sourceHeight * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return file;

    ctx.filter = 'grayscale(1) contrast(1.35) brightness(1.08)';
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    ctx.filter = 'none';

    return await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        resolve(new File([blob], `${file.name || 'ocr-image'}.preprocessed.png`, {
          type: 'image/png',
          lastModified: Date.now(),
        }));
      }, 'image/png');
    });
  } catch (error) {
    console.warn('OCR preprocessing skipped', error);
    return file;
  } finally {
    if (revokeObjectUrl) revokeObjectUrl(objectUrl);
  }
}

async function runOcr(file) {
  if (!window.Tesseract) {
    throw new Error(t('tesseractLoadError'));
  }

  const preparedImage = await preprocessImageForOcr(file);
  const result = await window.Tesseract.recognize(preparedImage, 'eng');
  return result.data.text;
}

async function handleRunOcr() {
  const [file] = imageUpload.files;
  if (!file) {
    revealStep(ocrStepSection);
    setStatus(t('ocrMissingFile'), 'error');
    return;
  }

  try {
    stopEditingPlace();
    setStepVisibility({ showOcr: true, showReview: true, showSave: false });
    revealStep(reviewStepSection);
    setStatus(t('ocrRunning'));
    runOcrButton.disabled = true;
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    const rawText = await runOcr(file);
    latestSourceText = rawText.trim();
    const parsed = parseRestaurantFields(rawText);
    latestParsedData = parsed;
    populateForm(parsed);
    renderCandidateList([]);
    setStatus(t('ocrSuccess'), 'success');
    revealStep(reviewStepSection);
  } catch (error) {
    console.error(error);
    setStatus(t('ocrError', { message: error.message }), 'error');
  } finally {
    runOcrButton.disabled = false;
  }
}
async function handlePreview() {
  const draft = readFormDraft();

  if (!draft.address && !draft.name) {
    revealStep(reviewStepSection);
    setStatus(t('candidateSearchNeedInput'), 'error');
    return;
  }

  try {
    previewButton.disabled = true;
    setStatus(t('candidateSearchInProgress'));
    const candidates = await geocodeDraft(draft);
    renderCandidateList(candidates);
    if (candidates.length) {
      setStepVisibility({ showOcr: true, showReview: true, showSave: true });
      setStatus(t('candidateSearchSuccess'), 'success');
      revealStep(saveStepSection);
    } else {
      setStatus(t('candidateSearchNoResult'), 'error');
    }
  } catch (error) {
    console.error(error);
    setStatus(t('candidateSearchError', { message: error.message }), 'error');
  } finally {
    previewButton.disabled = false;
  }
}

function handleSave() {
  const draft = readFormDraft();
  if (!draft.name) {
    setStatus(t('saveNeedsName'), 'error');
    return;
  }
  if (!selectedGeocodeCandidate) {
    setStatus(t('saveNeedsCandidate'), 'error');
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

  const duplicatePlace = findDuplicatePlace(userPlaces, placeRecord);
  if (duplicatePlace) {
    setStatus(t('duplicatePlace', { name: duplicatePlace.name }), 'error');
    return;
  }

  userPlaces = upsertUserPlace(userPlaces, placeRecord).map((place) => normalizePlaceTimestamps(place));
  persistSavedPlaces();
  updateAllPlaces();
  const message = editingPlaceId
    ? t('saveSuccessEdit', { name: placeRecord.name })
    : t('saveSuccessNew', { name: placeRecord.name });
  stopEditingPlace();
  setStatus(message, 'success');

  if (isSupabaseConfigured()) {
    void syncPlacesWithCloud({ announce: true });
  }
}

async function handleSyncNow() {
  await syncPlacesWithCloud({ announce: true });
}

async function init() {
  try {
    seedPlaces = [];
    userPlaces = loadSavedPlaces();
    setStepVisibility({ showOcr: false, showReview: false, showSave: false });
    updateFormMode();
    updateAllPlaces();
  } catch (error) {
    console.error(error);
    placeList.innerHTML = `<li class="place-card">${escapeHtml(t('dataLoadFailed'))}</li>`;
    setStatus(t('initialDataError'), 'error');
    setSyncStatus(t('localDataInitError'), 'error');
    return;
  }

  try {
    await restoreCloudSession();
  } catch (error) {
    console.error(error);
    setSyncStatus(t('syncStatusInitError'), 'error');
  }
}

imageUpload.addEventListener('change', () => {
  const [file] = imageUpload.files;
  selectedFileName.textContent = file ? t('selectedFileChosen', { fileName: file.name }) : t('selectedFileNone');
  latestParsedData = null;
  latestSourceText = '';
  stopEditingPlace();
  if (file) {
    setStepVisibility({ showOcr: true, showReview: false, showSave: false });
    revealStep(ocrStepSection);
  }
});

cancelEditButton.addEventListener('click', () => {
  stopEditingPlace();
  setStatus(t('editModeClosed'));
});

runOcrButton.addEventListener('click', handleRunOcr);
previewButton.addEventListener('click', handlePreview);
saveParsedPlaceButton.addEventListener('click', handleSave);
syncNowButton.addEventListener('click', handleSyncNow);
categoryFilter.addEventListener('change', renderPlaces);

applyTranslations();
setSyncStatus(t('syncStatusConfigHint'));
init();
