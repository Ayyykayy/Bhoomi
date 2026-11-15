// Descriptive comparison within the selected period; not drought or crop-risk classification.
export function describeSoilContext(records) {
  const valid = records.filter(r => Number.isFinite(r.soilMoistureTop?.value));
  if (valid.length < 21) return { label: 'Not enough soil history', detail: 'At least 21 valid daily values are needed for this comparison.' };
  const latest = valid[valid.length - 1];
  const history = valid.slice(0, -1).map(r => r.soilMoistureTop.value);
  const value = latest.soilMoistureTop.value;
  const percentile = 100 * (history.filter(v => v < value).length + 0.5 * history.filter(v => v === value).length) / history.length;
  const label = percentile < 20 ? 'Drier than most days in this period' : percentile > 80 ? 'Wetter than most days in this period' : 'Within the middle of this period’s values';
  return { label, detail: `Compared with ${history.length} earlier daily values (${valid[0].date} to ${valid[valid.length - 2].date}). This is a selected-period comparison, not a seasonal normal or crop-risk rating.`, date: latest.date };
}
