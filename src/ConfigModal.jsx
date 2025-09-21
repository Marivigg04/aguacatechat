import React from 'react';

const ConfigModal = ({ showConfigModal, setShowConfigModal }) => (
    showConfigModal && (
        <div className="fixed bottom-6 left-6 z-50">
            <div className="theme-bg-secondary theme-border border rounded-2xl shadow-2xl w-80 flex flex-col">
                <div className="p-4 theme-border border-b flex items-center justify-between">
                    <h3 className="text-lg font-bold theme-text-primary">Configuración</h3>
                    <button onClick={() => setShowConfigModal(false)} className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity">
                        ✕
                    </button>
                </div>
                <div className="flex flex-col gap-2 p-4">
                    <button
                        className="flex items-center gap-2 p-2 rounded transition-colors"
                        onClick={() => alert('Personalización')}
                    >
                        🎨 <span className="theme-text-primary">Personalización</span>
                    </button>
                    <button
                        className="flex items-center gap-2 p-2 rounded transition-colors"
                        onClick={() => alert('Chats')}
                    >
                        💬 <span className="theme-text-primary">Chats</span>
                    </button>
                    <button
                        className="flex items-center gap-2 p-2 rounded transition-colors"
                        onClick={() => alert('Cuenta')}
                    >
                        👤 <span className="theme-text-primary">Cuenta</span>
                    </button>
                </div>
            </div>
        </div>
    )
);

export default ConfigModal;