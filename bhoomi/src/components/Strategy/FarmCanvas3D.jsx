import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function FarmCanvas3D({ region, environment, strategies }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(environment.droughtSeverity > 6 ? '#2D2018' : '#141A23');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 14, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    // Dynamic Soil Color based on moisture & drought
    const moisture = environment.soilMoisture;
    const drought = environment.droughtSeverity;
    let soilColorHex = 0x8B5A2B; // standard brown
    if (moisture > 50) soilColorHex = 0x4A6B32; // rich moist earth
    else if (drought > 6 || moisture < 20) soilColorHex = 0xC2A478; // dry cracked earth

    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(24, 24, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: soilColorHex,
      roughness: 0.8,
      flatShading: true
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Farm Rows & Crops
    const cropGroup = new THREE.Group();
    const cropRows = 6;
    const cropsPerRow = 8;

    const isStressed = drought > 6 || moisture < 20;
    const cropColor = isStressed ? 0xD99A32 : 0x34A853; // amber/yellow when stressed, green when healthy

    for (let r = -cropRows / 2; r < cropRows / 2; r++) {
      for (let c = -cropsPerRow / 2; c < cropsPerRow / 2; c++) {
        // Simple geometric crop representation (cones/cylinders)
        const heightFactor = strategies.droughtSeeds ? 1.4 : 1.0;
        const cropGeo = new THREE.ConeGeometry(0.3, 1.2 * heightFactor, 5);
        const cropMat = new THREE.MeshStandardMaterial({ color: cropColor, roughness: 0.6 });
        const crop = new THREE.Mesh(cropGeo, cropMat);

        crop.position.set(c * 2.2, 0.6 * heightFactor, r * 2.2);
        cropGroup.add(crop);

        // Add Mulching layer if active
        if (strategies.mulching !== 'none') {
          const mulchGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.05, 8);
          const mulchMat = new THREE.MeshStandardMaterial({ color: 0x5C4033 });
          const mulch = new THREE.Mesh(mulchGeo, mulchMat);
          mulch.position.set(c * 2.2, 0.03, r * 2.2);
          cropGroup.add(mulch);
        }

        // Add Drip Irrigation pipes if active
        if (strategies.irrigation === 'drip' && c === -cropsPerRow / 2) {
          const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 18, 6);
          const pipeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
          const pipe = new THREE.Mesh(pipeGeo, pipeMat);
          pipe.rotation.z = Math.PI / 2;
          pipe.position.set(0, 0.05, r * 2.2);
          cropGroup.add(pipe);
        }
      }
    }
    scene.add(cropGroup);

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      cropGroup.rotation.y += 0.0015; // slow cinematic rotation
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, [environment, strategies]);

  return (
    <div ref={containerRef} className="farm-canvas-container">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {/* Floating Satellite Map Inset (Part 4) */}
      <div className="satellite-inset-card">
        <div className="inset-header">
          <span>NASA Satellite Inset</span>
          <span className="inset-coords">{region.lat.toFixed(2)}°N, {region.lng.toFixed(2)}°E</span>
        </div>
        <div className="inset-map-box">
          <MapContainer
            center={[region.lat, region.lng]}
            zoom={10}
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            attributionControl={false}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            <Marker position={[region.lat, region.lng]} />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
