const scales = [
  { name: 'Rainfall', labels: ['Less', 'More'], color: 'linear-gradient(90deg,#48dcff,#1689ff,#4e39ff)' },
  { name: 'Drought', labels: ['Low', 'Severe'], color: 'linear-gradient(90deg,#20e08a,#ffcf32,#ff4545)' },
  { name: 'Temperature', labels: ['Cold', 'Hot'], color: 'linear-gradient(90deg,#3da5ff,#27e3ba,#ffda36,#ff4646)' },
  { name: 'Soil moisture', labels: ['Low', 'High'], color: 'linear-gradient(90deg,#ff9340,#35dbb1,#277cff)' },
  { name: 'NDVI', labels: ['Sparse .2–.5', 'Dense .6–.9'], color: 'linear-gradient(90deg,#ffca3a,#9ee62f,#00cf70)' },
];
export default function SimulatorRangeGuide() {
  return <div className="sim-compact-guide" aria-label="Fixed condition reference scales">
    <div className="sim-compact-guide-grid">{scales.map(scale => <div key={scale.name} className="sim-compact-scale">
      <strong>{scale.name}</strong>
      <div className="sim-compact-track" style={{ background: scale.color }} role="img" aria-label={`${scale.name}: ${scale.labels.join(' to ')}`} />
      <div className="sim-compact-labels"><span>{scale.labels[0]}</span><span>{scale.labels[1]}</span></div>
    </div>)}</div>
    <small>Reference only · safe ranges depend on crop and growth stage.</small>
  </div>;
}
