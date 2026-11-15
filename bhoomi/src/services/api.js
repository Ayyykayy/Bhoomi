/**
 * API Service for BHOOMI Platform
 * Handles geocoding search, reverse geocoding, and backend FastAPI integration with timeouts, AbortController, and error handling.
 */

const BACKEND_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const REQUEST_TIMEOUT_MS = 18000;

async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const signal = options.signal
    ? AbortSignal.any ? AbortSignal.any([options.signal, controller.signal]) : controller.signal
    : controller.signal;

  try {
    const response = await fetch(url, { ...options, signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      if (options.signal && options.signal.aborted) {
        const userErr = new Error('Request was aborted.');
        userErr.name = 'AbortError';
        throw userErr;
      }
      const timeoutErr = new Error('Request timed out while waiting for NASA telemetry.');
      timeoutErr.name = 'TimeoutError';
      throw timeoutErr;
    }
    throw err;
  }
}

export async function searchLocations(query, signal) {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim();

  const coordRegex = /^(-?\d+(\.\d+)?)\s*[,°\s]\s*(-?\d+(\.\d+)?)[NSWE]?$/i;
  const match = trimmed.match(coordRegex);
  if (match) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[3]);
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return [{
        id: `coord-${lat}-${lng}`,
        name: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        country: lat >= 0 ? `${lat.toFixed(2)}°N` : `${Math.abs(lat).toFixed(2)}°S`,
        lat: lat,
        lng: lng,
        isCustom: true,
        description: `Direct coordinate location (${lat.toFixed(4)}, ${lng.toFixed(4)}). Gridded NASA POWER observations requested for this point.`
      }];
    }
  }

  try {
    const response = await fetchWithTimeout(`${BACKEND_BASE}/api/geocode?q=${encodeURIComponent(trimmed)}`, { signal }, 12000);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Geocoding backend returned status ${response.status}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err;
    }
    console.error('Geocoding backend error:', err);
    throw err;
  }
}

export async function reverseGeocodeLocation(lat, lng, signal) {
  try {
    const response = await fetchWithTimeout(`${BACKEND_BASE}/api/reverse?lat=${lat}&lon=${lng}`, { signal }, 12000);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.location || null;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err;
    }
    console.error('Reverse geocoding error:', err);
    return null;
  }
}

/**
 * Fetch historical climate observations from FastAPI backend connected to NASA POWER API with timeout.
 */
export async function fetchClimateObservations(lat, lon, signal) {
  try {
    const response = await fetchWithTimeout(`${BACKEND_BASE}/api/climate?lat=${lat}&lon=${lon}`, { signal }, REQUEST_TIMEOUT_MS);

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      if (response.status === 504) {
        throw new Error('NASA POWER telemetry service timed out upstream (HTTP 504).');
      }
      throw new Error(errJson.error || `Backend API returned status ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Climate fetch aborted by user/navigation');
      throw err;
    }
    console.error('Failed to fetch climate observations from backend:', err);
    throw err;
  }
}

// FastAPI Backend Research Integration Point
export async function fetchBackendResearch(geoJson) {
  return {
    success: true,
    dataSource: 'NASA SMAP / MODIS API (Simulated)',
    indicators: {
      soilMoisture: '28% (Analyzed)',
      ndvi: '0.48 (Healthy)',
      rainfall: '38mm (Normal)',
      temperature: '29°C (+1.2°C anomaly)'
    }
  };
}
