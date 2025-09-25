import React, { useState, useRef } from 'react';
import StoryViewerModal from './StoryViewerModal'; 
// Novedad: Se añade la importación del icono que faltaba
import { ArrowUpTrayIcon } from '@heroicons/react/24/solid'; 

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
const UploadStoryCard = ({ onFileSelect }) => {
    const fileInputRef = useRef(null);

    const handleCardClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            onFileSelect(file);
            console.log("Archivo seleccionado:", file);
            alert(`Has seleccionado la imagen: ${file.name}`);
        }
    };

    return (
        <div 
            className="flex flex-col gap-1 cursor-pointer group"
            onClick={handleCardClick}
        >
            <div className="aspect-square w-full rounded-md overflow-hidden bg-emerald-500/10 border-2 border-dashed border-emerald-500/50 flex flex-col items-center justify-center text-emerald-500 group-hover:bg-emerald-500/20 transition-colors">
                <ArrowUpTrayIcon className="w-6 h-6" />
                <span className="mt-1 text-xs font-semibold text-center px-1">Subir historia</span>
            </div>
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/jpeg, image/png"
                onChange={handleFileChange}
            />
        </div>
    );
};


const StoriesView = () => {
    // Novedad: Se ha descomentado la línea para declarar el estado `viewerOpen`
    const [viewerOpen, setViewerOpen] = useState(false);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
    const [viewedStoryIds, setViewedStoryIds] = useState(new Set());

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

    const handleFileSelect = (file) => {
        // Aquí puedes manejar la lógica de subida del archivo
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
                <UploadStoryCard onFileSelect={handleFileSelect} />

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
        </div>
    );
};

export default StoriesView;