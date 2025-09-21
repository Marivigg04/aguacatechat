import React from 'react';
import Lottie from 'react-lottie';

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
}) => (
    <div className="relative z-40 w-16 h-full theme-bg-secondary theme-border border-r">
        <div className="flex flex-col items-center pt-6">
            <button
                className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity flex flex-col gap-1 items-center"
                title="Menú"
                onClick={() => setShowSideMenu(!showSideMenu)}
            >
                <span className="block w-6 h-1 bg-teal-primary rounded mb-1"></span>
                <span className="block w-6 h-1 bg-teal-primary rounded mb-1"></span>
                <span className="block w-6 h-1 bg-teal-primary rounded"></span>
            </button>
        </div>
        {showSideMenu && (
            <div className="fixed top-0 left-0 h-full w-64 theme-bg-secondary theme-border border-r shadow-2xl z-50 flex flex-col pt-8">
                <button
                    className="w-full text-left p-4 hover:theme-bg-chat theme-text-primary rounded-t-lg transition-colors flex items-center gap-2"
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
                    <div className="w-6 h-6">
                        <Lottie options={lottieOptions.profile} isPaused={isProfilePaused} isStopped={isProfileStopped} />
                    </div>
                    <span>Perfil</span>
                </button>
                <button
                    className="w-full text-left p-4 hover:theme-bg-chat theme-text-primary rounded-b-lg transition-colors flex items-center gap-2"
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
                <button
                    className="absolute top-2 right-2 p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity"
                    onClick={() => setShowSideMenu(false)}
                    title="Cerrar menú"
                >
                    ✕
                </button>
            </div>
        )}
    </div>
);

export default Sidebar;