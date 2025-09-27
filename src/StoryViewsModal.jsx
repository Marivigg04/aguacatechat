import React from 'react';

const StoryViewsModal = ({ open, onClose, loading, error, viewers }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-fast" onClick={onClose} />
      <div className="relative w-full sm:w-[420px] max-h-[70vh] sm:max-h-[80vh] bg-neutral-900/95 border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-pop-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold tracking-wide text-white/90 uppercase">Vistas de la historia</h2>
          <button onClick={onClose} className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white/80">Cerrar</button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading && (
            <div className="p-6 text-center text-white/70 text-sm">Cargando...</div>
          )}
          {error && !loading && (
            <div className="p-6 text-center text-red-300 text-sm">{error}</div>
          )}
          {!loading && !error && (!viewers || viewers.length === 0) && (
            <div className="p-6 text-center text-white/60 text-sm">Aún no hay vistas.</div>
          )}
          {!loading && !error && viewers && viewers.length > 0 && (
            <ul className="divide-y divide-white/5">
              {viewers.map(v => {
                const avatar = v.avatar_url || null;
                const displayName = v.displayName || v.username || (v.id ? `user_${v.id.slice(0,6)}` : 'user_????');
                return (
                  <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 flex items-center justify-center flex-shrink-0">
                      {avatar ? (
                        <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-white/50">{(displayName || '?').substring(0,2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{displayName}</p>
                      {v.viewed_at && (
                        <p className="text-[11px] text-white/50 truncate">{v.viewed_at}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in-fast { animation: fadeIn .18s ease-out forwards; }
        .animate-pop-up { animation: popUp .28s cubic-bezier(.4,.15,.2,1) forwards; }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes popUp { from { opacity:0; transform: translateY(16px) scale(.96); } to { opacity:1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
};

export default StoryViewsModal;
