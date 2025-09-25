import React, { useEffect } from 'react';

const UploadChoiceModal = ({ open, onClose, onSelect }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative theme-bg-secondary theme-border border rounded-xl shadow-2xl w-72 p-4">
        <h2 className="text-base font-bold theme-text-primary mb-2">Subir a historias</h2>
        <p className="text-sm theme-text-primary/70 mb-4">Elige el tipo de contenido que deseas subir.</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            className="px-3 py-2 rounded-lg theme-bg-chat hover:opacity-90 transition theme-text-primary font-medium"
            onClick={() => onSelect?.('media')}
          >
            Foto / Video
          </button>
          <button
            className="px-3 py-2 rounded-lg theme-bg-chat hover:opacity-90 transition theme-text-primary font-medium"
            onClick={() => onSelect?.('text')}
          >
            Texto
          </button>
        </div>
        <button
          className="mt-4 w-full px-3 py-2 rounded-lg theme-text-secondary hover:opacity-90 transition"
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default UploadChoiceModal;
