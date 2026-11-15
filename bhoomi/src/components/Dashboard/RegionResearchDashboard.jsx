import { fetchNdvi } from '../../services/ndviClient';
import { RainfallDate, RainfallTiles } from './RainfallMapStatus';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, ArrowRight, Calendar, Loader2, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import './RegionResearchDashboard.css';
import { describeSoilContext } from '../../services/soilContext';
import ConditionScale from './ConditionScale';
import { useGibsLayer } from '../../hooks/useGibsLayer';

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
  const [ndviData, setNdviData] = useState(null);
  const [ndviStatus, setNdviStatus] = useState('loading');
  const [loadingObs, setLoadingObs] = useState(false);
  const [obsError, setObsError] = useState(null);
  const [rainfallDate, setRainfallDate] = useState(null);
  const imagery = useGibsLayer(activeLayer, rainfallDate);
  const [imageryError, setImageryError] = useState(false);
  useEffect(() => { setImageryError(false); }, [activeLayer]);

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

  useEffect(() => {
    if (!region) return;
    const controller = new AbortController();
    setNdviData(null);
    setNdviStatus('loading');
    const { startStr, endStr } = getDatesForRange(timeRange);
    const base = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    const timer = setTimeout(() => controller.abort(), 90000);
    fetchNdvi(`${base}/api/ndvi?lat=${region.lat}&lon=${region.lng}&start=${startStr}&end=${endStr}`, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setNdviData(data); setNdviStatus('ready'); } })
      .catch(() => { if (!disposed) setNdviStatus('error'); })
      .finally(() => clearTimeout(timer));
    let disposed = false;
    return () => { disposed = true; clearTimeout(timer); controller.abort(); };
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

  const soilContext = describeSoilContext(records);
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

  const satelliteUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const scientificLayer = ['soil', 'ndvi', 'rainfall'].includes(activeLayer);
  const layerTitle = activeLayer === 'soil' ? 'SMAP modeled surface soil moisture' : activeLayer === 'ndvi' ? 'MODIS vegetation greenness' : 'IMERG precipitation rate';

  return (
    <div className="research-dashboard-overlay">
      <header className="rd-header">
        <div className="rd-title-group">
          <button className="rd-back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Return to Globe
          </button>
          <h1 className="bhoomi-page-title">
            Regional Research <span className="nasa-badge" style={{ background: '#3b82f6', color: '#fff', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, marginLeft: '8px' }}>Latest available data</span>
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
            <p className="overview-desc">{region.description || `Measurements for the area around (${region.lat.toFixed(4)}, ${region.lng.toFixed(4)}).`}</p>
          </div>
          <div className="overview-right">
            <div className="overview-meta-card">
              <span className="meta-label">Coordinates</span>
              <span className="meta-val">{region.lat.toFixed(2)}°N, {region.lng.toFixed(2)}°E</span>
            </div>
            <div className="overview-meta-card">
              <span className="meta-label">Data Available</span>
              <span className="meta-val">{obsData?.completenessPercentage !== undefined ? `${obsData.completenessPercentage}%` : 'Loading...'}</span>
            </div>
            <div className="overview-meta-card">
              <span className="meta-label">Data Source</span>
              <span className="meta-val">{obsData?.dataSource || 'NASA POWER weather data'}</span>
            </div>
          </div>
        </div>

        {/* Section B: Environmental Indicators (Live from NASA POWER) */}
        <div>
          <h3>Local Conditions (Latest Available Measurements)</h3>
          <div className="indicators-grid-4">
            <div className="indicator-glass-card">
              <span className="ind-title">Surface Soil Wetness</span>
              <div className="ind-main-val">
                {latestSoil.value !== null ? `${(latestSoil.value * 100).toFixed(1)}% Saturation` : 'Unavailable'}
              </div>
              <div className="ind-sub-desc">
                Surface soil wetness (GWETTOP), top 5 cm ({latestSoil.date || 'No valid date'}). Coverage: {soilCompleteness}%. Model-based relative wetness, not volumetric water content or a direct SMAP measurement.
              </div>
              <ConditionScale kind="soil" value={latestSoil.value === null ? null : latestSoil.value * 100} />
            </div>

            <div className="indicator-glass-card">
              <span className="ind-title">Vegetation Greenness (NDVI)</span>
              <div className="ind-main-val">
                {ndviStatus === 'loading' ? 'Loading…' : ndviData?.latest?.value != null ? ndviData.latest.value.toFixed(4) : 'Unavailable'}
              </div>
              <div className="ind-sub-desc">
                {ndviData?.latest ? `MODIS Terra · ${ndviData.latest.date} (16-day composite start). ${ndviData.latest.quality} quality. Automatically retrieved point sample.` : ndviStatus === 'error' ? 'NDVI could not be loaded. Check the backend connection and try again.' : ndviData?.message || 'Checking available satellite samples.'}
              </div>
              {ndviData?.latest && <div className="ind-sub-desc">{ndviData.acceptedCount} of {ndviData.sampleCount} samples passed the quality filter for this period. NDVI measures greenness, not crop health or yield.</div>}
              <ConditionScale kind="ndvi" value={ndviData?.latest?.value} />
            </div>

            <div className="indicator-glass-card">
              <span className="ind-title">Rainfall (PRECTOTCORR)</span>
              <div className="ind-main-val">
                {latestPrec.value !== null ? `${latestPrec.value} mm/day` : 'Unavailable'}
              </div>
              <div className="ind-sub-desc">
                Corrected daily rate ({latestPrec.date || 'No valid date'}). Coverage: {precCompleteness}%.
              </div>
              <ConditionScale kind="rain" value={latestPrec.value} />
            </div>

            <div className="indicator-glass-card">
              <span className="ind-title">Air Temperature (T2M)</span>
              <div className="ind-main-val">
                {latestTemp.value !== null ? `${latestTemp.value} °C` : 'Unavailable'}
              </div>
              <div className="ind-sub-desc">
                Air temperature at 2m ({latestTemp.date || 'No valid date'}). Coverage: {tempCompleteness}%.
              </div>
              <ConditionScale kind="temp" value={latestTemp.value} />
            </div>
          </div>
          <div className="chart-glass-card" style={{ marginTop: 16, padding: '16px 20px' }}>
            <strong>Soil condition: {loadingObs ? 'Loading…' : soilContext.label}</strong>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '8px 0' }}>{soilContext.detail}</p>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Crop risk is not assessed yet. It also needs crop type, growth stage, soil properties, and a validated model.</span>
          </div>
        </div>

        {/* Section C: Detailed Leaflet Geographic Map with Verified NASA GIBS Layers */}
        <div>
          <div className="chart-header-flex">
            <h3>Detailed Map & NASA Data Layers</h3>
            <div className="time-range-tabs">
              <button className={`time-tab ${activeLayer === 'base' ? 'active' : ''}`} onClick={() => setActiveLayer('base')}>Base Map</button>
              <button className={`time-tab ${activeLayer === 'satellite' ? 'active' : ''}`} onClick={() => setActiveLayer('satellite')}>Satellite</button>
              <button className={`time-tab ${activeLayer === 'soil' ? 'active' : ''}`} onClick={() => setActiveLayer('soil')}>Soil Moisture (SMAP)</button>
              <button className={`time-tab ${activeLayer === 'ndvi' ? 'active' : ''}`} onClick={() => setActiveLayer('ndvi')}>Vegetation NDVI</button>
              <button className={`time-tab ${activeLayer === 'rainfall' ? 'active' : ''}`} onClick={() => setActiveLayer('rainfall')}>Rainfall (IMERG)</button>
            </div>
          </div>

          {activeLayer === 'rainfall' && <RainfallDate layer={imagery.layer} value={rainfallDate} onChange={setRainfallDate} />}
          {scientificLayer && <div role="status" style={{ padding: '12px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
            {imageryError || imagery.status === 'error' ? 'Some NASA imagery could not load. The base map underneath is not the data layer.' : imagery.layer ? `${layerTitle} · image date ${imagery.layer.date}. ${activeLayer === 'ndvi' ? '16-day composite; colors show greenness, not crop health.' : activeLayer === 'rainfall' ? 'Colors show precipitation rate in mm/hour, not the daily rainfall value above. Clear areas may have no rain.' : 'Colors show water content, not crop risk; separate from the POWER wetness card.'}` : 'Loading available NASA imagery…'}
            {imagery.layer?.legend && <img src={imagery.layer.legend} alt={`${layerTitle} NASA color scale and units`} style={{ display: 'block', maxWidth: '100%', maxHeight: 100, background: '#fff', marginTop: 8 }} />}
          </div>}
          <div className="chart-glass-card map-container-wrapper" style={{ padding: 0, overflow: 'hidden', height: 460, position: 'relative', zIndex: 1 }}>
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
              {activeLayer === 'satellite' && <TileLayer key="satellite" attribution="Esri World Imagery" url={satelliteUrl} />}
              {activeLayer === 'rainfall' && imagery.layer && <RainfallTiles key={imagery.layer.url} layer={imagery.layer} onError={() => setImageryError(true)} />}
              {scientificLayer && activeLayer !== 'rainfall' && imagery.layer && <TileLayer
                key={imagery.layer.id + imagery.layer.date}
                attribution={`NASA GIBS · ${layerTitle}`}
                url={imagery.layer.url} opacity={0.85}
                maxZoom={20} maxNativeZoom={imagery.layer.maxNativeZoom}
                eventHandlers={{ tileerror: () => setImageryError(true) }}
              />}
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
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={18} /> Past Weather & Soil Measurements</h3>
            <div className="time-range-tabs">
              <button className={`time-tab ${timeRange === '3m' ? 'active' : ''}`} onClick={() => setTimeRange('3m')}>3M</button>
              <button className={`time-tab ${timeRange === '6m' ? 'active' : ''}`} onClick={() => setTimeRange('6m')}>6M</button>
              <button className={`time-tab ${timeRange === '1y' ? 'active' : ''}`} onClick={() => setTimeRange('1y')}>1Y</button>
            </div>
          </div>

          {loadingObs && (
            <div className="chart-glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260, gap: '12px', color: 'var(--text-secondary)' }}>
              <Loader2 size={24} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              <span>Loading past NASA POWER measurements for {timeRange.toUpperCase()} range...</span>
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
                <h4>Surface Soil Wetness (GWETTOP, 0–1 scale)</h4>
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
                <h4>Rainfall (mm/day)</h4>
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
          <h3>Data Sources & Missing Measurements</h3>
          <div className="insights-list data-source-summary">
            <div className="insight-item">
              <h4>Data Source</h4>
              <p>NASA POWER provides weather and modeled soil wetness. Complete weather records: {obsData?.completenessPercentage != null ? `${obsData.completenessPercentage}%` : 'Unavailable'}. This percentage does not include NDVI.</p>
            </div>
            <div className="insight-item">
              <h4>How Missing Data Is Shown</h4>
              <p>Missing measurements appear as gaps. The app does not invent values to fill them.</p>
            </div>
          </div>
          {obsData?.sourceUrl && <div className="data-source-footer">
            <span>Check the original measurements</span>
            <a href={obsData.sourceUrl} target="_blank" rel="noreferrer">View NASA POWER data ↗</a>
          </div>}
        </div>
      </div>
    </div>
  );
}
