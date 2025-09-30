import React, { useEffect, useRef, useState } from 'react';
import supabase from '../../services/supabaseClient';

// Formatea la fecha/hora de la vista:
// - Hoy a las 7:15 pm
// - Ayer a las 11:48 am
// - dd/mm/aaaa a las h:mm am/pm (para días anteriores)
function formatViewedAt(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    const hour12 = ((hours + 11) % 12) + 1; // 1-12
    const timePart = `${hour12}:${minutes} ${ampm}`;

    if (sameDay) return `Hoy a las ${timePart}`;
    if (isYesterday) return `Ayer a las ${timePart}`;

    // Formato dd/mm/aaaa
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy} a las ${timePart}`;
  } catch {
    return '';
  }
}

// Props extendidos:
// - storyId: id de la historia activa
// - isOwner: bool si el usuario actual es dueño de la historia
// - onRealtimeAppend?: callback opcional si se quiere saber de nuevas vistas
const StoryViewsModal = ({ open, onClose, loading, error, viewers, storyId, isOwner, onRealtimeAppend }) => {
  const [liveViewers, setLiveViewers] = useState([]);
  const initialLoadedRef = useRef(false);

  // Sincronizar viewers iniciales cuando llegan (y no duplicar en re-renders)
  useEffect(() => {
    if (!open) return;
    if (!initialLoadedRef.current) {
      setLiveViewers(viewers || []);
      initialLoadedRef.current = true;
    } else {
      // Si cambia la lista externa (por refetch manual) fusionar sin duplicar
      if (Array.isArray(viewers)) {
        setLiveViewers(prev => {
          const map = new Map(prev.map(v => [v.id, v]));
          viewers.forEach(v => { if (!map.has(v.id)) map.set(v.id, v); });
          return Array.from(map.values()).sort((a,b) => (a.displayName||'').localeCompare(b.displayName||''));
        });
      }
    }
  }, [viewers, open]);

  // Suscripción realtime a inserts de history_views para la historia (solo si esOwner)
  useEffect(() => {
    if (!open) return; // modal cerrado => no suscribir
    if (!isOwner) return; // solo dueño ve vistas
    if (!storyId) return;
    const channel = supabase.channel(`story_views_modal_${storyId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'history_views',
        filter: `history_id=eq.${storyId}`
      }, async (payload) => {
        const row = payload?.new;
        if (!row) return;
        // Evitar duplicado
        setLiveViewers(prev => {
          if (prev.some(v => v.id === row.user_id)) return prev;
          return prev; // datos de perfil se cargarán abajo
        });
        try {
          const { data: prof, error: profErr } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', row.user_id)
            .single();
          if (profErr || !prof) return;
          setLiveViewers(prev => {
            if (prev.some(v => v.id === prof.id)) return prev;
            const shortId = prof.id ? prof.id.slice(0,6) : '??????';
            const displayName = prof.username || `user_${shortId}`;
            const next = [...prev, { ...prof, displayName, shortId, viewed_at: row.viewed_at }];
            return next.sort((a,b) => (a.displayName||'').localeCompare(b.displayName||''));
          });
          if (typeof onRealtimeAppend === 'function') {
            onRealtimeAppend({ userId: prof.id, viewed_at: row.viewed_at });
          }
        } catch {}
      });
    channel.subscribe();
    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, [open, isOwner, storyId, onRealtimeAppend]);

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
          {!loading && !error && liveViewers && liveViewers.length > 0 && (
            <ul className="divide-y divide-white/5">
              {liveViewers.map(v => {
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
                        <p className="text-[11px] text-white/50 truncate">{formatViewedAt(v.viewed_at)}</p>
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
