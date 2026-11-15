import { useState } from 'react';
import { TileLayer } from 'react-leaflet';

export function RainfallDate({ layer, value, onChange }) {
  return <label style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, margin: '10px 0', fontSize: 13 }}>
    Rainfall image date
    <input type="date" aria-label="Rainfall image date" value={value || layer?.date || ''} min="2000-06-01" max={layer?.latestDate?.slice(0, 10)}
      onChange={e => onChange(e.target.value || null)} style={{ padding: '6px 8px', borderRadius: 6, background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
    <span>Try another date or zoom out to see rain elsewhere.</span>
  </label>;
}

// Inspect rendered tile alpha, not its HTTP status. Transparency is not proof of zero rainfall.
export function RainfallTiles({ layer, opacity = 0.85, onError }) {
  const [counts, setCounts] = useState({ loaded: 0, colored: 0 });
  const [unreadable, setUnreadable] = useState(false);
  return <>
    <TileLayer url={layer.url} attribution="NASA GIBS · IMERG precipitation rate" crossOrigin="anonymous"
      maxNativeZoom={layer.maxNativeZoom} maxZoom={20} opacity={opacity}
      eventHandlers={{
        loading: () => { setCounts({ loaded: 0, colored: 0 }); setUnreadable(false); },
        tileerror: onError,
        tileload: e => {
          try {
            const canvas = document.createElement('canvas'); canvas.width = e.tile.naturalWidth; canvas.height = e.tile.naturalHeight;
            const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(e.tile, 0, 0);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let colored = false;
            for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] > 0) { colored = true; break; } }
            setCounts(c => ({ loaded: c.loaded + 1, colored: c.colored + Number(colored) }));
          } catch { setUnreadable(true); }
        },
      }} />
    {counts.loaded > 0 && counts.colored === 0 && !unreadable && <div role="status" style={{ position: 'absolute', left: 55, top: 16, right: 16, zIndex: 800, padding: '12px 16px', borderRadius: 8, background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', pointerEvents: 'none', fontSize: 13 }}>
      NASA images loaded, but no rainfall colors are visible here for {layer.date}. Transparent areas can mean no mapped rain or missing coverage. Choose another date or zoom out; this does not confirm zero rainfall.
    </div>}
  </>;
}
