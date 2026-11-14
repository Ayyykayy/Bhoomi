import { X, ArrowRight } from 'lucide-react';
import './RegionPanel.css';

// Helper for Full-Background Risk Alert styling (Issue 2)
function getRiskAlertStyles(riskLevel) {
  const level = (riskLevel || '').toLowerCase();
  if (level === 'critical' || level === 'high') {
    return {
      background: 'var(--risk-high-bg)',
      borderColor: 'var(--risk-high-border)',
      color: 'var(--risk-high-text)'
    };
  } else if (level === 'moderate') {
    return {
      background: 'var(--risk-mod-bg)',
      borderColor: 'var(--risk-mod-border)',
      color: 'var(--risk-mod-text)'
    };
  } else {
    return {
      background: 'var(--risk-low-bg)',
      borderColor: 'var(--risk-low-border)',
      color: 'var(--risk-low-text)'
    };
  }
}

export default function RegionPanel({ region, onClose, onInvestigate }) {
  if (!region) return null;

  const riskAlertStyle = getRiskAlertStyles(region.riskLevel);

  return (
    <div className="google-earth-panel">
      <div className="panel-top-bar">
        <span className="location-tag">{region.country}</span>
        <button className="panel-close-btn" onClick={onClose} aria-label="Close panel">
          <X size={20} />
        </button>
      </div>

      <div className="panel-main-info">
        <h2 className="region-title">{region.name}</h2>
        <div className="coordinates-text">
          {region.lat.toFixed(2)}°N, {region.lng.toFixed(2)}°E
        </div>
      </div>

      <div className="risk-summary-row" style={{
        backgroundColor: riskAlertStyle.background,
        borderColor: riskAlertStyle.borderColor,
        color: riskAlertStyle.color
      }}>
        <span className="risk-category-text" style={{ color: riskAlertStyle.color }}>{region.riskCategory}</span>
        <span className="risk-level-badge" style={{ color: riskAlertStyle.color, fontWeight: 700 }}>{region.riskLevel} Risk</span>
      </div>

      <p className="region-description">{region.description}</p>

      <div className="indicators-section-title">Environmental Indicators</div>
      <div className="indicators-compact-grid">
        <div className="ind-box">
          <span className="ind-label">Soil Moisture</span>
          <span className="ind-value">{region.indicators.soilMoisture}</span>
        </div>
        <div className="ind-box">
          <span className="ind-label">Vegetation (NDVI)</span>
          <span className="ind-value">{region.indicators.ndvi}</span>
        </div>
        <div className="ind-box">
          <span className="ind-label">Rainfall</span>
          <span className="ind-value">{region.indicators.rainfall}</span>
        </div>
        <div className="ind-box">
          <span className="ind-label">Surface Temp</span>
          <span className="ind-value">{region.indicators.temperature}</span>
        </div>
      </div>

      <div className="panel-action-container">
        <button className="google-earth-primary-btn" onClick={() => onInvestigate(region)}>
          <span>Investigate Region</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
