import { useState, useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

// Keep the worker bundled by Vite and matched to the installed MapLibre version.
maplibregl.setWorkerUrl(maplibreWorkerUrl);
import 'maplibre-gl/dist/maplibre-gl.css';
import { reverseGeocodeLocation } from '../../services/api';
import { AlertCircle } from 'lucide-react';
import './EarthGlobe.css';

export default function EarthGlobe({ selectedLocation, onSelectLocation }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const coordsRef = useRef(null);
  const [mapStyle, setMapStyle] = useState('satellite'); // 'satellite' | 'streets'
  const [keyError, setKeyError] = useState(null);

  const maptilerKey = import.meta.env.VITE_MAPTILER_KEY;

  useEffect(() => {
    if (!maptilerKey || maptilerKey.trim() === '' || maptilerKey.includes('YOUR_KEY')) {
      setKeyError('Missing or invalid VITE_MAPTILER_KEY in .env.local. Please provide a valid MapTiler API key.');
    }
  }, [maptilerKey]);

  const formatDMS = (lat, lng) => {
    const latAbs = Math.abs(lat);
    const latDeg = Math.floor(latAbs);
    const latMin = Math.floor((latAbs - latDeg) * 60);
    const latSec = Math.round(((latAbs - latDeg) * 60 - latMin) * 60);
    const latDir = lat >= 0 ? 'N' : 'S';

    const lngAbs = Math.abs(lng);
    const lngDeg = Math.floor(lngAbs);
    const lngMin = Math.floor((lngAbs - lngDeg) * 60);
    const lngSec = Math.round(((lngAbs - lngDeg) * 60 - lngMin) * 60);
    const lngDir = lng >= 0 ? 'E' : 'W';

    return `${latDeg}°${String(latMin).padStart(2, '0')}′${String(latSec).padStart(2, '0')}″${latDir}  ${lngDeg}°${String(lngMin).padStart(2, '0')}′${String(lngSec).padStart(2, '0')}″${lngDir}`;
  };

  // Initialize single map instance on mount with globe projection set in options where supported
  useEffect(() => {
    if (!mapContainerRef.current || keyError) return;

    const initialStyleUrl = mapStyle === 'satellite'
      ? `https://api.maptiler.com/maps/hybrid/style.json?key=${maptilerKey}`
      : `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyleUrl,
      center: selectedLocation ? [selectedLocation.lng, selectedLocation.lat] : [0, 20],
      zoom: selectedLocation ? 10 : 1.2,
      pitch: 0,
      bearing: 0,
      projection: 'globe'
    });

    mapRef.current = map;

    // Apply globe projection upon style loading and switching
    const applyGlobeProjection = () => {
      try {
        if (typeof map.setProjection === 'function') {
          map.setProjection({ type: 'globe' });
        }
      } catch (err) {
        console.log('Globe projection configuration:', err);
      }
    };

    map.on('style.load', applyGlobeProjection);

    map.on('error', (e) => {
      console.error('MapLibre error event:', e);
      if (e && e.error && (e.error.status === 401 || e.error.status === 403)) {
        setKeyError('MapTiler API key rejected or unauthorized. Please verify your VITE_MAPTILER_KEY.');
      }
    });

    map.on('mousemove', (e) => {
      if (!coordsRef.current) return;
      const { lng, lat } = e.lngLat;
      const features = map.queryRenderedFeatures(e.point);
      const isOverEarth = features.length > 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

      if (isOverEarth) {
        coordsRef.current.textContent = formatDMS(lat, lng);
        coordsRef.current.style.opacity = '1';
      } else {
        coordsRef.current.style.opacity = '0';
      }
    });

    map.on('mouseout', () => {
      if (coordsRef.current) {
        coordsRef.current.style.opacity = '0';
      }
    });

    map.on('click', async (e) => {
      const { lng, lat } = e.lngLat;

      const latStr = lat.toFixed(4);
      const lngStr = lng.toFixed(4);
      const fallbackLocation = {
        id: `clicked-${latStr}-${lngStr}`,
        name: `Location (${latStr}, ${lngStr})`,
        country: lat >= 0 ? `${lat.toFixed(2)}°N` : `${Math.abs(lat).toFixed(2)}°S`,
        lat: lat,
        lng: lng,
        isCustom: true,
        description: `Surface click at coordinates (${latStr}, ${lngStr}). NASA POWER measurements for the surrounding map area retrieved for this point.`
      };
      onSelectLocation(fallbackLocation);

      try {
        const resolved = await reverseGeocodeLocation(lat, lng);
        if (resolved) {
          onSelectLocation(prev => {
            if (prev && Math.abs(prev.lat - lat) < 0.0001 && Math.abs(prev.lng - lng) < 0.0001) {
              return {
                ...prev,
                name: resolved.name,
                country: resolved.country,
                fullName: resolved.fullName,
                description: `${resolved.fullName || resolved.name}. NASA POWER measurements for the surrounding map area retrieved for exact coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}).`
              };
            }
            return prev;
          });
        }
      } catch (err) {
        console.log('Reverse geocode lookup failed; keeping coordinates.', err);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [keyError]);

  // Update map style using setStyle instead of recreating map instance
  useEffect(() => {
    if (!mapRef.current || keyError) return;
    const styleUrl = mapStyle === 'satellite'
      ? `https://api.maptiler.com/maps/hybrid/style.json?key=${maptilerKey}`
      : `https://api.maptiler.com/maps/streets-v2/style.json?key=${maptilerKey}`;

    mapRef.current.setStyle(styleUrl);
  }, [mapStyle, maptilerKey, keyError]);

  useEffect(() => {
    if (mapRef.current && selectedLocation) {
      mapRef.current.flyTo({
        center: [selectedLocation.lng, selectedLocation.lat],
        zoom: 10,
        duration: 1200
      });
    }
  }, [selectedLocation]);


  return (
    <div className="earth-globe-container">
      {keyError ? (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--bg-main)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          textAlign: 'center',
          zIndex: 200
        }}>
          <AlertCircle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
          <h2>MapTiler Configuration Error</h2>
          <p style={{ maxWidth: '500px', marginTop: '12px', color: 'var(--text-secondary)' }}>{keyError}</p>
        </div>
      ) : (
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, background: '#06090f' }} />
      )}

      {/* Compact Map Style & Experiment Area Toolbar below search */}
      <div className="map-toolbar" style={{
        position: 'absolute',
        top: '76px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        zIndex: 50,
        background: 'var(--surface)',
        padding: '4px 10px',
        borderRadius: '10px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow)',
        alignItems: 'center'
      }}>
        <button
          className={`time-tab ${mapStyle === 'satellite' ? 'active' : ''}`}
          onClick={() => setMapStyle('satellite')}
          style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: mapStyle === 'satellite' ? 'var(--primary-blue)' : 'transparent', color: mapStyle === 'satellite' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
        >
          Satellite Hybrid
        </button>
        <button
          className={`time-tab ${mapStyle === 'streets' ? 'active' : ''}`}
          onClick={() => setMapStyle('streets')}
          style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', background: mapStyle === 'streets' ? 'var(--primary-blue)' : 'transparent', color: mapStyle === 'streets' ? '#fff' : 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '12px' }}
        >
          Streets
        </button>

      </div>

      {/* Required MapTiler Attribution Footer */}
      <div className="map-attribution-badge" style={{
        position: 'absolute',
        bottom: '12px',
        right: '16px',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        color: '#fff',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        zIndex: 50,
        pointerEvents: 'none'
      }}>
        © <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>MapTiler</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" style={{ color: '#93c5fd' }}>OpenStreetMap contributors</a>
      </div>

      {/* Google Earth style live coordinate readout with dark background and legible text */}
      <div ref={coordsRef} className="globe-cursor-coordinates">
        Hover over globe for coordinates...
      </div>
    </div>
  );
}
