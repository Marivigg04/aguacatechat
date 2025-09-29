import React, { useState, useCallback } from 'react';

/**
 * ChatImage (versión armonizada)
 * Objetivo: que todas las imágenes se perciban visualmente similares en área,
 * variando sólo la orientación (horizontal / vertical / cuadrada) como en WhatsApp.
 *
 * Estrategia:
 * 1. Detectamos relación de aspecto (ratio = w/h).
 * 2. Clasificamos en buckets:
 *    - Muy vertical (ratio < 0.66) → bucketVertical (ej: 230x340)
 *    - Muy horizontal (ratio > 1.45) → bucketHorizontal (ej: 300x200)
 *    - Resto → bucketSquare (ej: 260x260)
 * 3. Ajustamos internamente manteniendo el aspect ratio original dentro del bucket contenedor
 *    usando object-cover (más consistente para chat) para uniformidad.
 *
 * Beneficios:
 * - Evitamos imágenes excesivamente pequeñas o enormes.
 * - Se mantiene pista visual de orientación.
 * - Layout estable (no se estiran burbujas fuera de ritmo vertical).
 */
const ChatImage = ({
  src,
  alt = 'Imagen',
  onClick,
  uniformSet = { square: { w: 260, h: 260 }, horizontal: { w: 280, h: 240 }, vertical: { w: 240, h: 300 } },
  strictUniform = false // si true, fuerza contenedor cuadrado con object-contain
}) => {
  const [state, setState] = useState({ loaded: false, error: false, variant: 'square' });

  const handleLoad = useCallback((e) => {
    try {
      const naturalW = e.target.naturalWidth || 1;
      const naturalH = e.target.naturalHeight || 1;
      const ratio = naturalW / naturalH;
      let variant = 'square';
      if (ratio > 1.18) variant = 'horizontal';
      else if (ratio < 0.85) variant = 'vertical';
      setState({ loaded: true, error: false, variant });
    } catch {
      setState(s => ({ ...s, loaded: true, error: true }));
    }
  }, []);

  const handleError = useCallback(() => {
    setState(s => ({ ...s, loaded: true, error: true }));
  }, []);

  const dims = strictUniform ? uniformSet.square : (uniformSet[state.variant] || uniformSet.square);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-black/10 dark:bg-white/10 cursor-pointer select-none ${!state.loaded ? 'animate-pulse' : ''}`}
      style={{ width: dims.w, height: dims.h }}
      onClick={onClick}
    >
      {!state.error ? (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full ${strictUniform ? 'object-contain bg-black/20 dark:bg-white/10' : 'object-cover'} ${state.loaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
          draggable={false}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500 dark:text-gray-300 px-3 text-center">
          Imagen no disponible
        </div>
      )}
    </div>
  );
};

export default ChatImage;
