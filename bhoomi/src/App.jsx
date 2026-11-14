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
    return REGIONS[0];
  };

  const [selectedRegion, setSelectedRegion] = useState(getRegionFromHash());
  const [currentView, setCurrentView] = useState(getRouteFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentView(getRouteFromHash());
      const reg = getRegionFromHash();
      if (reg) setSelectedRegion(reg);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const updateRoute = (view, region = selectedRegion) => {
    setSelectedRegion(region);
    setCurrentView(view);
    if (view === 'globe') {
      window.location.hash = '#/globe';
    } else if (view === 'dashboard') {
      window.location.hash = `#/dashboard/${region.id}`;
    } else if (view === 'simulator') {
      window.location.hash = `#/simulator/${region.id}`;
    }
  };

  const handleSelectRegion = (region) => {
    setSelectedRegion(region);
  };

  const handleInvestigateRegion = (region) => {
    updateRoute('dashboard', region);
  };

  return (
    <div className="app-container">
      {currentView === 'globe' && (
        <>
          <SearchBar
            regions={REGIONS}
            selectedRegion={selectedRegion}
            onSelectRegion={handleSelectRegion}
          />

          <EarthGlobe
            regions={REGIONS}
            selectedRegion={selectedRegion}
            onSelectRegion={handleSelectRegion}
          />

          {/* Risk Category Legend */}
          <div className="risk-legend-hud">
            <div className="legend-title">Environmental Risks</div>
            <div className="legend-items">
              <div className="legend-item">
                <span className="dot" style={{ background: '#E5484D' }}></span>
                <span>Severe Drought & Heat</span>
              </div>
              <div className="legend-item">
                <span className="dot" style={{ background: '#D99A32' }}></span>
                <span>Soil Moisture Deficit</span>
              </div>
              <div className="legend-item">
                <span className="dot" style={{ background: '#3b82f6' }}></span>
                <span>Rainfall Anomaly</span>
              </div>
              <div className="legend-item">
                <span className="dot" style={{ background: '#4D9B75' }}></span>
                <span>Optimal Conditions</span>
              </div>
            </div>
          </div>

          <RegionPanel
            region={selectedRegion}
            onClose={() => setSelectedRegion(null)}
            onInvestigate={handleInvestigateRegion}
          />
        </>
      )}

      {currentView === 'dashboard' && (
        <RegionResearchDashboard
          region={selectedRegion}
          onBack={() => updateRoute('globe', selectedRegion)}
          onProceedToStrategy={() => updateRoute('simulator', selectedRegion)}
        />
      )}

      {currentView === 'simulator' && (
        <ScenarioLab
          region={selectedRegion}
          onBack={() => updateRoute('dashboard', selectedRegion)}
        />
      )}
    </div>
  );
}
