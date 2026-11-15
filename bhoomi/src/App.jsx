import { useState, useEffect } from 'react';
import { REGIONS } from './data/regions';
import EarthGlobe from './components/Globe/EarthGlobe';
import SearchBar from './components/HUD/SearchBar';
import RegionPanel from './components/Panel/RegionPanel';
import RegionResearchDashboard from './components/Dashboard/RegionResearchDashboard';
import ScenarioLab from './components/Strategy/ScenarioLab';
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
    const parts = hash.split('/');
    if (parts.length >= 3) {
      const regionId = parts[2];
      const found = REGIONS.find(r => r.id === regionId);
      if (found) return found;
    }
    return null;
  };

  // Initialize landing selection to null (empty landing globe)
  const [selectedLocation, setSelectedLocation] = useState(getRegionFromHash());
  const [polygonArea, setPolygonArea] = useState(null);
  const [currentView, setCurrentView] = useState(getRouteFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(getRouteFromHash());
      const reg = getRegionFromHash();
      if (reg) setSelectedLocation(reg);
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
      if (location) {
        const routeId = location.id || `coord-${location.lat}-${location.lng}`;
        window.location.hash = `#/dashboard/${routeId}`;
      } else {
        window.location.hash = '#/globe';
        setCurrentView('globe');
      }
    } else if (view === 'simulator') {
      if (location) {
        const routeId = location.id || `coord-${location.lat}-${location.lng}`;
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
        <RegionResearchDashboard
          region={selectedLocation}
          onBack={() => updateRoute('globe', selectedLocation)}
          onProceedToStrategy={() => updateRoute('simulator', selectedLocation)}
        />
      )}

      {currentView === 'simulator' && (
        <ScenarioLab
          region={selectedLocation}
          onBack={() => updateRoute('dashboard', selectedLocation)}
        />
      )}
    </div>
  );
}
