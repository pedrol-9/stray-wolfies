import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagePath = path.join(__dirname, '..', 'public', 'logo.jpg');
const svgPath = path.join(__dirname, '..', 'public', 'favicon.svg');

try {
  const imageBase64 = fs.readFileSync(imagePath).toString('base64');
  const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <clipPath id="circleView">
      <circle cx="50" cy="50" r="50" />
    </clipPath>
  </defs>
  <image href="${dataUrl}" width="100" height="100" clip-path="url(#circleView)" />
</svg>`;

  fs.writeFileSync(svgPath, svgContent);
  console.log('Favicon SVG generated successfully with embedded base64 image!');
} catch (err) {
  console.error('Error generating SVG favicon:', err);
  process.exit(1);
}
