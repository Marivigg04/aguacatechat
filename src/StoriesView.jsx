import React, { useState, useRef, useEffect } from 'react';
import StoryViewerModal from './StoryViewerModal'; 
// Novedad: Se añade la importación del icono que faltaba
import { ArrowUpTrayIcon } from '@heroicons/react/24/solid'; 
import { PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import UploadTextStoryModal from './UploadTextStoryModal';
import UploadMediaStoriesModal from './UploadMediaStoriesModal';

// Novedad: Se añade el array de "stories" que faltaba
const stories = [
    { id: 1, name: 'Sorianny Jumi', time: 'Hoy a la(s) 9:58 p.m.', image: 'https://i.pravatar.cc/150?img=27', userStories: ['https://i.pravatar.cc/400?img=27', 'https://i.pravatar.cc/400?img=26'] },
    { id: 2, name: 'José David', time: 'Hoy a la(s) 9:38 p.m.', image: 'https://i.pravatar.cc/150?img=28', userStories: ['https://i.pravatar.cc/400?img=28'] },
    { id: 3, name: 'Francia Alejandro', time: 'Hoy a la(s) 9:57 p.m.', image: 'https://i.pravatar.cc/150?img=31', userStories: ['https://i.pravatar.cc/400?img=31'] },
    { id: 4, name: 'Sorianny Jumi', time: 'Hoy a la(s) 9:58 p.m.', image: 'https://i.pravatar.cc/150?img=32', userStories: ['https://i.pravatar.cc/400?img=32'] },
    { id: 5, name: 'Francia Alejandro', time: 'Hoy a la(s) 9:38 p.m.', image: 'https://i.pravatar.cc/150?img=33', userStories: ['https://i.pravatar.cc/400?img=33'] },
    { id: 6, name: 'Francia Alejandro', time: 'Hoy a la(s) 9:58 p.m.', image: 'https://i.pravatar.cc/150?img=34', userStories: ['https://i.pravatar.cc/400?img=34'] },
];

// Novedad: Se han eliminado los comentarios "//" para definir correctamente el componente
const StoryItem = ({ name, time, image, onClick }) => (
    <div 
        className="flex flex-col gap-1 cursor-pointer group"
        onClick={onClick}
    >
        <div className="aspect-square w-full rounded-md overflow-hidden transform group-hover:scale-105 transition-transform duration-300">
            <img src={image} alt={name} className="w-full h-full object-cover" />
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
    const [viewedStoryIds, setViewedStoryIds] = useState(new Set());
    const [choiceOpen, setChoiceOpen] = useState(false);
    const [textModalOpen, setTextModalOpen] = useState(false);
    const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
    const mediaInputRef = useRef(null);

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

    const handleMediaChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');
            // TODO: subir archivo
            console.log(isImage ? 'Imagen seleccionada:' : isVideo ? 'Video seleccionado:' : 'Archivo:', file);
        }
        e.target.value = '';
    };

    const handleSubmitTextStory = (payload) => {
        // TODO: subir historia de texto
        console.log('Texto para historia:', payload);
        setTextModalOpen(false);
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
        // TODO: subir al bucket de historias
        console.log('Seleccionado para historia:', m);
        setMediaPickerOpen(false);
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
            
            <div className="grid grid-cols-2 gap-x-2 gap-y-3 p-1">
                {/* Cuadro para añadir mi estado */}
                <UploadStoryCard onOpenChoice={handleOpenChoice} choiceOpen={choiceOpen} onSelectChoice={handleChoiceSelect} />

                {/* Mapeo de historias no vistas */}
                {unseenStories.map((story) => (
                    <StoryItem
                        key={story.id}
                        {...story}
                        onClick={() => openViewerById(story.id)}
                    />
                ))}
            </div>

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
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleMediaChange}
            />
        </div>
    );
};

export default StoriesView;