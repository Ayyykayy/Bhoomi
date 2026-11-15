// Save source observations independently of editable simulation inputs.
export function observationSnapshot(climate, vegetation, lat, lng) {
  const samePoint = point => point && Math.abs(point.latitude - lat) < 1e-7 && Math.abs(point.longitude - lng) < 1e-7;
  const weather = samePoint(climate?.point) ? climate.data : null;
  const ndvi = samePoint(vegetation?.location) ? vegetation : null;
  const fields = weather?.latestByParameter || {};
  const measurements = [];
  for (const [key, label, source] of [
    ['soilMoistureTop', 'Surface soil wetness', 'NASA POWER model'],
    ['precipitation', 'Daily rainfall', 'NASA POWER'],
    ['temperature', 'Air temperature', 'NASA POWER'],
  ]) {
    const reading = fields[key];
    if (typeof reading?.value === 'number' && Number.isFinite(reading.value)) measurements.push({
      key, label, value: reading.value, unit: reading.unit, date: reading.date, source,
      sourceUrl: weather.sourceUrl,
    });
  }
  if (typeof ndvi?.latest?.value === 'number' && Number.isFinite(ndvi.latest.value)) measurements.push({
    key: 'ndvi', label: 'Vegetation greenness (NDVI)', value: ndvi.latest.value, unit: '',
    date: ndvi.latest.date, quality: ndvi.latest.quality, source: ndvi.source, sourceUrl: ndvi.sourceUrl,
  });
  const dates = [...new Set(measurements.map(m => m.date).filter(Boolean))].sort();
  return {
    // POWER surface relative wetness must not be represented as root-zone volumetric moisture.
    soilMoisture: null, surfaceWetness: fields.soilMoistureTop?.value ?? null,
    ndvi: ndvi?.latest?.value ?? null, rainfall: fields.precipitation?.value ?? null,
    temperature: fields.temperature?.value ?? null, measurements,
    location: { latitude: lat, longitude: lng },
    date: dates.join(' / ') || null,
    source: measurements.length ? [...new Set(measurements.map(m => m.source))].join(' · ') : 'No source readings were available when saved.',
    completeness: `${measurements.length} of 4 indicators saved`,
    weatherCompleteness: weather?.completenessPercentage ?? null,
    availability: measurements.length ? 'available' : 'unavailable',
    note: 'Point observations saved for reference. They are separate from edited experiment inputs and are not a polygon average.',
  };
}
