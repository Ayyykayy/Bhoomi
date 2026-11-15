import { useState, useEffect } from 'react';
import { ArrowLeft, GitCompare, Save, Share2, Layers, CheckCircle2, ArrowRight, Printer, Download, Pencil } from 'lucide-react';
import { saveSingleExperiment } from '../../services/experimentStorage';
import './ExperimentResults.css';

export default function ExperimentResults({ experiment, onBack, onNavigateToActionPlan, onNavigateToSaved }) {
  const [currentExp, setCurrentExp] = useState(experiment);
  const [toast, setToast] = useState(null);
  const [expName, setExpName] = useState(experiment ? experiment.name : 'BHOOMI Strategy Experiment');
  const [isEditingName, setIsEditingName] = useState(false);

  if (!currentExp) {
    return (
      <div className="exp-res-overlay">
        <div style={{ padding: '48px', textAlign: 'center', margin: 'auto' }}>
          <h2>No Experiment Selected</h2>
          <p>Please complete a scenario simulation in the Scenario Lab to view results.</p>
          <button className="er-btn primary" onClick={onBack} style={{ marginTop: '16px' }}>Return to Scenario Lab</button>
        </div>
      </div>
    );
  }

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSaveExperiment = () => {
    const updated = {
      ...currentExp,
      name: expName,
      updatedAt: new Date().toISOString()
    };
    saveSingleExperiment(updated);
    setCurrentExp(updated);
    showToast('Experiment saved successfully to browser storage ("Saved on this browser")');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentExp, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${expName.replace(/\s+/g, '_')}_results.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Experiment JSON downloaded successfully');
  };

  const { baseline, modified, metrics, inputs, observations, location } = currentExp;

  return (
    <div className="exp-res-overlay">
      {toast && (
        <div className="bhoomi-toast-banner">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="er-header">
        <div className="er-title-group">
          <button className="er-back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Return to Scenario Lab
          </button>
          <div>
            {isEditingName ? (
              <input
                type="text"
                value={expName}
                onChange={(e) => setExpName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                autoFocus
                className="er-name-input"
              />
            ) : (
              <h1 onClick={() => setIsEditingName(true)} title="Click to edit name" style={{ cursor: 'pointer' }}>
                {expName} <Pencil size={17} aria-hidden="true" />
              </h1>
            )}
            <span className="er-subtitle">
              Location: <strong>{location.name}</strong> ({Math.abs(location.lat).toFixed(2)}°{location.lat >= 0 ? 'N' : 'S'}, {Math.abs(location.lng).toFixed(2)}°{location.lng >= 0 ? 'E' : 'W'}) · Saved on this browser
            </span>
          </div>
        </div>

        <div className="er-header-actions"><button className="er-btn secondary" onClick={onNavigateToSaved}>Saved Experiments</button>
          <button className="er-btn secondary" onClick={handleSaveExperiment}>
            <Save size={16} /> Save Experiment
          </button>
          <button className="er-btn secondary" onClick={handlePrint} title="Print or Save as PDF">
            <Printer size={16} /> Print Report
          </button>
          <button className="er-btn secondary" onClick={handleDownloadJson} title="Download JSON">
            <Download size={16} /> JSON
          </button>
          <button className="er-btn primary" onClick={() => onNavigateToActionPlan(currentExp)}>
            Farm Action Plan <ArrowRight size={16} />
          </button>
        </div>
      </header>

      {/* Content Body */}
      <div className="er-content-body">
        <div className="er-grid-section">
          {/* Side-by-Side Comparison Card */}
          <div className="er-card">
            <h3><GitCompare size={20} /> Compare Starting and Changed Conditions</h3>
            <p>Example results compare your starting conditions with your changes. They are not tested crop predictions or measured local results.</p>

            <div className="er-comparison-table-wrapper">
              <table className="er-comparison-table">
                <thead>
                  <tr>
                    <th>Measure</th>
                    <th>Starting Conditions</th>
                    <th>Changed Conditions</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Water Needed</strong></td>
                    <td>{baseline.waterDemand} m³/ha</td>
                    <td><strong>{modified.waterDemand} m³/ha</strong></td>
                    <td className="er-positive">
                      {(modified.waterDemand < baseline.waterDemand ? '-' : '+')}
                      {Math.abs(modified.waterDemand - baseline.waterDemand)} m³/ha
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Soil Moisture in Experiment</strong></td>
                    <td>{baseline.soilMoisture}%</td>
                    <td><strong>{modified.soilMoisture}%</strong></td>
                    <td className="er-positive">{modified.soilMoisture - baseline.soilMoisture > 0 ? '+' : ''}{modified.soilMoisture - baseline.soilMoisture} percentage points</td>
                  </tr>
                  <tr>
                    <td><strong>Crop Stress Level</strong></td>
                    <td>{baseline.cropStress}%</td>
                    <td><strong>{modified.cropStress}%</strong></td>
                    <td className={modified.cropStress < baseline.cropStress ? 'er-positive' : 'er-negative'}>
                      {modified.cropStress - baseline.cropStress > 0 ? '+' : ''}{modified.cropStress - baseline.cropStress} percentage points
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Estimated Crop Harvest</strong></td>
                    <td>{baseline.yield} t/ha</td>
                    <td><strong>{modified.yield} t/ha</strong></td>
                    <td className="er-positive">{modified.yield - baseline.yield > 0 ? '+' : ''}{(modified.yield - baseline.yield).toFixed(1)} t/ha (example)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Inputs & Provenance Grid */}
          <div className="er-two-col-grid">
            <div className="er-card">
              <h3>Experiment Settings</h3>
              <ul className="er-prop-list">
                <li><span>Crop Variety:</span> <strong>{inputs.strategies.cropType.toUpperCase()}</strong></li>
                <li><span>Irrigation Method:</span> <strong>{inputs.strategies.irrigation.toUpperCase()}</strong></li>
                <li><span>Soil Management:</span> <strong>{inputs.strategies.mulching.toUpperCase()}</strong></li>
                <li><span>Drought-Tolerant Seeds:</span> <strong>{inputs.strategies.droughtSeeds ? 'Enabled' : 'Disabled'}</strong></li>
                <li><span>Targeted Nutrient Use:</span> <strong>{inputs.strategies.precisionNitrogen ? 'Enabled' : 'Disabled'}</strong></li>
                <li><span>Scenario Rainfall:</span> <strong>{inputs.environment.rainfall} mm</strong></li>
                <li><span>Drought Level:</span> <strong>Level {inputs.environment.droughtSeverity} / 10</strong></li>
                <li><span>Budget:</span> <strong>${inputs.budget},000 USD</strong></li>
              </ul>
            </div>

            <div className="er-card">
              <h3>Data Sources & Assumptions</h3>
              <ul className="er-prop-list">
                <li><span>Data Source:</span> <strong>{observations.source}</strong></li>
                <li><span>Date Measured:</span> <strong>{observations.date || 'Not available'}</strong></li>
                <li><span>Data Available:</span> <strong>{observations.completeness ?? 'Not assessed'}</strong></li>
                <li><span>Calculation Assumptions:</span> <strong>{metrics.assumptions?.[0] || 'Calculation assumptions not provided'}</strong></li>
                <li><span>Calculation Method:</span> <strong>{currentExp.metadata?.model || 'Example calculation'}</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
