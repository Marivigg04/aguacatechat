import React, { useState } from 'react';
import ToggleSwitch from './ToggleSwitch'; // Importamos nuestro nuevo componente

// Para los iconos, primero instala heroicons: npm install @heroicons/react
import {
    BellIcon,
    LockClosedIcon,
    UserCircleIcon,
    XMarkIcon,
    SunIcon,
    MoonIcon
} from '@heroicons/react/24/outline';

const ConfigModal = ({ showConfigModal, setShowConfigModal, isDarkMode, toggleTheme }) => {
    // Estados para controlar las opciones de configuración (puedes conectarlos a tu lógica global)
    const [notifications, setNotifications] = useState({
        all: true,
        sound: true,
    });

    const [privacy, setPrivacy] = useState({
        readReceipts: true,
        showStatus: true,
    });

    if (!showConfigModal) {
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
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
            onClick={() => setShowConfigModal(false)} // Cierra el modal al hacer clic fuera
        >
            {/* Contenedor principal del modal */}
            <div
                className="theme-bg-secondary rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()} // Evita que el clic dentro del modal lo cierre
            >
                {/* 1. Encabezado del Modal */}
                <div className="p-6 theme-border border-b flex items-center justify-between">
                    <h2 className="text-xl font-bold theme-text-primary">Configuración</h2>
                    <button
                        onClick={() => setShowConfigModal(false)}
                        className="p-2 rounded-full hover:theme-bg-chat transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6 theme-text-primary" />
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
                            'Recibe alertas de nuevos mensajes y llamadas.',
                            <ToggleSwitch
                                isOn={notifications.all}
                                handleToggle={() => setNotifications(prev => ({ ...prev, all: !prev.all }))}
                            />
                        )}
                        {renderSettingItem(
                            BellIcon,
                            'Sonido de Notificación',
                            'Reproducir un sonido cuando llega una notificación.',
                            <ToggleSwitch
                                isOn={notifications.sound}
                                handleToggle={() => setNotifications(prev => ({ ...prev, sound: !prev.sound }))}
                            />
                        )}
                    </div>

                    {/* Sección de Privacidad */}
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold theme-text-primary px-4">Privacidad</h3>
                        {renderSettingItem(
                            LockClosedIcon,
                            'Confirmación de Lectura',
                            'Permite que otros vean si has leído sus mensajes.',
                            <ToggleSwitch
                                isOn={privacy.readReceipts}
                                handleToggle={() => setPrivacy(prev => ({ ...prev, readReceipts: !prev.readReceipts }))}
                            />
                        )}
                         {renderSettingItem(
                            UserCircleIcon,
                            'Mostrar Estado "En Línea"',
                            'Permite que tus contactos vean cuándo estás activo.',
                            <ToggleSwitch
                                isOn={privacy.showStatus}
                                handleToggle={() => setPrivacy(prev => ({ ...prev, showStatus: !prev.showStatus }))}
                            />
                        )}
                    </div>
                </div>

                 {/* 3. Pie del Modal */}
                 <div className="p-4 theme-border border-t flex justify-end">
                    <button
                        onClick={() => setShowConfigModal(false)}
                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:opacity-90 transition-opacity"
                    >
                        Hecho
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigModal;