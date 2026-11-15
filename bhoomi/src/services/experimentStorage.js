/**
 * Experiment Model & Storage Service for BHOOMI
 * Handles creation, validation, storage in versioned localStorage, and migration.
 */

const STORAGE_KEY = 'bhoomi_experiments_v1';

export function createNewExperiment(location, environment, strategies, budget, polygonArea = null) {
  const id = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const regionIndicators = location.indicators || {};
  const soilMoistureObs = regionIndicators.soilMoisture || null;
  const ndviObs = regionIndicators.ndvi || null;
  const rainfallObs = regionIndicators.rainfall || null;
  const tempObs = regionIndicators.temperature || null;
  const dataSource = regionIndicators.dataSource || location.dataSource || 'NASA POWER / SMAP (Gridded)';

  return {
    id,
    name: `Experiment at ${location.name ? location.name.split(',')[0] : `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`}`,
    createdAt: now,
    updatedAt: now,
    location: {
      id: location.id || `coord-${location.lat}-${location.lng}`,
      name: location.name || `Coordinates (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`,
      country: location.country || (location.lat >= 0 ? `${location.lat.toFixed(1)}°N` : `${Math.abs(location.lat).toFixed(1)}°S`),
      lat: location.lat,
      lng: location.lng,
      riskLevel: location.riskLevel || 'Moderate',
      description: location.description || ''
    },
    polygonArea: polygonArea ? {
      type: polygonArea.type || 'Polygon',
      coordinates: polygonArea.coordinates || [],
      hectares: polygonArea.hectares || null
    } : null,
    inputs: {
      environment: {
        rainfall: environment.rainfall,
        droughtSeverity: environment.droughtSeverity,
        temperature: environment.temperature,
        soilMoisture: environment.soilMoisture
      },
      strategies: {
        cropType: strategies.cropType,
        irrigation: strategies.irrigation,
        mulching: strategies.mulching,
        droughtSeeds: strategies.droughtSeeds,
        precisionNitrogen: strategies.precisionNitrogen
      },
      budget: budget || 75
    },
    observations: {
      soilMoisture: soilMoistureObs,
      ndvi: ndviObs,
      rainfall: rainfallObs,
      temperature: tempObs,
      date: regionIndicators.observationDate || new Date().toISOString().split('T')[0],
      source: dataSource,
      availability: soilMoistureObs ? 'available' : 'manual_input_required'
    },
    status: 'completed', // 'not_run' | 'awaiting_backend' | 'completed' | 'failed'
    outputs: null, // Populated by simulation calculation
    actionChecklist: {
      items: [
        { id: 'check-soil', text: 'Check soil moisture near the roots and watering needs', completed: false },
        { id: 'verify-crop', text: 'Check whether the crop variety suits the expected growing conditions', completed: false },
        { id: 'review-water', text: 'Check available water, any required permits, and irrigation efficiency', completed: false },
        { id: 'inspect-datasets', text: 'Check which local measurements are available or missing', completed: false }
      ]
    },
    metadata: {
      model: 'BHOOMI Example Calculation Method v1.2',
      version: '1.2.0',
      assumptions: [
        'Rainfall anomaly simulated against 10-year baseline mean.',
        'Yield and water savings reflect trial agronomic coefficients.'
      ],
      warnings: soilMoistureObs ? [] : ['Soil moisture observation is not connected for this custom point; relying on manual baseline input.'],
      provenance: 'Example calculation on this device. Tested backend results are not connected yet.'
    }
  };
}

export function loadExperiments() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item => item && typeof item === 'object' && item.id);
  } catch (err) {
    console.error('Failed to load local experiments from storage:', err);
    return [];
  }
}

export function saveExperiments(experiments) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(experiments));
  } catch (err) {
    console.error('Failed to save experiments to local storage:', err);
    throw new Error('Saving failed. Browser storage may be blocked or full. Export or free space and try again.');
  }
}

export function saveSingleExperiment(experiment) {
  const existing = loadExperiments();
  const index = existing.findIndex(e => e.id === experiment.id);
  const updatedExp = {
    ...experiment,
    updatedAt: new Date().toISOString()
  };

  if (index >= 0) {
    existing[index] = updatedExp;
  } else {
    existing.unshift(updatedExp);
  }
  saveExperiments(existing);
  return updatedExp;
}

export function deleteExperiment(id) {
  const existing = loadExperiments();
  const filtered = existing.filter(e => e.id !== id);
  saveExperiments(filtered);
  return filtered;
}

export function duplicateExperiment(experiment) {
  const dup = {
    ...experiment,
    id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `${experiment.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'completed'
  };
  saveSingleExperiment(dup);
  return dup;
}
