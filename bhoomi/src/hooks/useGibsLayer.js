import { useEffect, useState } from 'react';
const CATALOG = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml';
const IDS = { soil: 'SMAP_L4_Analyzed_Surface_Soil_Moisture', ndvi: 'MODIS_Terra_L3_NDVI_16Day', rainfall: 'IMERG_Precipitation_Rate' };
let cachedCatalog = null;
export function useGibsLayer(kind, selectedDate = null) {
  const [state, setState] = useState({ kind, status: 'idle', layer: null });
  useEffect(() => {
    if (!IDS[kind]) { setState({ kind, status: 'idle', layer: null }); return; }
    const controller = new AbortController();
    let current = true;
    const timer = setTimeout(() => controller.abort(), 15000);
    setState({ kind, status: 'loading', layer: null });
    async function load() {
      let text = cachedCatalog;
      if (!text) {
        const response = await fetch(CATALOG, { signal: controller.signal });
        if (!response.ok) throw new Error('NASA catalog request failed');
        text = await response.text();
        cachedCatalog = text;
      }
      const xml = new DOMParser().parseFromString(text, 'application/xml');
      const children = (node, name) => Array.from(node?.children || []).filter(c => c.localName === name);
      const node = Array.from(xml.getElementsByTagNameNS('*', 'Layer')).find(n => children(n, 'Identifier')[0]?.textContent === IDS[kind]);
      if (!node) throw new Error('Layer not listed by NASA');
      const dimension = children(node, 'Dimension').find(n => children(n, 'Identifier')[0]?.textContent === 'Time');
      const latestDate = children(dimension, 'Default')[0]?.textContent;
      const date = kind === 'rainfall' && selectedDate ? selectedDate : latestDate;
      const matrix = children(children(node, 'TileMatrixSetLink')[0], 'TileMatrixSet')[0]?.textContent;
      const resource = children(node, 'ResourceURL').find(n => n.getAttribute('resourceType') === 'tile' && n.getAttribute('template')?.includes('{Time}'));
      const maxNativeZoom = Number(matrix?.match(/Level(\d+)/)?.[1]);
      const legend = node.getElementsByTagNameNS('*', 'LegendURL')[0]?.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      if (!date || !resource || !matrix || !Number.isFinite(maxNativeZoom)) throw new Error('Incomplete NASA layer metadata');
      const url = resource.getAttribute('template').replace('{Time}', date).replace('{TileMatrixSet}', matrix).replace('{TileMatrix}', '{z}').replace('{TileRow}', '{y}').replace('{TileCol}', '{x}');
      if (current && !controller.signal.aborted) setState({ kind, status: 'ready', layer: { id: IDS[kind], date, latestDate, url, maxNativeZoom, legend } });
    }
    load().catch(() => { if (current) setState({ kind, status: 'error', layer: null }); }).finally(() => clearTimeout(timer));
    return () => { current = false; controller.abort(); clearTimeout(timer); };
  }, [kind, selectedDate]);
  return state.kind === kind ? state : { kind, status: 'loading', layer: null };
}
