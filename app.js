const map = L.map('map').setView([1.3521, 103.8198], 12);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);

const categoryFilter = document.getElementById('categoryFilter');
const placeList = document.getElementById('placeList');
const placeCount = document.getElementById('placeCount');

const markers = [];
let allPlaces = [];
let activeCard = null;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderCategories(places) {
  const categories = [...new Set(places.map((place) => place.category))].sort();
  categoryFilter.innerHTML = '<option value="all">전체</option>';

  categories.forEach((category) => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
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

function renderPlaces() {
  const selectedCategory = categoryFilter.value;
  const filteredPlaces =
    selectedCategory === 'all'
      ? allPlaces
      : allPlaces.filter((place) => place.category === selectedCategory);

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
        <p class="popup-desc">${escapeHtml(place.description)}</p>
      </div>
    `);
    markers.push(marker);
    bounds.push([place.lat, place.lng]);

    const item = document.createElement('li');
    item.className = 'place-card';
    item.innerHTML = `
      <h3>${escapeHtml(place.name)}</h3>
      <div class="meta-row">
        <span class="badge">${escapeHtml(place.category)}</span>
        <span class="badge">${escapeHtml(place.area)}</span>
      </div>
      <p>${escapeHtml(place.description)}</p>
    `;

    item.addEventListener('click', () => {
      setActiveCard(item);
      map.flyTo([place.lat, place.lng], 15, {
        duration: 0.8,
      });
      marker.openPopup();
    });

    marker.on('click', () => setActiveCard(item));
    placeList.appendChild(item);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [40, 40] });
  }
}

async function init() {
  try {
    const response = await fetch('./data/restaurants.json');
    if (!response.ok) {
      throw new Error(`데이터를 불러오지 못했습니다: ${response.status}`);
    }

    allPlaces = await response.json();
    renderCategories(allPlaces);
    renderPlaces();
  } catch (error) {
    console.error(error);
    placeList.innerHTML = '<li class="place-card">데이터를 불러오지 못했습니다.</li>';
  }
}

categoryFilter.addEventListener('change', renderPlaces);
init();
