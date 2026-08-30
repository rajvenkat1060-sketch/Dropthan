import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateIcons() {
  const sourcePath = 'src/assets/images/image_5_1786271792168.jpg';
  if (!fs.existsSync(sourcePath)) {
    console.error('Source image not found at', sourcePath);
    return;
  }

  // 1. Create a circular mask SVG buffer for anti-aliased circle cropping
  const createCircleMask = (size) => {
    const r = size / 2;
    return Buffer.from(`
      <svg width="${size}" height="${size}" viewBox="0 0 ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${r}" cy="${r}" r="${r}" fill="#ffffff" />
      </svg>
    `);
  };

  // Process 1024 base cropped to clean circle
  const size1024 = 1024;
  const mask1024 = createCircleMask(size1024);

  // Circular 1024 with transparent corners
  const circular1024 = await sharp(sourcePath)
    .resize(size1024, size1024, { fit: 'cover' })
    .composite([
      {
        input: mask1024,
        blend: 'dest-in'
      }
    ])
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  const sizes = [
    { name: 'public/icon-512.png', size: 512 },
    { name: 'public/icon-192.png', size: 192 },
    { name: 'public/apple-touch-icon.png', size: 180 },
    { name: 'public/favicon-32x32.png', size: 32 },
    { name: 'public/favicon-16x16.png', size: 16 },
    { name: 'public/image_5.png', size: 512 },
    { name: 'src/assets/image_5.png', size: 512 }
  ];

  for (const item of sizes) {
    const mask = createCircleMask(item.size);
    await sharp(sourcePath)
      .resize(item.size, item.size, { fit: 'cover' })
      .composite([
        {
          input: mask,
          blend: 'dest-in'
        }
      ])
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(item.name);
    console.log(`Generated circular icon: ${item.name} (${item.size}x${item.size})`);
  }

  // Also generate a full-bleed square version for maskable PWA icon
  await sharp(sourcePath)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 100 })
    .toFile('public/icon-maskable-512.png');
  console.log('Generated maskable icon: public/icon-maskable-512.png');

  // Also create a high-res favicon.ico containing 16x16, 32x32, 48x48
  await sharp(sourcePath)
    .resize(48, 48, { fit: 'cover' })
    .composite([{ input: createCircleMask(48), blend: 'dest-in' }])
    .png()
    .toFile('public/favicon-48x48.png');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
