
// Externas
import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import { PhotoIcon, DocumentTextIcon, UserCircleIcon } from '@heroicons/react/24/outline';

// Componentes internos
import StoriesSkeleton from '../skeletons/StoriesSkeleton.jsx';
import StoryViewerModal from './StoryViewerModal';
import UploadTextStoryModal from './UploadTextStoryModal.jsx';
import UploadMediaStoriesModal from './UploadMediaStoriesModal.jsx';
import StoryVideoPreviewModal from './StoryVideoPreviewModal';
import StoryImageEditorModal from './StoryImageEditorModal';

// Servicios y hooks
import supabase from '../../services/supabaseClient.js';
import { compressImage } from '../../utils/js/compressImage.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchUserConversations, selectFrom, uploadVideoToBucket } from '../../services/db.js';

// Utilidad para formatear la hora de una historia
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

// Novedad: Se han eliminado los comentarios "//" para definir correctamente el componente
const StoryItem = ({ name, time, image, onClick, index = 0, seen = false, exiting = false }) => (
    <div 
        className={`flex flex-col gap-1 cursor-pointer group ${exiting ? 'story-exit' : (seen ? 'story-animate-soft' : 'story-animate')}`}
        style={!exiting ? { animationDelay: `${Math.min(index, 8) * 60}ms` } : undefined}
        onClick={onClick}
    >
        <div className="aspect-square w-full rounded-md overflow-hidden transform group-hover:scale-105 transition-transform duration-300 bg-gray-50">
            {image ? (
                <img src={image} alt={name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50">
                    <UserCircleIcon className="w-12 h-12 text-gray-400" />
                </div>
            )}
        </div>
        <div>
            <h4 className="font-semibold theme-text-primary text-sm truncate">{name}</h4>
            <p className="text-xs theme-text-secondary truncate">{time}</p>
        </div>
    </div>
);

// Novedad: Se han eliminado los comentarios "//" para definir correctamente el componente
const UploadStoryCard = ({ onOpenChoice, choiceOpen, onSelectChoice }) => {
    const anchorRef = useRef(null);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, width: 0 });

    // Recalcular posición cuando se abre o al hacer resize/scroll
    useEffect(() => {
        if (!choiceOpen) return;
        const calc = () => {
            if (!anchorRef.current) return;
            const rect = anchorRef.current.getBoundingClientRect();
            setPopoverPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX, width: rect.width });
        };
        calc();
        window.addEventListener('resize', calc);
        window.addEventListener('scroll', calc, true);
        return () => {
            window.removeEventListener('resize', calc);
            window.removeEventListener('scroll', calc, true);
        };
    }, [choiceOpen]);

    return (
        <>
            <div
                ref={anchorRef}
                className="flex flex-col gap-1 cursor-pointer group relative story-animate"
                style={{ animationDelay: '0ms' }}
                onClick={onOpenChoice}
            >
                <div className="aspect-square w-full rounded-md overflow-hidden bg-emerald-500/10 border-2 border-dashed border-emerald-500/50 flex flex-col items-center justify-center text-emerald-500 transition-all group-hover:bg-emerald-500/20 hover:ring-2 hover:ring-teal-400/50 hover:-translate-y-0.5 hover:shadow-lg">
                    <ArrowUpTrayIcon className="w-6 h-6" />
                    <span className="mt-1 text-xs font-semibold text-center px-1">Subir historia</span>
                </div>
            </div>
            {choiceOpen && createPortal(
                <div
                    className="fixed z-[2147483647] w-60 max-w-[260px] rounded-2xl shadow-2xl theme-border border backdrop-blur-sm p-2 theme-bg-secondary transition transform origin-top-left story-animate"
                    style={{ top: popoverPos.top, left: popoverPos.left }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="absolute -top-1 left-6 w-3 h-3 theme-bg-secondary theme-border border-l border-t rotate-45"></span>
                    <button
                        className="w-full flex items-center gap-3 p-2 rounded-xl transition group/item hover:ring-2 hover:ring-teal-400/40 hover:bg-gradient-to-r hover:from-teal-500/10 hover:to-emerald-500/10"
                        onClick={() => onSelectChoice('media')}
                    >
                        <span className="w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-500 flex items-center justify-center transition-colors group-hover/item:bg-teal-500/15 group-hover/item:text-teal-600">
                            <PhotoIcon className="w-5 h-5" />
                        </span>
                        <span className="text-sm font-medium">Foto / Video</span>
                    </button>
                    <button
                        className="w-full flex items-center gap-3 p-2 rounded-xl transition group/item hover:ring-2 hover:ring-teal-400/40 hover:bg-gradient-to-r hover:from-teal-500/10 hover:to-emerald-500/10"
                        onClick={() => onSelectChoice('text')}
                    >
                        <span className="w-8 h-8 rounded-md bg-teal-500/10 text-teal-500 flex items-center justify-center transition-colors group-hover/item:bg-teal-500/15 group-hover/item:text-teal-600">
                            <DocumentTextIcon className="w-5 h-5" />
                        </span>
                        <span className="text-sm font-medium">Texto</span>
                    </button>
                </div>,
                document.body
            )}
        </>
    );
};


