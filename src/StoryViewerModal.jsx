import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

const StoryViewerModal = ({ stories, startIndex, onClose }) => {
    const [currentUserIndex, setCurrentUserIndex] = useState(startIndex);
    const [currentStoryInUser, setCurrentStoryInUser] = useState(0);
    const [progress, setProgress] = useState(0); // 0..1 para historia actual
    const storyDuration = 5000; // ms por historia (imagen / texto). Para video luego variará.
    const rafRef = useRef(null);
    const startTimeRef = useRef(null);

    const safeClose = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        onClose();
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

    const activeUser = stories && stories.length > 0 ? stories[currentUserIndex] : null;
    const activeStoryUrl = activeUser && activeUser.userStories && activeUser.userStories.length > 0
        ? activeUser.userStories[currentStoryInUser]
        : null;

    const resetProgress = () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        startTimeRef.current = null;
        // Forzar a 0 sin animación: usamos un requestAnimationFrame para garantizar re-render inmediato
        setProgress(0);
    };

    const goToNextUser = () => {
        // Si es el último usuario -> cerrar
        if (currentUserIndex >= stories.length - 1) {
            safeClose();
            return;
        }
        setCurrentUserIndex((prevIndex) => prevIndex + 1);
        setCurrentStoryInUser(0);
        resetProgress();
    };

    const goToPrevUser = () => {
        if (currentUserIndex <= 0) return; // No ir antes del primero
        setCurrentUserIndex((prevIndex) => prevIndex - 1);
        setCurrentStoryInUser(0);
        resetProgress();
    };
    
    // --- Novedad: Lógica para navegar historias DEL MISMO USUARIO ---
    const goToNextStoryInUser = () => {
        if (!activeUser) return;
        if (currentStoryInUser < activeUser.userStories.length - 1) {
            setCurrentStoryInUser((prev) => prev + 1);
            resetProgress();
        } else {
            // última historia de este usuario
            // si además es el último usuario -> cerrar
            if (currentUserIndex >= stories.length - 1) {
                safeClose();
            } else {
                goToNextUser();
            }
        }
    };

    const goToPrevStoryInUser = () => {
        if (!activeUser) return;
        if (currentStoryInUser > 0) {
            setCurrentStoryInUser((prev) => prev - 1);
            resetProgress();
        } else {
            goToPrevUser();
        }
    };

    // Animación de progreso por historia (solo para imágenes/texto por ahora)
    useEffect(() => {
        if (!activeUser) return;
        // Reiniciar para nueva historia
        resetProgress();

        const tick = (timestamp) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const elapsed = timestamp - startTimeRef.current;
            const ratio = Math.min(1, elapsed / storyDuration);
            setProgress(ratio);
            if (ratio < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                // Auto-avance al completar
                goToNextStoryInUser();
            }
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStoryInUser, currentUserIndex]);


    return (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center animate-fade-in overflow-hidden">
            {/* Fondo blur dinámico */}
            {activeStoryUrl && (
                <div className="absolute inset-0 -z-10">
                    <img
                        src={activeStoryUrl}
                        alt="fondo historia"
                        className="w-full h-full object-cover scale-110 blur-2xl opacity-40"
                        aria-hidden="true"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
                </div>
            )}
            {/* Contenedor principal - centrado */}
            <div className="relative w-full h-full flex items-center justify-center">
                {/* Frame vertical 9:16 */}
                <div className="relative story-vertical-frame bg-black/60 backdrop-blur-md rounded-xl overflow-hidden flex items-center justify-center shadow-[0_0_25px_-5px_rgba(0,0,0,0.7)] border border-white/10">
                    {/* Imagen de la historia */}
                    {activeStoryUrl ? (
                        <img
                            src={activeStoryUrl}
                            alt={`Historia de ${activeUser?.name || 'usuario'}`}
                            className="max-w-full max-h-full object-contain select-none"
                            draggable={false}
                        />
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
                                    <p className="text-[10px] text-gray-300 leading-tight">{activeUser?.time}</p>
                                </div>
                            </div>
                            <button onClick={safeClose} className="text-white bg-white/20 rounded-full p-2 hover:bg-white/30 transition-colors shrink-0">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Flecha Izquierda */}
                    <button
                        onClick={goToPrevStoryInUser}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                    >
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>

                    {/* Flecha Derecha */}
                    <button
                        onClick={goToNextStoryInUser}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                    >
                        <ChevronRightIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
                .story-vertical-frame {
                    aspect-ratio: 9 / 16;
                    width: min(100vw, 430px);
                    height: min(100vh, calc((100vw) * 16 / 9));
                    max-height: 95vh;
                }
                @supports not (aspect-ratio: 9 / 16) {
                    .story-vertical-frame { width: 100%; max-width: 430px; }
                }
                @media (max-width: 480px) {
                    .story-vertical-frame { width: 100vw; height: 100vh; border-radius: 0; }
                }
            `}</style>
        </div>
    );
};

export default StoryViewerModal;