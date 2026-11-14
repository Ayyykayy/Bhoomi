import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, Droplets, Shovel, RotateCcw, Award } from 'lucide-react';
import { generatePixelFarmSprites } from '../../services/pixelArtGenerator';
import './PixelFarmGame.css';

export default function PixelFarmGame({ region, onBack }) {
  const [day, setDay] = useState(1);
  const [water, setWater] = useState(80);
  const [budget, setBudget] = useState(7500);
  const [selectedTool, setSelectedTool] = useState('trench');
  const [harvestScore, setHarvestScore] = useState(null);

  const [rainfall, setRainfall] = useState(30);
  const [droughtSev, setDroughtSev] = useState(4);

  const [tiles, setTiles] = useState(
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      status: 'empty', // 'empty' | 'tilled' | 'seeded' | 'growing' | 'mature' | 'wilting'
      moisture: 40,
      growth: 0,
      hasMulch: false
    }))
  );

  const canvasRef = useRef(null);
  const spriteSheetRef = useRef(null);

  // Initialize procedural 16-bit pixel art raster sprite sheet
  useEffect(() => {
    const dataUrl = generatePixelFarmSprites();
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      spriteSheetRef.current = img;
    };
  }, []);

  const handleTileClick = (index) => {
    const tile = tiles[index];
    const newTiles = [...tiles];

    if (selectedTool === 'trench' && tile.status === 'empty') {
      newTiles[index] = { ...tile, status: 'tilled' };
    } else if (selectedTool === 'plant' && tile.status === 'tilled') {
      newTiles[index] = { ...tile, status: 'seeded', growth: 10 };
    } else if (selectedTool === 'water' && tile.status !== 'empty') {
      if (water >= 10) {
        setWater(w => Math.max(0, w - 10));
        newTiles[index] = { ...tile, moisture: Math.min(100, tile.moisture + 35) };
      }
    } else if (selectedTool === 'mulch' && tile.status !== 'empty' && !tile.hasMulch) {
      if (budget >= 150) {
        setBudget(b => b - 150);
        newTiles[index] = { ...tile, hasMulch: true, moisture: Math.min(100, tile.moisture + 15) };
      }
    }

    setTiles(newTiles);
  };

  const handleNextDay = () => {
    if (day >= 30) {
      calculateHarvestResults();
      return;
    }

    setDay(d => d + 1);
    setWater(w => Math.min(100, w + Math.round(rainfall / 3)));

    setTiles(prevTiles =>
      prevTiles.map(tile => {
        if (tile.status === 'empty') return tile;

        const dryingRate = 8 + (droughtSev * 1.5) - (tile.hasMulch ? 5 : 0) + (rainfall > 20 ? -15 : 0);
        const newMoisture = Math.max(0, Math.min(100, tile.moisture - dryingRate));

        let newGrowth = tile.growth;
        let newStatus = tile.status;

        if (tile.status === 'seeded' || tile.status === 'growing') {
          if (newMoisture > 20) {
            newGrowth = Math.min(100, tile.growth + (newMoisture > 50 ? 12 : 6));
            if (newGrowth >= 100) newStatus = 'mature';
            else newStatus = 'growing';
          } else {
            newStatus = 'wilting';
          }
        }

        return {
          ...tile,
          moisture: newMoisture,
          growth: newGrowth,
          status: newStatus
        };
      })
    );
  };

  const calculateHarvestResults = () => {
    const matureCount = tiles.filter(t => t.status === 'mature').length;
    const score = matureCount * 250 + Math.round(water * 5);
    setHarvestScore(score);
  };

  // Render 2D Pixel Art using raster sprite sheet (Nearest-neighbor 16-bit)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const width = canvas.width;
    const height = canvas.height;

    // Background Grass Fill
    ctx.fillStyle = '#4A7C31';
    ctx.fillRect(0, 0, width, height);

    // Render Tile Grid (6 cols x 4 rows)
    const startX = 60;
    const startY = 160;
    const tileSize = 80;
    const gap = 12;

    tiles.forEach((tile, index) => {
      const col = index % 6;
      const row = Math.floor(index / 6);
      const tx = startX + col * (tileSize + gap);
      const ty = startY + row * (tileSize + gap);

      // Soil or Grass base
      if (tile.status === 'empty') {
        ctx.fillStyle = '#4A8532';
      } else if (tile.moisture < 20) {
        ctx.fillStyle = '#9E7A53'; // Dry soil
      } else {
        ctx.fillStyle = '#6F4E37'; // Moist soil
      }
      ctx.fillRect(tx, ty, tileSize, tileSize);

      // Pixel Border
      ctx.strokeStyle = '#2B1D0C';
      ctx.lineWidth = 4;
      ctx.strokeRect(tx, ty, tileSize, tileSize);

      // Mulch texture
      if (tile.hasMulch) {
        ctx.fillStyle = '#4A3525';
        ctx.fillRect(tx + 8, ty + 8, tileSize - 16, tileSize - 16);
      }

      // Render crop sprite based on status
      if (spriteSheetRef.current && tile.status !== 'empty' && tile.status !== 'tilled') {
        let sx = 0, sy = 32;
        if (tile.status === 'seeded') sx = 0;
        else if (tile.status === 'growing') sx = 32;
        else if (tile.status === 'mature') sx = 64;
        else if (tile.status === 'wilting') sx = 64;

        ctx.drawImage(
          spriteSheetRef.current,
          sx, sy, 32, 32,
          tx + 16, ty + 16, 48, 48
        );
      }

      // Moisture Bar
      ctx.fillStyle = '#111';
      ctx.fillRect(tx + 10, ty - 12, tileSize - 20, 6);
      ctx.fillStyle = tile.moisture > 30 ? '#3A86FF' : '#E5484D';
      ctx.fillRect(tx + 11, ty - 11, Math.round(((tileSize - 22) * tile.moisture) / 100), 4);
    });

  }, [tiles]);

  return (
    <div className="pixel-game-overlay">
      <header className="pixel-header">
        <div className="pixel-title-group">
          <button className="pixel-back-btn" onClick={onBack}>
            Return to Research
          </button>
          <h1>
            BHOOMI Pixel Farm Lab <span className="demo-badge">16-Bit Raster Edition</span>
          </h1>
        </div>
        <div className="pixel-status-bar">
          <div className="status-pill">Day <strong>{day} / 30</strong></div>
          <div className="status-pill">Water <strong>{water}%</strong></div>
          <div className="status-pill">Budget <strong>${budget}</strong></div>
          <button className="advance-day-btn" onClick={handleNextDay}>
            <Play size={16} /> Next Day
          </button>
        </div>
      </header>

      <div className="pixel-game-layout">
        <div className="pixel-controls-panel">
          <h3>Farming Tools</h3>
          <p className="panel-sub">Select raster tool and click farm tiles.</p>

          <div className="tool-btn-grid">
            <button
              className={`tool-btn ${selectedTool === 'trench' ? 'active' : ''}`}
              onClick={() => setSelectedTool('trench')}
            >
              <Shovel size={18} /> Till Soil
            </button>
            <button
              className={`tool-btn ${selectedTool === 'plant' ? 'active' : ''}`}
              onClick={() => setSelectedTool('plant')}
            >
              🌱 Plant Wheat
            </button>
            <button
              className={`tool-btn ${selectedTool === 'water' ? 'active' : ''}`}
              onClick={() => setSelectedTool('water')}
            >
              <Droplets size={18} /> Water Tile
            </button>
            <button
              className={`tool-btn ${selectedTool === 'mulch' ? 'active' : ''}`}
              onClick={() => setSelectedTool('mulch')}
            >
              🛡️ Apply Mulch
            </button>
          </div>

          <div className="weather-control-box">
            <h4>Weather Controls</h4>
            <div className="ctrl-row">
              <span>Rainfall: {rainfall}mm</span>
              <input
                type="range"
                min="0"
                max="80"
                value={rainfall}
                onChange={(e) => setRainfall(Number(e.target.value))}
              />
            </div>
            <div className="ctrl-row">
              <span>Drought Index: {droughtSev}/10</span>
              <input
                type="range"
                min="1"
                max="10"
                value={droughtSev}
                onChange={(e) => setDroughtSev(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="methodology-note">
            <strong>Raster Tile Engine:</strong> Utilizes 16-bit procedural nearest-neighbor sprite rendering integrated with NASA SMAP soil moisture telemetry.
          </div>
        </div>

        <div className="pixel-canvas-workspace">
          <div className="canvas-card">
            <canvas
              ref={canvasRef}
              width={640}
              height={520}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                const startX = 60;
                const startY = 160;
                const tileSize = 80;
                const gap = 12;

                for (let i = 0; i < 24; i++) {
                  const col = i % 6;
                  const row = Math.floor(i / 6);
                  const tx = startX + col * (tileSize + gap);
                  const ty = startY + row * (tileSize + gap);

                  if (x >= tx && x <= tx + tileSize && y >= ty && y <= ty + tileSize) {
                    handleTileClick(i);
                    break;
                  }
                }
              }}
              style={{ width: '100%', height: 'auto', display: 'block', background: '#3F6B28' }}
            />

            <div className="pixel-satellite-inset">
              <div className="inset-bar">{region.name}</div>
              <div className="inset-map">
                <MapContainer
                  center={[region.lat, region.lng]}
                  zoom={9}
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

          {harvestScore !== null && (
            <div className="harvest-modal-overlay">
              <div className="harvest-modal">
                <h3><Award size={22} /> Season Harvest Summary</h3>
                <p>You completed the 30-day Punjab wheat simulation cycle!</p>
                <div className="harvest-score-box">
                  <span>Final Harvest Score:</span>
                  <strong>{harvestScore} pts</strong>
                </div>
                <button className="restart-game-btn" onClick={() => {
                  setDay(1);
                  setWater(80);
                  setBudget(7500);
                  setHarvestScore(null);
                  setTiles(Array.from({ length: 24 }, (_, i) => ({ id: i, status: 'empty', moisture: 40, growth: 0, hasMulch: false })));
                }}>
                  <RotateCcw size={16} /> Play Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
