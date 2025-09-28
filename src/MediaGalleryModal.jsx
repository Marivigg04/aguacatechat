import React, { useCallback, useEffect, useRef } from 'react';
import ChatImage from './ChatImage.jsx';
import VideoThumbnail from './VideoPlayer.jsx';

/**
 * MediaGalleryModal
 * Visor tipo lightbox para navegar entre imágenes y videos del chat.
 * Props:
 *  - open: boolean
 *  - items: [{ type: 'image'|'video', src, created_at?, id? }]
 *  - index: índice inicial
 *  - onClose: () => void
 *  - onIndexChange: (newIndex) => void
 */
const MediaGalleryModal = ({ open, items = [], index = 0, onClose, onIndexChange }) => {
  const containerRef = useRef(null);
  const pointerRef = useRef({ active: false, startX: 0, deltaX: 0 });

  const len = items.length;
  const current = items[index];

  const go = useCallback((dir) => {
    if (!len) return;
    let ni = index + dir;
    if (ni < 0) ni = len - 1; // circular
    if (ni >= len) ni = 0;
    onIndexChange?.(ni);
  }, [index, len, onIndexChange]);

  const handleKey = useCallback((e) => {
    if (!open) return;
    const key = e.key;
    if (key === 'Escape' || key === 'Esc' || e.keyCode === 27) {
      e.preventDefault();
      onClose?.();
      return;
    }
    if (key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  }, [open, go, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  // Gestos táctiles / drag
  const onPointerDown = (e) => {
    // Solo permitir gesto swipe si es tacto
    if (e.pointerType !== 'touch') return;
    pointerRef.current = { active: true, startX: e.clientX, deltaX: 0 };
  };
  const onPointerMove = (e) => {
    if (!pointerRef.current.active) return;
    pointerRef.current.deltaX = e.clientX - pointerRef.current.startX;
    const el = containerRef.current;
    if (el) {
      el.style.setProperty('--slide-offset', pointerRef.current.deltaX + 'px');
    }
  };
  const onPointerUp = () => {
    if (!pointerRef.current.active) return;
    const { deltaX } = pointerRef.current;
    pointerRef.current.active = false;
    const threshold = 90;
    if (deltaX > threshold) go(-1);
    else if (deltaX < -threshold) go(1);
    const el = containerRef.current;
    if (el) {
      el.style.removeProperty('--slide-offset');
    }
  };

  useEffect(() => {
    if (!open) return;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [open]);

  if (!open) return null;
  if (!current) return null;

  const timeLabel = (() => {
    try {
      if (!current.created_at) return '';
      const d = new Date(current.created_at);
      if (d.toString() === 'Invalid Date') return '';
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch { return ''; }
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm select-none"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl max-h-[88vh] flex items-center justify-center overflow-hidden"
        style={{ '--slide-offset': '0px' }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
      >
        {/* Contenido actual */}
        <div
          className="relative transition-transform duration-300 ease-out"
          style={{ transform: 'translateX(var(--slide-offset))' }}
        >
          {current.type === 'image' ? (
            <img
              src={current.src}
              alt="media"
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
              draggable={false}
            />
          ) : (
            <video
              src={current.src}
              controls
              autoPlay
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl bg-black"
            />
          )}
          <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md text-[11px] font-medium bg-black/55 text-white backdrop-blur-sm flex items-center gap-2">
            {timeLabel}
            <span className="text-white/50">{index + 1}/{len}</span>
          </div>
        </div>
        {/* Botones navegación */}
        {len > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 h-16 w-12 flex items-center justify-center text-white/80 hover:text-white focus:outline-none"
              aria-label="Anterior"
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 h-16 w-12 flex items-center justify-center text-white/80 hover:text-white focus:outline-none"
              aria-label="Siguiente"
            >
              <svg viewBox="0 0 24 24" className="w-8 h-8" fill="currentColor"><path d="M8.59 16.59 10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>
            </button>
          </>
        )}
        {/* Cerrar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/70 text-white focus:outline-none"
          aria-label="Cerrar"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MediaGalleryModal;
