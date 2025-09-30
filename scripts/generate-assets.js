import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = process.cwd();
const resourcesDir = path.join(root, 'resources');
if (!fs.existsSync(resourcesDir)) fs.mkdirSync(resourcesDir, { recursive: true });

const svgPath = path.join(root, 'public', 'aguacachat_logo.svg');
const pngPath = path.join(root, 'public', 'aguacachat_logo.png');

const iconOut = path.join(resourcesDir, 'icon.png');
const splashOut = path.join(resourcesDir, 'splash.png');

async function build() {
  try {
    const source = fs.existsSync(pngPath) ? pngPath : svgPath;
    if (!fs.existsSync(source)) {
      console.error('No se encontró aguacachat_logo.svg ni aguacachat_logo.png en /public. Coloca uno de ellos.');
      process.exit(1);
    }

    // Icon 1024x1024, transparent background
    await sharp(source)
      .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(iconOut);
    console.log('Generado', iconOut);

    // Splash 2732x2732 with white background and centered logo
    await sharp(source)
      .resize(2000, 2000, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .extend({
        top: 366,
        bottom: 366,
        left: 366,
        right: 366,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(splashOut);
    console.log('Generado', splashOut);

    console.log('\nListo. Ahora ejecuta: npx cordova-res android --skip-config --copy');
  } catch (err) {
    console.error('Error al generar assets:', err);
    process.exit(1);
  }
}

build();
