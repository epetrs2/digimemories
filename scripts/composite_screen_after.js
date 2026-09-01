import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function createDigitalScreenAfterImage() {
  const baseCassettePath = '/Users/antoniosalem/.gemini/antigravity-ide/brain/04a391b7-e460-4812-b785-24976925b645/cassette_physical_es_1788225714651.jpg';
  const videoFramePath = '/Users/antoniosalem/.gemini/antigravity-ide/brain/04a391b7-e460-4812-b785-24976925b645/restored_video_frame_1788225247904.jpg';
  const outputBeforePath = 'public/restoration_before.jpg';
  const outputAfterPath = 'public/restoration_after.jpg';

  console.log('--- 1. Saving Cassette (Before) Image ---');
  await sharp(baseCassettePath)
    .resize(1920, 1080, { fit: 'cover' })
    .jpeg({ quality: 95 })
    .toFile(outputBeforePath);
  console.log('✅ Created public/restoration_before.jpg');

  console.log('--- 2. Creating Digital Screen on Desk (After) Image ---');
  // Get blurred warm background from room
  const blurredBg = await sharp(baseCassettePath)
    .resize(1920, 1080, { fit: 'cover' })
    .blur(18)
    .modulate({ brightness: 0.85, saturation: 0.95 })
    .toBuffer();

  // Resize video frame to fit inside modern tablet/screen mockup
  const screenWidth = 1420;
  const screenHeight = 800;
  const resizedVideo = await sharp(videoFramePath)
    .resize(screenWidth, screenHeight, { fit: 'cover' })
    .toBuffer();

  // SVG frame overlay for modern Smart TV / Tablet screen with Spanish player controls and USB drive
  const screenX = Math.round((1920 - screenWidth) / 2);
  const screenY = 110;

  const svgOverlay = Buffer.from(`
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="screenShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="25" stdDeviation="35" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
        <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#383431"/>
          <stop offset="50%" stop-color="#1c1917"/>
          <stop offset="100%" stop-color="#0c0a09"/>
        </linearGradient>
        <linearGradient id="barGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ea580c"/>
          <stop offset="100%" stop-color="#f97316"/>
        </linearGradient>
        <linearGradient id="usbMetal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e7e5e4"/>
          <stop offset="50%" stop-color="#a8a29e"/>
          <stop offset="100%" stop-color="#78716c"/>
        </linearGradient>
      </defs>

      <!-- Outer Tablet / Smart Screen Device Bezel with Shadow -->
      <rect x="${screenX - 24}" y="${screenY - 24}" width="${screenWidth + 48}" height="${screenHeight + 48}" rx="28" fill="url(#bezelGrad)" stroke="#57534e" stroke-width="3" filter="url(#screenShadow)"/>
      <rect x="${screenX - 8}" y="${screenY - 8}" width="${screenWidth + 16}" height="${screenHeight + 16}" rx="14" fill="#000000"/>

      <!-- Video Player Modern UI Overlay (Header & Bottom Bar) -->
      <!-- Player Header -->
      <rect x="${screenX}" y="${screenY}" width="${screenWidth}" height="68" fill="rgba(0, 0, 0, 0.65)"/>
      <circle cx="${screenX + 36}" cy="${screenY + 34}" r="12" fill="#22c55e"/>
      <text x="${screenX + 60}" y="${screenY + 40}" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="bold" fill="#ffffff">
        ▶ Boda_y_Vacaciones_1994_Remastered.mp4
      </text>
      <rect x="${screenX + screenWidth - 190}" y="${screenY + 18}" width="165" height="34" rx="8" fill="rgba(234, 88, 12, 0.9)"/>
      <text x="${screenX + screenWidth - 108}" y="${screenY + 41}" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle">
        1080p Full HD
      </text>

      <!-- Player Bottom Progress Bar -->
      <rect x="${screenX}" y="${screenY + screenHeight - 80}" width="${screenWidth}" height="80" fill="rgba(0, 0, 0, 0.75)"/>
      <!-- Time -->
      <text x="${screenX + 30}" y="${screenY + screenHeight - 34}" font-family="monospace" font-size="20" font-weight="bold" fill="#ffffff">
        00:42:15 / 01:58:30
      </text>
      <!-- Scrubber Track -->
      <rect x="${screenX + 280}" y="${screenY + screenHeight - 44}" width="${screenWidth - 560}" height="10" rx="5" fill="#44403c"/>
      <rect x="${screenX + 280}" y="${screenY + screenHeight - 44}" width="${(screenWidth - 560) * 0.38}" height="10" rx="5" fill="url(#barGrad)"/>
      <circle cx="${screenX + 280 + (screenWidth - 560) * 0.38}" cy="${screenY + screenHeight - 39}" r="10" fill="#ffffff" stroke="#ea580c" stroke-width="3"/>
      <!-- Audio & Quality Badge -->
      <text x="${screenX + screenWidth - 240}" y="${screenY + screenHeight - 34}" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="bold" fill="#38bdf8">
        🔊 Audio Estéreo Limpio
      </text>

      <!-- Stand Support under screen -->
      <path d="M ${screenX + (screenWidth / 2) - 120} ${screenY + screenHeight + 24} L ${screenX + (screenWidth / 2) + 120} ${screenY + screenHeight + 24} L ${screenX + (screenWidth / 2) + 160} ${screenY + screenHeight + 80} L ${screenX + (screenWidth / 2) - 160} ${screenY + screenHeight + 80} Z" fill="#292524" opacity="0.9"/>

      <!-- Modern USB 3.0 Kingston Flash Drive beside screen on the desk -->
      <g transform="translate(180, 940)">
        <rect x="0" y="0" width="130" height="42" rx="8" fill="url(#usbMetal)" stroke="#d6d3d1" stroke-width="1.5" filter="url(#screenShadow)"/>
        <rect x="100" y="8" width="36" height="26" rx="3" fill="#78716c"/>
        <circle cx="20" cy="21" r="5" fill="#ea580c">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite"/>
        </circle>
        <text x="32" y="27" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="900" fill="#1c1917" letter-spacing="1">
          USB 3.0 64GB
        </text>
      </g>
    </svg>
  `);

  // Composite screen onto background
  await sharp(blurredBg)
    .composite([
      {
        input: resizedVideo,
        top: screenY,
        left: screenX
      },
      {
        input: svgOverlay,
        top: 0,
        left: 0
      }
    ])
    .jpeg({ quality: 95 })
    .toFile(outputAfterPath);

  console.log('✅ Created public/restoration_after.jpg (Digital Screen in 1080p HD)');
}

createDigitalScreenAfterImage().catch(console.error);
