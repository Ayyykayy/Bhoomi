/**
 * API Service for BHOOMI Platform
 * Handles geocoding search and backend research integration points.
 */

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

export async function searchLocations(query) {
  if (!query || query.trim().length < 2) return [];

  try {
    const response = await fetch(
      `${NOMINATIM_BASE}?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding network response failed');
    }

    const data = await response.json();
    return data.map(item => ({
      id: item.place_id,
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      boundingbox: item.boundingbox ? item.boundingbox.map(Number) : null,
      type: item.type
    }));
  } catch (err) {
    console.error('Geocoding error:', err);
    return [];
  }
}

// Future FastAPI Backend Integration Point
export async function fetchBackendResearch(geoJson) {
  // In production, this would call FastAPI backend /api/research
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
