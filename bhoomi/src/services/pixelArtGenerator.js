export const TILE_CONFIG = {
  tileSize: 32,
  gridCols: 8,
  gridRows: 5
};

// Expanded 16-bit Cozy Pixel-Art Raster Asset Generator (Stardew-inspired)
export function generatePixelFarmSprites() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Helper for drawing textured 16-bit pixel blocks
  const drawPixelBlock = (x, y, w, h, base, shadow, highlight) => {
    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = shadow;
    ctx.fillRect(x, y + h - 4, w, 4);
    ctx.fillRect(x + w - 4, y, 4, h);
    ctx.fillStyle = highlight;
    ctx.fillRect(x, y, w, 4);
    ctx.fillRect(x, y, 4, h);
  };

  // 1. Lush Grass Tile (src: 0, 0)
  drawPixelBlock(0, 0, 32, 32, '#4A8532', '#2D5420', '#63A845');

  // 2. Tilled Moist Soil Tile (src: 32, 0)
  drawPixelBlock(32, 0, 32, 32, '#6F4E37', '#422E21', '#8C6247');
  // Add tilled row ridges
  ctx.fillStyle = '#422E21';
  ctx.fillRect(32, 8, 32, 2);
  ctx.fillRect(32, 18, 32, 2);
  ctx.fillRect(32, 26, 32, 2);

  // 3. Dry Cracked Soil Tile (src: 64, 0)
  drawPixelBlock(64, 0, 32, 32, '#A6805B', '#6E523A', '#C49F7B');

  // 4. Wheat Sprout (src: 0, 32)
  ctx.fillStyle = '#70A9A1';
  ctx.fillRect(14, 20, 4, 8);
  ctx.fillStyle = '#9EC1CF';
  ctx.fillRect(10, 16, 6, 6);
  ctx.fillRect(16, 16, 6, 6);

  // 5. Wheat Growing (src: 32, 32)
  ctx.fillStyle = '#38A3A5';
  ctx.fillRect(12, 12, 8, 16);
  ctx.fillStyle = '#57CC99';
  ctx.fillRect(8, 8, 8, 12);
  ctx.fillRect(16, 8, 8, 12);

  // 6. Wheat Mature Golden (src: 64, 32)
  ctx.fillStyle = '#F4A261';
  ctx.fillRect(10, 4, 12, 24);
  ctx.fillStyle = '#E76F51';
  ctx.fillRect(8, 10, 16, 12);
  ctx.fillStyle = '#F4A261';
  ctx.fillRect(12, 0, 8, 8);

  // 7. Wooden Fence Post (src: 96, 0)
  drawPixelBlock(96, 0, 32, 32, '#8D5B4C', '#54352B', '#A87263');
  ctx.fillStyle = '#54352B';
  ctx.fillRect(96, 12, 32, 4);
  ctx.fillRect(96, 22, 32, 4);

  // 8. Farmhouse Wall & Roof (src: 128, 0)
  drawPixelBlock(128, 0, 32, 32, '#C84B31', '#7A2C1D', '#E26D55');
  ctx.fillStyle = '#3E160E';
  ctx.fillRect(138, 10, 12, 14); // window

  return canvas.toDataURL();
}
