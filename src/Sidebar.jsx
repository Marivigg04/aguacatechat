import React from 'react';
import Lottie from 'react-lottie';
import wiredPhotoAnimation from './animations/wired-outline-54-photo-hover-pinch.json';
import filterAnimation from './animations/Filter.json';
import { useEffect, useState } from 'react';
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
    setConfigStopped
}) => {
    const { user } = useAuth();
    const [isFilterPaused, setFilterPaused] = useState(true);
    const [isFilterStopped, setFilterStopped] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isPersonalizationPaused, setPersonalizationPaused] = useState(true);
    const [isPersonalizationStopped, setPersonalizationStopped] = useState(false);

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
                    onMouseEnter={() => {
                        setFilterStopped(true);
                        setTimeout(() => {
                            setFilterStopped(false);
                            setFilterPaused(false);
                        }, 10);
                    }}
                    onMouseLeave={() => setFilterPaused(true)}
                >
                    <div className="w-8 h-8 flex items-center justify-center">
                        <Lottie
                            options={{
                                loop: true,
                                autoplay: true,
                                animationData: filterAnimation,
                                rendererSettings: {
                                    preserveAspectRatio: 'xMidYMid slice'
                                }
                            }}
                            isPaused={isFilterPaused}
                            isStopped={isFilterStopped}
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
                        onMouseEnter={() => {
                            setProfileStopped(true);
                            setTimeout(() => {
                                setProfileStopped(false);
                                setProfilePaused(false);
                            }, 10);
                        }}
                        onMouseLeave={() => setProfilePaused(true)}
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
                                <Lottie options={lottieOptions.profile} isPaused={isProfilePaused} isStopped={isProfileStopped} />
                            )}
                        </div>
                    </button>
                    {/* Botón Personalización visible también cuando la sidebar está cerrada */}
                    <button
                        className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-all duration-300 ease-out transform hover:scale-105 flex flex-col items-center shadow-md hover:shadow-lg"
                        title="Personalización"
                        onClick={() => setShowPersonalizationModal(true)}
                        onMouseEnter={() => {
                            setPersonalizationStopped(true);
                            setTimeout(() => {
                                setPersonalizationStopped(false);
                                setPersonalizationPaused(false);
                            }, 10);
                        }}
                        onMouseLeave={() => setPersonalizationPaused(true)}
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
                                isPaused={isPersonalizationPaused}
                                isStopped={isPersonalizationStopped}
                                height={32}
                                width={32}
                            />
                        </div>
                    </button>
                    <button
                        className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-all duration-300 ease-out transform hover:scale-105 flex flex-col items-center shadow-md hover:shadow-lg"
                        title="Configuración"
                        onClick={() => setShowConfigModal(true)}
                        onMouseEnter={() => {
                            setConfigStopped(true);
                            setTimeout(() => {
                                setConfigStopped(false);
                                setConfigPaused(false);
                            }, 10);
                        }}
                        onMouseLeave={() => setConfigPaused(true)}
                    >
                        <div className="w-7 h-7 flex items-center justify-center">
                            <Lottie options={lottieOptions.config} isPaused={isConfigPaused} isStopped={isConfigStopped} />
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
                        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col pt-8
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
                            className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-all duration-300 ease-out transform hover:scale-110 hover:rotate-90 text-gray-600 hover:text-gray-800"
                            onClick={handleCloseMenu}
                            title="Cerrar menú"
                        >
                            <span className="text-lg font-light">✕</span>
                        </button>

                        {/* Contenido del menú con animación staggered */}
                        <div className="flex-1 px-4 pt-8">
                            <div 
                                className="space-y-2"
                                style={{
                                    animation: showSideMenu && !isAnimating ? 'slideInLeft 0.4s ease-out 0.1s both' : 'slideOutLeft 0.3s ease-in both'
                                }}
                            >
                                {/* Aquí puedes agregar más elementos del menú */}
                                <div className="h-32 flex items-center justify-center text-gray-500 text-sm">
                                    {/* Espacio para contenido adicional del menú */}
                                </div>
                            </div>
                        </div>

                        {/* Opciones Perfil y Configuración en la parte inferior */}
                        <div 
                            className="px-4 pb-6 space-y-2"
                            style={{
                                animation: showSideMenu && !isAnimating ? 'slideInLeft 0.4s ease-out 0.2s both' : 'slideOutLeft 0.3s ease-in both'
                            }}
                        >
                            <button
                                className="w-full text-left p-4 hover:bg-gray-50 text-gray-800 rounded-xl transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg flex items-center gap-3 group"
                                onClick={() => {
                                    setShowProfileModal(true);
                                    handleCloseMenu();
                                }}
                                onMouseEnter={() => {
                                    setProfileStopped(true);
                                    setTimeout(() => {
                                        setProfileStopped(false);
                                        setProfilePaused(false);
                                    }, 10);
                                }}
                                onMouseLeave={() => setProfilePaused(true)}
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
                                        <Lottie options={lottieOptions.profile} isPaused={isProfilePaused} isStopped={isProfileStopped} />
                                    )}
                                </div>
                                <span className="font-medium transition-all duration-300 group-hover:translate-x-1">Perfil</span>
                            </button>
                            
                            {/* Nuevo botón Personalización */}
                            <button
                                className="w-full text-left p-4 hover:bg-gray-50 text-gray-800 rounded-xl transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg flex items-center gap-3 group"
                                onClick={() => {
                                    setShowPersonalizationModal(true);
                                    handleCloseMenu();
                                }}
                            >
                                <div className="w-8 h-8 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                                    onMouseEnter={() => {
                                        setPersonalizationStopped(true);
                                        setTimeout(() => {
                                            setPersonalizationStopped(false);
                                            setPersonalizationPaused(false);
                                        }, 10);
                                    }}
                                    onMouseLeave={() => setPersonalizationPaused(true)}
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
                                        isPaused={isPersonalizationPaused}
                                        isStopped={isPersonalizationStopped}
                                        height={32}
                                        width={32}
                                    />
                                </div>
                                <span className="font-medium transition-all duration-300 group-hover:translate-x-1">Personalización</span>
                            </button>

                            <button
                                className="w-full text-left p-4 hover:bg-gray-50 text-gray-800 rounded-xl transition-all duration-300 ease-out transform hover:scale-105 hover:shadow-lg flex items-center gap-3 group"
                                onClick={() => { 
                                    setShowConfigModal(true); 
                                    handleCloseMenu(); 
                                }}
                                onMouseEnter={() => {
                                    setConfigStopped(true);
                                    setTimeout(() => {
                                        setConfigStopped(false);
                                        setConfigPaused(false);
                                    }, 10);
                                }}
                                onMouseLeave={() => setConfigPaused(true)}
                            >
                                <div className="w-8 h-8 transition-transform duration-300 group-hover:scale-110">
                                    <Lottie options={lottieOptions.config} isPaused={isConfigPaused} isStopped={isConfigStopped} />
                                </div>
                                <span className="font-medium transition-all duration-300 group-hover:translate-x-1">Configuración</span>
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