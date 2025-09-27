import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import StoryViewerModal from './StoryViewerModal'; 
// Novedad: Se añade la importación del icono que faltaba
import { ArrowUpTrayIcon } from '@heroicons/react/24/solid'; 
import { PhotoIcon, DocumentTextIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import UploadTextStoryModal from './UploadTextStoryModal';
import UploadMediaStoriesModal from './UploadMediaStoriesModal';
import StoryVideoPreviewModal from './StoryVideoPreviewModal';
import StoryImageEditorModal from './StoryImageEditorModal';
import supabase from './services/supabaseClient';
import { compressImage } from './utils/compressImage';
import { useAuth } from './context/AuthContext.jsx';
import { fetchUserConversations, selectFrom, uploadVideoToBucket } from './services/db';
import StoriesSkeleton from './components/StoriesSkeleton.jsx';

// Fallback de ejemplo si no hay datos reales
const sampleStories = [
    { id: 's-1', name: 'Sorianny Jumi', time: 'Hoy a la(s) 9:58 p.m.', image: 'https://i.pravatar.cc/150?img=27', userStories: ['https://i.pravatar.cc/400?img=27', 'https://i.pravatar.cc/400?img=26'] },
    { id: 's-2', name: 'José David', time: 'Hoy a la(s) 9:38 p.m.', image: 'https://i.pravatar.cc/150?img=28', userStories: ['https://i.pravatar.cc/400?img=28'] },
    { id: 's-3', name: 'Francia Alejandro', time: 'Hoy a la(s) 9:57 p.m.', image: 'https://i.pravatar.cc/150?img=31', userStories: ['https://i.pravatar.cc/400?img=31'] },
];

// Novedad: Se han eliminado los comentarios "//" para definir correctamente el componente
const StoryItem = ({ name, time, image, onClick }) => (
    <div 
        className="flex flex-col gap-1 cursor-pointer group"
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
const UploadStoryCard = ({ onOpenChoice, choiceOpen, onSelectChoice }) => (
    <div 
        className="flex flex-col gap-1 cursor-pointer group relative"
        onClick={onOpenChoice}
    >
        <div className="aspect-square w-full rounded-md overflow-hidden bg-emerald-500/10 border-2 border-dashed border-emerald-500/50 flex flex-col items-center justify-center text-emerald-500 transition-all group-hover:bg-emerald-500/20 hover:ring-2 hover:ring-teal-400/50 hover:-translate-y-0.5 hover:shadow-lg">
            <ArrowUpTrayIcon className="w-6 h-6" />
            <span className="mt-1 text-xs font-semibold text-center px-1">Subir historia</span>
        </div>
        {choiceOpen && (
            <div 
                className="absolute z-50 left-0 top-full mt-2 w-60 rounded-2xl shadow-2xl theme-border border backdrop-blur-sm p-2 theme-bg-secondary transition transform origin-top-left"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Caret */}
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
            </div>
        )}
    </div>
);


const StoriesView = () => {
    // Novedad: Se ha descomentado la línea para declarar el estado `viewerOpen`
    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
    const { user } = useAuth();
    const [stories, setStories] = useState([]);
    const [loadingStoriesList, setLoadingStoriesList] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [viewedStoryIds, setViewedStoryIds] = useState(new Set());
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
            setViewerOpen(true);
            // Marcar como visto
            setViewedStoryIds(prev => {
                const next = new Set(prev);
                next.add(id);
                return next;
            });
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
                const otherProfiles = convs
                    .map(c => c.otherProfile)
                    .filter(Boolean);

                // 2) Para cada perfil (incluyendo el propio usuario) consultar tabla 'histories' con user_id
                // Hacemos una consulta batch: primero construir set de user ids
                const userIds = new Set([user.id]);
                for (const p of otherProfiles) userIds.add(p.id);
                const idsArr = Array.from(userIds);

                // 3) Preparar fetch del avatar del propio usuario en paralelo para reducir latencia
                let avatarPromise = null;
                if (user && user.id) {
                    avatarPromise = selectFrom('profiles', { columns: 'avatar_url', match: { id: user.id }, single: true }).catch(() => null);
                }

                // Traer historias de Supabase (filtrar últimas 24 horas)
                const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                const { data: rows, error } = await supabase
                    .from('histories')
                    .select('id, user_id, content_url, content_type, caption, created_at')
                    .in('user_id', idsArr)
                    .gt('created_at', cutoff)
                    .order('created_at', { ascending: false });
                if (error) throw error;

                // 4) Agrupar por usuario
                const byUser = new Map();
                for (const r of rows || []) {
                    const arr = byUser.get(r.user_id) || [];
                    arr.push(r);
                    byUser.set(r.user_id, arr);
                }

                // Helper para formatear la fecha según requerimiento
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
                        // Sino mostrar fecha local corta + hora
                        return `${d.toLocaleDateString()} a las ${timePart}`;
                    } catch (e) {
                        return '';
                    }
                };

                // 5) Construir lista final: primera entrada es 'Tu historia'
                const final = [];

                // Tu historia (si tiene historias) — añadimos solo si hay historias del propio usuario
                const myStories = byUser.get(user.id) || [];
                if (myStories.length > 0) {
                    // Usar resultado de la promesa del avatar que iniciamos en paralelo
                    let avatarFromProfile = null;
                    if (avatarPromise) {
                        const row = await avatarPromise;
                        avatarFromProfile = row?.avatar_url || null;
                    }

                    final.push({
                        id: `me-${user.id}`,
                        name: 'Mi Estado',
                        time: myStories[0] ? formatStoryTime(myStories[0].created_at) : 'No tienes historias',
                        image: avatarFromProfile || (user.raw && user.raw.user_metadata && user.raw.user_metadata.avatar_url) || user.avatar_url,
                        userStories: myStories.map(h => h.content_url),
                        isMe: true,
                    });
                }

                // Ahora los contactos en el mismo orden que convs
                for (const c of convs) {
                    const prof = c.otherProfile;
                    if (!prof) continue;
                    const userHist = byUser.get(prof.id) || [];
                    if (userHist.length === 0) continue; // omitimos si no tiene historias
                    final.push({
                        id: `u-${prof.id}`,
                        name: prof.username || prof.id,
                        time: userHist[0] ? formatStoryTime(userHist[0].created_at) : '',
                        image: prof.avatar_url || `https://i.pravatar.cc/150?u=${prof.id}`,
                        userStories: userHist.map(h => h.content_url),
                    });
                }

                if (final.length === 0) {
                    // Ninguna historia real: usar fallback samples
                    if (mounted) setStories(sampleStories);
                } else {
                    if (mounted) setStories(final);
                }
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

    const handleSaveVideo = async (file) => {
        const tId = toast.loading('Subiendo video...');
        try {
            const { publicUrl } = await uploadVideoToBucket({ file, userId: user?.id, bucket: 'histories' });
            // Insertar en tabla 'histories'
            const { error: insErr } = await supabase
                .from('histories')
                .insert({
                    content_url: publicUrl,
                    content_type: 'video',
                    caption: null,
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
        const caption = (text || '').trim();
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
    const unseenStories = stories.filter(s => !viewedStoryIds.has(s.id));
    const seenStories = stories.filter(s => viewedStoryIds.has(s.id));

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
                    {unseenStories.map((story) => (
                        <StoryItem
                            key={story.id}
                            {...story}
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
                        {seenStories.map((story) => (
                            <StoryItem
                                key={story.id}
                                {...story}
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
                    onClose={closeViewer}
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
                    onSave={async (finalFile) => {
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
                            const { error: insErr } = await supabase
                                .from('histories')
                                .insert({
                                    content_url: publicUrl,
                                    content_type: 'image',
                                    caption: null,
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
                    onSave={handleSaveVideo}
                />
            )}
        </div>
    );
};

export default StoriesView;