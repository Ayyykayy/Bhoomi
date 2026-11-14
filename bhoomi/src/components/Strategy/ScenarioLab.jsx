import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Sliders, CloudRain, RefreshCw, Layers, Search, MapPin, CheckCircle2, Square, Pentagon, Hand } from 'lucide-react';
import { calculateSimulation } from '../../services/simulationService';
import { searchLocations, fetchBackendResearch } from '../../services/api';
import './ScenarioLab.css';

// Helper component to smoothly fly the Leaflet map to new coordinates
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 11, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function ScenarioLab({ region, onBack }) {
  // Map navigation & Geocoding Search state (Phase 1)
  const [mapCenter, setMapCenter] = useState([region.lat, region.lng]);
  const [mapZoom, setMapZoom] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocationName, setSelectedLocationName] = useState(region.name);

  // Geographic Drawing / Area Selection state (Phase 2)
  const [activeTool, setActiveTool] = useState('pan'); // 'pan' | 'point' | 'rectangle' | 'polygon'
  const [selectedAreaGeoJson, setSelectedAreaGeoJson] = useState(null);
  const [selectedAreaHectares, setSelectedAreaHectares] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Centralized Environment State (Phase 5)
  const [environment, setEnvironment] = useState({
    rainfall: 35,
    droughtSeverity: region.riskLevel === 'Critical' ? 8 : region.riskLevel === 'High' ? 6 : 3,
    temperature: 32,
    soilMoisture: parseFloat(region.indicators.soilMoisture) || 30
  });

  // Strategy Selection State
  const [strategies, setStrategies] = useState({
    cropType: 'wheat',
    irrigation: 'drip',
    mulching: 'residue',
    droughtSeeds: true,
    precisionNitrogen: true
  });

  const [budget, setBudget] = useState(75);
  const [activeLayer, setActiveLayer] = useState('satellite');

  if (!region) return null;

  // Run simulation calculations
  const simResult = calculateSimulation(region, environment, strategies, budget);

  // Handle Global Location Search (Phase 1)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        const results = await searchLocations(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (loc) => {
    setMapCenter([loc.lat, loc.lng]);
    setMapZoom(12);
    setSelectedLocationName(loc.name);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle Geographic Area Selection (Phase 2)
  const handleMapClick = (e) => {
    if (activeTool === 'point') {
      const { lat, lng } = e.latlng;
      const dummyGeoJson = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: { name: selectedLocationName }
      };
      setSelectedAreaGeoJson(dummyGeoJson);
      setSelectedAreaHectares(125.4); // Demonstration area size in hectares
    }
  };

  // Handle Research Integration (Phase 3)
  const handleAnalyzeArea = async () => {
    if (!selectedAreaGeoJson) return;
    setIsAnalyzing(true);
    const res = await fetchBackendResearch(selectedAreaGeoJson);
    setAnalysisResult(res);
    setIsAnalyzing(false);
  };

  const handleReset = () => {
    setEnvironment({ rainfall: 35, droughtSeverity: 5, temperature: 32, soilMoisture: 30 });
    setStrategies({ cropType: 'wheat', irrigation: 'drip', mulching: 'residue', droughtSeeds: true, precisionNitrogen: true });
    setBudget(75);
    setSelectedAreaGeoJson(null);
    setSelectedAreaHectares(null);
    setAnalysisResult(null);
  };

  const getTileUrl = () => {
    switch (activeLayer) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'soil':
      case 'ndvi':
      case 'rainfall':
      case 'base':
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  return (
    <div className="scenario-lab-overlay">
      {/* Google Earth Minimalist Header with Global Search (Phase 1 & 4) */}
      <header className="lab-header">
        <div className="lab-title-group">
          <button className="lab-back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Return to Research
          </button>
          <h1>
            BHOOMI Scenario Lab <span className="demo-badge">Demo Data</span>
          </h1>
        </div>

        {/* Global Location Search Bar */}
        <div className="lab-search-container">
          <div className="lab-search-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search cities, villages, coordinates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchResults.length > 0 && (
            <div className="lab-search-dropdown">
              {searchResults.map(loc => (
                <div key={loc.id} className="lab-search-item" onClick={() => handleSelectLocation(loc)}>
                  <MapPin size={14} />
                  <span>{loc.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lab-region-pill">
          <span>{selectedLocationName.split(',')[0]}</span>
        </div>
      </header>

      {/* Map-First Workspace */}
      <div className="lab-workspace">
        {/* Large Interactive Satellite Map Centerpiece */}
        <div className="lab-map-container" onClick={activeTool === 'point' ? undefined : undefined}>
          {/* Geographic Drawing Toolbar (Phase 2) */}
          <div className="map-drawing-toolbar">
            <button className={`draw-btn ${activeTool === 'pan' ? 'active' : ''}`} onClick={() => setActiveTool('pan')} title="Pan Map"><Hand size={16} /></button>
            <button className={`draw-btn ${activeTool === 'point' ? 'active' : ''}`} onClick={() => setActiveTool('point')} title="Select Point"><MapPin size={16} /></button>
            <button className={`draw-btn ${activeTool === 'rectangle' ? 'active' : ''}`} onClick={() => { setActiveTool('rectangle'); setSelectedAreaGeoJson({ type: 'Polygon', area: '240 ha' }); setSelectedAreaHectares(240); }} title="Draw Bounding Box"><Square size={16} /></button>
            <button className={`draw-btn ${activeTool === 'polygon' ? 'active' : ''}`} onClick={() => { setActiveTool('polygon'); setSelectedAreaGeoJson({ type: 'Polygon', area: '510 ha' }); setSelectedAreaHectares(510); }} title="Draw Polygon"><Pentagon size={16} /></button>
            <button className="draw-btn clear" onClick={() => { setSelectedAreaGeoJson(null); setSelectedAreaHectares(null); setAnalysisResult(null); }} title="Clear Selection">Clear</button>
          </div>

          {/* Map Layer Switcher Toolbar */}
          <div className="map-layer-toolbar">
            <button className={`layer-btn ${activeLayer === 'satellite' ? 'active' : ''}`} onClick={() => setActiveLayer('satellite')}>Satellite</button>
            <button className={`layer-btn ${activeLayer === 'base' ? 'active' : ''}`} onClick={() => setActiveLayer('base')}>Base Map</button>
            <button className={`layer-btn ${activeLayer === 'soil' ? 'active' : ''}`} onClick={() => setActiveLayer('soil')}>Soil Moisture</button>
            <button className={`layer-btn ${activeLayer === 'ndvi' ? 'active' : ''}`} onClick={() => setActiveLayer('ndvi')}>Vegetation NDVI</button>
          </div>

          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            scrollWheelZoom={true}
            style={{ width: '100%', height: '100%', background: '#202124' }}
            onClick={handleMapClick}
          >
            <MapController center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; OpenStreetMap contributors & NASA GIBS'
              url={getTileUrl()}
            />
            <Marker position={mapCenter}>
              <Popup>
                <div style={{ fontFamily: 'Roboto, sans-serif', fontSize: '14px', color: '#202124' }}>
                  <strong>{selectedLocationName}</strong><br />
                  Simulated Scenario Soil Moisture: <strong>{simResult.modified.soilMoisture}%</strong><br />
                  Coordinates: {mapCenter[0].toFixed(2)}°N, {mapCenter[1].toFixed(2)}°E
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Selected Area Research Overlay Card (Phase 3) */}
          {selectedAreaGeoJson && (
            <div className="selected-area-research-hud">
              <div className="sar-header">
                <span>Selected Area: <strong>{selectedAreaHectares} Hectares</strong></span>
              </div>
              {!analysisResult ? (
                <button className="sar-analyze-btn" onClick={handleAnalyzeArea} disabled={isAnalyzing}>
                  {isAnalyzing ? 'Analyzing Satellite Telemetry...' : 'Analyze Selected Area'}
                </button>
              ) : (
                <div className="sar-results">
                  <div className="sar-row"><span>Soil Moisture:</span> <strong>{analysisResult.indicators.soilMoisture}</strong></div>
                  <div className="sar-row"><span>Vegetation NDVI:</span> <strong>{analysisResult.indicators.ndvi}</strong></div>
                  <div className="sar-row"><span>Rainfall:</span> <strong>{analysisResult.indicators.rainfall}</strong></div>
                  <div className="sar-source">{analysisResult.dataSource}</div>
                </div>
              )}
            </div>
          )}

          {/* Map Attribution HUD */}
          <div className="map-attribution-hud">
            <span>Source: NASA SMAP / MODIS / ArcGIS World Imagery</span>
          </div>
        </div>

        {/* Compact Floating Environmental & Strategy Controls (Right Glass Panel - Phase 4) */}
        <div className="lab-floating-controls-panel">
          <div className="control-card">
            <h3><CloudRain size={16} /> Environmental Parameters</h3>

            <div className="ctrl-group">
              <div className="ctrl-label-row">
                <span>Rainfall Anomaly</span>
                <strong>{environment.rainfall} mm</strong>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                value={environment.rainfall}
                onChange={(e) => setEnvironment({ ...environment, rainfall: Number(e.target.value) })}
                className="lab-range"
              />
            </div>

            <div className="ctrl-group">
              <div className="ctrl-label-row">
                <span>Drought Severity Index</span>
                <strong>Level {environment.droughtSeverity} / 10</strong>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={environment.droughtSeverity}
                onChange={(e) => setEnvironment({ ...environment, droughtSeverity: Number(e.target.value) })}
                className="lab-range"
              />
            </div>

            <div className="ctrl-group">
              <div className="ctrl-label-row">
                <span>Air Temperature</span>
                <strong>{environment.temperature} °C</strong>
              </div>
              <input
                type="range"
                min="15"
                max="48"
                value={environment.temperature}
                onChange={(e) => setEnvironment({ ...environment, temperature: Number(e.target.value) })}
                className="lab-range"
              />
            </div>
          </div>

          <div className="control-card">
            <h3><Sliders size={16} /> Farming Interventions</h3>

            <div className="ctrl-select-row">
              <label>Crop Cultivar</label>
              <select
                value={strategies.cropType}
                onChange={(e) => setStrategies({ ...strategies, cropType: e.target.value })}
                className="lab-select"
              >
                <option value="wheat">Winter Wheat</option>
                <option value="maize">Maize / Corn</option>
                <option value="soy">Soybeans</option>
                <option value="sorghum">Drought Sorghum</option>
              </select>
            </div>

            <div className="ctrl-select-row">
              <label>Irrigation Strategy</label>
              <select
                value={strategies.irrigation}
                onChange={(e) => setStrategies({ ...strategies, irrigation: e.target.value })}
                className="lab-select"
              >
                <option value="none">Rainfed (No Irrigation)</option>
                <option value="flood">Conventional Flood</option>
                <option value="sprinkler">Overhead Sprinkler</option>
                <option value="drip">Advanced Drip Irrigation</option>
              </select>
            </div>

            <div className="ctrl-select-row">
              <label>Soil Management</label>
              <select
                value={strategies.mulching}
                onChange={(e) => setStrategies({ ...strategies, mulching: e.target.value })}
                className="lab-select"
              >
                <option value="none">Bare Soil</option>
                <option value="residue">Crop Residue Mulch</option>
                <option value="cover">Cover Cropping</option>
              </select>
            </div>

            <div className="ctrl-toggles">
              <label className="lab-checkbox">
                <input
                  type="checkbox"
                  checked={strategies.droughtSeeds}
                  onChange={(e) => setStrategies({ ...strategies, droughtSeeds: e.target.checked })}
                />
                <span>Drought-Resilient Cultivars</span>
              </label>
              <label className="lab-checkbox">
                <input
                  type="checkbox"
                  checked={strategies.precisionNitrogen}
                  onChange={(e) => setStrategies({ ...strategies, precisionNitrogen: e.target.checked })}
                />
                <span>Precision NDVI Nutrient App</span>
              </label>
            </div>

            <div className="ctrl-group" style={{ marginTop: '12px' }}>
              <div className="ctrl-label-row">
                <span>Budget Allocation</span>
                <strong>${budget},000 USD</strong>
              </div>
              <input
                type="range"
                min="25"
                max="200"
                step="25"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="lab-range"
              />
            </div>
          </div>

          <button className="lab-reset-btn" onClick={handleReset}>
            <RefreshCw size={15} /> Reset Scenario Parameters
          </button>
        </div>
      </div>

      {/* Bottom Comparison Drawer */}
      <div className="lab-comparison-drawer">
        <div className="drawer-title-row">
          <h3><Layers size={18} /> Baseline vs. Scenario Strategy Comparison</h3>
          <span className="drawer-subtitle">Simulated against NASA telemetry baseline</span>
        </div>

        <div className="drawer-metrics-grid">
          <div className="metric-box">
            <span className="m-label">Water Demand</span>
            <div className="m-val-row">
              <span className="base-val">{simResult.baseline.waterDemand} m³/ha</span>
              <span className="arrow">→</span>
              <span className="mod-val" style={{ color: '#729A78' }}>{simResult.modified.waterDemand} m³/ha</span>
            </div>
          </div>

          <div className="metric-box">
            <span className="m-label">Soil Moisture</span>
            <div className="m-val-row">
              <span className="base-val">{simResult.baseline.soilMoisture}%</span>
              <span className="arrow">→</span>
              <span className="mod-val" style={{ color: '#729A78' }}>{simResult.modified.soilMoisture}%</span>
            </div>
          </div>

          <div className="metric-box">
            <span className="m-label">Crop Stress Index</span>
            <div className="m-val-row">
              <span className="base-val">{simResult.baseline.cropStress}%</span>
              <span className="arrow">→</span>
              <span className="mod-val" style={{ color: simResult.modified.cropStress < 40 ? '#729A78' : '#C46B5B' }}>
                {simResult.modified.cropStress}%
              </span>
            </div>
          </div>

          <div className="metric-box">
            <span className="m-label">Projected Yield</span>
            <div className="m-val-row">
              <span className="base-val">{simResult.baseline.yield} t/ha</span>
              <span className="arrow">→</span>
              <span className="mod-val" style={{ color: '#729A78' }}>{simResult.modified.yield} t/ha (+{simResult.metrics.economicRoi}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
