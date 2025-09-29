import React, { useEffect } from 'react';
import { PhotoIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative theme-bg-secondary theme-border border rounded-2xl shadow-2xl w-[22rem] p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold theme-text-primary">Subir a historias</h2>
            <p className="text-sm theme-text-primary/70">Elige el tipo de contenido que deseas subir.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg theme-bg-chat hover:opacity-90 transition" aria-label="Cerrar">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            className="flex items-center gap-3 p-3 rounded-xl theme-bg-chat hover:ring-2 hover:ring-teal-primary/60 hover:-translate-y-0.5 transition-all theme-text-primary"
            onClick={() => onSelect?.('media')}
          >
            <PhotoIcon className="w-6 h-6" />
            <span className="font-medium">Foto / Video</span>
          </button>
          <button
            className="flex items-center gap-3 p-3 rounded-xl theme-bg-chat hover:ring-2 hover:ring-teal-primary/60 hover:-translate-y-0.5 transition-all theme-text-primary"
            onClick={() => onSelect?.('text')}
          >
            <DocumentTextIcon className="w-6 h-6" />
            <span className="font-medium">Texto</span>
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="px-3 py-2 rounded-lg theme-text-secondary hover:opacity-90 transition"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadChoiceModal;
