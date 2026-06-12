/*
 * Franky memorial portrait. Tries to load franky.jpg from the site root
 * and renders it pixelated on a canvas (downscale to a coarse grid,
 * upscale with smoothing off). If the photo is missing, falls back to a
 * hand-drawn pixel-art pup so the hover card always works.
 */

(() => {
  const canvas = document.querySelector('.franky__photo');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const SIZE = canvas.width;
  const GRID = 36;

  const pixelate = (img) => {
    const off = document.createElement('canvas');
    off.width = GRID;
    off.height = GRID;
    const octx = off.getContext('2d');

    // Center-crop to a square, then sample down to the coarse grid.
    const s = Math.min(img.width, img.height);
    octx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, GRID, GRID);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0, GRID, GRID, 0, 0, SIZE, SIZE);
  };

  const drawPixelPup = () => {
    const PAL = {
      D: '#2a2118', // outline
      B: '#6b4a2f', // ears, head
      L: '#c89a6b', // fur
      W: '#efe5d2', // muzzle
      N: '#1c1611', // eyes, nose
      P: '#d97a6c', // tongue
    };
    const MAP = [
      '..DD........DD..',
      '.DBBD......DBBD.',
      '.DBBBDDDDDDBBBD.',
      '.DBLLLLLLLLLLBD.',
      '.DBLLLLLLLLLLBD.',
      '..DLLDLLLLDLLD..',
      '..DLLNLLLLNLLD..',
      '..DLLLLLLLLLLD..',
      '..DLLLWWWWLLLD..',
      '...DLWWNNWWLD...',
      '...DLWNNNNWLD...',
      '....DWWPPWWD....',
      '....DLWPPWLD....',
      '.....DLWWLD.....',
      '......DDDD......',
      '................',
    ];
    const cell = SIZE / 16;
    ctx.fillStyle = '#171411';
    ctx.fillRect(0, 0, SIZE, SIZE);
    MAP.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        ctx.fillStyle = PAL[ch];
        ctx.fillRect(Math.round(x * cell), Math.round(y * cell), Math.ceil(cell), Math.ceil(cell));
      });
    });
  };

  const img = new Image();
  img.onload = () => pixelate(img);
  img.onerror = drawPixelPup;
  img.src = 'franky.jpg';
})();
