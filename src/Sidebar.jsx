import React, { useEffect, useState, useRef } from 'react';
import Lottie from 'react-lottie';
import wiredPhotoAnimation from './animations/wired-outline-54-photo-hover-pinch.json';
import filterAnimationData from './animations/Filter.json';
import paperPlaneAnimation from './animations/Paper Plane.json';
import storiesAnimationData from './animations/wired-outline-2626-logo-circle-instagram-hover-pinch.json';
import { useAuth } from './context/AuthContext.jsx';

// Carga simple del avatar desde la tabla profiles
async function fetchAvatarUrl(userId) {
    if (!userId) return null;
    try {
        const { selectFrom } = await import('./services/db');
        const data = await selectFrom('profiles', {
            columns: 'avatar_url',
            match: { id: userId },
            single: true,
        });
        return data?.avatar_url || null;
    } catch {
        return null;
    }
}

const Sidebar = ({
    showSideMenu,
    setShowSideMenu,
    setShowProfileModal,
    setShowConfigModal,
    setShowPersonalizationModal,
    lottieOptions,
    isProfilePaused,
    setProfilePaused,
    isProfileStopped,
    setProfileStopped,
    isConfigPaused,
    setConfigPaused,
    isConfigStopped,
    setConfigStopped,
    currentView,
    onViewChange
}) => {
    // Custom hook local (definido dentro para cumplir Reglas de Hooks)
    const useLottieAnimation = () => {
        const [isPaused, setPaused] = useState(true);
        const [isStopped, setStopped] = useState(true);
        const lottieRef = useRef(null);

        const onMouseEnter = () => {
            setStopped(false);
            setPaused(false);
        };

        const onMouseLeave = () => {
            setPaused(true);
        };

        const onComplete = () => {
            setPaused(true);
        };

        // react-lottie espera un array de listeners
        const eventListeners = [
            { eventName: 'complete', callback: onComplete }
        ];

        return { isPaused, isStopped, onMouseEnter, onMouseLeave, eventListeners, lottieRef };
    };

    // Instancias de animaciones (todas dentro del componente)
    const filterAnimation = useLottieAnimation();
    const chatsAnimation = useLottieAnimation();
    const storiesAnimation = useLottieAnimation();
    const profileAnimation = useLottieAnimation();
    const personalizationAnimation = useLottieAnimation();
    const configAnimation = useLottieAnimation();
    const menuProfileAnimation = useLottieAnimation();
    const menuPersonalizationAnimation = useLottieAnimation();
    const menuConfigAnimation = useLottieAnimation();

    const { user } = useAuth();
    const [isFilterPaused, setFilterPaused] = useState(true);
    const [isFilterStopped, setFilterStopped] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isPersonalizationPaused, setPersonalizationPaused] = useState(true);
    const [isPersonalizationStopped, setPersonalizationStopped] = useState(false);
    const [isChatsPaused, setChatsPaused] = useState(true);
    const [isChatsStopped, setChatsStopped] = useState(false);
    const [isStoriesPaused, setStoriesPaused] = useState(true);
    const [isStoriesStopped, setStoriesStopped] = useState(true);

    const handleLottieHover = (setPaused, setStopped) => {
        setStopped(true);
        setTimeout(() => {
            setStopped(false);
            setPaused(false);
        }, 10);
    };

    const handleLottieLeave = (setPaused) => {
        setPaused(true);
    };

    // Detectar modo oscuro desde el body (igual que AguacateChat.jsx)
    const [isDarkMode, setIsDarkMode] = useState(document.body.classList.contains('dark-mode'));
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.body.classList.contains('dark-mode'));
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    // Cargar avatar inicial y reaccionar a cambios
    useEffect(() => {
        let mounted = true;
        (async () => {
            const url = await fetchAvatarUrl(user?.id);
            if (mounted) setAvatarUrl(url);
        })();
        // Escuchar actualizaciones desde el modal de perfil
        const onAvatarUpdated = (e) => {
            const url = e?.detail || null;
            if (url) setAvatarUrl(url);
        };
        window.addEventListener('profile:avatar-updated', onAvatarUpdated);
        return () => {
            mounted = false;
            window.removeEventListener('profile:avatar-updated', onAvatarUpdated);
        };
    }, [user?.id]);

    // Manejar animaciones del menú
    const handleMenuToggle = () => {
        if (showSideMenu) {
            // Cerrar menú
            setIsAnimating(true);
            setTimeout(() => {
                setShowSideMenu(false);
                setIsAnimating(false);
            }, 300);
        } else {
            // Abrir menú
            setShowSideMenu(true);
        }
    };

    const handleCloseMenu = () => {
        setIsAnimating(true);
        setTimeout(() => {
            setShowSideMenu(false);
            setIsAnimating(false);
        }, 300);
    };

    return (
        <div className="relative z-40 w-16 h-full theme-bg-secondary theme-border border-r">
            {/* Icono animado de las tres rayas SIEMPRE visible arriba */}
            <div className="flex flex-col items-center pt-6">
                <button
                    className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-all duration-300 ease-out transform hover:scale-105 flex flex-col gap-1 items-center shadow-lg hover:shadow-xl"
                    title="Menú"
                    onClick={handleMenuToggle}
                    onMouseEnter={filterAnimation.onMouseEnter}
                    onMouseLeave={filterAnimation.onMouseLeave}
                >
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Lottie
                            options={{
                                loop: false,
                                autoplay: false,
                                animationData: filterAnimationData,
                                rendererSettings: {
                                    preserveAspectRatio: 'xMidYMid slice'
                                }
                            }}
                            isPaused={filterAnimation.isPaused}
                            isStopped={filterAnimation.isStopped}
                            eventListeners={filterAnimation.eventListeners}
                            height={32}
                            width={32}
                        />
                    </div>
                </button>
            </div>

            {/* Botones de Navegación: Chats e Historias */}
            <div className="flex flex-col items-center pt-4 gap-3">
                {/* Botón de Chats */}
                <button
                    className={`p-2 rounded-lg transition-all duration-300 ease-out transform hover:scale-105 flex flex-col items-center shadow-md hover:shadow-lg ${currentView === 'chats' ? 'theme-bg-accent' : 'theme-bg-chat'}`}
                    title="Chats"
                    onClick={() => onViewChange('chats')}
                    onMouseEnter={chatsAnimation.onMouseEnter}
                    onMouseLeave={chatsAnimation.onMouseLeave}
                >
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Lottie
                            options={{
                                loop: false,
                                autoplay: false,
                                animationData: paperPlaneAnimation,
                                rendererSettings: {
                                    preserveAspectRatio: 'xMidYMid slice'
                                }
                            }}
                            isPaused={chatsAnimation.isPaused}
                            isStopped={chatsAnimation.isStopped}
                            eventListeners={chatsAnimation.eventListeners}
                            height={32}
                            width={32}
                        />
                    </div>
                </button>

                {/* Botón de Historias */}
                <button
                    className={`p-2 rounded-lg transition-all duration-300 ease-out transform hover:scale-105 flex flex-col items-center shadow-md hover:shadow-lg ${currentView === 'stories' ? 'theme-bg-accent' : 'theme-bg-chat'}`}
                    title="Historias"
                    onClick={() => onViewChange('stories')}
                    onMouseEnter={storiesAnimation.onMouseEnter}
                    onMouseLeave={storiesAnimation.onMouseLeave}
                >
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Lottie
                            options={{
                                loop: false,
                                autoplay: false,
                                animationData: storiesAnimationData,
                                rendererSettings: {
                                    preserveAspectRatio: 'xMidYMid slice'
                                }
                            }}
                            isPaused={storiesAnimation.isPaused}
                            isStopped={storiesAnimation.isStopped}
                            eventListeners={storiesAnimation.eventListeners}
                            height={32}
                            width={32}
                        />
                    </div>
                </button>
            </div>

            {/* Iconos de Perfil, Personalización y Configuración en la parte inferior izquierda cuando la sidebar está cerrada */}
            {!showSideMenu && (
                <div className="absolute bottom-6 left-0 w-full flex flex-col items-center gap-3">
                    <button
                        className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-all duration-300 ease-out transform hover:scale-105 flex flex-col items-center shadow-md hover:shadow-lg"
                        title="Perfil"
                        onClick={() => setShowProfileModal(true)}
                        onMouseEnter={profileAnimation.onMouseEnter}
                        onMouseLeave={profileAnimation.onMouseLeave}
                    >
                        <div className="w-7 h-7 flex items-center justify-center">
                            {avatarUrl ? (
                                <div className="w-full h-full rounded-full overflow-hidden border border-white/10 transition-all duration-300">
                                    <img
                                        src={avatarUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover scale-125 transition-transform duration-300 hover:scale-150"
                                    />
                                </div>
                            ) : (
                                <Lottie options={lottieOptions.profile} isPaused={profileAnimation.isPaused} isStopped={profileAnimation.isStopped} eventListeners={profileAnimation.eventListeners} />
                            )}
                        </div>
                    </button>
                    {/* Botón Personalización visible también cuando la sidebar está cerrada */}
                    <button
                        className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-all duration-300 ease-out transform hover:scale-105 flex flex-col items-center shadow-md hover:shadow-lg"
                        title="Personalización"
                        onClick={() => setShowPersonalizationModal(true)}
                        onMouseEnter={personalizationAnimation.onMouseEnter}
                        onMouseLeave={personalizationAnimation.onMouseLeave}
                    >
                        <div className="w-7 h-7 flex items-center justify-center">
                            <Lottie
                                options={{
                                    loop: false,
                                    autoplay: false,
                                    animationData: wiredPhotoAnimation,
                                    rendererSettings: {
                                        preserveAspectRatio: 'xMidYMid slice'
                                    }
                                }}
                                isPaused={personalizationAnimation.isPaused}
                                isStopped={personalizationAnimation.isStopped}
                                eventListeners={personalizationAnimation.eventListeners}
                                height={32}
                                width={32}
                            />
                        </div>
                    </button>
                    <button
                        className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-all duration-300 ease-out transform hover:scale-105 flex flex-col items-center shadow-md hover:shadow-lg"
                        title="Configuración"
                        onClick={() => setShowConfigModal(true)}
                        onMouseEnter={configAnimation.onMouseEnter}
                        onMouseLeave={configAnimation.onMouseLeave}
                    >
                        <div className="w-7 h-7 flex items-center justify-center">
                            <Lottie options={lottieOptions.config} isPaused={configAnimation.isPaused} isStopped={configAnimation.isStopped} eventListeners={configAnimation.eventListeners} />
                        </div>
                    </button>
                </div>
            )}

            {/* Menú lateral expandido */}
            {showSideMenu && (
                <div
                    className="fixed inset-0 z-50"
                    onClick={handleCloseMenu}
                    style={{
                        background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(2px)',
                        animation: showSideMenu && !isAnimating ? 'fadeIn 0.3s ease-out' : 'fadeOut 0.3s ease-in'
                    }}
                >
                    <div
                        className={`
                            fixed top-0 left-0 h-full w-64
                            theme-bg-secondary theme-border border-r
                            flex flex-col pt-8
                            transition-all duration-300 ease-out transform
                            ${showSideMenu && !isAnimating
                                ? 'translate-x-0 opacity-100 scale-100'
                                : '-translate-x-full opacity-0 scale-95'
                            }
                        `}
                        style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Botón cerrar menú */}
                        <button
                            className={`
                                absolute top-3 right-3 p-2 rounded-full
                                transition-all duration-300 ease-out transform hover:scale-110 hover:rotate-90
                                theme-bg-chat
                            `}
                            onClick={handleCloseMenu}
                            title="Cerrar menú"
                        >
                            <span className="text-lg font-light transition-colors duration-300 theme-text-primary">✕</span>
                        </button>

                        {/* Contenido del menú con animación staggered */}
                        <div className="flex-1 px-4 pt-8">
                            <div
                                className="space-y-2 theme-text-secondary"
                                style={{
                                    animation: showSideMenu && !isAnimating ? 'slideInLeft 0.4s ease-out 0.1s both' : 'slideOutLeft 0.3s ease-in both'
                                }}
                            >
                                {/* Navegación principal dentro del menú expandido */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        className={`w-full text-left p-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg flex items-center gap-3 group theme-text-primary hover:theme-bg-chat ${currentView === 'chats' ? 'theme-bg-accent' : ''}`}
                                        onClick={() => { onViewChange('chats'); handleCloseMenu(); }}
                                        onMouseEnter={chatsAnimation.onMouseEnter}
                                        onMouseLeave={chatsAnimation.onMouseLeave}
                                    >
                                        <div className="w-8 h-8 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                            <Lottie
                                                options={{
                                                    loop: false,
                                                    autoplay: false,
                                                    animationData: paperPlaneAnimation,
                                                    rendererSettings: { preserveAspectRatio: 'xMidYMid slice' }
                                                }}
                                                isPaused={chatsAnimation.isPaused}
                                                isStopped={chatsAnimation.isStopped}
                                                eventListeners={chatsAnimation.eventListeners}
                                                height={32}
                                                width={32}
                                            />
                                        </div>
                                        <span className="font-medium transition-all duration-300 group-hover:translate-x-1">Chats</span>
                                    </button>

                                    <button
                                        className={`w-full text-left p-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg flex items-center gap-3 group theme-text-primary hover:theme-bg-chat ${currentView === 'stories' ? 'theme-bg-accent' : ''}`}
                                        onClick={() => { onViewChange('stories'); handleCloseMenu(); }}
                                        onMouseEnter={storiesAnimation.onMouseEnter}
                                        onMouseLeave={storiesAnimation.onMouseLeave}
                                    >
                                        <div className="w-8 h-8 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                            <Lottie
                                                options={{
                                                    loop: false,
                                                    autoplay: false,
                                                    animationData: storiesAnimationData,
                                                    rendererSettings: { preserveAspectRatio: 'xMidYMid slice' }
                                                }}
                                                isPaused={storiesAnimation.isPaused}
                                                isStopped={storiesAnimation.isStopped}
                                                eventListeners={storiesAnimation.eventListeners}
                                                height={32}
                                                width={32}
                                            />
                                        </div>
                                        <span className="font-medium transition-all duration-300 group-hover:translate-x-1">Historias</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Opciones Perfil, Personalización y Configuración en la parte inferior */}
                        <div
                            className="px-4 pb-6 space-y-2"
                            style={{
                                animation: showSideMenu && !isAnimating ? 'slideInLeft 0.4s ease-out 0.2s both' : 'slideOutLeft 0.3s ease-in both'
                            }}
                        >
                            <button
                                className={`
                                    w-full text-left p-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg flex items-center gap-3 group
                                    theme-text-primary hover:theme-bg-chat
                                `}
                                onClick={() => {
                                    setShowProfileModal(true);
                                    handleCloseMenu();
                                }}
                                onMouseEnter={menuProfileAnimation.onMouseEnter}
                                onMouseLeave={menuProfileAnimation.onMouseLeave}
                            >
                                <div className="w-8 h-8 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                                    {avatarUrl ? (
                                        <div className="w-full h-full rounded-full overflow-hidden border border-white/10 shadow-md">
                                            <img
                                                src={avatarUrl}
                                                alt="Avatar"
                                                className="w-full h-full object-cover scale-150 transition-transform duration-300 group-hover:scale-[1.7]"
                                            />
                                        </div>
                                    ) : (
                                        <Lottie options={lottieOptions.profile} isPaused={menuProfileAnimation.isPaused} isStopped={menuProfileAnimation.isStopped} eventListeners={menuProfileAnimation.eventListeners} />
                                    )}
                                </div>
                                <span className="font-medium transition-all duration-300 group-hover:translate-x-1 theme-text-primary">Perfil</span>
                            </button>
                            
                            {/* Botón Personalización */}
                            <button
                                className={`
                                    w-full text-left p-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg flex items-center gap-3 group
                                    theme-text-primary hover:theme-bg-chat
                                `}
                                onClick={() => {
                                    setShowPersonalizationModal(true);
                                    handleCloseMenu();
                                }}
                            >
                                <div className="w-8 h-8 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                                    onMouseEnter={menuPersonalizationAnimation.onMouseEnter}
                                    onMouseLeave={menuPersonalizationAnimation.onMouseLeave}
                                >
                                    <Lottie
                                        options={{
                                            loop: false,
                                            autoplay: false,
                                            animationData: wiredPhotoAnimation,
                                            rendererSettings: {
                                                preserveAspectRatio: 'xMidYMid slice'
                                            }
                                        }}
                                        isPaused={menuPersonalizationAnimation.isPaused}
                                        isStopped={menuPersonalizationAnimation.isStopped}
                                        eventListeners={menuPersonalizationAnimation.eventListeners}
                                        height={32}
                                        width={32}
                                    />
                                </div>
                                <span className="font-medium transition-all duration-300 group-hover:translate-x-1 theme-text-primary">Personalización</span>
                            </button>

                            <button
                                className={`
                                    w-full text-left p-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg flex items-center gap-3 group
                                    theme-text-primary hover:theme-bg-chat
                                `}
                                onClick={() => { 
                                    setShowConfigModal(true); 
                                    handleCloseMenu(); 
                                }}
                                onMouseLeave={() => setConfigPaused(true)}
                            >
                                <div className="w-8 h-8 transition-transform duration-300 group-hover:scale-110">
                                    <Lottie options={lottieOptions.config} isPaused={isConfigPaused} isStopped={isConfigStopped} />
                                </div>
                                <span className="font-medium transition-all duration-300 group-hover:translate-x-1 theme-text-primary">Configuración</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                
                @keyframes slideInLeft {
                    from { 
                        opacity: 0; 
                        transform: translateX(-30px);
                    }
                    to { 
                        opacity: 1; 
                        transform: translateX(0);
                    }
                }
                
                @keyframes slideOutLeft {
                    from { 
                        opacity: 1; 
                        transform: translateX(0);
                    }
                    to { 
                        opacity: 0; 
                        transform: translateX(-30px);
                    }
                }
            `}</style>
        </div>
    );
}

export default Sidebar;