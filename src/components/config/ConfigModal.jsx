import React, { useState } from 'react';
import ToggleSwitch from '../common/ToggleSwitch';
import {
    BellIcon,
    LockClosedIcon,
    UserCircleIcon,
    XMarkIcon,
    SunIcon,
    MoonIcon
} from '@heroicons/react/24/outline';

const ConfigModal = ({ showConfigModal, setShowConfigModal, isDarkMode, toggleTheme, notificationSettings, onChangeNotificationSettings, privacySettings, onChangePrivacySettings }) => {
    // Los estados ahora se reciben desde arriba para persistencia centralizada
    const notifications = notificationSettings || { all: true, sound: true };
    const privacy = privacySettings || { readReceipts: true, showStatus: true };

    // Estado para animación de cierre
    const [isClosing, setIsClosing] = useState(false);

    // Función para cerrar el modal con animación (adaptada de ProfileModal)
    const handleCloseModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowConfigModal(false);
            setIsClosing(false);
        }, 400);
    };

    if (!showConfigModal && !isClosing) {
        return null;
    }

    // Función para renderizar cada fila de configuración. Esto mantiene el código limpio.
    const renderSettingItem = (Icon, title, description, control) => (
        <div className="flex items-center justify-between p-4 hover:theme-bg-chat rounded-lg transition-colors duration-200">
            <div className="flex items-center gap-4">
                <Icon className="w-6 h-6 theme-text-secondary" />
                <div>
                    <h4 className="font-semibold theme-text-primary">{title}</h4>
                    <p className="text-sm theme-text-secondary opacity-80">{description}</p>
                </div>
            </div>
            {control}
        </div>
    );

    return (
        // Fondo semi-transparente que cubre toda la pantalla
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
            onClick={handleCloseModal}
            style={{
                animation: isClosing ? 'fadeOut 0.3s ease-in forwards' : 'fadeIn 0.3s ease-out forwards'
            }}
        >
            {/* Contenedor principal del modal */}
            <div
                className={`theme-bg-secondary rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl
                    transition-all duration-700
                    ${isClosing 
                        ? 'opacity-0 scale-90 translate-y-8' 
                        : 'opacity-100 scale-100 translate-y-0'
                    }
                `}
                style={{
                    transitionProperty: 'opacity, transform',
                    transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
                    animation: isClosing
                        ? 'slideOutRight 0.4s ease-in forwards'
                        : 'slideInLeft 0.4s ease-out forwards'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* 1. Encabezado del Modal */}
                <div className="p-6 theme-border border-b flex items-center justify-between relative">
                    <h2 className="text-xl font-bold theme-text-primary">Configuración</h2>
                    <button
                        onClick={handleCloseModal}
                        className={`
                            ml-4 p-2 rounded-full
                            transition-all duration-300 ease-out transform hover:scale-110 hover:rotate-90
                            theme-bg-chat
                        `}
                        title="Cerrar modal"
                        style={{ zIndex: 10 }}
                    >
                        <span className="text-lg font-light transition-colors duration-300 theme-text-primary">✕</span>
                    </button>
                </div>

                {/* 2. Contenido con Scroll */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Sección de Apariencia */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold theme-text-primary px-4">Apariencia</h3>
                        {renderSettingItem(
                            isDarkMode ? MoonIcon : SunIcon,
                            'Modo Oscuro',
                            'Reduce el brillo para una visualización más cómoda.',
                            <ToggleSwitch isOn={isDarkMode} handleToggle={toggleTheme} />
                        )}
                    </div>

                    {/* Sección de Notificaciones */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold theme-text-primary px-4">Notificaciones</h3>
                        {renderSettingItem(
                            BellIcon,
                            'Activar Notificaciones',
                            'Recibe alertas de nuevos mensajes.',
                            <ToggleSwitch
                                isOn={notifications.all}
                                handleToggle={() => onChangeNotificationSettings && onChangeNotificationSettings({ ...notifications, all: !notifications.all })}
                            />
                        )}
                        {renderSettingItem(
                            BellIcon,
                            'Sonido de Notificación',
                            'Reproducir un sonido cuando llega una notificación.',
                            <div className={notifications.all ? '' : 'pointer-events-none'}>
                                <ToggleSwitch
                                    isOn={notifications.sound && notifications.all}
                                    disabled={!notifications.all}
                                    handleToggle={() => {
                                        if (!notifications.all) return;
                                        onChangeNotificationSettings && onChangeNotificationSettings({ ...notifications, sound: !notifications.sound });
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Sección de Privacidad */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold theme-text-primary px-4">Privacidad</h3>
                        <p className="px-4 pl-5 text-[16px] leading-relaxed italic relative theme-text-secondary opacity-75 before:content-[''] before:absolute before:left-4 before:top-1 before:bottom-1 before:w-[3px] before:rounded-full before:bg-emerald-500/60 dark:before:bg-emerald-400/60">
                            No podrás hacer uso de las opciones que deshabilites
                        </p>
                        {renderSettingItem(
                            LockClosedIcon,
                            'Confirmación de Lectura',
                            'Permite que otros vean si has leído sus mensajes.',
                            <ToggleSwitch
                                isOn={privacy.readReceipts}
                                handleToggle={() => onChangePrivacySettings && onChangePrivacySettings({ ...privacy, readReceipts: !privacy.readReceipts })}
                            />
                        )}
                        {renderSettingItem(
                            UserCircleIcon,
                            'Mostrar Estado "En Línea"',
                            'Permite que tus contactos vean cuándo estás activo.',
                            <ToggleSwitch
                                isOn={privacy.showStatus}
                                handleToggle={() => onChangePrivacySettings && onChangePrivacySettings({ ...privacy, showStatus: !privacy.showStatus })}
                            />
                        )}
                        {renderSettingItem(
                            UserCircleIcon,
                            'Mostrar Última Conexión',
                            'Permite que tus contactos vean cuándo fue tu última conexión.',
                            <ToggleSwitch
                                isOn={privacy.showLastConex}
                                handleToggle={() => onChangePrivacySettings && onChangePrivacySettings({ ...privacy, showLastConex: !privacy.showLastConex })}
                            />
                        )}
                    </div>
                </div>

                {/* 3. Pie del Modal */}
                <div className="p-4 theme-border border-t flex justify-end">
                    <button
                        onClick={handleCloseModal}
                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:opacity-90 transition-opacity"
                    >
                        Hecho
                    </button>
                </div>
            </div>
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
                        transform: translateX(-30px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }
                @keyframes slideOutRight {
                    from {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(30px) scale(0.95);
                    }
                }
            `}</style>
        </div>
    );
};

export default ConfigModal;