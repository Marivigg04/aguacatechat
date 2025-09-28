import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import supabase from './services/supabaseClient';
import { useAuth } from './context/AuthContext';
import StoryViewsModal from './StoryViewsModal';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, PlayIcon, PauseIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';

// Helper local para formatear la hora de publicación de cada historia individual
// (duplicado ligero de StoriesView; si se repite más veces convendría extraer a utils)
const formatStoryTime = (iso) => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        const now = new Date();
        const isSameDay = d.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();

        const hours = d.getHours();
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        const hour12 = ((hours + 11) % 12) + 1; // 1-12
        const timePart = `${hour12}:${minutes} ${ampm}`;

        if (isSameDay) return `Hoy a las ${timePart}`;
        if (isYesterday) return `Ayer a las ${timePart}`;
        return `${d.toLocaleDateString()} a las ${timePart}`;
    } catch {
        return '';
    }
};

const StoryViewerModal = ({ stories, startIndex, initialInnerIndex = 0, onClose, onViewedStory, onDeleteStory }) => {
    const { user } = useAuth();
    const [currentUserIndex, setCurrentUserIndex] = useState(startIndex || 0);
    const [currentStoryInUser, setCurrentStoryInUser] = useState(0); // índice dentro del usuario actual
    const [progress, setProgress] = useState(0); // 0..1 para historia actual
    const defaultImageDuration = 5000; // ms para imagen / texto
    const rafRef = useRef(null);
    const startTimeRef = useRef(null);
    const videoRef = useRef(null);
    const [isPaused, setIsPaused] = useState(false);
    const isPausedRef = useRef(false);
    const [isVideo, setIsVideo] = useState(false);
    const [videoMeta, setVideoMeta] = useState({ duration: 0 });
    const [isVideoLoading, setIsVideoLoading] = useState(false);
    const [videoError, setVideoError] = useState(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isClosing, setIsClosing] = useState(false);
    const [transitionDir, setTransitionDir] = useState(null); // 'next' | 'prev'
    const [showViewsModal, setShowViewsModal] = useState(false);
    const [viewsLoading, setViewsLoading] = useState(false);
    const [viewsError, setViewsError] = useState(null);
    const [viewersData, setViewersData] = useState([]);
    // Recordar si la historia ya estaba en pausa antes de abrir el modal de vistas
    const pauseBeforeViewsRef = useRef(false);
    // Refs para control preciso de pausa en imágenes/texto
    const accumulatedRef = useRef(0); // ms acumulados confirmados
    const lastFrameRef = useRef(null); // timestamp del último frame activo (no en pausa)

    const safeClose = () => {
        if (isClosing) return;
        setIsClosing(true);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        setTimeout(() => {
            onClose();
        }, 220); // duración animación fade-out
    };

    // Efecto para cerrar con la tecla 'Escape'
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                safeClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // --- Preparación de estructura flexible ---
    // Aceptamos:
    // 1) Array de usuarios con campo userStories | stories | histories
    // 2) Array plano de historias (strings u objetos) => se encapsula en un usuario virtual
    // debug eliminado

    const preparedUsers = useMemo(() => {
        if (!Array.isArray(stories) || stories.length === 0) return [];
        const isGrouped = stories.some(u => u && typeof u === 'object' && (u.userStories || u.stories || u.histories));
        if (isGrouped) {
            const mapped = stories.map(u => ({
                ...u,
                userStories: u.userStories || u.stories || u.histories || []
            }));
            
            return mapped;
        }
        // Array plano -> usuario virtual
        const virtual = [{
            name: stories[0]?.userName || stories[0]?.name || 'Historias',
            image: stories[0]?.userImage || undefined,
            userStories: stories
        }];
        
        return virtual;
    }, [stories]);

    // debug removido

    // Si la data es array plano y startIndex hace referencia a una historia específica,
    // movemos el índice interno de historia.
    useEffect(() => {
        if (!preparedUsers.length) return;
        if (preparedUsers.length === 1 && Array.isArray(stories) && stories.length > 0) {
            // Caso array plano: currentUserIndex siempre 0, usar startIndex como historia inicial
            setCurrentUserIndex(0);
            const baseIdx = Math.min(startIndex || 0, preparedUsers[0].userStories.length - 1);
            const inner = Math.min(initialInnerIndex || 0, preparedUsers[0].userStories.length - 1);
            setCurrentStoryInUser(inner > 0 ? inner : baseIdx);
            
        } else {
            // Caso agrupado: startIndex refiere a usuario
            setCurrentUserIndex(Math.min(startIndex || 0, preparedUsers.length - 1));
            const userStories = preparedUsers[Math.min(startIndex || 0, preparedUsers.length - 1)].userStories || [];
            const inner = Math.min(initialInnerIndex || 0, userStories.length - 1);
            setCurrentStoryInUser(inner);
            
        }
    }, [preparedUsers, startIndex, stories, initialInnerIndex]);

    const activeUser = preparedUsers && preparedUsers.length > 0 ? preparedUsers[currentUserIndex] : null;
    // Permitimos que cada historia pueda ser:
    // - string (se infiere image/video por extensión)
    // - objeto { type: 'video'|'image'|'text', url, text, bgColor, textColor, fontSize, align, fontWeight, fontFamily, gradient }
    const rawStory = activeUser && activeUser.userStories && activeUser.userStories.length > 0
        ? activeUser.userStories[currentStoryInUser]
        : null;
    // Tiempo formateado de la historia activa (si tiene created_at individual)
    const activeStoryTime = useMemo(() => {
        if (rawStory && typeof rawStory === 'object' && rawStory.created_at) {
            return formatStoryTime(rawStory.created_at);
        }
        return '';
    }, [rawStory]);
    const inferTypeFromUrl = (url) => {
        if (!url || typeof url !== 'string') return 'image';
        const qless = url.split('?')[0].toLowerCase();
        if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(qless)) return 'video';
        return 'image';
    };

    let normalized;
    // Utilidad para sanitizar colores hex (agrega # si falta, recorta, mayúsculas no importan)
    const sanitizeHex = (val) => {
        if (val == null) return val;
        let v = String(val)
            .replace(/^["']|["']$/g, '') // quitar comillas simples o dobles en extremos
            .replace(/[\s\u200B\uFEFF]+/g, '') // quitar todo tipo de espacios (incl. zero-width/BOM)
            .replace(/;+$/g, ''); // quitar ; finales
        // Normalizar hash full-width a ASCII si viniera (caso raro)
        v = v.replace(/\uFF03/g, '#');
        if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return v; // válido
        if (/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return `#${v}`; // falta #
        return v; // podría ser rgb()/gradient/nombre
    };
    const isLikelyColor = (val) => {
        if (val == null) return false;
        const v = sanitizeHex(val);
        if (typeof v !== 'string') return false;
        if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) return true;
        if (/^linear-gradient\(/i.test(v)) return true;
        if (/^radial-gradient\(/i.test(v)) return true;
        if (/^(rgb|hsl)a?\(/i.test(v)) return true;
        // nombres básicos CSS: simple heurística
        if (/^[a-zA-Z]{3,20}$/.test(v)) return true;
        return false;
    };
    if (typeof rawStory === 'string') {
        normalized = { type: inferTypeFromUrl(rawStory), url: rawStory };
    } else if (rawStory && typeof rawStory === 'object') {
        // Normalización robusta para historias de texto (variantes de campos y content_type)
        let url = rawStory.url || rawStory.src || rawStory.path || rawStory.content_url || rawStory.media_url || rawStory.file_url || '';
        if (typeof url === 'string') {
            url = url.trim();
            if (!url || ['null','undefined'].includes(url.toLowerCase())) url = '';
        }
        const rawCT = typeof rawStory.content_type === 'string' ? rawStory.content_type : null;
        const ct = rawCT ? rawCT.trim().toLowerCase() : null;
        let type;
        if (rawStory.type) {
            type = rawStory.type.toLowerCase();
        } else if (ct === 'text' || (ct && ct.includes('text'))) {
            type = 'text';
        } else if (ct === 'video' || (ct && ct.includes('video'))) {
            type = 'video';
        } else if (ct === 'image' || (ct && (ct.includes('image') || ct.includes('photo') || ct.includes('jpeg') || ct.includes('png')))) {
            type = 'image';
        } else {
            type = inferTypeFromUrl(url);
        }
        // Colores (aceptar múltiples alias)
        let rawBg = type === 'text' ? (
            rawStory.bgColor || rawStory.bg_color || rawStory.background || rawStory.background_color || rawStory.bg || rawStory.color_bg
        ) : undefined;
        let rawFont = type === 'text' ? (
            rawStory.textColor || rawStory.font_color || rawStory.fontColor || rawStory.color || rawStory.text_color || rawStory.fgColor
        ) : undefined;
        rawBg = typeof rawBg === 'string' ? rawBg.trim() : rawBg;
        rawFont = typeof rawFont === 'string' ? rawFont.trim() : rawFont;
        const bgColorSanitized = sanitizeHex(rawBg);
        let textColor = sanitizeHex(rawFont) || '#ffffff';
        const bgColor = bgColorSanitized || '#111';
        normalized = {
            ...rawStory,
            type,
            url: type === 'text' ? '' : url,
            text: type === 'text' ? (rawStory.caption || rawStory.text || rawStory.content || '') : undefined,
            bgColor,
            textColor,
            originalBgRaw: rawBg ?? null,
            originalTextRaw: rawFont ?? null,
        };
    } else {
        normalized = null;
    }
    const activeStoryUrl = normalized?.url || null;
    const activeText = normalized?.type === 'text' ? (normalized.text || '') : null;
    const activeType = normalized?.type || 'image';
    const activeStoryId = rawStory && typeof rawStory === 'object' ? rawStory.id : null;
    const isOwnStory = rawStory && typeof rawStory === 'object' && (rawStory.user_id === user?.id);
    const viewsArray = rawStory && Array.isArray(rawStory.views) ? rawStory.views : [];
    const totalExternalViews = viewsArray.filter(v => v && v !== user?.id).length;

    // Registro de vistas: evitar duplicados durante esta sesión en este componente
    const viewedIdsRef = useRef(new Set());

    useEffect(() => {
        const registerView = async () => {
            if (!user || !user.id) return;
            if (!activeStoryId) return;
            // No registrar si la historia es del mismo usuario
            const ownerId = (rawStory && typeof rawStory === 'object' && (rawStory.user_id || rawStory.userId || rawStory.userID)) || null;
            if (ownerId && ownerId === user.id) return;
            // Evitar doble envío si ya se marcó en esta sesión del modal
            if (viewedIdsRef.current.has(activeStoryId)) return;
            viewedIdsRef.current.add(activeStoryId);
            try {
                // Intento: usar RPC-like update: añadir user.id si no está.
                // Paso 1: obtener vistas actuales minimamente para evitar duplicado persistente
                const { data: currentRow, error: fetchErr } = await supabase
                    .from('histories')
                    .select('views')
                    .eq('id', activeStoryId)
                    .single();
                if (fetchErr) {
                    console.warn('[views] fetch error', fetchErr.message);
                }
                const currentViews = Array.isArray(currentRow?.views) ? currentRow.views : [];
                if (currentViews.includes(user.id)) {
                    return; // ya registrado en servidor
                }
                // Actualizar agregando id
                const newViews = [...currentViews, user.id];
                const { error: updateErr } = await supabase
                    .from('histories')
                    .update({ views: newViews })
                    .eq('id', activeStoryId);
                if (updateErr) {
                    console.warn('[views] update error', updateErr.message);
                } else {
                    if (typeof onViewedStory === 'function') {
                        onViewedStory(activeStoryId);
                    }
                }
            } catch (err) {
                console.warn('[views] unexpected error', err);
            }
        };
        registerView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeStoryId, rawStory]);

    // Cargar viewers (perfiles) cuando se abre el modal de vistas
    useEffect(() => {
        const loadViewers = async () => {
            if (!showViewsModal) return;
            if (!isOwnStory) return; // solo dueño puede ver
            if (!activeStoryId) return;
            setViewsLoading(true);
            setViewsError(null);
            try {
                // Tomar el array de views actual del rawStory (excluyendo al dueño)
                const toFetch = viewsArray.filter(v => v && v !== user.id);
                if (toFetch.length === 0) {
                    setViewersData([]);
                    setViewsLoading(false);
                    return;
                }
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', toFetch);
                if (error) throw error;
                const enhanced = (data || []).map(p => {
                    const shortId = p.id ? p.id.slice(0, 6) : '??????';
                    const displayName = p.username || `user_${shortId}`;
                    return { ...p, displayName, shortId };
                });
                const sorted = enhanced.sort((a,b) => (a.displayName||'').localeCompare(b.displayName||''));
                setViewersData(sorted);
            } catch (e) {
                setViewsError(e?.message || 'Error al cargar vistas');
            } finally {
                setViewsLoading(false);
            }
        };
        loadViewers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showViewsModal, activeStoryId]);

    useEffect(() => {}, [currentUserIndex, currentStoryInUser, rawStory, normalized, activeType, activeStoryUrl, activeText]);

    // (toast de diagnóstico eliminado a petición)

    // (debug eliminated)

    const resetProgress = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        startTimeRef.current = null;
        // Forzar a 0 sin animación: usamos un requestAnimationFrame para garantizar re-render inmediato
        setProgress(0);
        accumulatedRef.current = 0;
        lastFrameRef.current = null;
    };

    const goToNextUser = () => {
        // Si es el último usuario -> cerrar
        if (currentUserIndex >= preparedUsers.length - 1) {
            safeClose();
            return;
        }
        setTransitionDir('next');
        setCurrentUserIndex((prevIndex) => prevIndex + 1);
        setCurrentStoryInUser(0);
        resetProgress();
        
    };

    const goToPrevUser = () => {
        if (currentUserIndex <= 0) return; // No ir antes del primero
        setTransitionDir('prev');
        setCurrentUserIndex((prevIndex) => prevIndex - 1);
        setCurrentStoryInUser(0);
        resetProgress();
        
    };
    
    // --- Novedad: Lógica para navegar historias DEL MISMO USUARIO ---
    const goToNextStoryInUser = () => {
        if (!activeUser) return;
        if (currentStoryInUser < activeUser.userStories.length - 1) {
            setTransitionDir('next');
            setCurrentStoryInUser((prev) => prev + 1);
            resetProgress();
            
        } else {
            // última historia de este usuario
            // si además es el último usuario -> cerrar
            if (currentUserIndex >= preparedUsers.length - 1) {
                safeClose();
            } else {
                goToNextUser();
            }
            
        }
    };

    const goToPrevStoryInUser = () => {
        if (!activeUser) return;
        if (currentStoryInUser > 0) {
            setTransitionDir('prev');
            setCurrentStoryInUser((prev) => prev - 1);
            resetProgress();
            
        } else {
            goToPrevUser();
        }
    };

    // Determinar si la historia es video
    useEffect(() => {
        setIsVideo(activeType === 'video');
        
    }, [activeType, currentStoryInUser, currentUserIndex]);

    // Reset loading states al cambiar historia
    useEffect(() => {
        setVideoError(null);
        setIsVideoLoading(activeType === 'video');
        
    }, [activeType, currentStoryInUser, currentUserIndex]);

    // Mantener ref sincronizada con isPaused
    useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

    // Progreso para imágenes / texto (duración fija) o video (duración real)
    useEffect(() => {
        if (!activeUser) return;
        resetProgress();
        setIsPaused(false);
        isPausedRef.current = false;

        if (activeType === 'video') {
            const vid = videoRef.current;
            if (!vid) return;
            const startVideoProgress = () => {
                const tickVideo = () => {
                    if (!vid) return;
                    if (vid.paused || isPausedRef.current) {
                        rafRef.current = requestAnimationFrame(tickVideo);
                        return;
                    }
                    const dur = vid.duration || 1;
                    const ratio = Math.min(1, vid.currentTime / dur);
                    setProgress(ratio);
                    if (ratio >= 1) {
                        goToNextStoryInUser();
                    } else {
                        rafRef.current = requestAnimationFrame(tickVideo);
                    }
                };
                rafRef.current = requestAnimationFrame(tickVideo);
            };
            const handleLoaded = () => {
                setIsVideoLoading(false);
                setVideoMeta({ duration: vid.duration || 0 });
                vid.currentTime = 0;
                vid.muted = isMuted;
                vid.play().catch(()=>{});
                startVideoProgress();
            };
            const handleEnded = () => {
                setProgress(1);
                goToNextStoryInUser();
            };
            const handleError = () => {
                setIsVideoLoading(false);
                setVideoError('No se pudo cargar el video');
            };
            vid.addEventListener('loadedmetadata', handleLoaded);
            vid.addEventListener('ended', handleEnded);
            vid.addEventListener('error', handleError);
            return () => {
                vid.removeEventListener('loadedmetadata', handleLoaded);
                vid.removeEventListener('ended', handleEnded);
                vid.removeEventListener('error', handleError);
            };
        } else {
            const duration = defaultImageDuration;
            const tick = (timestamp) => {
                if (lastFrameRef.current == null) lastFrameRef.current = timestamp;
                if (!isPausedRef.current) {
                    const delta = timestamp - lastFrameRef.current;
                    accumulatedRef.current += delta;
                    const ratio = Math.min(1, accumulatedRef.current / duration);
                    setProgress(ratio);
                    if (ratio >= 1) {
                        goToNextStoryInUser();
                        return;
                    }
                }
                lastFrameRef.current = timestamp;
                rafRef.current = requestAnimationFrame(tick);
            };
            rafRef.current = requestAnimationFrame(tick);
            return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStoryInUser, currentUserIndex, activeType]);

    // Pausa / play (afecta ambos tipos, en video pausa el elemento)
    const togglePause = () => {
        if (activeType === 'video') {
            const vid = videoRef.current;
            if (!vid) return;
            if (vid.paused) {
                vid.play().catch(()=>{});
                setIsPaused(false); isPausedRef.current = false;
                
            } else {
                vid.pause();
                setIsPaused(true); isPausedRef.current = true;
                
            }
        } else {
            setIsPaused(p => { const nv = !p; isPausedRef.current = nv; return nv; });
        }
    };

    const toggleMute = () => {
        if (activeType !== 'video') return;
        const vid = videoRef.current;
        if (!vid) return;
        vid.muted = !vid.muted;
        setIsMuted(vid.muted);
        
    };


    const handleKeyNav = useCallback((e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); goToPrevStoryInUser(); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); goToNextStoryInUser(); }
    }, [goToPrevStoryInUser, goToNextStoryInUser]);

    const pendingDeleteToastRef = useRef(null);
    const handleDelete = () => {
        if (!isOwnStory || !activeStoryId || !onDeleteStory) return;
        // Pausar historia actual (imagen/texto) y video si aplica
        if (activeType === 'video' && videoRef.current) {
            try { videoRef.current.pause(); } catch {}
        }
        setIsPaused(true); isPausedRef.current = true;
        // Evitar múltiples toasts de confirmación
        if (pendingDeleteToastRef.current) {
            toast.dismiss(pendingDeleteToastRef.current);
            pendingDeleteToastRef.current = null;
        }
        const id = toast.custom((t) => (
            <div className={`max-w-sm w-full bg-[#0f172a] text-white rounded-xl shadow-lg border border-white/10 p-4 flex flex-col gap-3 ${t.visible ? 'animate-enter' : 'animate-leave'}`}
                 style={{ fontSize: '13px' }}>
                <div className="font-semibold text-sm">Eliminar historia</div>
                <p className="text-[12px] text-white/70 leading-snug">Esta acción es permanente. ¿Deseas continuar?</p>
                <div className="flex gap-2 justify-end">
                    <button
                        onClick={() => { 
                            toast.dismiss(id); 
                            pendingDeleteToastRef.current = null; 
                            // Reanudar si era video y no estaba en pausa manual
                            if (activeType === 'video' && videoRef.current) {
                                try { videoRef.current.play().catch(()=>{}); } catch {}
                            }
                            setIsPaused(false); isPausedRef.current = false;
                        }}
                        className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-medium transition-colors"
                    >Cancelar</button>
                    <button
                        onClick={async () => {
                            // feedback inmediato
                            const loadingId = toast.loading('Eliminando historia...');
                            try {
                                await onDeleteStory({ storyId: activeStoryId, userId: user?.id, currentUserIndex, currentStoryInUser });
                                toast.success('Historia eliminada');
                            } catch (e) {
                                toast.error('No se pudo eliminar');
                            } finally {
                                toast.dismiss(loadingId);
                                toast.dismiss(id);
                                pendingDeleteToastRef.current = null;
                            }
                        }}
                        className="px-3 py-1.5 rounded-md bg-red-500/80 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-colors"
                    >Eliminar</button>
                </div>
                <style jsx>{`
                  .animate-enter { animation: toastIn .28s cubic-bezier(.4,0,.2,1); }
                  .animate-leave { animation: toastOut .18s ease forwards; }
                  @keyframes toastIn { from { opacity:0; transform: translateY(6px) scale(.96); } to { opacity:1; transform: translateY(0) scale(1); } }
                  @keyframes toastOut { from { opacity:1; transform: translateY(0) scale(1); } to { opacity:0; transform: translateY(-2px) scale(.96); } }
                `}</style>
            </div>
        ), { duration: 60000, id: `confirm-delete-${activeStoryId}` });
        pendingDeleteToastRef.current = id;
    };

    // Pausar automáticamente al abrir el modal de vistas (solo historias propias)
    // y reanudar al cerrarlo si antes no estaba pausada manualmente
    useEffect(() => {
        if (!isOwnStory) return; // Solo aplica a historias propias
        if (showViewsModal) {
            // Guardar estado de pausa previo
            const videoWasPaused = (activeType === 'video' && videoRef.current) ? videoRef.current.paused : false;
            pauseBeforeViewsRef.current = isPausedRef.current || videoWasPaused;
            // Forzar pausa si no lo estaba
            if (!isPausedRef.current) {
                if (activeType === 'video' && videoRef.current) {
                    try { videoRef.current.pause(); } catch {}
                }
                setIsPaused(true); isPausedRef.current = true;
            }
        } else {
            // Al cerrar: solo reanudar si no estaba pausada antes
            if (pauseBeforeViewsRef.current === false) {
                if (activeType === 'video' && videoRef.current) {
                    try { videoRef.current.play().catch(()=>{}); } catch {}
                }
                setIsPaused(false); isPausedRef.current = false;
            }
        }
    }, [showViewsModal, isOwnStory, activeType]);

    return (
    <div
        className={`fixed inset-0 bg-black z-50 flex items-center justify-center overflow-hidden modal-root ${isClosing ? 'modal-leave' : 'modal-enter'}`}
        tabIndex={0}
        onKeyDown={handleKeyNav}
        role="dialog"
        aria-modal="true"
    >
            {/* Debug overlay removido */}
            {/* Fondo dinámico: si es texto usar color/gradient; si es imagen/video usar blur */}
            {activeType !== 'text' && activeStoryUrl && (
                <div className="absolute inset-0 -z-10">
                    <img
                        src={activeStoryUrl}
                        alt="fondo historia"
                        className="w-full h-full object-cover scale-110 blur-2xl opacity-40"
                        style={{ filter: 'brightness(0.55) saturate(0.92)' }}
                        aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
                </div>
            )}
            {activeType === 'text' && (
                <div
                    className="absolute inset-0 -z-10"
                    style={{
                        background: normalized?.gradient || normalized?.bgColor || '#111',
                        filter: 'brightness(0.55) saturate(0.95)'
                    }}
                />
            )}
            {/* Contenedor principal - centrado */}
            <div className="relative w-full h-full flex items-center justify-center">
                {/* Frame vertical 9:16 */}
                <div className={`relative story-vertical-frame bg-black/60 backdrop-blur-md rounded-xl overflow-hidden flex items-center justify-center shadow-[0_0_25px_-5px_rgba(0,0,0,0.7)] border border-white/10 story-transition ${transitionDir === 'next' ? 'enter-from-next' : ''} ${transitionDir === 'prev' ? 'enter-from-prev' : ''}`}
                    onAnimationEnd={() => { if (transitionDir) setTransitionDir(null); }}
                >
                    {/* Contenido de la historia (imagen, video o texto) */}
                    {activeType === 'text' ? (
                        <div
                            className="w-full h-full flex items-center justify-center p-6 relative"
                            style={{
                                background: normalized?.gradient || undefined,
                                backgroundColor: normalized?.bgColor || '#111'
                            }}
                        >
                            {/* Overlay de diagnóstico retirado */}
                            <div
                                className="w-full text-center whitespace-pre-wrap break-words max-h-full overflow-y-auto custom-scrollbar relative z-10"
                                style={{
                                    color: normalized?.textColor || '#fff',
                                    fontSize: normalized?.fontSize || '1.3rem',
                                    fontWeight: normalized?.fontWeight || '600',
                                    fontFamily: normalized?.fontFamily || 'inherit',
                                    textAlign: normalized?.align || 'center',
                                    lineHeight: '1.3',
                                    textShadow: '0 2px 8px rgba(0,0,0,0.35)',
                                    letterSpacing: '0.5px'
                                }}
                            >{activeText}</div>
                        </div>
                    ) : activeStoryUrl ? (
                        activeType === 'video' ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                {videoError && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 px-6 text-center">
                                        <p className="text-sm text-red-300 font-medium">{videoError}</p>
                                        <button
                                            onClick={goToNextStoryInUser}
                                            className="px-4 py-1.5 rounded bg-white/20 hover:bg-white/30 text-xs text-white"
                                        >Saltar</button>
                                    </div>
                                )}
                                {isVideoLoading && !videoError && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
                                        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <p className="text-[11px] text-white/70 tracking-wide">Cargando video...</p>
                                    </div>
                                )}
                                <video
                                    key={activeStoryUrl /* remount para reiniciar correctamente */}
                                    ref={videoRef}
                                    src={activeStoryUrl}
                                    className={`max-w-full max-h-full object-contain select-none transition-opacity duration-300 ${isVideoLoading ? 'opacity-0' : 'opacity-100'}`}
                                    playsInline
                                    webkit-playsinline="true"
                                    preload="metadata"
                                    muted={isMuted}
                                    autoPlay
                                    onClick={togglePause}
                                />
                            </div>
                        ) : (
                            <img
                                src={activeStoryUrl}
                                alt={`Historia de ${activeUser?.name || 'usuario'}`}
                                className="max-w-full max-h-full object-contain select-none"
                                draggable={false}
                                onClick={togglePause}
                            />
                        )
                    ) : (
                        <div className="p-6 text-center text-white">No hay historia disponible</div>
                    )}

                    {/* Gradiente superior + barras + info */}
                    <div className="absolute top-0 left-0 right-0 pt-3 px-3 pb-4 bg-gradient-to-b from-black/70 via-black/30 to-transparent flex flex-col gap-3">
                        {/* Barras de progreso */}
                        {activeUser?.userStories && activeUser.userStories.length > 0 && (
                            <div className="flex gap-1 w-full">
                                {activeUser.userStories.map((_, idx) => {
                                    let fill = 0;
                                    if (idx < currentStoryInUser) fill = 1; // completadas
                                    else if (idx === currentStoryInUser) fill = progress; // actual
                                    else fill = 0; // futuras
                                    return (
                                        <div key={idx} className="flex-1 h-1.5 bg-white/25 rounded overflow-hidden">
                                            <div
                                                className={`h-full bg-white ${idx === currentStoryInUser ? '' : 'transition-none'}`}
                                                style={{ width: `${fill * 100}%` }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                {activeUser?.image && (
                                    <img src={activeUser.image} alt={activeUser.name} className="w-10 h-10 rounded-full object-cover border-2 border-white/70" />
                                )}
                                <div className="truncate">
                                    <h4 className="font-bold text-white text-sm leading-tight truncate">{activeUser?.name}</h4>
                                    <p className="text-[10px] text-gray-300 leading-tight">{activeStoryTime || activeUser?.time || ''}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Botón Play/Pause */}
                                <button
                                    onClick={togglePause}
                                    aria-label={isPaused ? 'Reanudar historia' : 'Pausar historia'}
                                    title={isPaused ? 'Reanudar' : 'Pausar'}
                                    className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
                                >
                                    {isPaused ? <PlayIcon className="w-5 h-5" /> : <PauseIcon className="w-5 h-5" />}
                                </button>
                                {/* Botón Mute/Unmute solo si es video */}
                                {isVideo && (
                                    <button
                                        onClick={toggleMute}
                                        aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
                                        title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
                                        className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
                                    >
                                        {isMuted ? <SpeakerXMarkIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
                                    </button>
                                )}
                                {/* Botón eliminar (solo historias propias) */}
                                {isOwnStory && (
                                    <button
                                        onClick={handleDelete}
                                        aria-label="Eliminar historia"
                                        title="Eliminar"
                                        className="relative group w-9 h-9 flex items-center justify-center rounded-full bg-red-500/25 hover:bg-red-500/40 text-red-200 hover:text-red-50 transition-colors"
                                    >
                                        {/* Icono trash simple (SVG inline) */}
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            <line x1="10" y1="11" x2="10" y2="17" />
                                            <line x1="14" y1="11" x2="14" y2="17" />
                                        </svg>
                                    </button>
                                )}
                                <button
                                    onClick={safeClose}
                                    aria-label="Cerrar"
                                    title="Cerrar"
                                    className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors shrink-0"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Flecha Izquierda */}
                    <button
                        onClick={goToPrevStoryInUser}
                        aria-label="Historia anterior"
                        className="arrow-btn left"
                        tabIndex={0}
                    >
                        <ChevronLeftIcon className="w-6 h-6 pointer-events-none" />
                    </button>

                    {/* Flecha Derecha */}
                    <button
                        onClick={goToNextStoryInUser}
                        aria-label="Siguiente historia"
                        className="arrow-btn right"
                        tabIndex={0}
                    >
                        <ChevronRightIcon className="w-6 h-6 pointer-events-none" />
                    </button>

                    {/* Botón Ver vistas abajo (siempre en historias propias, incluso 0) */}
                    {isOwnStory && (
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                            <button
                                onClick={() => setShowViewsModal(true)}
                                className="group pointer-events-auto pl-3 pr-4 py-1.5 rounded-full bg-black/55 hover:bg-black/70 text-white/90 hover:text-white text-xs font-medium backdrop-blur border border-white/15 shadow-sm transition-colors flex items-center gap-1.5"
                                title="Ver quiénes vieron esta historia"
                            >
                                {/* Icono ojo */}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity"
                                >
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                                    <circle cx="12" cy="12" r="3" />
                                </svg>
                                <span>Vistas: {totalExternalViews || 0}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .arrow-btn { position:absolute; top:50%; transform:translateY(-50%); width:46px; height:46px; display:flex; align-items:center; justify-content:center; border-radius:9999px; background:rgba(0,0,0,.42); color:#fff; backdrop-filter:blur(4px); transition:background .18s, transform .18s; z-index:30; outline:none; }
                .arrow-btn:hover { background:rgba(0,0,0,.62); }
                .arrow-btn:active { transform:translateY(-50%) scale(.94); }
                .arrow-btn.left { left:6px; }
                .arrow-btn.right { right:6px; }
                .arrow-btn::before { content:""; position:absolute; inset:-8px; border-radius:inherit; }
                .arrow-btn:focus-visible { box-shadow:0 0 0 2px #fff6; }
                .modal-enter { animation: modalFadeIn 0.28s ease-out forwards; }
                .modal-leave { animation: modalFadeOut 0.22s ease-in forwards; }
                @keyframes modalFadeIn { from { opacity:0; transform:scale(.96); } to { opacity:1; transform:scale(1); } }
                @keyframes modalFadeOut { from { opacity:1; transform:scale(1); } to { opacity:0; transform:scale(.96); } }
                .story-transition { position:relative; }
                .enter-from-next { animation: slideInNext .32s cubic-bezier(.4,.15,.2,1); }
                .enter-from-prev { animation: slideInPrev .32s cubic-bezier(.4,.15,.2,1); }
                @keyframes slideInNext { 
                    0% { opacity:0; transform: translateX(40px) scale(.98); }
                    60% { opacity:1; }
                    100% { opacity:1; transform: translateX(0) scale(1); }
                }
                @keyframes slideInPrev { 
                    0% { opacity:0; transform: translateX(-40px) scale(.98); }
                    60% { opacity:1; }
                    100% { opacity:1; transform: translateX(0) scale(1); }
                }
                .story-vertical-frame {
                    aspect-ratio: 9 / 16;
                    width: min(100vw, 430px);
                    height: min(100vh, calc((100vw) * 16 / 9));
                    max-height: 95vh;
                }
                .custom-scrollbar { scrollbar-width: thin; }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 3px; }
                @supports not (aspect-ratio: 9 / 16) {
                    .story-vertical-frame { width: 100%; max-width: 430px; }
                }
                @media (max-width: 480px) {
                    .story-vertical-frame { width: 100vw; height: 100vh; border-radius: 0; }
                }
            `}</style>
            <StoryViewsModal
                open={showViewsModal}
                onClose={() => setShowViewsModal(false)}
                loading={viewsLoading}
                error={viewsError}
                viewers={viewersData}
            />
        </div>
    );
};

export default StoryViewerModal;