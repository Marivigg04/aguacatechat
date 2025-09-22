import React from 'react';
import Lottie from 'react-lottie';
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

    return (
        <div className="relative z-40 w-16 h-full theme-bg-secondary theme-border border-r">
            {/* Icono animado de las tres rayas SIEMPRE visible arriba */}
            <div className="flex flex-col items-center pt-6">
                <button
                    className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity flex flex-col gap-1 items-center"
                    title="Menú"
                    onClick={() => setShowSideMenu(!showSideMenu)}
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
            {/* Iconos de Perfil y Configuración en la parte inferior izquierda cuando la sidebar está cerrada */}
            {!showSideMenu && (
                <div className="absolute bottom-6 left-0 w-full flex flex-col items-center gap-1">
                    <button
                        className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity flex flex-col items-center"
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
                                <div className="w-full h-full rounded-full overflow-hidden border border-white/10">
                                    <img
                                        src={avatarUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover scale-125"
                                    />
                                </div>
                            ) : (
                                <Lottie options={lottieOptions.profile} isPaused={isProfilePaused} isStopped={isProfileStopped} />
                            )}
                        </div>
                    </button>
                    <button
                        className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity flex flex-col items-center"
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
            <div
                className={`fixed top-0 left-0 h-full w-64 theme-bg-secondary theme-border border-r shadow-2xl z-50 flex flex-col pt-8 sidebar-slide ${showSideMenu ? 'sidebar-slide-in' : 'sidebar-slide-out'}`}
                style={{ pointerEvents: showSideMenu ? 'auto' : 'none' }}
            >
                {/* Botón cerrar menú */}
                <button
                    className="absolute top-2 right-2 p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity"
                    onClick={() => setShowSideMenu(false)}
                    title="Cerrar menú"
                >
                    ✕
                </button>
                {/* Opciones Perfil y Configuración en la parte inferior izquierda */}
                <div className="absolute bottom-6 left-0 w-full flex flex-col items-center gap-1">
                    <button
                        className="w-11/12 text-left p-4 hover:theme-bg-chat theme-text-primary rounded-lg transition-colors flex items-center gap-2"
                        onClick={() => {
                            setShowProfileModal(true);
                            setShowSideMenu(false);
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
                        <div className="w-6 h-6 flex items-center justify-center">
                            {avatarUrl ? (
                                <div className="w-full h-full rounded-full overflow-hidden border border-white/10">
                                    <img
                                        src={avatarUrl}
                                        alt="Avatar"
                                        className="w-full h-full object-cover scale-150"
                                    />
                                </div>
                            ) : (
                                <Lottie options={lottieOptions.profile} isPaused={isProfilePaused} isStopped={isProfileStopped} />
                            )}
                        </div>
                        <span>Perfil</span>
                    </button>
                    <button
                        className="w-11/12 text-left p-4 hover:theme-bg-chat theme-text-primary rounded-lg transition-colors flex items-center gap-2"
                        onClick={() => { setShowConfigModal(true); setShowSideMenu(false); }}
                        onMouseEnter={() => {
                            setConfigStopped(true);
                            setTimeout(() => {
                                setConfigStopped(false);
                                setConfigPaused(false);
                            }, 10);
                        }}
                        onMouseLeave={() => setConfigPaused(true)}
                    >
                        <div className="w-6 h-6">
                            <Lottie options={lottieOptions.config} isPaused={isConfigPaused} isStopped={isConfigStopped} />
                        </div>
                        <span>Configuración</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
export default Sidebar;