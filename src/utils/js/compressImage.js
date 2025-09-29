// Utilidad para comprimir imágenes en el navegador usando canvas
// - Redimensiona manteniendo aspecto a un máximo (por defecto 1440px por lado)
// - Exporta como JPEG o PNG según el tipo de entrada (JPEG/WebP -> JPEG por defecto)
// - Devuelve un File nuevo con el nombre ajustado ("-compressed")

/**
 * @param {File|Blob} file - Imagen de entrada
 * @param {Object} [opts]
 * @param {number} [opts.maxSize=1440] - Máximo de ancho/alto
 * @param {number} [opts.quality=0.82] - Calidad JPEG entre 0-1
 * @returns {Promise<File>} File comprimido
 */
export async function compressImage(file, opts = {}) {
  const { maxSize = 1440, quality = 0.82 } = opts;
  const type = (file.type || 'image/jpeg').toLowerCase();
  if (!type.startsWith('image/')) throw new Error('El archivo no es una imagen');

  const arrayBuffer = await file.arrayBuffer();
  const blobUrl = URL.createObjectURL(new Blob([arrayBuffer], { type }));
  try {
    const img = await loadImage(blobUrl);
    const { canvas, mime } = drawContain(img, { maxSize, type, quality });
    const outBlob = await canvasToBlob(canvas, mime, quality);
    const name = getOutputName(file, mime, '-compressed');
    return new File([outBlob], name, { type: mime });
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawContain(img, { maxSize, type, quality }) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.min(1, maxSize / Math.max(iw, ih));
  const ow = Math.max(1, Math.round(iw * scale));
  const oh = Math.max(1, Math.round(ih * scale));
  const canvas = document.createElement('canvas');
  canvas.width = ow;
  canvas.height = oh;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, ow, oh);
  // Elegir MIME de salida: preferimos JPEG para fotos
  const lower = (type || '').toLowerCase();
  const mime = lower.includes('png') ? 'image/png' : 'image/jpeg';
  return { canvas, mime };
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo crear blob'))), mime, quality);
  });
}

function getOutputName(file, mime, suffix) {
  const base = typeof file.name === 'string' ? file.name : 'image';
  const dot = base.lastIndexOf('.');
  const root = dot > 0 ? base.slice(0, dot) : base;
  const ext = mime.includes('png') ? 'png' : 'jpg';
  return `${root}${suffix}.${ext}`;
}

export default compressImage;
