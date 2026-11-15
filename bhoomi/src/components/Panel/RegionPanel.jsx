import { useState, useEffect } from 'react';
import { X, ArrowRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchClimateObservations } from '../../services/api';
import './RegionPanel.css';

export default function RegionPanel({ location, onClose, onInvestigate }) {
  const [climateData, setClimateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!location) {
      setClimateData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setClimateData(null);

    fetchClimateObservations(location.lat, location.lng, controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          setClimateData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError' && !controller.signal.aborted) {
          setError(err.message || 'Failed to load historical NASA observations.');
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [location, retryCount]);

  if (!location) return null;

  const latest = climateData?.latestMeasurement;
  const soilReading = climateData?.latestByParameter?.soilMoistureTop;
  const rootReading = climateData?.latestByParameter?.soilMoistureRoot;

  const formatVal = (val, unit) => {
    if (val === null || val === undefined) return 'Unavailable';
    return `${val} ${unit}`;
  };

  const formatLat = (lat) => {
    const abs = Math.abs(lat).toFixed(2);
    return lat >= 0 ? `${abs}°N` : `${abs}°S`;
  };

  const formatLng = (lng) => {
    const abs = Math.abs(lng).toFixed(2);
    return lng >= 0 ? `${abs}°E` : `${abs}°W`;
  };

  return (
    <div className="google-earth-panel">
      <div className="panel-top-bar">
        <span className="location-tag">{location.country || (location.lat >= 0 ? 'Northern Hemisphere' : 'Southern Hemisphere')}</span>
        <button className="panel-close-btn" onClick={onClose} aria-label="Close panel">
          <X size={20} />
        </button>
      </div>

      <div className="panel-main-info">
        <h2 className="region-title">{location.name}</h2>
        <div className="coordinates-text">
          {formatLat(location.lat)}, {formatLng(location.lng)}
        </div>
      </div>

      <p className="region-description">{location.description}</p>

      <div className="indicators-section-title">
        Latest Available NASA Measurements
        <span className="nasa-time-badge" style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-secondary)', marginLeft: '8px' }}>
          ({climateData?.timeStandard || 'UTC'} {climateData?.observationDate ? `• ${climateData.observationDate}` : ''})
        </span>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
        Note: NASA POWER measurements for the surrounding map area for grid cell ({location.lat.toFixed(2)}, {location.lng.toFixed(2)}). Not precise enough to measure an individual field.
      </div>

      {loading && (
        <div className="panel-status-box">
          <Loader2 size={18} className="spinner" />
          <span>Loading NASA POWER measurements...</span>
        </div>
      )}

      {error && (
        <div className="panel-status-box error" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setRetryCount(c => c + 1)}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItem: 'center',
              gap: '6px',
              fontWeight: 600
            }}
          >
            <RefreshCw size={14} /> Retry Request
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="indicators-compact-grid">
          <div className="ind-box">
            <span className="ind-label">Air Temperature (T2M)</span>
            <span className="ind-value">
              {formatVal(latest?.temperature?.value, latest?.temperature?.unit || '°C')}
            </span>
          </div>
          <div className="ind-box">
            <span className="ind-label">Precipitation</span>
            <span className="ind-value">
              {formatVal(latest?.precipitation?.value, latest?.precipitation?.unit || 'mm/day')}
            </span>
          </div>
          <div className="ind-box">
            <span className="ind-label">Relative Humidity</span>
            <span className="ind-value">
              {formatVal(latest?.relativeHumidity?.value, latest?.relativeHumidity?.unit || '%')}
            </span>
          </div>
          <div className="ind-box">
            <span className="ind-label" title="Surface soil wetness (0-1 fraction relative saturation)">Surface Soil Wetness</span>
            <span className="ind-value" title="NASA POWER GWETTOP Surface Soil Wetness (0-1 fraction relative saturation). Not volumetric moisture.">
              {soilReading?.value !== null && soilReading?.value !== undefined
                ? `${(soilReading.value * 100).toFixed(1)}% Saturation`
                : 'Unavailable'}
            </span>
            {soilReading?.date && <span className="ind-label">Top 5 cm · {soilReading.date}</span>}
            {rootReading?.value != null && <span className="ind-label">Root zone: {(rootReading.value * 100).toFixed(1)}% saturation · {rootReading.date}</span>}
          </div>
        </div>
      )}

      <div className="panel-attribution-footer">
        Source: {climateData?.dataSource || 'NASA POWER API (Agroclimatology Community)'}
      </div>

      <div className="panel-action-container">
        <button className="google-earth-primary-btn" onClick={() => onInvestigate(location)}>
          <span>Investigate Region</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
