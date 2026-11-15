/**
 * Simulation Service for BHOOMI Farming Strategy Simulator
 * Keeps calculation logic modular and separate from UI components,
 * ready for future FastAPI backend integration.
 */

export function calculateSimulation(region, environment, strategies, budget) {
  // Baseline comes from the editable scenario input, not assumed location observations.
  const baseMoisture = environment?.soilMoisture;
  if (typeof baseMoisture !== 'number' || !Number.isFinite(baseMoisture) || baseMoisture < 0 || baseMoisture > 100) {
    throw new Error('Enter a scenario soil moisture between 0 and 100%.');
  }
  const baseYield = 4.2; // tons/hectare baseline

  // Environment inputs (rainfall in mm, drought severity 1-10, temp °C)
  const rainfall = environment.rainfall;
  const drought = environment.droughtSeverity;
  const temperature = environment.temperature;

  // Strategy adjustments
  const isDrip = strategies.irrigation === 'drip';
  const isSprinkler = strategies.irrigation === 'sprinkler';
  const isFlood = strategies.irrigation === 'flood';
  const hasMulch = strategies.mulching !== 'none';
  const hasDroughtSeeds = strategies.droughtSeeds;
  const hasPrecisionN = strategies.precisionNitrogen;

  const costMultiplier = budget / 75;

  // Water demand calculation (m3/ha)
  let baseWaterDemand = 4500 - (rainfall * 12) + (temperature * 45) + (drought * 120);
  let savedWaterPct = 0;

  if (isDrip) savedWaterPct += 40;
  else if (isSprinkler) savedWaterPct += 20;
  else if (isFlood) savedWaterPct -= 15; // flood wastes water

  if (hasMulch) savedWaterPct += 15;

  const modifiedWaterDemand = Math.max(1200, Math.round(baseWaterDemand * (1 - (savedWaterPct / 100))));

  // Soil moisture projection (%)
  let moistureDelta = (rainfall / 10) - (drought * 2) - ((temperature - 25) * 0.8);
  if (isDrip) moistureDelta += 18;
  else if (isSprinkler) moistureDelta += 10;
  if (hasMulch) moistureDelta += 12;

  const projectedMoisture = Math.min(90, Math.max(10, Math.round(baseMoisture + moistureDelta)));

  // Crop stress indicator (0 - 100%, lower is better)
  let stressScore = Math.max(5, Math.min(95, Math.round(75 - (projectedMoisture * 0.8) + (drought * 5) + ((temperature - 28) * 2.5))));
  if (hasDroughtSeeds) stressScore = Math.max(5, stressScore - 22);

  // Crop yield projection (tons/ha)
  let yieldBonus = 0;
  if (isDrip) yieldBonus += 1.1;
  if (hasDroughtSeeds) yieldBonus += 1.4;
  if (hasPrecisionN) yieldBonus += 0.8;
  if (hasMulch) yieldBonus += 0.5;

  const projectedYield = Math.max(1.0, Number((baseYield + (yieldBonus * Math.min(1.5, costMultiplier))).toFixed(1)));
  const economicRoi = Math.round((projectedYield / baseYield) * 130 - 100);

  return {
    baseline: {
      waterDemand: Math.round(baseWaterDemand),
      soilMoisture: baseMoisture,
      cropStress: Math.min(95, Math.max(20, Math.round(85 - baseMoisture))),
      yield: baseYield,
      suitability: 'Moderate'
    },
    modified: {
      waterDemand: modifiedWaterDemand,
      soilMoisture: projectedMoisture,
      cropStress: stressScore,
      yield: projectedYield,
      suitability: stressScore < 30 ? 'High' : stressScore < 60 ? 'Moderate' : 'Stressed'
    },
    metrics: {
      waterSavedPercent: savedWaterPct,
      projectedYield,
      economicRoi,
      carbonOffsetTon: Math.round((budget / 10) * 1.8)
    },
    assumptions: [
      `Rainfall used in this experiment: ${rainfall}mm (your chosen value, not a measured change from normal rainfall).`,
      `These example calculations use your settings. SMAP and MODIS measurements are not connected to this calculation.`,
      `Money-related and crop-harvest estimates are examples, not tested predictions.`
    ]
  };
}
