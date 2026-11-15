export function comparisonTone(before, after, direction = 'lower') {
  if (![before, after].every(value => typeof value === 'number' && Number.isFinite(value)) || before === after) return { tone: 'neutral', label: 'No change' };
  const rising = after > before;
  if (direction === 'context') return { tone: rising ? 'rising' : 'falling', label: rising ? 'Increased' : 'Decreased' };
  const improved = direction === 'higher' ? rising : !rising;
  return { tone: improved ? 'improved' : 'worse', label: improved ? 'Improved' : 'Worsened' };
}
