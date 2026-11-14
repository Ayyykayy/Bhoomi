import { useEffect, useRef, useState, useCallback } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';
import './EarthGlobe.css';

export default function EarthGlobe({ regions, selectedRegion, onSelectRegion }) {
  const globeEl = useRef();
  const coordsRef = useRef();
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      const controls = globeEl.current.controls();
      controls.enableZoom = true;
      controls.minDistance = 120;
      controls.maxDistance = 600;
      controls.autoRotate = !selectedRegion;
      controls.autoRotateSpeed = 0.5;

      globeEl.current.pointOfView({ altitude: 2.5 }, 1000);
    }
  }, []);

  useEffect(() => {
    if (globeEl.current && selectedRegion) {
      globeEl.current.controls().autoRotate = false;
      globeEl.current.pointOfView(
        {
          lat: selectedRegion.lat,
          lng: selectedRegion.lng,
          altitude: 1.5
        },
        1200
      );
    } else if (globeEl.current) {
      globeEl.current.controls().autoRotate = true;
    }
  }, [selectedRegion]);

  // Helper to convert decimal degrees to DMS format
  const formatDMS = (lat, lng) => {
    const latAbs = Math.abs(lat);
    const latDeg = Math.floor(latAbs);
    const latMin = Math.floor((latAbs - latDeg) * 60);
    const latSec = Math.round(((latAbs - latDeg) * 60 - latMin) * 60);
    const latDir = lat >= 0 ? 'N' : 'S';

    const lngAbs = Math.abs(lng);
    const lngDeg = Math.floor(lngAbs);
    const lngMin = Math.floor((lngAbs - lngDeg) * 60);
    const lngSec = Math.round(((lngAbs - lngDeg) * 60 - lngMin) * 60);
    const lngDir = lng >= 0 ? 'E' : 'W';

    return `${latDeg}°${String(latMin).padStart(2, '0')}′${String(latSec).padStart(2, '0')}″${latDir}  ${lngDeg}°${String(lngMin).padStart(2, '0')}′${String(lngSec).padStart(2, '0')}″${lngDir}`;
  };

  // Mouse move handler for live coordinate readout using raycasting
  const handleMouseMove = useCallback((e) => {
    if (!globeEl.current || !coordsRef.current) return;
    const globe = globeEl.current;

    // Get mouse NDC (-1 to +1)
    const rect = globe.renderer().domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    const camera = globe.camera();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const scene = globe.scene();
    const intersects = raycaster.intersectObjects(scene.children, true);

    // Find intersection with the globe sphere (radius ~ 100 in Three-Globe)
    const globeIntersection = intersects.find(hit => hit.object && hit.object.geometry && hit.object.type === 'Mesh');

    if (globeIntersection && globeIntersection.point) {
      const p = globeIntersection.point;
      // Convert Cartesian (x, y, z) to Lat, Lng on sphere
      const r = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
      if (r > 0) {
        const lat = Math.asin(p.y / r) * (180 / Math.PI);
        const lng = Math.atan2(p.z, p.x) * (180 / Math.PI);
        coordsRef.current.textContent = formatDMS(lat, lng);
        coordsRef.current.style.opacity = '1';
        return;
      }
    }
    coordsRef.current.style.opacity = '0';
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (coordsRef.current) {
      coordsRef.current.style.opacity = '0';
    }
  }, []);

  const handleGlobeClick = useCallback(() => {}, []);

  return (
    <div
      className="earth-globe-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Globe
        ref={globeEl}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#3b82f6"
        atmosphereAltitude={0.25}
        htmlElementsData={regions}
        htmlLat={d => d.lat}
        htmlLng={d => d.lng}
        htmlAltitude={0.02}
        htmlElement={d => {
          const isSelected = selectedRegion && selectedRegion.id === d.id;
          const el = document.createElement('div');
          el.className = `region-marker-wrapper ${isSelected ? 'selected' : ''}`;
          el.innerHTML = `
            <div class="marker-dot" style="background-color: ${d.color};">
              <span class="marker-tooltip">${d.name} (${d.riskCategory})</span>
            </div>
          `;
          el.onclick = (e) => {
            e.stopPropagation();
            onSelectRegion(d);
          };
          return el;
        }}
        onGlobeClick={handleGlobeClick}
      />

      {/* Google Earth style live coordinate readout */}
      <div ref={coordsRef} className="globe-cursor-coordinates">
        Initializing coordinates...
      </div>
    </div>
  );
}
