import React, { useState, useEffect } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

const StoryViewerModal = ({ stories, startIndex, onClose }) => {
    const [currentUserIndex, setCurrentUserIndex] = useState(startIndex);
    const [currentStoryInUser, setCurrentStoryInUser] = useState(0);

    // Efecto para cerrar con la tecla 'Escape'
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const activeUser = stories && stories.length > 0 ? stories[currentUserIndex] : null;
    const activeStoryUrl = activeUser && activeUser.userStories && activeUser.userStories.length > 0
        ? activeUser.userStories[currentStoryInUser]
        : null;

    const goToNextUser = () => {
        setCurrentUserIndex((prevIndex) => (prevIndex + 1) % stories.length);
        setCurrentStoryInUser(0);
    };

    const goToPrevUser = () => {
        setCurrentUserIndex((prevIndex) => (prevIndex - 1 + stories.length) % stories.length);
        setCurrentStoryInUser(0);
    };
    
    // --- Novedad: Lógica para navegar historias DEL MISMO USUARIO ---
    const goToNextStoryInUser = () => {
        // Si hay más historias de este usuario, muéstralas
        if (currentStoryInUser < activeUser.userStories.length - 1) {
            setCurrentStoryInUser(currentStoryInUser + 1);
        } else {
            // Si es la última historia de este usuario, pasa al siguiente usuario
            goToNextUser();
        }
    };

    const goToPrevStoryInUser = () => {
        if (currentStoryInUser > 0) {
            setCurrentStoryInUser(currentStoryInUser - 1);
        } else {
            goToPrevUser();
        }
    };


    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center animate-fade-in">
            {/* Contenedor principal */}
            <div className="relative w-full h-full md:w-auto md:h-auto max-w-md max-h-screen flex items-center justify-center">

                {/* Imagen de la historia */}
                {activeStoryUrl ? (
                    <div className="relative">
                        <img 
                            src={activeStoryUrl} 
                            alt={`Historia de ${activeUser?.name || 'usuario'}`} 
                            className="max-h-[95vh] w-auto h-auto object-contain rounded-lg"
                        />

                        {/* Foto de perfil superpuesta sobre la imagen (esquina superior izquierda) */}
                        {activeUser?.image && (
                            <div className="absolute left-3 top-3 w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg">
                                <img src={activeUser.image} alt={activeUser.name} className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-6 text-center text-white">No hay historia disponible</div>
                )}

                {/* Encabezado con información y botón de cerrar */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <img src={activeUser.image} alt={activeUser.name} className="w-10 h-10 rounded-full object-cover"/>
                            <div>
                                <h4 className="font-bold text-white">{activeUser.name}</h4>
                                <p className="text-xs text-gray-300">{activeUser.time}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-white bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Flecha Izquierda */}
                <button 
                    onClick={goToPrevStoryInUser} 
                    className="absolute left-2 md:-left-12 top-1/2 -translate-y-1/2 bg-white/30 p-2 rounded-full hover:bg-white/50 transition-colors"
                >
                    <ChevronLeftIcon className="w-7 h-7 text-white" />
                </button>

                {/* Flecha Derecha */}
                <button 
                    onClick={goToNextStoryInUser}
                    className="absolute right-2 md:-right-12 top-1/2 -translate-y-1/2 bg-white/30 p-2 rounded-full hover:bg-white/50 transition-colors"
                >
                    <ChevronRightIcon className="w-7 h-7 text-white" />
                </button>
            </div>
            
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default StoryViewerModal;