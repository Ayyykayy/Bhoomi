import { useState, useEffect } from 'react';
import { ArrowLeft, Search, Folder, Trash2, Copy, Play, ExternalLink, AlertCircle, CheckCircle2, Layers } from 'lucide-react';
import { loadExperiments, deleteExperiment, duplicateExperiment, saveSingleExperiment } from '../../services/experimentStorage';
import './SavedExperiments.css';

export default function SavedExperiments({ onBack, onOpenExperiment, onNewExperiment }) {
  const [experiments, setExperiments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [toast, setToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    setExperiments(loadExperiments());
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleDelete = (id) => {
    const updated = deleteExperiment(id);
    setExperiments(updated);
    setConfirmDeleteId(null);
    showToast('Experiment deleted successfully');
  };

  const handleDuplicate = (exp) => {
    const newExp = duplicateExperiment(exp);
    setExperiments(loadExperiments());
    showToast(`Duplicated experiment as "${newExp.name}"`);
  };

  const handleToggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredExperiments = experiments.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.inputs.strategies.cropType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="saved-exp-overlay">
      {toast && (
        <div className="bhoomi-toast-banner">
          <CheckCircle2 size={16} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <header className="se-header">
        <div className="se-title-group">
          <button className="se-back-btn" onClick={onBack}>
            <ArrowLeft size={18} /> Return to Globe
          </button>
          <div>
            <h1 className="bhoomi-page-title">Saved Experiments</h1>
            <span className="se-subtitle">
              Saved on this browser · {experiments.length} total experiments
            </span>
          </div>
        </div>

        <div className="se-header-actions">
          <button className="se-btn primary" onClick={onNewExperiment}>
            + New Scenario Experiment
          </button>
        </div>
      </header>

      {/* Content Body */}
      <div className="se-content-body">
        <div className="se-search-bar-row">
          <div className="se-search-input-wrap">
            <Search size={18} className="se-search-icon" />
            <input
              type="text"
              placeholder="Search experiments by name, location, or crop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="se-search-input"
            />
          </div>
          <span className="se-browser-badge">Saved on this browser</span>
        </div>

        {filteredExperiments.length === 0 ? (
          <div className="se-empty-state">
            <Folder size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px' }} />
            <h3>No Saved Experiments Found</h3>
            <p>You haven't saved any farming strategy experiments yet, or none match your search query.</p>
            <button className="se-btn primary" onClick={onNewExperiment} style={{ marginTop: '16px' }}>
              Launch Simulator & Create Experiment
            </button>
          </div>
        ) : (
          <div className="se-table-card">
            <table className="se-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Experiment Name</th>
                  <th>Location</th>
                  <th>Crop Variety</th>
                  <th>Last Updated</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExperiments.map((exp) => (
                  <tr key={exp.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(exp.id)}
                        onChange={() => handleToggleSelect(exp.id)}
                        className="se-checkbox"
                      />
                    </td>
                    <td>
                      <strong className="se-exp-name" onClick={() => onOpenExperiment(exp)}>
                        {exp.name}
                      </strong>
                    </td>
                    <td>{exp.location.name}</td>
                    <td><span className="se-crop-pill">{exp.inputs.strategies.cropType.toUpperCase()}</span></td>
                    <td>{new Date(exp.updatedAt || exp.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className="se-status-badge completed">Completed</span>
                    </td>
                    <td>
                      <div className="se-action-buttons">
                        <button className="se-icon-btn" onClick={() => onOpenExperiment(exp)} title="Open Experiment">
                          <ExternalLink size={16} />
                        </button>
                        <button className="se-icon-btn" onClick={() => handleDuplicate(exp)} title="Duplicate Experiment">
                          <Copy size={16} />
                        </button>
                        <button className="se-icon-btn danger" onClick={() => setConfirmDeleteId(exp.id)} title="Delete Experiment">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {confirmDeleteId && (
          <div className="se-modal-backdrop">
            <div className="se-modal">
              <h3>Confirm Deletion</h3>
              <p>Are you sure you want to delete this saved experiment? This action cannot be undone.</p>
              <div className="se-modal-actions">
                <button className="se-btn secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                <button className="se-btn danger" onClick={() => handleDelete(confirmDeleteId)}>Delete Experiment</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
