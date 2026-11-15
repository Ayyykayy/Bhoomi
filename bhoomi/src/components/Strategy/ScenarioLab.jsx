import { comparisonTone } from '../../services/comparisonTone';
import { observationSnapshot } from '../../services/observationSnapshot';
import { fetchNdvi } from '../../services/ndviClient';
import { RainfallDate, RainfallTiles } from '../Dashboard/RainfallMapStatus';
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polygon as LeafletPolygon, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Sliders, CloudRain, RefreshCw, Layers, Search, MapPin, Pentagon, Hand, X, Loader2, CheckCircle2, ChevronRight, ChevronLeft, Info, HelpCircle, AlertCircle } from 'lucide-react';
import { calculateSimulation } from '../../services/simulationService';
import { searchLocations, fetchBackendResearch } from '../../services/api';
import './ScenarioLab.css';
import { useGibsLayer } from '../../hooks/useGibsLayer';
import { createNewExperiment, saveSingleExperiment } from '../../services/experimentStorage';

// Helper component to smoothly fly the Leaflet map to new coordinates or bounding box
function MapController({ center, zoom, bounds }) {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
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
function DrawingManager({ activeTool, onPolygonComplete }) {
  const map = useMap();
  const [vertices, setVertices] = useState([]);
  useEffect(() => {
    setVertices([]);
    if (activeTool === 'polygon') { map.dragging.disable(); map.doubleClickZoom.disable(); }
    else { map.dragging.enable(); map.doubleClickZoom.enable(); }
    return () => { map.dragging.enable(); map.doubleClickZoom.enable(); };
  }, [activeTool, map]);
  useMapEvents({
    click(e) {
      if (activeTool === 'polygon' && e.originalEvent.detail !== 2) {
        setVertices(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
      }
    },
    dblclick(e) {
      if (activeTool === 'polygon' && vertices.length >= 3) {
        e.originalEvent.preventDefault();
        onPolygonComplete(vertices);
        setVertices([]);
      }
    },
  });
  return vertices.length ? <LeafletPolygon positions={vertices} pathOptions={{ color: '#3b82f6', fillOpacity: 0.15, dashArray: '5 5' }} interactive={false} /> : null;
}

export default function ScenarioLab({ region, onBack, onSaved, onNavigateToSaved, onNavigateToSources }) {
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
  const [activeTool, setActiveTool] = useState('pan'); // 'pan' | 'polygon'
  const [selectedAreaGeoJson, setSelectedAreaGeoJson] = useState(null);
  const [selectedAreaHectares, setSelectedAreaHectares] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Sidebar collapse state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mapFocused, setMapFocused] = useState(false);
  const [mapControlsOpen, setMapControlsOpen] = useState(true);
  const [locationInfoOpen, setLocationInfoOpen] = useState(true);

  // Layer & Opacity state
  const [activeLayer, setActiveLayer] = useState('satellite');
  const [rainfallDate, setRainfallDate] = useState(null);
  const imagery = useGibsLayer(activeLayer, rainfallDate);
  const [imageryError, setImageryError] = useState(null);
  useEffect(() => { setImageryError(null); }, [activeLayer]);
  const [layerOpacity, setLayerOpacity] = useState(85);

  // Centralized Environment State
  const [environment, setEnvironment] = useState({
    rainfall: 35,
    droughtSeverity: initialDrought,
    temperature: 32,
    soilMoisture: hasSoilMoistureData ? initialSoilMoisture : 30
  });

  const [observedSoil, setObservedSoil] = useState(null);
  const [climateSnapshot, setClimateSnapshot] = useState(null);
  const [soilStatus, setSoilStatus] = useState('loading');
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setObservedSoil(null); setClimateSnapshot(null); setSoilStatus('loading');
    const timer = setTimeout(() => controller.abort(), 20000);
    const base = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    fetch(`${base}/api/climate?lat=${mapCenter[0]}&lon=${mapCenter[1]}`, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error('Soil request failed'); return res.json(); })
      .then(data => {
        const reading = data.latestByParameter?.soilMoistureTop;
        if (current) {
          setClimateSnapshot({ point: { latitude: mapCenter[0], longitude: mapCenter[1] }, data });
          setObservedSoil(typeof reading?.value === 'number' && Number.isFinite(reading.value) ? reading : null);
          setSoilStatus('ready');
        }
      })
      .catch(() => { if (current) setSoilStatus('error'); })
      .finally(() => clearTimeout(timer));
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [mapCenter[0], mapCenter[1]]);

  const [vegetationData, setVegetationData] = useState(null);
  const [vegetationStatus, setVegetationStatus] = useState('loading');
  const [vegetationError, setVegetationError] = useState('');
  const [ndviRetry, setNdviRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setVegetationData(null); setVegetationStatus('loading'); setVegetationError('');
    const timer = setTimeout(() => controller.abort(), 90000);
    const base = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    fetchNdvi(`${base}/api/ndvi?lat=${mapCenter[0]}&lon=${mapCenter[1]}`, controller.signal)
      .then(data => { if (current) { setVegetationData(data); setVegetationStatus('ready'); } })
      .catch(error => { if (current) { setVegetationStatus('error'); setVegetationError(controller.signal.aborted ? 'NASA took too long to respond. Please retry.' : error.message); } })
      .finally(() => clearTimeout(timer));
    return () => { current = false; clearTimeout(timer); controller.abort(); };
  }, [mapCenter[0], mapCenter[1], ndviRetry]);

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

  const [saveError, setSaveError] = useState(null);
  const handleSaveAndView = () => {
    try {
      if (!simResult || simulationError) throw new Error('Resolve the scenario inputs before saving.');
      const experiment = createNewExperiment({ ...region, lat: mapCenter[0], lng: mapCenter[1], name: selectedLocationName }, environment, strategies, budget,
        selectedAreaGeoJson ? { ...selectedAreaGeoJson, hectares: selectedAreaHectares } : null);
      experiment.status = 'awaiting_backend';
      experiment.outputs = { ...simResult, illustrative: true };
      experiment.baseline = simResult.baseline;
      experiment.modified = simResult.modified;
      experiment.metrics = { ...simResult.metrics, assumptions: simResult.assumptions };
      experiment.metadata.assumptions = simResult.assumptions;
      experiment.metadata.provenance = 'Example calculation; tested backend predictions are not connected yet.';
      experiment.observations = observationSnapshot(climateSnapshot, vegetationData, mapCenter[0], mapCenter[1]);
      setSaveError(null);
      onSaved(saveSingleExperiment(experiment));
    } catch (error) {
      setSaveError(error.message || 'Unable to save this experiment on this browser.');
    }
  };

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
    <div className={`scenario-lab-overlay ${mapFocused ? 'map-focused' : ''}`}>
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
          <h1 className="bhoomi-page-title">
            BHOOMI Scenario Lab
          </h1>
        </div>

        <div className="header-actions-right">
          <button className="lab-example-btn" onClick={onNavigateToSources}>Data Sources</button>
          <button className="lab-example-btn" onClick={onNavigateToSaved}>Saved Experiments</button>
          <button className="lab-example-btn" onClick={handleSaveAndView} style={{ background: 'var(--primary-blue)', color: '#fff' }}>Save &amp; View Results</button>
          <button className="lab-example-btn" onClick={handleLoadExample}>
            Load Example Scenario
          </button>
          <div className="lab-region-pill">
            <span>{selectedLocationName.split(',')[0]}</span>
          </div>
        </div>
      </header>

      {saveError && <div role="alert" style={{ padding: '12px 24px', color: 'var(--danger)' }}>{saveError}</div>}
      {simulationError ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: '#E5484D', marginBottom: '16px' }} />
          <h2>Simulation Calculation Error</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginTop: '8px' }}>{simulationError}</p>
          <button className="lab-back-btn" onClick={onBack} style={{ marginTop: '16px' }}>Return to Research</button>
        </div>
      ) : (
        <>
          {/* Map-First Workspace */}
          <div className="lab-workspace">
            {/* Large Satellite Map Centerpiece (70-75% width) */}
            <div className="lab-map-container" style={{ width: isSidebarOpen && !mapFocused ? 'calc(100% - 410px)' : '100%', transition: 'width 0.3s ease' }}>

              {/* Geographic Drawing Toolbar */}
              <div className="map-drawing-toolbar">
                <button className="draw-btn map-focus-btn" aria-pressed={mapFocused} onClick={() => setMapFocused(value => !value)} title={mapFocused ? 'Restore information panels' : 'Hide information panels to focus on the map'}>{mapFocused ? 'Show information' : 'Focus on map'}</button>
                <button className={`draw-btn ${activeTool === 'pan' ? 'active' : ''}`} onClick={() => setActiveTool('pan')} title="Pan Map"><Hand size={16} /></button>
                <button className={`draw-btn ${activeTool === 'polygon' ? 'active' : ''}`} onClick={() => setActiveTool('polygon')} title="Draw Polygon (Click vertices, double-click to finish)"><Pentagon size={16} /></button>
                <button className="draw-btn clear" onClick={() => { setSelectedAreaGeoJson(null); setSelectedAreaHectares(null); setAnalysisResult(null); showToast('Selection cleared'); }} title="Clear Selection">Clear</button>
              </div>

              <div className={`lab-map-controls-stack ${mapControlsOpen ? '' : 'is-collapsed'}`}>
                <button className="map-panel-toggle" aria-expanded={mapControlsOpen} aria-controls="simulator-map-control-content" onClick={() => setMapControlsOpen(open => !open)}>{mapControlsOpen ? 'Hide map controls' : 'Show map controls'} {mapControlsOpen ? '−' : '+'}</button>
                <div id="simulator-map-control-content" hidden={!mapControlsOpen}>
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

              {/* Map Layer Switcher Toolbar & Opacity Slider */}
              <div className="map-layer-toolbar">
                <div className="layer-btns-row">
                  <button className={`layer-btn ${activeLayer === 'satellite' ? 'active' : ''}`} onClick={() => setActiveLayer('satellite')}>Satellite</button>
                  <button className={`layer-btn ${activeLayer === 'base' ? 'active' : ''}`} onClick={() => setActiveLayer('base')}>Base</button>
                  <button className={`layer-btn ${activeLayer === 'soil' ? 'active' : ''}`} onClick={() => setActiveLayer('soil')}>Soil Moisture</button>
                  <button className={`layer-btn ${activeLayer === 'ndvi' ? 'active' : ''}`} onClick={() => setActiveLayer('ndvi')}>NDVI</button>
                  <button className={`layer-btn ${activeLayer === 'rainfall' ? 'active' : ''}`} onClick={() => setActiveLayer('rainfall')}>Rainfall</button>
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

              {(activeLayer === 'soil' || activeLayer === 'ndvi' || activeLayer === 'rainfall' || activeLayer === 'temperature') && (
                <div className="map-ndvi-legend" role="status" style={{ maxWidth: 390, width: 'auto' }}>
                  {activeLayer === 'rainfall' && <RainfallDate layer={imagery.layer} value={rainfallDate} onChange={setRainfallDate} />}
                  <span className="legend-title">{activeLayer === 'soil' ? 'SMAP modeled surface soil moisture' : activeLayer === 'ndvi' ? 'MODIS vegetation greenness (NDVI)' : activeLayer === 'rainfall' ? 'IMERG precipitation rate (mm/hour)' : 'Temperature map not connected'}</span>
                  {activeLayer !== 'temperature' && <>
                    <p style={{ fontSize: 12, lineHeight: 1.5, margin: '8px 0' }}>{imageryError || (imagery.status === 'error' ? 'NASA imagery could not load. The base map is shown underneath.' : imagery.layer ? `Image date: ${imagery.layer.date}. ${activeLayer === 'ndvi' ? '16-day composite. Colors show vegetation greenness, not a crop diagnosis. Map imagery and point samples may use different composite dates.' : activeLayer === 'rainfall' ? 'Colors show mm/hour, not daily totals. Clear areas may have no rain.' : 'Colors show water content; there is no universal optimal value for all crops. This image is separate from POWER relative wetness.'}` : 'Loading NASA imagery…')}</p>
                    {imagery.layer?.legend && <img src={imagery.layer.legend} alt="NASA data color scale and units" style={{ display: 'block', width: '100%', maxWidth: 378, background: '#fff' }} />}
                  </>}
                </div>
              )}

                </div>
              </div>

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
                />
                <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {activeLayer === 'satellite' && <TileLayer key="satellite" attribution="Esri World Imagery" url={getTileUrl()} opacity={layerOpacity / 100} />}
                {activeLayer === 'rainfall' && imagery.layer && <RainfallTiles key={imagery.layer.url} layer={imagery.layer} opacity={layerOpacity / 100} onError={() => setImageryError('Some NASA rainfall tiles failed to load.')} />}
                {(activeLayer === 'soil' || activeLayer === 'ndvi') && imagery.layer && <TileLayer
                  key={imagery.layer.id + imagery.layer.date} attribution="NASA GIBS"
                  url={imagery.layer.url} opacity={layerOpacity / 100}
                  maxNativeZoom={imagery.layer.maxNativeZoom} maxZoom={20}
                  eventHandlers={{ tileerror: () => setImageryError('Some NASA tiles failed to load. The base map is not the scientific layer.') }}
                />}
                <Marker position={mapCenter}>
                  <Popup>
                    <div style={{ fontFamily: 'Roboto, sans-serif', fontSize: '15px', color: 'var(--text-primary)' }}>
                      <strong>{selectedLocationName}</strong><br />
                      Simulated Soil Moisture in Experiment: <strong>{simResult ? simResult.modified.soilMoisture : 'N/A'}%</strong><br />
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
                  <button className="map-panel-toggle location-info-toggle" aria-expanded={locationInfoOpen} aria-controls="simulator-location-info" onClick={() => setLocationInfoOpen(open => !open)}>{locationInfoOpen ? 'Hide info −' : 'Show info +'}</button>
                </div>
                <div id="simulator-location-info" hidden={!locationInfoOpen}>
                <div className="frc-grid">
                  <div className="frc-item">
                    <span>Surface Soil Wetness</span>
                    <strong>{observedSoil ? `${(observedSoil.value * 100).toFixed(1)}% relative wetness` : soilStatus === 'loading' ? 'Loading…' : soilStatus === 'error' ? 'Could not load' : 'No valid reading'}</strong>
                    {observedSoil && <small>{observedSoil.date} · NASA POWER model</small>}
                  </div>
                  <div className="frc-item">
                    <span>Vegetation Greenness (NDVI)</span>
                    <strong>{vegetationData?.latest?.value != null ? vegetationData.latest.value.toFixed(4) : vegetationStatus === 'loading' ? 'Loading…' : vegetationStatus === 'error' ? 'Could not load' : 'No usable sample'}</strong>
                    {vegetationStatus === 'error' && <><small>{vegetationError}</small><button className="ndvi-retry-btn" onClick={() => setNdviRetry(value => value + 1)}>Retry vegetation data</button></>}
                    {vegetationData?.latest ? <small>{vegetationData.latest.date} · {vegetationData.latest.quality} quality · MODIS point sample, not a polygon average</small> : vegetationStatus === 'ready' && <small>{vegetationData?.message || 'No valid satellite sample for this location.'}</small>}

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
                        <span>Soil Moisture Result: <strong>{analysisResult.indicators.soilMoisture}</strong></span>
                        <span>Plant Health (NDVI): <strong>{analysisResult.indicators.ndvi}</strong></span>
                        <span className="frc-source">{analysisResult.dataSource}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="frc-empty-state">
                    <span>Select the Polygon tool, click the field corners, then double-click to finish the boundary.</span>
                  </div>
                )}
                </div>
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

            {/* Collapsible Right Sidebar (Environmental Controls & Farming Choices) */}
            <div className={`lab-floating-controls-panel ${isSidebarOpen ? 'open' : 'closed'}`}>
              <div className="control-card">
                <h3><CloudRain size={18} /> Weather and Climate</h3>

                <div className="ctrl-group">
                  <div className="ctrl-label-row">
                    <span>Rainfall Used in Experiment</span>
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
                    <span>Drought Level</span>
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
                    <span>Starting Soil Moisture</span>
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
                  <span className="lab-soil-input-note">
                    Editable experiment value. {observedSoil ? 'The map card shows NASA POWER relative wetness, a different measure; it does not set this input.' : 'This is an assumption, not a measured field value.'}
                  </span>
                </div>
              </div>

              <div className="control-card">
                <h3><Sliders size={18} /> Farming Choices</h3>

                <div className="ctrl-select-row">
                  <label>Crop Variety</label>
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
                    <span>Drought-Tolerant Varieties</span>
                  </label>
                  <label className="lab-checkbox">
                    <input
                      type="checkbox"
                      checked={strategies.precisionNitrogen}
                      onChange={(e) => setStrategies({ ...strategies, precisionNitrogen: e.target.checked })}
                    />
                    <span>Targeted Nutrient Use</span>
                  </label>
                </div>

                <div className="ctrl-group" style={{ marginTop: '16px' }}>
                  <div className="ctrl-label-row">
                    <span>Budget ($k)</span>
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
                <h3>Settings & Calculation Status</h3>
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
                <h3><Layers size={18} /> Baseline vs. Changed Conditions Comparison</h3>
                <span className="drawer-subtitle">Example results · starting conditions → your changes</span>
              </div>

              <div className="drawer-metrics-grid">
                <div className={`metric-box metric-${comparisonTone(simResult.baseline.waterDemand, simResult.modified.waterDemand, 'lower').tone}`}>
                  <span className="m-label">Water Needed<small className="metric-change-label">{comparisonTone(simResult.baseline.waterDemand, simResult.modified.waterDemand, 'lower').label}</small></span>
                  <div className="m-val-row">
                    <span className="base-val">{simResult.baseline.waterDemand} m³/ha</span>
                    <span className="arrow">→</span>
                    <span className="mod-val" style={{ color: '#245C46' }}>{simResult.modified.waterDemand} m³/ha</span>
                  </div>
                </div>

                <div className={`metric-box metric-${comparisonTone(simResult.baseline.soilMoisture, simResult.modified.soilMoisture, 'context').tone}`}>
                  <span className="m-label">Soil Moisture<small className="metric-change-label">{comparisonTone(simResult.baseline.soilMoisture, simResult.modified.soilMoisture, 'context').label}</small></span>
                  <div className="m-val-row">
                    <span className="base-val">{simResult.baseline.soilMoisture}%</span>
                    <span className="arrow">→</span>
                    <span className="mod-val" style={{ color: '#245C46' }}>{simResult.modified.soilMoisture}%</span>
                  </div>
                </div>

                <div className={`metric-box metric-${comparisonTone(simResult.baseline.cropStress, simResult.modified.cropStress, 'lower').tone}`}>
                  <span className="m-label">Crop Stress Level<small className="metric-change-label">{comparisonTone(simResult.baseline.cropStress, simResult.modified.cropStress, 'lower').label}</small></span>
                  <div className="m-val-row">
                    <span className="base-val">{simResult.baseline.cropStress}%</span>
                    <span className="arrow">→</span>
                    <span className="mod-val" style={{ color: simResult.modified.cropStress < 40 ? '#245C46' : '#C94F4F' }}>
                      {simResult.modified.cropStress}%
                    </span>
                  </div>
                </div>

                <div className={`metric-box metric-${comparisonTone(simResult.baseline.yield, simResult.modified.yield, 'higher').tone}`}>
                  <span className="m-label">Estimated Crop Harvest<small className="metric-change-label">{comparisonTone(simResult.baseline.yield, simResult.modified.yield, 'higher').label}</small></span>
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

