import React, { useEffect, useRef, useState } from 'react';

const UploadMediaStoriesModal = ({ open, onClose, recentMedia = [], onAddRecentMedia, onSelectMedia }) => {
  const filePickerRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="theme-bg-secondary rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl theme-border border">
        <div className="p-5 theme-border border-b flex items-center justify-between">
          <h3 className="text-lg md:text-xl font-bold theme-text-primary">Selecciona multimedia</h3>
          <button onClick={onClose} className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity" aria-label="Cerrar modal">✕</button>
        </div>
        <div className="p-4 overflow-y-auto">
          {/* Bloque de ayuda */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowHelp(h => !h)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl theme-border border theme-bg-chat hover:bg-teal-600/10 transition-colors group"
              aria-expanded={showHelp}
            >
              <span className="flex items-center gap-2 text-sm font-medium tracking-wide theme-text-primary">
                <svg className={`w-4 h-4 transition-transform ${showHelp ? 'rotate-90' : ''}`} stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" />
                </svg>
                Cómo usar este selector
              </span>
              <span className="text-[11px] uppercase tracking-wide font-semibold px-2 py-1 rounded-md bg-teal-500/15 text-teal-300 group-hover:bg-teal-500/25 transition-colors">{showHelp ? 'Ocultar' : 'Ayuda'}</span>
            </button>
            {showHelp && (
              <div className="mt-3 px-4 py-4 rounded-xl bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-950/70 border border-white/10 shadow-inner text-[13px] leading-relaxed space-y-3 animate-[fadeIn_.35s_ease]">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">1</div>
                  <p><strong className="text-teal-300 font-semibold">Pulsa "Ver más"</strong> para abrir el explorador de archivos y seleccionar <span className="text-teal-200">imágenes o videos</span> desde tu dispositivo.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">2</div>
                  <p><strong className="text-teal-300 font-semibold">Haz clic</strong> sobre una miniatura reciente para <span className="text-teal-200">usarla directamente</span> en tu historia.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">3</div>
                  <p><strong className="text-teal-300 font-semibold">Puedes seleccionar varios</strong> a la vez en el explorador: se añadirán aquí como recientes (no se suben todavía).</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">4</div>
                  <p>Al confirmar en el paso siguiente podrás <span className="text-teal-200">editar o publicar</span> tu historia con el archivo elegido.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">?</div>
                  <p>Si algo no carga, intenta volver a pulsar "Ver más" o refrescar la página. Formatos soportados: JPG, PNG, MP4, WebM.</p>
                </div>
                <div className="pt-2 text-[11px] text-white/50 border-t border-white/10">Tus archivos no se suben hasta que confirmes la creación de la historia.</div>
              </div>
            )}
          </div>
          <p className="theme-text-secondary text-sm mb-3">Fotos y videos recientes de esta sesión</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {/* Ver más */}
            <button
              onClick={() => filePickerRef.current?.click()}
              className="flex flex-col items-center justify-center aspect-square rounded-xl theme-border border theme-bg-chat hover:ring-2 hover:ring-teal-primary/60 hover:-translate-y-0.5 transition-all"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-full theme-bg-secondary text-lg">📁</div>
              <span className="mt-1 text-sm theme-text-primary">Ver más</span>
              <span className="text-[10px] theme-text-secondary">Abrir explorador</span>
            </button>

            {/* Recientes */}
            {recentMedia.slice(0, 5).map((m) => (
              <button
                key={m.id}
                className="relative group aspect-square rounded-xl overflow-hidden theme-border border hover:ring-2 hover:ring-teal-primary/60 hover:-translate-y-0.5 transition-all"
                title={m.name}
                onClick={() => onSelectMedia?.(m)}
              >
                {m.type === 'image' ? (
                  <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                ) : (
                  <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/60 text-white capitalize">{m.type}</span>
              </button>
            ))}
          </div>

          {/* Input oculto para abrir el explorador */}
          <input
            ref={filePickerRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length === 0) return;
              const now = Date.now();
              const items = files.map((f, idx) => ({
                id: `${now}-${idx}-${f.name}`,
                type: f.type.startsWith('video') ? 'video' : 'image',
                name: f.name,
                size: f.size,
                lastModified: f.lastModified || now,
                url: URL.createObjectURL(f),
                file: f,
                addedAt: now + idx,
              }));
              onAddRecentMedia?.(items);
              try { e.target.value = ''; } catch {}
            }}
          />

          {recentMedia.length === 0 && (
            <div className="mt-4 text-center theme-text-secondary text-sm">
              No hay elementos recientes aún. Usa "Ver más" para elegir archivos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadMediaStoriesModal;
