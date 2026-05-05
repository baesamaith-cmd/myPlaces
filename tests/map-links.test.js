import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleMapsPlaceUrl,
  buildGoogleMapsDirectionsUrl,
  buildPlaceActionLinks,
} from '../map-links.js';

test('buildGoogleMapsPlaceUrl prefers lat/lng coordinates for precise map viewing', () => {
  const url = buildGoogleMapsPlaceUrl({
    name: 'JJ Sarawak Noodle',
    address: '3 Yung Sheng Rd, Singapore 618499',
    lat: 1.3381,
    lng: 103.7192,
  });

  assert.equal(
    url,
    'https://www.google.com/maps/search/?api=1&query=1.3381%2C103.7192'
  );
});

test('buildGoogleMapsDirectionsUrl uses coordinates as destination', () => {
  const url = buildGoogleMapsDirectionsUrl({ lat: 1.3381, lng: 103.7192 });

  assert.equal(
    url,
    'https://www.google.com/maps/dir/?api=1&destination=1.3381%2C103.7192'
  );
});

test('buildPlaceActionLinks falls back to address when coordinates are unavailable', () => {
  const links = buildPlaceActionLinks({
    name: 'JJ Sarawak Noodle',
    address: '3 Yung Sheng Rd, Singapore 618499',
  });

  assert.deepEqual(links, {
    viewUrl:
      'https://www.google.com/maps/search/?api=1&query=3%20Yung%20Sheng%20Rd%2C%20Singapore%20618499',
    directionsUrl:
      'https://www.google.com/maps/dir/?api=1&destination=3%20Yung%20Sheng%20Rd%2C%20Singapore%20618499',
  });
});
