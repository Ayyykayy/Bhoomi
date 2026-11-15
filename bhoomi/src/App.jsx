import { useState, useEffect } from 'react';
import { REGIONS } from './data/regions';
import EarthGlobe from './components/Globe/EarthGlobe';
import SearchBar from './components/HUD/SearchBar';
import RegionPanel from './components/Panel/RegionPanel';
import RegionResearchDashboard from './components/Dashboard/RegionResearchDashboard';
import ScenarioLab from './components/Strategy/ScenarioLab';
import { MapPin, ArrowLeft } from 'lucide-react';
import './App.css';

export default function App() {
  const getRouteFromHash = () => {
    const hash = window.location.hash;
    if (hash.startsWith('#/simulator')) return 'simulator';
    if (hash.startsWith('#/dashboard')) return 'dashboard';
    return 'globe';
  };

  const getRegionFromHash = () => {
    const hash = window.location.hash;
    // Expected formats:
    // #/dashboard/punjab-india or #/simulator/punjab-india
    // #/dashboard/lat-31.1471-lng-75.3412 or #/simulator/lat-31.1471-lng-75.3412
    const parts = hash.split('/');
    if (parts.length >= 3) {
      const param = decodeURIComponent(parts[2]);

      // 1. Check preset regions
      const found = REGIONS.find(r => r.id === param);
      if (found) return found;

      // 2. Check coordinate pattern: lat-<lat>-lng-<lng> or custom coordinate tokens
      const coordMatch = param.match(/lat-([-\d.]+)-lng-([-\d.]+)/i);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lng = parseFloat(coordMatch[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          const latStr = lat.toFixed(4);
          const lngStr = lng.toFixed(4);
          return {
            id: `coord-${latStr}-${lngStr}`,
            name: `Location (${latStr}, ${lngStr})`,
            country: lat >= 0 ? `${lat.toFixed(2)}°N` : `${Math.abs(lat).toFixed(2)}°S`,
            lat: lat,
            lng: lng,
            riskLevel: 'Moderate',
            riskCategory: 'Gridded Point Telemetry',
            description: `Restored location at (${latStr}, ${lngStr}). Gridded NASA POWER observations retrieved.`,
            indicators: {
              soilMoisture: '30% (Estimated)',
              ndvi: '0.50 (Moderate)',
              rainfall: '35mm (Normal)',
              temperature: '28°C'
            }
          };
        }
      }
    }
    return null;
  };

  const [selectedLocation, setSelectedLocation] = useState(getRegionFromHash());
  const [polygonArea, setPolygonArea] = useState(null);
  const [currentView, setCurrentView] = useState(getRouteFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(getRouteFromHash());
      const reg = getRegionFromHash();
      if (reg) {
        setSelectedLocation(reg);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const updateRoute = (view, location = selectedLocation) => {
    setSelectedLocation(location);
    setCurrentView(view);
    if (view === 'globe') {
      window.location.hash = '#/globe';
    } else if (view === 'dashboard') {
      if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
        const routeId = location.id || `lat-${location.lat.toFixed(4)}-lng-${location.lng.toFixed(4)}`;
        window.location.hash = `#/dashboard/${routeId}`;
      } else {
        window.location.hash = '#/globe';
        setCurrentView('globe');
      }
    } else if (view === 'simulator') {
      if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
        const routeId = location.id || `lat-${location.lat.toFixed(4)}-lng-${location.lng.toFixed(4)}`;
        window.location.hash = `#/simulator/${routeId}`;
      } else {
        window.location.hash = '#/globe';
        setCurrentView('globe');
      }
    }
  };

  const handleSelectLocation = (location) => {
    setSelectedLocation(location);
  };

  const handleInvestigateRegion = (location) => {
    if (!location) return;
    updateRoute('dashboard', location);
  };

  const isValidLocation = selectedLocation && typeof selectedLocation.lat === 'number' && typeof selectedLocation.lng === 'number' && !isNaN(selectedLocation.lat) && !isNaN(selectedLocation.lng);

  return (
    <div className="app-container">
      {currentView === 'globe' && (
        <>
          <SearchBar
            onSelectLocation={handleSelectLocation}
            selectedLocation={selectedLocation}
          />

          <EarthGlobe
            selectedLocation={selectedLocation}
            onSelectLocation={handleSelectLocation}
            polygonArea={polygonArea}
            onPolygonChange={setPolygonArea}
          />

          <RegionPanel
            location={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            onInvestigate={handleInvestigateRegion}
          />
        </>
      )}

      {currentView === 'dashboard' && (
        isValidLocation ? (
          <RegionResearchDashboard
            region={selectedLocation}
            onBack={() => updateRoute('globe', selectedLocation)}
            onProceedToStrategy={() => updateRoute('simulator', selectedLocation)}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', zIndex: 1000, fontFamily: 'var(--font-primary)'
          }}>
            <MapPin size={48} style={{ color: '#245C46', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Select a Location</h2>
            <p style={{ maxWidth: '450px', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px', lineHeight: 1.5 }}>
              No valid location was provided or restored from the URL hash. Please return to the globe to select a region or click anywhere on Earth.
            </p>
            <button
              onClick={() => updateRoute('globe', null)}
              style={{
                background: '#245C46', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow)'
              }}
            >
              <ArrowLeft size={18} /> Return to Globe
            </button>
          </div>
        )
      )}

      {currentView === 'simulator' && (
        isValidLocation ? (
          <ScenarioLab
            region={selectedLocation}
            onBack={() => updateRoute('dashboard', selectedLocation)}
          />
        ) : (
          <div style={{
            position: 'absolute', inset: 0, background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', zIndex: 1000, fontFamily: 'var(--font-primary)'
          }}>
            <MapPin size={48} style={{ color: '#245C46', marginBottom: '16px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Select a Location for Simulator</h2>
            <p style={{ maxWidth: '450px', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px', lineHeight: 1.5 }}>
              No valid location was found for the Farming Strategy Simulator. Please return to the globe or select an agricultural region to run simulations.
            </p>
            <button
              onClick={() => updateRoute('globe', null)}
              style={{
                background: '#245C46', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow)'
              }}
            >
              <ArrowLeft size={18} /> Return to Globe
            </button>
          </div>
        )
      )}
    </div>
  );
}