const StoriesView = forwardRef((props, ref) => {
    // Novedad: Se ha descomentado la línea para declarar el estado `viewerOpen`
    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
    const [initialInnerIndex, setInitialInnerIndex] = useState(0);
    const { user } = useAuth();
    const [stories, setStories] = useState([]);
    // Guardar timeouts de expiración por id de historia
    const expirationTimeoutsRef = useRef(new Map());
    // Cache local de perfiles (user_id -> { username, avatar_url }) para evitar fetch repetido en realtime
    const profilesCacheRef = useRef(new Map());
    const [loadingStoriesList, setLoadingStoriesList] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    // Mapa local para forzar actualización inmediata sin refetch (storyId -> true)
    const [locallyViewed, setLocallyViewed] = useState(() => new Set());
    const [choiceOpen, setChoiceOpen] = useState(false);
    const [textModalOpen, setTextModalOpen] = useState(false);
    const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const mediaInputRef = useRef(null);
    const [editorFile, setEditorFile] = useState(null); // imagen a editar
    const [videoFile, setVideoFile] = useState(null); // video a previsualizar
    const [uploading, setUploading] = useState(false);

    const openViewerById = (id) => {
        const idx = stories.findIndex(s => s.id === id);
        if (idx >= 0) {
            setSelectedStoryIndex(idx);
            // Calcular primer no visto interno
            const group = stories[idx];
            const userStories = Array.isArray(group.userStories) ? group.userStories : [];
            let firstUnseen = 0;
            if (user && user.id) {
                let allSeen = true;
                for (let i = 0; i < userStories.length; i++) {
                    const h = userStories[i];
                    const arr = Array.isArray(h.views) ? h.views : [];
                    const locally = locallyViewed.has(h.id);
                    if (!locally && !arr.includes(user.id)) {
                        firstUnseen = i;
                        allSeen = false;
                        break;
                    }
                }
                if (allSeen) firstUnseen = 0; // todas vistas -> abrir primera
            }
            setInitialInnerIndex(firstUnseen);
            setViewerOpen(true);
        }
    };

    // Cargar historias: la idea es mostrar "Tu historia" primero y luego contactos con historias
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoadingStoriesList(true);
            setIsFadingOut(false);
            try {
                if (!user || !user.id) {
                    // No autenticado: usar muestras
                    if (mounted) setStories(sampleStories);
                    return;
                }

                // 1) Obtener conversaciones del usuario para conocer contactos
                const convs = await fetchUserConversations(user.id);
                // Filtrar sólo conversaciones aceptadas. Criterio:
                // - conv.acepted === true OR conv.created_by === user.id (el creador puede ver su propio contacto aunque espere aceptación)
                const acceptedConvs = convs.filter(c => c && (c.acepted === true || c.created_by === user.id));
                const otherProfiles = acceptedConvs
                    .map(c => c.otherProfile)
                    .filter(Boolean);

                // 2) Para cada perfil (incluyendo el propio usuario) consultar tabla 'histories' con user_id
                // Hacemos una consulta batch: primero construir set de user ids
                const userIds = new Set([user.id]);
                for (const p of otherProfiles) userIds.add(p.id);
                const idsArr = Array.from(userIds);

                // Limpiar cache y precargar perfiles conocidos
                profilesCacheRef.current.clear();

                // 3) Preparar fetch del avatar del propio usuario en paralelo para reducir latencia
                let avatarPromise = null;
                if (user && user.id) {
                    avatarPromise = selectFrom('profiles', { columns: 'username, avatar_url', match: { id: user.id }, single: true }).catch(() => null);
                }

                // Traer historias de Supabase (filtrar últimas 24 horas)
                const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const { data: rows, error } = await supabase
                    .from('histories')
                    .select('id, user_id, content_url, content_type, caption, created_at, bg_color, font_color, views')
                    .in('user_id', idsArr)
                    .gt('created_at', cutoff)
                    .order('created_at', { ascending: true }); // más vieja -> más nueva
                if (error) throw error;

                // 4) Agrupar por usuario
                const byUser = new Map();
                for (const r of rows || []) {
                    const arr = byUser.get(r.user_id) || [];
                    arr.push(r); // ya vienen en orden ascendente
                    byUser.set(r.user_id, arr);
                }

                // 5) Construir lista final: primera entrada es 'Tu historia'
                const final = [];

                // Tu historia (si tiene historias) — añadimos solo si hay historias del propio usuario
                const myStories = byUser.get(user.id) || [];
                if (myStories.length > 0) {
                    // Usar resultado de la promesa del avatar que iniciamos en paralelo
                    let avatarFromProfile = null;
                    let usernameFromProfile = null;
                    if (avatarPromise) {
                        const row = await avatarPromise;
                        avatarFromProfile = row?.avatar_url || null;
                        usernameFromProfile = row?.username || null;
                    }

                    // Guardar en cache
                    profilesCacheRef.current.set(user.id, {
                        username: usernameFromProfile || 'Mi Estado',
                        avatar_url: avatarFromProfile || (user.raw && user.raw.user_metadata && user.raw.user_metadata.avatar_url) || user.avatar_url || null
                    });

                    final.push({
                        id: `me-${user.id}`,
                        name: 'Mi Estado',
                        // time mostrará la más reciente (último elemento) manteniendo orden interno ascendente
                        time: myStories[myStories.length - 1] ? formatStoryTime(myStories[myStories.length - 1].created_at) : 'No tienes historias',
                        image: avatarFromProfile || (user.raw && user.raw.user_metadata && user.raw.user_metadata.avatar_url) || user.avatar_url,
                        // Enviar objetos completos para poder detectar content_type='text'
                        userStories: myStories.map(h => ({ ...h })),
                        isMe: true,
                    });
                }

                // Ahora los contactos en el mismo orden que convs
                for (const c of acceptedConvs) {
                    const prof = c.otherProfile;
                    if (!prof) continue;
                    const userHist = byUser.get(prof.id) || [];
                    if (userHist.length === 0) continue; // omitimos si no tiene historias
                    // Guardar perfil en cache
                    profilesCacheRef.current.set(prof.id, { username: prof.username || prof.id, avatar_url: prof.avatar_url || `https://i.pravatar.cc/150?u=${prof.id}` });
                    final.push({
                        id: `u-${prof.id}`,
                        name: prof.username || prof.id,
                        // mostrar hora de la más reciente (última)
                        time: userHist[userHist.length - 1] ? formatStoryTime(userHist[userHist.length - 1].created_at) : '',
                        image: prof.avatar_url || `https://i.pravatar.cc/150?u=${prof.id}`,
                        userStories: userHist.map(h => ({ ...h })), // ya en orden ascendente
                    });
                }

                if (final.length === 0) {
                    // Ninguna historia real: usar fallback samples
                    if (mounted) setStories(sampleStories);
                } else {
                    if (mounted) setStories(final);
                }
                // Programar expiración para cada historia cargada
                setTimeout(() => {
                    if (!mounted) return;
                    scheduleExpirations(final);
                }, 0);
            } catch (err) {
                console.error('Error cargando historias:', err);
                if (mounted) setStories(sampleStories);
            } finally {
                if (mounted) {
                    setIsFadingOut(true);
                    setTimeout(() => {
                        setLoadingStoriesList(false);
                        setIsFadingOut(false);
                    }, 300); // duración de la animación
                }
            }
        };
        load();
        return () => { mounted = false };
    }, [user]);

    // Función para programar expiración de historias (24h desde created_at)
    const scheduleExpirations = useCallback((storyGroups) => {
        if (!Array.isArray(storyGroups)) return;
        storyGroups.forEach(group => {
            if (!Array.isArray(group.userStories)) return;
            group.userStories.forEach(h => {
                if (!h || !h.id || !h.created_at) return;
                const created = new Date(h.created_at).getTime();
                const expiresAt = created + 24 * 60 * 60 * 1000;
                const remaining = expiresAt - Date.now();
                if (remaining <= 0) {
                    // Ya expiró -> eliminar inmediatamente
                    softRemoveHistoryById(h.id);
                    return;
                }
                if (!expirationTimeoutsRef.current.has(h.id)) {
                    const to = setTimeout(() => {
                        expirationTimeoutsRef.current.delete(h.id);
                        softRemoveHistoryById(h.id);
                    }, remaining);
                    expirationTimeoutsRef.current.set(h.id, to);
                }
            });
        });
    }, []);

    // Estado para grupos en salida (animación)
    const exitingGroupsRef = useRef(new Set());
    const [, forceRerender] = useState(0);

    const softRemoveHistoryById = useCallback((historyId) => {
        setStories(current => {
            // Detectar qué grupo se verá afectado y si se queda vacío
            let targetGroupId = null;
            let willBeEmpty = false;
            const updated = current.map(g => {
                if (!Array.isArray(g.userStories)) return g;
                if (g.userStories.some(h => h.id === historyId)) {
                    const filtered = g.userStories.filter(h => h.id !== historyId);
                    if (filtered.length === 0) {
                        targetGroupId = g.id;
                        willBeEmpty = true;
                        return g; // devolvemos intacto por ahora para animar
                    }
                    return { ...g, userStories: filtered };
                }
                return g;
            });
            if (willBeEmpty && targetGroupId) {
                exitingGroupsRef.current.add(targetGroupId);
                // Forzar re-render para aplicar clase .story-exit
                forceRerender(v => v + 1);
                // Después de la duración de la animación (340ms) eliminar definitivamente
                setTimeout(() => {
                    setStories(curr2 => curr2.filter(gr => gr.id !== targetGroupId));
                    exitingGroupsRef.current.delete(targetGroupId);
                }, 360);
            }
            return updated;
        });
    }, []);

    // Realtime: suscripción a inserts y deletes en histories
    useEffect(() => {
        if (!user || !user.id) return; // Solo si autenticado

        const channel = supabase.channel('histories-realtime')
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'histories'
            }, (payload) => {
                const newRow = payload.new;
                if (!newRow) return;
                // Ignorar si ya expiró
                const created = new Date(newRow.created_at).getTime();
                if (Date.now() - created > 24 * 60 * 60 * 1000) return;

                // Verificar que la conversación con este user_id esté aceptada antes de mostrar la historia.
                // Estrategia: usamos fetchUserConversations almacenado? Para evitar otra carga pesada haremos una verificación ligera asincrónica.
                // Si la historia es del propio usuario, siempre se permite.
                const ownerId = newRow.user_id;
                if (ownerId !== user.id) {
                    (async () => {
                        try {
                            const convs = await fetchUserConversations(user.id);
                            const accepted = convs.some(c => c.otherUserId === ownerId && (c.acepted === true || c.created_by === user.id));
                            if (!accepted) return; // no mostrar historia si no hay conversación aceptada
                            // Proceder a insertar localmente (duplicamos la lógica previa)
                            setStories(prev => {
                                const histObj = { ...newRow };
                                const groupIndex = prev.findIndex(g => g.isMe ? newRow.user_id === user.id && g.id.includes(user.id) : g.id.endsWith(newRow.user_id));
                                let updatedGroups = [...prev];
                                if (groupIndex >= 0) {
                                    const grp = updatedGroups[groupIndex];
                                    const newUserStories = [...(grp.userStories || []), histObj].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                                    const latest = newUserStories[newUserStories.length - 1];
                                    const updatedGroup = { ...grp, userStories: newUserStories, time: formatStoryTime(latest.created_at) };
                                    updatedGroups[groupIndex] = updatedGroup;
                                } else {
                                    const cached = profilesCacheRef.current.get(newRow.user_id);
                                    const baseGroup = {
                                        id: `u-${newRow.user_id}`,
                                        name: (cached?.username || newRow.user_id),
                                        time: formatStoryTime(newRow.created_at),
                                        image: (cached?.avatar_url),
                                        userStories: [histObj],
                                        isMe: false
                                    };
                                    updatedGroups = [baseGroup, ...updatedGroups];
                                    if (!cached) {
                                        (async () => {
                                            try {
                                                const { data: prof, error: profErr } = await supabase
                                                    .from('profiles')
                                                    .select('username, avatar_url')
                                                    .eq('id', newRow.user_id)
                                                    .single();
                                                if (profErr) return;
                                                profilesCacheRef.current.set(newRow.user_id, { username: prof.username || newRow.user_id, avatar_url: prof.avatar_url });
                                                setStories(curr => curr.map(g => {
                                                    if (g.id === baseGroup.id) {
                                                        return {
                                                            ...g,
                                                            name: (prof.username || newRow.user_id),
                                                            image: (prof.avatar_url || g.image)
                                                        };
                                                    }
                                                    return g;
                                                }));
                                            } catch {}
                                        })();
                                    }
                                }
                                scheduleExpirations([{ userStories: [histObj] }]);
                                return updatedGroups;
                            });
                        } catch (e) {
                            // Silencioso: si falla el fetch, no mostramos la historia por seguridad
                        }
                    })();
                    return; // salir hasta que verificación async la añada (si procede)
                }

                setStories(prev => {
                    // Construir objeto historia
                    const histObj = { ...newRow };
                    // Encontrar grupo
                    const groupIndex = prev.findIndex(g => g.isMe ? newRow.user_id === user.id && g.id.includes(user.id) : g.id.endsWith(newRow.user_id));
                    let updatedGroups = [...prev];
                    if (groupIndex >= 0) {
                        const grp = updatedGroups[groupIndex];
                        // Insertar manteniendo orden ascendente: push al final y luego ordenar por created_at
                        const newUserStories = [...(grp.userStories || []), histObj].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                        const latest = newUserStories[newUserStories.length - 1];
                        const updatedGroup = { ...grp, userStories: newUserStories, time: formatStoryTime(latest.created_at) };
                        updatedGroups[groupIndex] = updatedGroup;
                        // Mantener posición actual (ya no movemos al frente para respetar orden de contactos)
                    } else {
                        // Crear nuevo grupo (contacto nuevo o mi primer historia)
                        const isMe = newRow.user_id === user.id;
                        const cached = profilesCacheRef.current.get(newRow.user_id);
                        const baseGroup = {
                            id: isMe ? `me-${user.id}` : `u-${newRow.user_id}`,
                            name: isMe ? 'Mi Estado' : (cached?.username || newRow.user_id),
                            time: formatStoryTime(newRow.created_at),
                            image: isMe ? (cached?.avatar_url || user?.avatar_url) : (cached?.avatar_url),
                            userStories: [histObj],
                            isMe
                        };
                        updatedGroups = [baseGroup, ...updatedGroups];
                        // Si no hay cache, disparar fetch de perfil asincrónico
                        if (!cached) {
                            (async () => {
                                try {
                                    const { data: prof, error: profErr } = await supabase
                                        .from('profiles')
                                        .select('username, avatar_url')
                                        .eq('id', newRow.user_id)
                                        .single();
                                    if (profErr) return;
                                    profilesCacheRef.current.set(newRow.user_id, { username: prof.username || newRow.user_id, avatar_url: prof.avatar_url });
                                    setStories(curr => curr.map(g => {
                                        if (g.id === baseGroup.id) {
                                            return {
                                                ...g,
                                                name: isMe ? 'Mi Estado' : (prof.username || newRow.user_id),
                                                image: isMe ? (prof.avatar_url || g.image) : (prof.avatar_url || g.image)
                                            };
                                        }
                                        return g;
                                    }));
                                } catch {}
                            })();
                        }
                    }
                    // Programar expiración para esta nueva historia
                    scheduleExpirations([{ userStories: [histObj] }]);
                    return updatedGroups;
                });
            })
            .on('postgres_changes', {
                event: 'DELETE',
                schema: 'public',
                table: 'histories'
            }, (payload) => {
                const oldRow = payload.old;
                if (!oldRow || !oldRow.id) return;
                // Limpiar timeout si estaba programado
                const to = expirationTimeoutsRef.current.get(oldRow.id);
                if (to) {
                    clearTimeout(to);
                    expirationTimeoutsRef.current.delete(oldRow.id);
                }
                softRemoveHistoryById(oldRow.id);
            });

        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                // console.log('Suscrito a inserts de histories');
            }
        });

        return () => {
            try { supabase.removeChannel(channel); } catch {}
        };
    }, [user, scheduleExpirations]);

    // Cleanup de timeouts al desmontar
    useEffect(() => {
        return () => {
            expirationTimeoutsRef.current.forEach(to => clearTimeout(to));
            expirationTimeoutsRef.current.clear();
        };
    }, []);

    const closeViewer = () => {
        setViewerOpen(false);
    };

    const handleOpenChoice = () => setChoiceOpen(true);
    const handleCloseChoice = () => setChoiceOpen(false);
    const handleChoiceSelect = (type) => {
        setChoiceOpen(false);
        if (type === 'text') {
            setTextModalOpen(true);
            return;
        }
        if (type === 'media') setMediaPickerOpen(true);
    };

    // API pública para el padre (AguacateChat)
    useImperativeHandle(ref, () => ({
        openUploadChoice: () => handleOpenChoice(),
        openTextStory: () => { setTextModalOpen(true); },
        openMediaStory: () => { setMediaPickerOpen(true); }
    }), []);

    // Cerrar con Escape cuando el popover esté abierto
    useEffect(() => {
        if (!choiceOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') setChoiceOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [choiceOpen]);

    const handleMediaChange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            if (isImage) {
                setEditorFile(file); // abrir editor
            } else if (isVideo) {
                setVideoFile(file);
                setVideoModalOpen(true);
            } else {
                alert('Formato no soportado');
            }
        }
        e.target.value = '';
    };

    const handleSaveVideo = async (file, captionText) => {
        const tId = toast.loading('Subiendo video...');
        try {
            const { publicUrl } = await uploadVideoToBucket({ file, userId: user?.id, bucket: 'histories' });
            // Insertar en tabla 'histories'
            const rawCaptionVideo = (captionText || '').trim();
            const caption = rawCaptionVideo ? rawCaptionVideo.slice(0,500) : null;
            const { error: insErr } = await supabase
                .from('histories')
                .insert({
                    content_url: publicUrl,
                    content_type: 'video',
                    caption,
                    user_id: user.id,
                });
            if (insErr) throw new Error(`Error al guardar en la base de datos: ${insErr.message || insErr}`);
            toast.success('Video subido como historia ✅');
        } catch (err) {
            console.error('Error subiendo video', err);
            const reason = err?.message || String(err);
            toast.error(`No se pudo subir el video: ${reason}`);
        } finally {
            toast.dismiss(tId);
        }
    };

    const handleSubmitTextStory = async (payload) => {
        // payload: { type: 'text', text, bg, color }
        if (!user || !user.id) {
            toast.error('Debes iniciar sesión para publicar una historia');
            return;
        }
        const { text, bg, color } = payload || {};
        const rawCaptionText = (text || '').trim();
        const caption = rawCaptionText.slice(0,500);
        if (!caption) {
            toast.error('El texto está vacío');
            return;
        }
        const tId = toast.loading('Publicando historia de texto...');
        try {
            // Guardar directamente en tabla histories.
            // Campos esperados (según otros inserts): content_url, content_type, caption, user_id
            // Nuevos campos solicitados: bg_color, font_color
            const row = {
                content_url: null, // no hay archivo
                content_type: 'text',
                caption, // el texto del usuario
                user_id: user.id,
                bg_color: bg, // puede ser un color plano o un string gradiente
                font_color: color,
            };
            const { error: insErr } = await supabase.from('histories').insert(row);
            if (insErr) throw new Error(insErr.message || 'Error al insertar la historia de texto');
            toast.success('Historia de texto publicada ✅');
            setTextModalOpen(false);
        } catch (e) {
            console.error('Error insertando historia de texto', e);
            toast.error(e?.message || 'No se pudo publicar');
        } finally {
            toast.dismiss(tId);
        }
    };

    // Soporte para recientes de historias (local a StoriesView)
    const [storiesRecentMedia, setStoriesRecentMedia] = useState([]);
    const addRecentMedia = (items) => {
        setStoriesRecentMedia((prev) => {
            const next = [...items, ...prev];
            // Limitar a 8 elementos locales
            return next.slice(0, 8);
        });
    };
    const handleSelectRecentMedia = (m) => {
        if (!m) return;
        if (m.type === 'image') {
            if (m.file instanceof File) {
                setEditorFile(m.file);
            } else if (m.url) {
                fetch(m.url).then(r => r.blob()).then(blob => {
                    const ext = blob.type.includes('png') ? 'png' : 'jpg';
                    const name = m.name || `story-${Date.now()}.${ext}`;
                    const file = new File([blob], name, { type: blob.type || 'image/jpeg' });
                    setEditorFile(file);
                }).catch(() => alert('No se pudo abrir la imagen seleccionada'));
            }
            setMediaPickerOpen(false);
        } else if (m.type === 'video') {
            // Abrir modal de vista previa de video
            if (m.file instanceof File) {
                setVideoFile(m.file);
            } else if (m.url) {
                // reconstruir un File desde el blob URL para mantener misma ruta de subida
                fetch(m.url).then(r => r.blob()).then(blob => {
                    const ext = (blob.type.split('/')[1]) || 'mp4';
                    const name = m.name || `story-${Date.now()}.${ext}`;
                    const file = new File([blob], name, { type: blob.type || 'video/mp4' });
                    setVideoFile(file);
                }).catch(() => alert('No se pudo abrir el video seleccionado'));
            }
            setVideoModalOpen(true);
            setMediaPickerOpen(false);
        }
    };

    // Derivar listas: no vistos y vistos
    // Determinar si un grupo de historias (un usuario) fue visto: si TODAS las historias incluyen al user.id en views
    const computeSeen = (storyGroup) => {
        if (!user || !user.id) return false;
        if (!Array.isArray(storyGroup.userStories)) return false;
        return storyGroup.userStories.every(h => {
            if (locallyViewed.has(h.id)) return true; // forzado local
            const arr = Array.isArray(h.views) ? h.views : [];
            return arr.includes(user.id);
        });
    };
    const unseenStories = stories.filter(s => !computeSeen(s));
    const seenStories = stories.filter(s => computeSeen(s));

    const handleStoryViewed = (storyId) => {
        setLocallyViewed(prev => {
            if (prev.has(storyId)) return prev;
            const next = new Set(prev);
            next.add(storyId);
            return next;
        });
    };

    return (
        <div className="flex-1 overflow-y-auto p-2">
            <div className="px-1 pt-1 pb-2 theme-border border-b">
                <h1 className="text-xl md:text-2xl font-bold theme-text-primary">Historias</h1>
            </div>
            <div className="mt-2 md:mt-3 px-1 pt-2 pb-2">
                <h3 className="text-sm md:text-base font-semibold theme-text-secondary uppercase tracking-wider">RECIENTES</h3>
            </div>
            
            {loadingStoriesList ? (
                <div className={`transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
                    <StoriesSkeleton />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-x-2 gap-y-3 p-1">
                    {/* Cuadro para añadir mi estado (siempre disponible) */}
                    <UploadStoryCard onOpenChoice={handleOpenChoice} choiceOpen={choiceOpen} onSelectChoice={handleChoiceSelect} />

                    {/* Si el usuario tiene su propia historia (isMe) la mostramos aquí; en caso contrario no mostramos el recuadro personal */}
                    {unseenStories.map((story, idx) => (
                        <StoryItem
                            key={story.id}
                            {...story}
                            index={idx + 1} // +1 porque el 0 lo ocupa la tarjeta de subir
                            exiting={exitingGroupsRef.current.has(story.id)}
                            onClick={() => openViewerById(story.id)}
                        />
                    ))}
                </div>
            )}

            {/* Sección de historias ya vistas */}
            {seenStories.length > 0 && (
                <>
                    <div className="mt-4 md:mt-6 px-1 pt-2 pb-2">
                        <h3 className="text-sm md:text-base font-semibold theme-text-secondary uppercase tracking-wider">VISTOS</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 p-1">
                        {seenStories.map((story, idx) => (
                            <StoryItem
                                key={story.id}
                                {...story}
                                seen
                                index={idx}
                                exiting={exitingGroupsRef.current.has(story.id)}
                                onClick={() => openViewerById(story.id)}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Renderizado del modal visor */}
            {viewerOpen && (
                <StoryViewerModal
                    stories={stories}
                    startIndex={selectedStoryIndex}
                    initialInnerIndex={initialInnerIndex}
                    onClose={closeViewer}
                    onViewedStory={handleStoryViewed}
                    onDeleteStory={async ({ storyId, userId, currentUserIndex, currentStoryInUser }) => {
                        if (!storyId || !userId) return;
                        // Optimista: eliminar localmente primero
                        softRemoveHistoryById(storyId);
                        try {
                            const { error } = await supabase
                                .from('histories')
                                .delete()
                                .eq('id', storyId)
                                .eq('user_id', userId);
                            if (error) {
                                console.error('Error eliminando historia', error);
                            }
                        } catch (e) {
                            console.error('Excepción eliminando historia', e);
                        }
                    }}
                />
            )}

            {/* Cerrar popover al hacer clic fuera */}
            {choiceOpen && (
                <div className="fixed inset-0 z-40" onClick={handleCloseChoice} />
            )}

            {/* Modal estilo chat para elegir multimedia para historias */}
            <UploadMediaStoriesModal
                open={mediaPickerOpen}
                onClose={() => setMediaPickerOpen(false)}
                recentMedia={storiesRecentMedia}
                onAddRecentMedia={addRecentMedia}
                onSelectMedia={handleSelectRecentMedia}
            />

            {/* Modal para escribir historia de texto */}
            <UploadTextStoryModal
                open={textModalOpen}
                onClose={() => setTextModalOpen(false)}
                onSubmit={handleSubmitTextStory}
            />

            {/* Input oculto para seleccionar imagen o video */}
            <input
                ref={mediaInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleMediaChange}
            />

            {/* Modal de edición de imagen para historias */}
            {editorFile && (
                <StoryImageEditorModal
                    file={editorFile}
                    onClose={() => setEditorFile(null)}
                    // onSave ahora recibe (file, caption)
                    onSave={async (finalFile, captionText) => {
                        if (uploading) return;
                        const tId = toast.loading('Subiendo historia...');
                        setUploading(true);
                        try {
                            // Validación de configuración básica
                            if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
                                throw new Error('Supabase no está configurado (faltan VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY)');
                            }
                            const BUCKET = 'histories';

                            // 0) Obtener usuario autenticado
                            const { data: userData, error: userErr } = await supabase.auth.getUser();
                            if (userErr) throw new Error(`No se pudo obtener el usuario: ${userErr.message}`);
                            const user = userData?.user;
                            if (!user) throw new Error('Debes iniciar sesión para publicar historias');

                            // 1) Comprimir
                            let compressed;
                            try {
                                compressed = await compressImage(finalFile, { maxSize: 1440, quality: 0.82 });
                            } catch (e) {
                                throw new Error(`Error al comprimir la imagen: ${e?.message || e}`);
                            }

                            // 2) Subir al bucket 'histories'
                            const ext = (compressed.type.includes('png') ? 'png' : 'jpg');
                            const fileName = `story-${Date.now()}.${ext}`;
                            // Guardar bajo carpeta del usuario
                            const filePath = `${user.id}/${fileName}`;
                            const { data: up, error: upErr } = await supabase.storage
                                .from(BUCKET)
                                .upload(filePath, compressed, { upsert: false, contentType: compressed.type });
                            if (upErr) throw new Error(`Error al subir a Storage: ${upErr.message || upErr}`);

                            // 3) Obtener URL pública
                            const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(up.path);
                            const publicUrl = pub?.publicUrl;
                            if (!publicUrl) throw new Error('No se pudo obtener URL pública del archivo subido');

                            // 4) Insertar en tabla 'histories'
                            const rawCaptionImg = (captionText || '').trim();
                            const caption = rawCaptionImg ? rawCaptionImg.slice(0,500) : null;
                            const { error: insErr } = await supabase
                                .from('histories')
                                .insert({
                                    content_url: publicUrl,
                                    content_type: 'image',
                                    caption,
                                    user_id: user.id,
                                });
                            if (insErr) throw new Error(`Error al guardar en la base de datos: ${insErr.message || insErr}`);

                            toast.success('Historia publicada ✅');
                        } catch (err) {
                            console.error('Error publicando historia', err);
                            const reason = err?.message || String(err);
                            toast.error(`No se pudo publicar la historia: ${reason}`);
                        } finally {
                            toast.dismiss(tId);
                            setUploading(false);
                            setEditorFile(null);
                        }
                    }}
                />
            )}

            {/* Modal de vista previa de video */}
            {videoModalOpen && (
                <StoryVideoPreviewModal
                    file={videoFile}
                    onClose={() => {
                        setVideoModalOpen(false);
                        setVideoFile(null);
                    }}
                    // handleSaveVideo ahora debe recibir (file, caption)
                    onSave={(file, captionText) => handleSaveVideo(file, captionText)}
                />
            )}
        </div>
    );
});

export default StoriesView;