import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, ArrowRight, Calendar } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { getSeverityColor } from '../../data/regions';
import './RegionResearchDashboard.css';

// Helper for Full-Background Risk Alert styling (Issue 2)
function getRiskAlertStyles(riskLevel) {
  const level = (riskLevel || '').toLowerCase();
  if (level === 'critical' || level === 'high') {
    return {
      background: 'var(--risk-high-bg, #6E2027)',
      borderColor: 'var(--risk-high-border, #B94650)',
      color: 'var(--risk-high-text, #FFE4E6)'
    };
  } else if (level === 'moderate') {
    return {
      background: 'var(--risk-mod-bg, #76501D)',
      borderColor: 'var(--risk-mod-border, #B88435)',
      color: 'var(--risk-mod-text, #FFF0D0)'
    };
  } else {
    // Low risk
    return {
      background: 'var(--risk-low-bg, #1D563F)',
      borderColor: 'var(--risk-low-border, #448E6D)',
      color: 'var(--risk-low-text, #E0F6E9)'
    };
  }
}

export default function RegionResearchDashboard({ region, onBack, onProceedToStrategy }) {
  const [timeRange, setTimeRange] = useState('6m');
  const [activeLayer, setActiveLayer] = useState('satellite');

  if (!region) return null;

  const riskAlertStyle = getRiskAlertStyles(region.riskLevel);

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
          <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Month: {label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '3px 0', color: entry.color, fontWeight: 600, fontSize: '14px' }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
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
    <div className="research-dashboard-overlay">
      <header className="rd-header">
        <div className="rd-title-group">
          <button className="rd-back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Return to Globe
          </button>
          <h1>
            Regional Research Workspace <span className="demo-badge">Demo Data</span>
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
            <span className="overview-country">{region.country}</span>
            <h2>{region.name}</h2>
            <p className="overview-desc">{region.description}</p>
          </div>
          <div className="overview-right">
            <div className="overview-meta-card">
              <span className="meta-label">Coordinates</span>
              <span className="meta-val">{region.lat.toFixed(2)}°N, {region.lng.toFixed(2)}°E</span>
            </div>
            <div className="overview-meta-card risk-alert-box" style={{
              backgroundColor: riskAlertStyle.background,
              borderColor: riskAlertStyle.borderColor,
              color: riskAlertStyle.color
            }}>
              <span className="meta-label" style={{ color: riskAlertStyle.color, opacity: 0.85 }}>Risk Level</span>
              <span className="meta-val" style={{ color: riskAlertStyle.color, fontWeight: 700 }}>
                {region.riskLevel} Risk ({region.riskCategory})
              </span>
            </div>
            <div className="overview-meta-card">
              <span className="meta-label">Data Source</span>
              <span className="meta-val">{region.indicators.dataSource}</span>
            </div>
          </div>
        </div>

        {/* Section B: Environmental Indicators */}
        <div>
          <h3>Key Environmental Indicators</h3>
          <div className="indicators-grid-4">
            <div className="indicator-glass-card">
              <span className="ind-title">Soil Moisture</span>
              <div className="ind-main-val">{region.indicators.soilMoisture}</div>
              <div className="ind-sub-desc">Root-zone soil water index derived from microwave radiometry.</div>
            </div>

            <div className="indicator-glass-card">
              <span className="ind-title">Vegetation Health</span>
              <div className="ind-main-val">{region.indicators.ndvi}</div>
              <div className="ind-sub-desc">Normalized Difference Vegetation Index canopy vigor metric.</div>
            </div>

            <div className="indicator-glass-card">
              <span className="ind-title">Rainfall Anomaly</span>
              <div className="ind-main-val">{region.indicators.rainfall}</div>
              <div className="ind-sub-desc">Precipitation departure from historical climatological mean.</div>
            </div>

            <div className="indicator-glass-card">
              <span className="ind-title">Surface Temperature</span>
              <div className="ind-main-val">{region.indicators.temperature}</div>
              <div className="ind-sub-desc">Land surface temperature anomaly during peak solar irradiance.</div>
            </div>
          </div>
        </div>

        {/* Section C: Detailed Leaflet Geographic Map with Layer Controls */}
        <div>
          <div className="chart-header-flex">
            <h3>Detailed Geographic Map & NASA Layers</h3>
            <div className="time-range-tabs">
              <button className={`time-tab ${activeLayer === 'base' ? 'active' : ''}`} onClick={() => setActiveLayer('base')}>Base Map</button>
              <button className={`time-tab ${activeLayer === 'satellite' ? 'active' : ''}`} onClick={() => setActiveLayer('satellite')}>Satellite</button>
              <button className={`time-tab ${activeLayer === 'soil' ? 'active' : ''}`} onClick={() => setActiveLayer('soil')}>Soil Moisture (Raster)</button>
              <button className={`time-tab ${activeLayer === 'ndvi' ? 'active' : ''}`} onClick={() => setActiveLayer('ndvi')}>Vegetation NDVI</button>
              <button className={`time-tab ${activeLayer === 'rainfall' ? 'active' : ''}`} onClick={() => setActiveLayer('rainfall')}>Rainfall</button>
            </div>
          </div>

          <div className="chart-glass-card map-container-wrapper" style={{ padding: 0, overflow: 'hidden', height: 460, position: 'relative', zIndex: 1 }}>
            {activeLayer !== 'base' && activeLayer !== 'satellite' && (
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
                Layer notification: Real NASA raster endpoint pending backend connection.
              </div>
            )}

            <MapContainer
              center={[region.lat, region.lng]}
              zoom={8}
              scrollWheelZoom={false}
              style={{ width: '100%', height: '100%', background: 'var(--bg-main)', zIndex: 1 }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors & NASA GIBS'
                url={getTileUrl()}
              />
              <Marker position={[region.lat, region.lng]}>
                <Popup>
                  <div style={{ color: 'var(--text-primary)', fontFamily: 'Roboto, sans-serif', fontSize: '14px', padding: '4px' }}>
                    <strong>{region.name}</strong><br />
                    Risk: {region.riskCategory}<br />
                    Coordinates: {region.lat.toFixed(2)}, {region.lng.toFixed(2)}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>

        {/* Section D: Historical Analysis (Recharts) */}
        <div>
          <div className="chart-header-flex">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={18} /> Historical Climatological Trends</h3>
            <div className="time-range-tabs">
              <button className={`time-tab ${timeRange === '3m' ? 'active' : ''}`} onClick={() => setTimeRange('3m')}>3M</button>
              <button className={`time-tab ${timeRange === '6m' ? 'active' : ''}`} onClick={() => setTimeRange('6m')}>6M</button>
              <button className={`time-tab ${timeRange === '1y' ? 'active' : ''}`} onClick={() => setTimeRange('1y')}>1Y</button>
            </div>
          </div>

          <div className="charts-grid-2">
            <div className="chart-glass-card">
              <h4>Soil Moisture Index (%)</h4>
              <div style={{ width: '100%', height: 260, marginTop: '16px' }}>
                <ResponsiveContainer>
                  <LineChart data={region.historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={13} />
                    <YAxis stroke="var(--text-secondary)" fontSize={13} domain={[0, 70]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="moisture" name="Soil Moisture %" stroke="var(--primary-blue)" strokeWidth={3} dot={{ fill: 'var(--primary-blue)', r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-glass-card">
              <h4>Vegetation Vigor Index (NDVI)</h4>
              <div style={{ width: '100%', height: 260, marginTop: '16px' }}>
                <ResponsiveContainer>
                  <BarChart data={region.historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={13} />
                    <YAxis stroke="var(--text-secondary)" fontSize={13} domain={[0, 1]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="ndvi" name="NDVI Index" fill="var(--vegetation)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Section E: Research Insights */}
        <div className="insights-glass-card">
          <h3>Research insights</h3>
          <div className="insights-list">
            <div className="insight-item">
              <h4>Environmental conditions</h4>
              <p>Simulated telemetry indicates prolonged soil moisture deficit and thermal stress during critical crop growth windows, increasing irrigation dependency.</p>
            </div>
            <div className="insight-item">
              <h4>Satellite data and limitations</h4>
              <p>Synthesized using multi-spectral indices from MODIS and microwave soil moisture estimates from NASA SMAP. Data resolution is subject to atmospheric interference and cloud cover.</p>
            </div>
            <div className="insight-item">
              <h4>Suggested strategies</h4>
              <p>Proceed to the Farming Strategy Simulator to evaluate micro-irrigation, cover cropping, and drought-resistant seed deployment.</p>
            </div>
          </div>
          <div className="scientific-disclaimer">
            Note: This dashboard utilizes clearly labelled demonstration scenario data for educational and hackathon demonstration purposes. Real NASA API integration is configured for backend ingestion.
          </div>
        </div>
      </div>
    </div>
  );
}
