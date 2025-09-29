import React from 'react';

/**
 * Menú extendido desacoplado del contenedor compacto.
 * Props:
 *  - open (bool)
 *  - onClose () => void
 *  - currentView ('chats'|'stories')
 *  - onViewChange(view)
 *  - onOpenProfile / onOpenPersonalization / onOpenConfig
 */
const ExtendedMenu = ({
  open,
  onClose,
  currentView,
  onViewChange,
  onOpenProfile,
  onOpenPersonalization,
  onOpenConfig,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[999]"
      onClick={onClose}
      style={{
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(2px)',
        animation: open ? 'fadeIn 0.25s ease-out' : 'fadeOut 0.2s ease-in'
      }}
    >
      <div
        className={`fixed top-0 left-0 h-full w-64 theme-bg-secondary theme-border border-r flex flex-col pt-8 transition-all duration-300 ease-out transform ${open ? 'translate-x-0 opacity-100 scale-100' : '-translate-x-full opacity-0 scale-95'}`}
        style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 10px 10px -5px rgba(0,0,0,0.04)' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-3 p-2 rounded-full transition-all duration-300 ease-out transform hover:scale-110 hover:rotate-90 theme-bg-chat"
          onClick={onClose}
          title="Cerrar menú"
        >
          <span className="text-lg font-light transition-colors duration-300 theme-text-primary">✕</span>
        </button>
        <div className="flex-1 px-4 pt-8 space-y-4 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <button
              className={`w-full text-left p-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg flex items-center gap-3 group theme-text-primary hover:theme-bg-chat ${currentView === 'chats' ? 'theme-bg-accent' : ''}`}
              onClick={() => { onViewChange('chats'); onClose(); }}
              aria-current={currentView === 'chats' ? 'page' : undefined}
            >
              <span className="font-medium transition-all duration-300 group-hover:translate-x-1">Chats</span>
            </button>
            <button
              className={`w-full text-left p-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg flex items-center gap-3 group theme-text-primary hover:theme-bg-chat ${currentView === 'stories' ? 'theme-bg-accent' : ''}`}
              onClick={() => { onViewChange('stories'); onClose(); }}
              aria-current={currentView === 'stories' ? 'page' : undefined}
            >
              <span className="font-medium transition-all duration-300 group-hover:translate-x-1">Historias</span>
            </button>
          </div>
          <div className="space-y-2 pt-2 border-t theme-border">
            <button
              className="w-full text-left p-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg flex items-center gap-3 group theme-text-primary hover:theme-bg-chat"
              onClick={() => { onOpenProfile(); onClose(); }}
            >
              <span className="font-medium transition-all duration-300 group-hover:translate-x-1">Perfil</span>
            </button>
            <button
              className="w-full text-left p-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg flex items-center gap-3 group theme-text-primary hover:theme-bg-chat"
              onClick={() => { onOpenPersonalization(); onClose(); }}
            >
              <span className="font-medium transition-all duration-300 group-hover:translate-x-1">Personalización</span>
            </button>
            <button
              className="w-full text-left p-4 rounded-xl transition-all duration-300 ease-out transform hover:scale-[1.02] hover:shadow-lg flex items-center gap-3 group theme-text-primary hover:theme-bg-chat"
              onClick={() => { onOpenConfig(); onClose(); }}
            >
              <span className="font-medium transition-all duration-300 group-hover:translate-x-1">Configuración</span>
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes fadeOut { from { opacity:1 } to { opacity:0 } }
      `}</style>
    </div>
  );
};

export default ExtendedMenu;
