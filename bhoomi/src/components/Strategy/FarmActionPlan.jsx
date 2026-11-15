import { useState, useEffect } from 'react';
import { ArrowLeft, CheckSquare, Square, Save, Printer, Download, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { saveSingleExperiment } from '../../services/experimentStorage';
import './FarmActionPlan.css';

export default function FarmActionPlan({ experiment, onBack, onNavigateToSimulator }) {
  const [currentExp, setCurrentExp] = useState(experiment);
  const [toast, setToast] = useState(null);

  if (!currentExp) {
    return (
      <div className="action-plan-overlay">
        <div style={{ padding: '48px', textAlign: 'center', margin: 'auto' }}>
          <AlertCircle size={48} style={{ color: '#E5484D', margin: '0 auto 16px' }} />
          <h2>No Experiment Selected</h2>
          <p>Please complete a scenario and proceed to the action plan.</p>
          <button className="ap-btn primary" onClick={onBack} style={{ marginTop: '16px' }}>Return to Results</button>
        </div>
      </div>
    );
  }

  const checklist = currentExp.actionChecklist?.items || [
    { id: 'check-soil', text: 'Check soil moisture near the roots and watering needs', completed: false },
    { id: 'verify-crop', text: 'Verify seed cultivar suitability against documented crop requirements and available climate records', completed: false },
    { id: 'review-water', text: 'Check available water, any required permits, and irrigation efficiency', completed: false },
    { id: 'inspect-datasets', text: 'Check which local measurements are available or missing', completed: false }
  ];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleCheck = (id) => {
    const updatedItems = checklist.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    const updatedExp = {
      ...currentExp,
      actionChecklist: { items: updatedItems },
      updatedAt: new Date().toISOString()
    };
    saveSingleExperiment(updatedExp);
    setCurrentExp(updatedExp);
  };

  const handleSave = () => {
    saveSingleExperiment(currentExp);
    showToast('Action plan and checklist progress saved to browser storage ("Saved on this browser")');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentExp, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${currentExp.name.replace(/\s+/g, '_')}_action_plan.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Action plan JSON downloaded');
  };

  const hasSoilData = currentExp.observations?.soilMoisture !== null && currentExp.observations?.soilMoisture !== undefined;

  return (
    <div className="action-plan-overlay">
      {toast && (
        <div className="bhoomi-toast-banner">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="ap-header">
        <div className="ap-title-group">
          <button className="ap-back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Return to Results
          </button>
          <div>
            <h1 className="bhoomi-page-title">Farm Action Plan & Recommendations</h1>
            <span className="ap-subtitle">
              Experiment: <strong>{currentExp.name}</strong> · Saved on this browser
            </span>
          </div>
        </div>

        <div className="ap-header-actions">
          <button className="ap-btn secondary" onClick={handleSave}>
            <Save size={16} /> Save Plan
          </button>
          <button className="ap-btn secondary" onClick={handlePrint} title="Print or Save as PDF">
            <Printer size={16} /> Print Plan
          </button>
          <button className="ap-btn secondary" onClick={handleDownloadJson} title="Download JSON">
            <Download size={16} /> JSON
          </button>
        </div>
      </header>

      {/* Notice Banner */}
      <div className="ap-notice-banner">
        <Info size={18} style={{ color: '#4285F4', flexShrink: 0 }} />
        <div>
          <strong>Preparation Checklist:</strong> These steps use your experiment settings and available data. Farm-specific advice needs the completed backend.
        </div>
      </div>

      {/* Content Body */}
      <div className="ap-content-body">
        <div className="ap-grid-section">
          {/* Summary Card */}
          <div className="ap-card">
            <h3>Experiment Overview</h3>
            <div className="ap-summary-grid">
              <div className="ap-sum-item">
                <span>Location</span>
                <strong>{currentExp.location.name}</strong>
              </div>
              <div className="ap-sum-item">
                <span>Coordinates</span>
                <strong>{Math.abs(currentExp.location.lat).toFixed(4)}°{currentExp.location.lat >= 0 ? 'N' : 'S'}, {Math.abs(currentExp.location.lng).toFixed(4)}°{currentExp.location.lng >= 0 ? 'E' : 'W'}</strong>
              </div>
              <div className="ap-sum-item">
                <span>Crop Variety</span>
                <strong>{currentExp.inputs.strategies.cropType.toUpperCase()}</strong>
              </div>
              <div className="ap-sum-item">
                <span>Irrigation Strategy</span>
                <strong>{currentExp.inputs.strategies.irrigation.toUpperCase()}</strong>
              </div>
            </div>
          </div>

          {/* Action Checklist */}
          <div className="ap-card">
            <h3>Preparation Checklist</h3><p>{checklist.filter(item => item.completed).length} of {checklist.length} preparation steps completed</p>
            <p>Check these items before using the plan on a farm.</p>

            <div className="ap-checklist">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`ap-check-item ${item.completed ? 'completed' : ''}`}
                  onClick={() => handleToggleCheck(item.id)}
                >
                  <div className="ap-checkbox-icon">
                    {item.completed ? <CheckSquare size={20} style={{ color: '#34A853' }} /> : <Square size={20} style={{ color: 'var(--text-secondary)' }} />}
                  </div>
                  <span className="ap-check-text">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Prioritized Actions & Evidence */}
          <div className="ap-card">
            <h3>Preparation Steps & Supporting Data</h3>

            <div className="ap-action-list">
              <div className="ap-action-box">
                <h4>1. Check Soil Moisture Near the Roots</h4>
                <p><strong>Why:</strong> Soil moisture near the roots is currently {hasSoilData ? currentExp.observations.soilMoisture : 'based on an entered starting value'}.</p>
                <p><strong>Based On:</strong> {hasSoilData ? currentExp.observations.source : 'No confirmed soil measurement is saved. Check the soil before planning watering.'}</p>
              </div>

              <div className="ap-action-box">
                <h4>2. Review How You Water the Crops</h4>
                <p><strong>Why:</strong> Selected strategy ({currentExp.inputs.strategies.irrigation.toUpperCase()}) targets water conservation in a hypothetical rainfall scenario ({currentExp.inputs.environment.rainfall} mm); this is not a weather forecast.</p>
                <p><strong>Based On:</strong> Your selected method and an example calculation. Benefits have not been tested for this farm.</p>
              </div>

              <div className="ap-action-box">
                <h4>3. Check Missing Data & Limits</h4>
                <p><strong>Why:</strong> {currentExp.observations.date ? `Review observations dated ${currentExp.observations.date} for coverage and relevance.` : 'Measurement dates and data coverage are unavailable. Add confirmed measurements before relying on the results.'}</p>
                <p><strong>Assumptions & Limits:</strong> {currentExp.metadata.assumptions[0]}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
