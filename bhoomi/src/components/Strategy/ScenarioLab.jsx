import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon as LeafletPolygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Sliders, CloudRain, RefreshCw, Layers, Search, MapPin, Square, Pentagon, Hand, X, Loader2, CheckCircle2, ChevronRight, ChevronLeft, Info, HelpCircle, AlertCircle } from 'lucide-react';
import { calculateSimulation } from '../../services/simulationService';
import { searchLocations, fetchBackendResearch } from '../../services/api';
import './ScenarioLab.css';

// Helper component to smoothly fly the Leaflet map to new coordinates or bounding box
function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length === 4) {
      const [south, north, west, east] = bounds;
      map.fitBounds([[south, west], [north, east]], { padding: [50, 50], maxZoom: 14, duration: 1.5 });
    } else if (center) {
      map.flyTo(center, zoom || 12, { duration: 1.5 });
    }
  }, [center, zoom, bounds, map]);
  return null;
}

// Interactive Drawing Handler Component for Leaflet Map
function DrawingManager({ activeTool, onPolygonComplete, onRectangleComplete, onPointComplete }) {
  const map = useMap();
  const [vertices, setVertices] = useState([]);
  const [rectStart, setRectStart] = useState(null);

  useEffect(() => {
    setVertices([]);
    setRectStart(null);
    if (activeTool === 'pan' || activeTool === 'point') {
      map.dragging.enable();
    } else {
      map.dragging.disable();
    }
  }, [activeTool, map]);

  useMapEvents({
    click(e) {
      if (activeTool === 'point') {
        onPointComplete(e.latlng);
      } else if (activeTool === 'polygon') {
        setVertices(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
      } else if (activeTool === 'rectangle') {
        if (!rectStart) {
          setRectStart([e.latlng.lat, e.latlng.lng]);
        } else {
          const bounds = [rectStart, [e.latlng.lat, e.latlng.lng]];
          onRectangleComplete(bounds);
          setRectStart(null);
        }
      }
    },
    dblclick(e) {
      if (activeTool === 'polygon' && vertices.length >= 3) {
        e.originalEvent.preventDefault();
        onPolygonComplete(vertices);
        setVertices([]);
      }
    }
  });

  return null;
}

export default function ScenarioLab({ region, onBack }) {
  // Safety check for missing region before mounting stateful hooks
  if (!region || typeof region.lat !== 'number' || typeof region.lng !== 'number') {
    return (
      <div style={{
        position: 'absolute', inset: 0, background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', zIndex: 1000, fontFamily: 'var(--font-primary)'
      }}>
        <AlertCircle size={48} style={{ color: '#E5484D', marginBottom: '16px' }} />
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>Missing Location Data</h2>
        <p style={{ maxWidth: '450px', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '15px', lineHeight: 1.5 }}>
          The Farming Strategy Simulator requires a valid regional location with coordinates. Please return to the workspace or globe to select a region.
        </p>
        <button
          onClick={onBack}
          style={{
            background: '#245C46', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow)'
          }}
        >
          <ArrowLeft size={18} /> Return to Workspace
        </button>
      </div>
    );
  }

  // Safe accessor helper for region indicators and risk level
  const regionIndicators = region.indicators || {};
  const rawSoilMoisture = regionIndicators.soilMoisture ? parseFloat(regionIndicators.soilMoisture) : null;
  const initialSoilMoisture = (rawSoilMoisture !== null && !isNaN(rawSoilMoisture)) ? rawSoilMoisture : null;
  const hasSoilMoistureData = initialSoilMoisture !== null;

  const riskLevel = region.riskLevel || 'Moderate';
  const initialDrought = riskLevel === 'Critical' ? 8 : riskLevel === 'High' ? 6 : 3;

  // Map navigation & Geocoding Search state
  const [mapCenter, setMapCenter] = useState([region.lat, region.lng]);
  const [mapZoom, setMapZoom] = useState(11);
  const [mapBounds, setMapBounds] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedLocationName, setSelectedLocationName] = useState(region.name || `Location (${region.lat.toFixed(4)}, ${region.lng.toFixed(4)})`);
  const searchContainerRef = useRef(null);

  // Geographic Drawing / Area Selection state
  const [activeTool, setActiveTool] = useState('pan'); // 'pan' | 'point' | 'rectangle' | 'polygon'
  const [selectedAreaGeoJson, setSelectedAreaGeoJson] = useState(null);
  const [selectedAreaHectares, setSelectedAreaHectares] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Sidebar collapse state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Layer & Opacity state
  const [activeLayer, setActiveLayer] = useState('satellite');
  const [layerOpacity, setLayerOpacity] = useState(85);

  // Centralized Environment State
  const [environment, setEnvironment] = useState({
    rainfall: 35,
    droughtSeverity: initialDrought,
    temperature: 32,
    soilMoisture: hasSoilMoistureData ? initialSoilMoisture : 30
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

  // Run simulation calculations with safety check
  let simResult = null;
  let simulationError = null;
  try {
    simResult = calculateSimulation(region, environment, strategies, budget);
  } catch (err) {
    simulationError = err.message || 'Simulation calculation failed';
  }

  // Handle Global Location Search with Debouncing & Keyboard Navigation
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        const results = await searchLocations(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
        setSelectedIndex(-1);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLocation = (loc) => {
    setMapCenter([loc.lat, loc.lng]);
    setMapZoom(12);
    if (loc.boundingbox) {
      setMapBounds(loc.boundingbox);
    } else {
      setMapBounds(null);
    }
    setSelectedLocationName(loc.name);
    setSearchQuery('');
    setSearchResults([]);
    setSelectedIndex(-1);
    showToast(`Zoomed to ${loc.name.split(',')[0]}`);
  };

  const handleKeyDown = (e) => {
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < searchResults.length) {
      e.preventDefault();
      handleSelectLocation(searchResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setSearchResults([]);
      setSelectedIndex(-1);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Helper to compute polygon area in hectares approximately using spherical geometry
  const computePolygonHectares = (coords) => {
    if (!coords || coords.length < 3) return 50;
    let area = 0;
    const earthRadius = 6378137;
    for (let i = 0; i < coords.length; i++) {
      const p1 = coords[i];
      const p2 = coords[(i + 1) % coords.length];
      const lat1 = (p1[0] * Math.PI) / 180;
      const lat2 = (p2[0] * Math.PI) / 180;
      const lng1 = (p1[1] * Math.PI) / 180;
      const lng2 = (p2[1] * Math.PI) / 180;
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    area = Math.abs((area * earthRadius * earthRadius) / 2.0);
    const hectares = area / 10000;
    return Math.max(10, Math.round(hectares * 10) / 10);
  };

  const handlePolygonComplete = (latlngs) => {
    const hectares = computePolygonHectares(latlngs);
    setSelectedAreaGeoJson({
      type: 'Polygon',
      coordinates: latlngs
    });
    setSelectedAreaHectares(hectares);
    setActiveTool('pan');
    showToast(`Farmland boundary completed: ${hectares} hectares`);
  };

  const handleRectangleComplete = (bounds) => {
    const [sw, ne] = bounds;
    const latLngs = [
      [sw[0], sw[1]],
      [sw[0], ne[1]],
      [ne[0], ne[1]],
      [ne[0], sw[1]]
    ];
    const hectares = computePolygonHectares(latLngs);
    setSelectedAreaGeoJson({
      type: 'Polygon',
      coordinates: latLngs
    });
    setSelectedAreaHectares(hectares);
    setActiveTool('pan');
    showToast(`Bounding box completed: ${hectares} hectares`);
  };

  const handlePointComplete = (latlng) => {
    const latLngs = [
      [latlng.lat - 0.005, latlng.lng - 0.005],
      [latlng.lat - 0.005, latlng.lng + 0.005],
      [latlng.lat + 0.005, latlng.lng + 0.005],
      [latlng.lat + 0.005, latlng.lng - 0.005]
    ];
    const hectares = computePolygonHectares(latLngs);
    setSelectedAreaGeoJson({
      type: 'Polygon',
      coordinates: latLngs
    });
    setSelectedAreaHectares(hectares);
    setActiveTool('pan');
    showToast(`Point selected with 125 ha buffer zone`);
  };

  const handleAnalyzeArea = async () => {
    if (!selectedAreaGeoJson) return;
    setIsAnalyzing(true);
    const res = await fetchBackendResearch(selectedAreaGeoJson);
    setAnalysisResult(res);
    setIsAnalyzing(false);
  };

  const handleReset = () => {
    setEnvironment({ rainfall: 35, droughtSeverity: 5, temperature: 32, soilMoisture: hasSoilMoistureData ? initialSoilMoisture : 30 });
    setStrategies({ cropType: 'wheat', irrigation: 'drip', mulching: 'residue', droughtSeeds: true, precisionNitrogen: true });
    setBudget(75);
    setSelectedAreaGeoJson(null);
    setSelectedAreaHectares(null);
    setAnalysisResult(null);
    showToast('Scenario parameters reset to baseline');
  };

  const handleLoadExample = () => {
    setEnvironment({ rainfall: 22, droughtSeverity: 7, temperature: 36, soilMoisture: 24 });
    setStrategies({ cropType: 'maize', irrigation: 'sprinkler', mulching: 'residue', droughtSeeds: true, precisionNitrogen: false });
    setBudget(100);
    showToast('Loaded Extreme Drought Maize Scenario');
  };

  const getTileUrl = () => {
    switch (activeLayer) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'soil':
      case 'ndvi':
      case 'temperature':
      case 'base':
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  return (
    <div className="scenario-lab-overlay">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bhoomi-toast-banner">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navbar (approx 68-72px) */}
      <header className="lab-header">
        <div className="lab-title-group">
          <button className="lab-back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Return to Research
          </button>
          <h1>
            BHOOMI Scenario Lab <span className="demo-badge">Scenario preview</span>
          </h1>
        </div>

        <div className="header-actions-right">
          <button className="lab-example-btn" onClick={handleLoadExample}>
            Load Example Scenario
          </button>
          <div className="lab-region-pill">
            <span>{selectedLocationName.split(',')[0]}</span>
          </div>
        </div>
      </header>

      {simulationError ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: '#E5484D', marginBottom: '16px' }} />
          <h2>Simulation Calculation Error</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginTop: '8px' }}>{simulationError}</p>
          <button className="lab-back-btn" onClick={onBack} style={{ marginTop: '16px' }}>Return to Research</button>
        </div>
      ) : (
        <>
          <div role="note" className="lab-data-notice"><strong>Experiment mode</strong><span>Adjust assumptions and compare scenarios. Calculated outcomes are illustrative; validated model results will be available when the backend is connected.</span></div>{/* Map-First Workspace */}
          <div className="lab-workspace">
            {/* Large Satellite Map Centerpiece (70-75% width) */}
            <div className="lab-map-container" style={{ width: isSidebarOpen ? 'calc(100% - 410px)' : '100%', transition: 'width 0.3s ease' }}>

              {/* Google Earth Inspired Floating Location Search Bar */}
              <div
                className="earth-search-container"
                ref={searchContainerRef}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="earth-search-bar-wrapper">
                  <Search size={18} className="earth-search-icon" />
                  <input
                    type="text"
                    className="earth-search-input"
                    placeholder="Search a location or coordinates"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  {isSearching && <Loader2 size={16} className="earth-search-spinner" />}
                  {searchQuery && !isSearching && (
                    <button
                      className="earth-search-clear"
                      onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                      title="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="earth-autocomplete-dropdown">
                    {searchResults.map((loc, idx) => (
                      <div
                        key={loc.id}
                        className={`earth-autocomplete-item ${idx === selectedIndex ? 'active' : ''}`}
                        onClick={() => handleSelectLocation(loc)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <MapPin size={15} className="earth-item-pin" />
                        <div className="earth-item-text">
                          <span className="earth-item-name">{loc.name.split(',')[0]}</span>
                          <span className="earth-item-detail">{loc.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Geographic Drawing Toolbar */}
              <div className="map-drawing-toolbar">
                <button className={`draw-btn ${activeTool === 'pan' ? 'active' : ''}`} onClick={() => setActiveTool('pan')} title="Pan Map"><Hand size={16} /></button>
                <button className={`draw-btn ${activeTool === 'point' ? 'active' : ''}`} onClick={() => setActiveTool('point')} title="Select Point"><MapPin size={16} /></button>
                <button className={`draw-btn ${activeTool === 'rectangle' ? 'active' : ''}`} onClick={() => setActiveTool('rectangle')} title="Draw Bounding Box"><Square size={16} /></button>
                <button className={`draw-btn ${activeTool === 'polygon' ? 'active' : ''}`} onClick={() => setActiveTool('polygon')} title="Draw Polygon (Click vertices, double-click to finish)"><Pentagon size={16} /></button>
                <button className="draw-btn clear" onClick={() => { setSelectedAreaGeoJson(null); setSelectedAreaHectares(null); setAnalysisResult(null); showToast('Selection cleared'); }} title="Clear Selection">Clear</button>
              </div>

              {/* Map Layer Switcher Toolbar & Opacity Slider */}
              <div className="map-layer-toolbar">
                <div className="layer-btns-row">
                  <button className={`layer-btn ${activeLayer === 'satellite' ? 'active' : ''}`} onClick={() => setActiveLayer('satellite')}>Satellite</button>
                  <button className={`layer-btn ${activeLayer === 'base' ? 'active' : ''}`} onClick={() => setActiveLayer('base')}>Base</button>
                  <button className={`layer-btn ${activeLayer === 'soil' ? 'active' : ''}`} onClick={() => setActiveLayer('soil')}>Soil Moisture</button>
                  <button className={`layer-btn ${activeLayer === 'ndvi' ? 'active' : ''}`} onClick={() => setActiveLayer('ndvi')}>NDVI</button>
                  <button className={`layer-btn ${activeLayer === 'temperature' ? 'active' : ''}`} onClick={() => setActiveLayer('temperature')}>Temp</button>
                </div>
                <div className="layer-opacity-row">
                  <span>Opacity: {layerOpacity}%</span>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={layerOpacity}
                    onChange={(e) => setLayerOpacity(Number(e.target.value))}
                    className="opacity-slider"
                  />
                </div>
              </div>

              {/* NDVI & Soil Moisture Legend */}
              {(activeLayer === 'ndvi' || activeLayer === 'soil' || activeLayer === 'temperature') && (
                <div className="map-ndvi-legend">
                  <span className="legend-title">{activeLayer === 'ndvi' ? 'Vegetation NDVI' : activeLayer === 'soil' ? 'Soil Moisture (SMAP)' : 'Surface Temp (°C)'}</span>
                  <div className="legend-gradient-bar"></div>
                  <div className="legend-labels">
                    <span>{activeLayer === 'ndvi' ? '0.1 (Stressed)' : activeLayer === 'soil' ? '10% (Dry)' : '20°C'}</span>
                    <span>{activeLayer === 'ndvi' ? '0.5 (Moderate)' : activeLayer === 'soil' ? '35% (Optimal)' : '32°C'}</span>
                    <span>{activeLayer === 'ndvi' ? '0.9 (Vigor)' : activeLayer === 'soil' ? '65% (Saturated)' : '45°C'}</span>
                  </div>
                </div>
              )}

              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                scrollWheelZoom={true}
                style={{ width: '100%', height: '100%', background: 'var(--bg-main)' }}
              >
                <MapController center={mapCenter} zoom={mapZoom} bounds={mapBounds} />
                <DrawingManager
                  activeTool={activeTool}
                  onPolygonComplete={handlePolygonComplete}
                  onRectangleComplete={handleRectangleComplete}
                  onPointComplete={handlePointComplete}
                />
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors & NASA GIBS'
                  url={getTileUrl()}
                  opacity={layerOpacity / 100}
                />
                <Marker position={mapCenter}>
                  <Popup>
                    <div style={{ fontFamily: 'Roboto, sans-serif', fontSize: '15px', color: 'var(--text-primary)' }}>
                      <strong>{selectedLocationName}</strong><br />
                      Simulated Scenario Soil Moisture: <strong>{simResult ? simResult.modified.soilMoisture : 'N/A'}%</strong><br />
                      Coordinates: {mapCenter[0].toFixed(2)}°N, {mapCenter[1].toFixed(2)}°E
                    </div>
                  </Popup>
                </Marker>

                {/* Render User Drawn Polygon */}
                {selectedAreaGeoJson && selectedAreaGeoJson.coordinates && (
                  <LeafletPolygon
                    positions={selectedAreaGeoJson.coordinates}
                    pathOptions={{ color: '#245C46', fillColor: '#94B49F', fillOpacity: 0.45, weight: 3 }}
                  />
                )}
              </MapContainer>

              {/* Floating Research Card (Shown over map) */}
              <div className="floating-research-glass-card">
                <div className="frc-header">
                  <span className="frc-title">{selectedLocationName.split(',')[0]}</span>
                  <span className="frc-badge">Scenario inputs</span>
                </div>
                <div className="frc-grid">
                  <div className="frc-item">
                    <span>Soil Moisture</span>
                    <strong>{hasSoilMoistureData ? `${environment.soilMoisture}%` : 'Unavailable (Manual Input)'}</strong>
                  </div>
                  <div className="frc-item">
                    <span>Vegetation Health</span>
                    <strong>{regionIndicators.ndvi || 'Unavailable'}</strong>
                  </div>
                  <div className="frc-item">
                    <span>Rainfall</span>
                    <strong>{environment.rainfall} mm</strong>
                  </div>
                  <div className="frc-item">
                    <span>Temperature</span>
                    <strong>{environment.temperature} °C</strong>
                  </div>
                </div>

                {selectedAreaHectares ? (
                  <div className="frc-area-info">
                    <span>Selected Farmland: <strong>{selectedAreaHectares} Hectares</strong></span>
                    {!analysisResult ? (
                      <button className="frc-analyze-btn" onClick={handleAnalyzeArea} disabled={isAnalyzing}>
                        {isAnalyzing ? 'Analyzing Satellite Telemetry...' : 'Analyze Selected Area'}
                      </button>
                    ) : (
                      <div className="frc-analysis-res">
                        <span>Analyzed Soil Moisture: <strong>{analysisResult.indicators.soilMoisture}</strong></span>
                        <span>NDVI Vigor: <strong>{analysisResult.indicators.ndvi}</strong></span>
                        <span className="frc-source">{analysisResult.dataSource}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="frc-empty-state">
                    <span>Select the Polygon or Box tool on the map to draw and analyze custom farmland boundaries.</span>
                  </div>
                )}
              </div>

              {/* Map Attribution HUD */}
              <div className="map-attribution-hud">
                <span>Basemap: Esri World Imagery · scenario inputs are separate</span>
              </div>
            </div>

            {/* Toggle Sidebar Button */}
            <button
              className="sidebar-toggle-btn"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            >
              {isSidebarOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            {/* Collapsible Right Sidebar (Environmental Controls & Farming Interventions) */}
            <div className={`lab-floating-controls-panel ${isSidebarOpen ? 'open' : 'closed'}`}>
              <div className="control-card">
                <h3><CloudRain size={18} /> Weather and Climate</h3>

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

                <div className="ctrl-group">
                  <div className="ctrl-label-row">
                    <span>Baseline Soil Moisture</span>
                    <strong>{environment.soilMoisture} %</strong>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    value={environment.soilMoisture}
                    onChange={(e) => setEnvironment({ ...environment, soilMoisture: Number(e.target.value) })}
                    className="lab-range"
                  />
                  {!hasSoilMoistureData && (
                    <span style={{ fontSize: '11px', color: '#D99A32', marginTop: '2px' }}>
                      * Editable scenario assumption; measured soil data is not connected.
                    </span>
                  )}
                </div>
              </div>

              <div className="control-card">
                <h3><Sliders size={18} /> Farming Interventions</h3>

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

                <div className="ctrl-group" style={{ marginTop: '16px' }}>
                  <div className="ctrl-label-row">
                    <span>Budget Allocation ($k)</span>
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

              <div className="control-card">
                <h3>Inputs & model status</h3>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {simResult ? `${simResult.assumptions[0]} ${simResult.assumptions[1]}` : 'Telemetry simulation parameters active.'}
                </p>
              </div>

              <button className="lab-reset-btn" onClick={handleReset}>
                <RefreshCw size={16} /> Reset Scenario Parameters
              </button>
            </div>
          </div>

          {/* Bottom Scenario Comparison Panel */}
          {simResult && (
            <div className="lab-comparison-drawer">
              <div className="drawer-title-row">
                <h3><Layers size={18} /> Baseline vs. Scenario Strategy Comparison</h3>
                <span className="drawer-subtitle">Illustrative comparison · baseline → adjusted scenario</span>
              </div>

              <div className="drawer-metrics-grid">
                <div className="metric-box">
                  <span className="m-label">Water Demand</span>
                  <div className="m-val-row">
                    <span className="base-val">{simResult.baseline.waterDemand} m³/ha</span>
                    <span className="arrow">→</span>
                    <span className="mod-val" style={{ color: '#245C46' }}>{simResult.modified.waterDemand} m³/ha</span>
                  </div>
                </div>

                <div className="metric-box">
                  <span className="m-label">Soil Moisture</span>
                  <div className="m-val-row">
                    <span className="base-val">{simResult.baseline.soilMoisture}%</span>
                    <span className="arrow">→</span>
                    <span className="mod-val" style={{ color: '#245C46' }}>{simResult.modified.soilMoisture}%</span>
                  </div>
                </div>

                <div className="metric-box">
                  <span className="m-label">Crop Stress Index</span>
                  <div className="m-val-row">
                    <span className="base-val">{simResult.baseline.cropStress}%</span>
                    <span className="arrow">→</span>
                    <span className="mod-val" style={{ color: simResult.modified.cropStress < 40 ? '#245C46' : '#C94F4F' }}>
                      {simResult.modified.cropStress}%
                    </span>
                  </div>
                </div>

                <div className="metric-box">
                  <span className="m-label">Projected Yield</span>
                  <div className="m-val-row">
                    <span className="base-val">{simResult.baseline.yield} t/ha</span>
                    <span className="arrow">→</span>
                    <span className="mod-val" style={{ color: '#245C46' }}>{simResult.modified.yield} t/ha (+{simResult.metrics.economicRoi}%)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

