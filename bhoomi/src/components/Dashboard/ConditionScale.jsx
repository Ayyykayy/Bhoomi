const guides = {
  soil: {
    min: 0, max: 100, ticks: ['0% · Dry end', '50%', '100% · Wet end'],
    gradient: 'linear-gradient(90deg, #bd8754, #789da9, #438cce)',
    note: 'Good soil water levels depend on soil type, crop and growth stage. This wetness index has no universal safe range.',
  },
  ndvi: {
    min: -1, max: 1, ticks: ['−1', '0', '+1'],
    gradient: 'linear-gradient(90deg, #64748b 0%, #b8a07a 50%, #a9b86a 65%, #4b9869 85%, #25714c 100%)',
    note: 'Around 0 or below: little vegetation or non-vegetated surfaces. About 0.2–0.5: sparse vegetation. About 0.6–0.9: dense green vegetation. Low values can be normal for bare fields; higher is not always better.',
    source: 'https://www.usgs.gov/fire-danger-forecast/weekly-ndvi',
  },
  rain: {
    min: 0, max: 50, ticks: ['0 · No rain', '25', '50+ mm/day'],
    gradient: 'linear-gradient(90deg, #8c9aa6, #6da6cf, #367bb5)',
    note: 'One dry day is not drought. Helpful or harmful rainfall depends on recent rain, drainage and crop water needs; there is no universal good daily range.',
  },
  temp: {
    min: -10, max: 50, ticks: ['−10°C', '20°C', '50°C'],
    gradient: 'linear-gradient(90deg, #6498c6, #91aeb3, #c5a16f, #c97c65)',
    note: 'Cooler ← → hotter. A good temperature range depends on crop and growth stage. Daily averages can hide damaging hot or cold extremes.',
  },
};

export default function ConditionScale({ kind, value }) {
  const guide = guides[kind];
  const available = typeof value === 'number' && Number.isFinite(value);
  const position = available ? Math.max(0, Math.min(100, (value-guide.min)/(guide.max-guide.min)*100)) : null;
  return <div className="condition-guide">
    <div className="condition-guide-heading">Reading guide <span>{available ? 'Marker = latest value' : 'No reading available'}</span></div>
    <div className="condition-guide-track" style={{ background: guide.gradient }} role="img" aria-label={`${kind} reference scale from ${guide.min} to ${guide.max}${available ? `; latest value ${value}` : '; no reading'}`}>
      {available && <span className="condition-guide-marker" style={{ left: `${position}%` }} />}
    </div>
    <div className="condition-guide-ticks">{guide.ticks.map(tick => <span key={tick}>{tick}</span>)}</div>
    <p>{guide.note}</p>
    {guide.source && <a href={guide.source} target="_blank" rel="noreferrer">NDVI guide · USGS</a>}
  </div>;
}
