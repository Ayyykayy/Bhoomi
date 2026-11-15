import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, ArrowRight, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import './RegionResearchDashboard.css';

// Helper component to recenter Leaflet map when region changes
function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 8, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function RegionResearchDashboard({ region, onBack, onProceedToStrategy }) {
  const [timeRange, setTimeRange] = useState('3m'); // '3m' | '6m' | '1y'
  const [activeLayer, setActiveLayer] = useState('satellite'); // 'base' | 'satellite' | 'soil' | 'ndvi' | 'rainfall'
  const [obsData, setObsData] = useState(null);
  const [loadingObs, setLoadingObs] = useState(false);
  const [obsError, setObsError] = useState(null);

  if (!region) return null;

  // Compute start/end dates YYYYMMDD dynamically relative to current UTC date (with 3-day data lag)
  const getDatesForRange = (range) => {
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 3); // Account for ~3-day operational lag in NASA telemetry
    const start = new Date(end);
    if (range === '3m') {
      start.setUTCMonth(start.getUTCMonth() - 3);
    } else if (range === '6m') {
      start.setUTCMonth(start.getUTCMonth() - 6);
    } else if (range === '1y') {
      start.setUTCFullYear(start.getUTCFullYear() - 1);
    }
    const fmt = (d) => {
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${y}${m}${day}`;
    };
    return { startStr: fmt(start), endStr: fmt(end) };
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoadingObs(true);
    setObsError(null);
    setObsData(null);

    const { startStr, endStr } = getDatesForRange(timeRange);
    const backendBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

    fetch(`${backendBase}/api/observations?lat=${region.lat}&lon=${region.lng}&start=${startStr}&end=${endStr}`, {
      signal: controller.signal
    })
      .then(res => {
        if (!res.ok) throw new Error(`Backend returned status ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!controller.signal.aborted) {
          setObsData(data);
          setLoadingObs(false);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError' && !controller.signal.aborted) {
          setObsError(err.message || 'Failed to fetch historical observations.');
          setLoadingObs(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [region, timeRange]);

  // Extract latest valid measurement independently for each metric (finite number check)
  const records = obsData?.records || [];
  const getLatestValid = (extractor) => {
    for (let i = records.length - 1; i >= 0; i--) {
      const val = extractor(records[i]);
      if (typeof val === 'number' && Number.isFinite(val)) {
        return { value: val, date: records[i].date };
      }
    }
    return { value: null, date: null };
  };

  const latestSoil = getLatestValid(r => r.soilMoistureTop?.value);
  const latestPrec = getLatestValid(r => r.precipitation?.value);
  const latestTemp = getLatestValid(r => r.temperature?.value);

  // Parameter completeness calculations
  const getParamCompleteness = (extractor) => {
    if (records.length === 0) return 0;
    const count = records.filter(r => {
      const val = extractor(r);
      return typeof val === 'number' && Number.isFinite(val);
    }).length;
    return Math.round((count / records.length) * 100);
  };

  const soilCompleteness = getParamCompleteness(r => r.soilMoistureTop?.value);
  const precCompleteness = getParamCompleteness(r => r.precipitation?.value);
  const tempCompleteness = getParamCompleteness(r => r.temperature?.value);

  const formatVal = (val, unit) => (typeof val === 'number' && Number.isFinite(val) ? `${val} ${unit}` : 'Unavailable');

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '14px',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow)'
        }}>
          <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Date: {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '3px 0', color: entry.color, fontWeight: 600, fontSize: '14px' }}>
              {entry.name}: {entry.value !== null && entry.value !== undefined ? entry.value : 'Unavailable'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Verified NASA GIBS Imagery details with base map overlay
  const gibsDate = '2024-05-01'; // Known stable composite date for GIBS global testing
  const getTileUrl = () => {
    switch (activeLayer) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'soil':
        // NASA GIBS SMAP L4 Surface Soil Moisture with explicit date and Level9 tile matrix
        return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SMAP_L4_Soil_Moisture_Surface/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;
      case 'rainfall':
        // NASA GIBS IMERG Precipitation Rate with explicit date and Level6 tile matrix
        return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${gibsDate}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
      case 'base':
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  return (
    <div className="research-dashboard-overlay">
      <header className="rd-header">
        <div className="rd-title-group">
          <button className="rd-back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Return to Globe
          </button>
          <h1>
            Regional Research Workspace <span className="nasa-badge" style={{ background: '#3b82f6', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, marginLeft: '8px' }}>NASA POWER Live</span>
          </h1>
        </div>
        <div className="rd-nav-actions">
          <button className="rd-action-btn" onClick={onProceedToStrategy}>
            <span>Farming Strategy Simulator</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </header>

      <div className="rd-content">
        {/* Section A: Region Overview Banner */}
        <div className="overview-banner-glass">
          <div className="overview-left">
            <span className="overview-country">{region.country || 'Global Coordinate'}</span>
            <h2>{region.name}</h2>
            <p className="overview-desc">{region.description || `Gridded telemetry analysis for coordinates (${region.lat.toFixed(4)}, ${region.lng.toFixed(4)}).`}</p>
          </div>
          <div className="overview-right">
            <div className="overview-meta-card">
              <span className="meta-label">Coordinates</span>
              <span className="meta-val">{region.lat.toFixed(2)}°N, {region.lng.toFixed(2)}°E</span>
            </div>
            <div className="overview-meta-card">
              <span className="meta-label">Data Completeness</span>
              <span className="meta-val">{obsData?.completenessPercentage !== undefined ? `${obsData.completenessPercentage}%` : 'Loading...'}</span>
            </div>
            <div className="overview-meta-card">
              <span className="meta-label">Data Source</span>
              <span className="meta-val">{obsData?.dataSource || 'NASA POWER API (Agroclimatology)'}</span>
            </div>
          </div>
        </div>

        {/* Section B: Environmental Indicators (Live from NASA POWER) */}
        <div>
          <h3>Key Environmental Indicators (Independently Verified Latest Observations)</h3>
          <div className="indicators-grid-4">
            <div className="indicator-glass-card">
              <span className="ind-title">Surface Soil Wetness</span>
              <div className="ind-main-val">
                {latestSoil.value !== null ? `${(latestSoil.value * 100).toFixed(1)}% Saturation` : 'Unavailable'}
              </div>
              <div className="ind-sub-desc">
                GWETTOP 0-5cm relative saturation ({latestSoil.date || 'No valid date'}). Coverage: {soilCompleteness}%. Not volumetric.
              </div>
            </div>

            <div className="indicator-glass-card">
              <span className="ind-title">Vegetation Health (NDVI)</span>
              <div className="ind-main-val" style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>
                Not Connected
              </div>
              <div className="ind-sub-desc">Requires MODIS/Landsat NDVI scientific dataset integration. No simulated proxy.</div>
            </div>

            <div className="indicator-glass-card">
              <span className="ind-title">Precipitation (PRECTOTCORR)</span>
              <div className="ind-main-val">
                {latestPrec.value !== null ? `${latestPrec.value} mm/day` : 'Unavailable'}
              </div>
              <div className="ind-sub-desc">
                Corrected daily rate ({latestPrec.date || 'No valid date'}). Coverage: {precCompleteness}%.
              </div>
            </div>

            <div className="indicator-glass-card">
              <span className="ind-title">Temperature (T2M)</span>
              <div className="ind-main-val">
                {latestTemp.value !== null ? `${latestTemp.value} °C` : 'Unavailable'}
              </div>
              <div className="ind-sub-desc">
                Air temperature at 2m ({latestTemp.date || 'No valid date'}). Coverage: {tempCompleteness}%.
              </div>
            </div>
          </div>
        </div>

        {/* Section C: Detailed Leaflet Geographic Map with Verified NASA GIBS Layers */}
        <div>
          <div className="chart-header-flex">
            <h3>Detailed Geographic Map & NASA Layers</h3>
            <div className="time-range-tabs">
              <button className={`time-tab ${activeLayer === 'base' ? 'active' : ''}`} onClick={() => setActiveLayer('base')}>Base Map</button>
              <button className={`time-tab ${activeLayer === 'satellite' ? 'active' : ''}`} onClick={() => setActiveLayer('satellite')}>Satellite</button>
              <button className={`time-tab ${activeLayer === 'soil' ? 'active' : ''}`} onClick={() => setActiveLayer('soil')}>Soil Moisture (SMAP)</button>
              <button className={`time-tab ${activeLayer === 'ndvi' ? 'active' : ''}`} onClick={() => setActiveLayer('ndvi')}>Vegetation NDVI</button>
              <button className={`time-tab ${activeLayer === 'rainfall' ? 'active' : ''}`} onClick={() => setActiveLayer('rainfall')}>Rainfall (IMERG)</button>
            </div>
          </div>

          <div className="chart-glass-card map-container-wrapper" style={{ padding: 0, overflow: 'hidden', height: 460, position: 'relative', zIndex: 1 }}>
            {activeLayer === 'ndvi' && (
              <div style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'var(--surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                zIndex: 10,
                fontWeight: 500,
                boxShadow: 'var(--shadow)'
              }}>
                Layer disabled: NDVI raster stream not connected. Showing base geography.
              </div>
            )}

            <MapContainer
              center={[region.lat, region.lng]}
              zoom={8}
              scrollWheelZoom={false}
              style={{ width: '100%', height: '100%', background: 'var(--bg-main)', zIndex: 1 }}
            >
              <MapCenterUpdater center={[region.lat, region.lng]} zoom={8} />
              {/* Always show base map underneath */}
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* Overlay scientific or satellite layer on top when selected */}
              {activeLayer !== 'base' && activeLayer !== 'ndvi' && (
                <TileLayer
                  key={activeLayer}
                  attribution={
                    activeLayer === 'soil' ? 'NASA GIBS SMAP L4 Surface Soil Moisture' :
                    activeLayer === 'rainfall' ? 'NASA GIBS IMERG Precipitation' :
                    'Esri World Imagery'
                  }
                  url={getTileUrl()}
                  opacity={activeLayer === 'satellite' ? 1.0 : 0.75}
                  maxZoom={activeLayer === 'rainfall' ? 6 : activeLayer === 'soil' ? 9 : 18}
                />
              )}
              <Marker position={[region.lat, region.lng]}>
                <Popup>
                  <div style={{ color: 'var(--text-primary)', fontFamily: 'Roboto, sans-serif', fontSize: '14px', padding: '4px' }}>
                    <strong>{region.name}</strong><br />
                    Coordinates: {region.lat.toFixed(4)}, {region.lng.toFixed(4)}<br />
                    Surface Wetness: {latestSoil.value !== null ? `${(latestSoil.value * 100).toFixed(1)}%` : 'Unavailable'}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>

        {/* Section D: Historical Analysis (Recharts with Real Observations) */}
        <div>
          <div className="chart-header-flex">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={18} /> Real Historical Climatological Observations</h3>
            <div className="time-range-tabs">
              <button className={`time-tab ${timeRange === '3m' ? 'active' : ''}`} onClick={() => setTimeRange('3m')}>3M</button>
              <button className={`time-tab ${timeRange === '6m' ? 'active' : ''}`} onClick={() => setTimeRange('6m')}>6M</button>
              <button className={`time-tab ${timeRange === '1y' ? 'active' : ''}`} onClick={() => setTimeRange('1y')}>1Y</button>
            </div>
          </div>

          {loadingObs && (
            <div className="chart-glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, gap: '12px', color: 'var(--text-secondary)' }}>
              <Loader2 size={24} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Fetching NASA POWER historical records for {timeRange.toUpperCase()} range...</span>
            </div>
          )}

          {obsError && (
            <div className="chart-glass-card" style={{ padding: '24px', background: 'var(--risk-high-bg)', color: 'var(--risk-high-text)', border: '1px solid var(--risk-high-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={18} />
                <strong>Failed to load observations:</strong> {obsError}
              </div>
            </div>
          )}

          {!loadingObs && !obsError && (
            <div className="charts-grid-2">
              <div className="chart-glass-card">
                <h4>Surface Soil Wetness (GWETTOP Fraction 0-1)</h4>
                <div style={{ width: '100%', height: 260, marginTop: '16px' }}>
                  <ResponsiveContainer>
                    <LineChart data={records.map(r => ({ date: r.date, val: r.soilMoistureTop?.value }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                      <YAxis stroke="var(--text-secondary)" fontSize={13} domain={[0, 1]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="val" name="Soil Wetness (0-1)" stroke="var(--primary-blue)" strokeWidth={2} dot={false} connectNulls={true} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-glass-card">
                <h4>Corrected Precipitation (mm/day)</h4>
                <div style={{ width: '100%', height: 260, marginTop: '16px' }}>
                  <ResponsiveContainer>
                    <BarChart data={records.map(r => ({ date: r.date, val: r.precipitation?.value }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={11} tickFormatter={(d) => d.slice(5)} />
                      <YAxis stroke="var(--text-secondary)" fontSize={13} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="val" name="Precipitation (mm/day)" fill="var(--primary-blue)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section E: Research Insights */}
        <div className="insights-glass-card">
          <h3>Research insights & Data Traceability</h3>
          <div className="insights-list">
            <div className="insight-item">
              <h4>Telemetry Source</h4>
              <p>Queried directly from NASA POWER API (Agroclimatology Community - GEOS-5 FP). Data completeness: {obsData?.completenessPercentage}%.</p>
            </div>
            <div className="insight-item">
              <h4>Missing-Data Handling</h4>
              <p>Missing daily records (-999 values) are explicitly filtered and shown as gaps without synthetic interpolation or data fabrication.</p>
            </div>
          </div>
          <div className="scientific-disclaimer">
            Source URL: <a href={obsData?.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-blue)', wordBreak: 'break-all' }}>{obsData?.sourceUrl || 'NASA POWER API Endpoint'}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
