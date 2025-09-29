import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
// Usamos únicamente la versión "emoji-mart" clásica para evitar conflictos con React 19
// La versión 5.x exporta Picker directamente.
import { Picker } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';

/**
 * EmojiPicker
 * Props:
 *  - onSelect(emojiNative: string): void  (retorna el carácter nativo del emoji)
 *  - onClose(): void (cuando se debe cerrar por click externo / ESC)
 *  - dark: boolean (tema oscuro)
 *  - anchorRef: ref del botón (para posicionar si se requiere)
 */
const EmojiPicker = ({ onSelect, onClose, dark, anchorRef }) => {
  const wrapperRef = useRef(null);
  const cacheRef = useRef({ width: 0, left: 0, top: 0 });
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));
  const [coords, setCoords] = useState({ top: 0, left: 0, ready: false, arrowX: 0, arrowPosition: 'bottom' });
  const [measuredWidth, setMeasuredWidth] = useState(340); // ancho real después de montar
  // Drag state (mobile sheet)
  const dragStateRef = useRef({ startY: 0, lastY: 0, translating: false, startTime: 0 });
  const [dragOffset, setDragOffset] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const PICKER_WIDTH_FALLBACK = 340; // fallback inicial antes de medir
  const PICKER_HEIGHT = 420; // altura máxima estimada
  const GAP = 8; // separación entre botón y picker
  // Desplazamiento manual opcional (si quisieras mover globalmente a la izquierda/derecha)
  const GLOBAL_OFFSET_X = 0;

  // Calcular posición sobre el botón (anchor)
  const computePosition = () => {
    if (isMobile) {
      setCoords(prev => ({ ...prev, ready: true }));
      return;
    }
    const btn = anchorRef?.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const pickerW = measuredWidth || PICKER_WIDTH_FALLBACK;
    const buttonCenterX = rect.left + rect.width / 2;
    let left = buttonCenterX - pickerW / 2 + GLOBAL_OFFSET_X;
    const minLeft = 8;
    const maxLeft = vw - pickerW - 8;
    const clampedLeft = Math.max(minLeft, Math.min(left, maxLeft));
    let arrowX = buttonCenterX - clampedLeft;
    arrowX = Math.max(16, Math.min(arrowX, pickerW - 16));

    // Espacio disponible arriba y abajo del botón
    const spaceAbove = rect.top - GAP; // desde top viewport hasta borde superior del botón - GAP
    const spaceBelow = vh - rect.bottom - GAP; // desde borde inferior botón + GAP hasta bottom viewport

    // Altura deseada base
    const desiredHeight = PICKER_HEIGHT;
    // Determinar si cabe arriba o abajo completamente
    const canFitAbove = spaceAbove >= desiredHeight;
    const canFitBelow = spaceBelow >= desiredHeight;

    let arrowPosition = 'bottom'; // por defecto mostramos arriba del botón (flecha abajo del picker)
    let top;
    let effectiveHeight = desiredHeight;

    if (canFitAbove || (!canFitBelow && spaceAbove >= spaceBelow)) {
      // Colocar arriba (preferimos arriba si cabe o si hay más espacio arriba)
      effectiveHeight = Math.min(desiredHeight, spaceAbove - 8); // margen de seguridad
      top = rect.top - GAP - effectiveHeight;
      arrowPosition = 'bottom';
    } else {
      // Colocar abajo
      effectiveHeight = Math.min(desiredHeight, spaceBelow - 8);
      top = rect.bottom + GAP;
      arrowPosition = 'top';
    }

    // Guardar altura efectiva para estilos inline (usamos cacheRef para reutilizar si re-render)
    cacheRef.current = { width: pickerW, left: clampedLeft, top };
    setCoords({ top, left: clampedLeft, arrowPosition, ready: true, arrowX, effectiveHeight });
  };

  useEffect(() => {
    computePosition();
    const onResize = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      computePosition();
    };
    const onScroll = (e) => {
      // Reposicionar en scroll global (p.ej. ventana) o si el botón se mueve
      // Usa requestAnimationFrame para batching
      requestAnimationFrame(computePosition);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [anchorRef, measuredWidth, isMobile]);

  // Montar animación sólo cuando ya tenemos coordenadas listas (evita parpadeo/recolocación)
  useEffect(() => {
    if (!coords.ready) return; // esperar a posicionamiento inicial
    const r = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(r);
  }, [coords.ready]);

  // Medir ancho real después del primer render del picker
  useEffect(() => {
    if (isMobile) return; // en móvil no necesitamos medir para centrar
    if (wrapperRef.current) {
      const el = wrapperRef.current.querySelector('.emoji-mart');
      if (el) {
        const w = el.getBoundingClientRect().width;
        if (w && Math.abs(w - measuredWidth) > 2) {
          setMeasuredWidth(w);
        } else if (!coords.ready && cacheRef.current.width) {
          // Reusar caché si existe y aún no marcamos listo
          setMeasuredWidth(cacheRef.current.width);
        }
      }
    }
  });

  // Bloquear scroll de body en móvil mientras está abierto
  useEffect(() => {
    if (!isMobile) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [isMobile]);

  // Cerrar al hacer click fuera o ESC
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target) && !anchorRef?.current?.contains(e.target)) {
        initiateClose();
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') initiateClose();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [anchorRef]);

  const initiateClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    const timeout = isMobile ? 240 : 180;
    setTimeout(() => {
      onClose?.();
    }, timeout);
  };

  if (typeof document === 'undefined') return null; // SSR safety

  // Handlers de drag (solo móvil)
  const DRAG_TRIGGER_ZONE = 48; // px superiores donde permitimos iniciar drag
  const CLOSE_THRESHOLD = 140;  // desplazamiento para cerrar
  const VELOCITY_THRESHOLD = 0.7; // px/ms aproximado para cierre rápido

  const onTouchStart = (e) => {
    if (!isMobile || isClosing) return;
    const touch = e.touches[0];
    const sheet = wrapperRef.current;
    if (!sheet) return;
    const rect = sheet.getBoundingClientRect();
    if (e.target && sheet.contains(e.target)) {
      // Limitar inicio a la zona superior
      if (touch.clientY < rect.top || touch.clientY > rect.top + DRAG_TRIGGER_ZONE) return;
    }
    dragStateRef.current = { startY: touch.clientY, lastY: touch.clientY, translating: true, startTime: performance.now() };
  };

  const onTouchMove = (e) => {
    if (!dragStateRef.current.translating) return;
    const touch = e.touches[0];
    const delta = touch.clientY - dragStateRef.current.startY;
    if (delta < 0) {
      // No permitir arrastrar hacia arriba (rebote leve)
      setDragOffset(delta * 0.15);
    } else {
      setDragOffset(delta);
    }
    dragStateRef.current.lastY = touch.clientY;
  };

  const onTouchEnd = () => {
    if (!dragStateRef.current.translating) return;
    const { startY, lastY, startTime } = dragStateRef.current;
    const delta = lastY - startY;
    const elapsed = performance.now() - startTime;
    const velocity = delta / Math.max(elapsed, 1); // px/ms
    dragStateRef.current.translating = false;

    const shouldClose = delta > CLOSE_THRESHOLD || velocity > VELOCITY_THRESHOLD;
    if (shouldClose) {
      // Para cierre por gesto mantenemos desplazamiento y ejecutamos timeout consistente
      setIsClosing(true);
      setDragOffset((prev) => Math.max(prev, CLOSE_THRESHOLD + 40));
      setTimeout(() => {
        onClose?.();
      }, isMobile ? 240 : 180);
    } else {
      // Rebotar a posición original
      setDragOffset(0);
    }
  };

  return createPortal(
    <>
      {isMobile && (
        <div
          className={
            `fixed inset-0 z-[119] bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`
          }
          onClick={initiateClose}
        />
      )}
      {isMobile && (
        <style>{`.emoji-picker-portal .emoji-mart { width:100% !important; max-width:100% !important; border-radius:0 !important; }`}</style>
      )}
      <div
        ref={wrapperRef}
        className={(() => {
          const base = 'emoji-picker-portal z-[120] fixed';
          // Mientras no esté listo coords, ocultamos totalmente
            if (!coords.ready) return `${base} opacity-0 pointer-events-none`; 
          if (!mounted && !isClosing) {
            // Mostrar sin animación (estado estable) primera pintura oculta y luego se gatilla enter
            return `${base} opacity-0`;
          }
          if (isMobile) {
            return `${base} left-0 right-0 bottom-0 ${isClosing ? 'emoji-picker-exit-mobile' : 'emoji-picker-enter-mobile'}`;
          }
          return `${base} ${isClosing ? 'emoji-picker-exit-desktop' : 'emoji-picker-enter-desktop'}`;
        })()}
        style={
          isMobile
            ? {
                visibility: coords.ready ? 'visible' : 'hidden',
                // Solo aplicar transform directo mientras se arrastra (para que animaciones no entren en conflicto)
                transform: dragStateRef.current.translating ? `translateY(${dragOffset}px)` : undefined,
                transition: dragStateRef.current.translating ? 'none' : undefined
              }
            : {
                top: coords.top,
                left: coords.left,
                visibility: coords.ready ? 'visible' : 'hidden'
              }
        }
        aria-label="Selector de emojis"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div
          className={
            isMobile
              ? 'relative rounded-t-2xl overflow-hidden border-t border-x theme-border theme-bg-secondary shadow-2xl'
              : 'relative rounded-xl overflow-hidden border theme-border theme-bg-secondary shadow-2xl'
          }
          style={{
            backdropFilter: 'blur(10px)',
            // Si tenemos una altura efectiva calculada (desktop) úsala, sino fallback
            maxHeight: isMobile ? '75vh' : (coords.effectiveHeight || PICKER_HEIGHT),
            width: isMobile ? '100%' : 'auto'
          }}
        >
          {isMobile && (
            <div className="w-full flex justify-center py-2">
              <div className="h-1.5 w-14 rounded-full bg-gray-400/40" />
            </div>
          )}
          <Picker
            theme={dark ? 'dark' : 'light'}
            showPreview={false}
            showSkinTones={false}
            set={'apple'}
            perLine={isMobile ? 8 : 12}
            emojiSize={isMobile ? 28 : 32}
            sheetSize={64}
            onSelect={(emoji) => {
              if (emoji?.native) onSelect?.(emoji.native);
              if (isMobile) initiateClose();
            }}
            style={isMobile ? { width: '100%', maxWidth: '100%' } : undefined}
          />
          {/* Flecha (solo desktop) */}
          {!isMobile && (
            <div
              className="pointer-events-none absolute w-3 h-3 rotate-45 border theme-border theme-bg-secondary"
              style={
                coords.arrowPosition === 'bottom'
                  ? { bottom: -6, left: coords.arrowX, marginLeft: -6 }
                  : { top: -6, left: coords.arrowX, marginLeft: -6 }
              }
            />
          )}
        </div>
      </div>
    </>,
    document.body
  );
};

export default EmojiPicker;
