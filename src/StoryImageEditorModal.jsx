import React, { useEffect, useState } from 'react';

// Modal simple de vista previa de imagen para historias
// Props: file (File), onClose(), onSave(file: File)

export default function StoryImageEditorModal({ file, onClose, onSave }) {
  const [imgUrl, setImgUrl] = useState('');
  const [storyText, setStoryText] = useState('');

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => { try { URL.revokeObjectURL(url); } catch {} };
  }, [file]);

  const handleUse = () => {
    // Devuelve el archivo y el texto
    onSave?.(file, storyText);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-3xl max-h-[90vh] theme-bg-secondary rounded-2xl overflow-hidden shadow-2xl">
        {/* Cabecera */}
        <div className="absolute top-3 left-3">
          <button
            onClick={onClose}
            title="Cerrar"
            className="w-10 h-10 rounded-full theme-bg-secondary/90 backdrop-blur text-current flex items-center justify-center hover:opacity-90 shadow"
            aria-label="Cerrar"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 1 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.42L12 13.41l4.89 4.9a1 1 0 0 0 1.42-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"/></svg>
          </button>
        </div>

        {/* Contenido: vista previa responsive con object-contain y overlay de texto */}
        <div className="p-6 pt-16 pb-16">
          <div className="w-full flex items-center justify-center relative">
            {imgUrl && (
              <div className="relative max-w-[70vw] max-h-[55vh]">
                <img
                  src={imgUrl}
                  alt="Vista previa"
                  className="max-w-[70vw] max-h-[55vh] object-contain rounded-xl"
                  draggable={false}
                />
                {/* Overlay de texto eliminado, solo imagen */}
              </div>
            )}
          </div>
          {/* Barra de texto para escribir sobre la historia */}
          <div className="mt-6 flex items-center justify-center">
            <div className="w-full max-w-lg relative">
              <textarea
                value={storyText}
                onChange={e => {
                  const next = e.target.value.slice(0,500);
                  setStoryText(next);
                  const textarea = e.target;
                  textarea.value = next; // asegurar límite duro
                  const maxH = 140; // px máximo antes de scroll
                  textarea.style.height = 'auto';
                  const newH = Math.min(textarea.scrollHeight, maxH);
                  textarea.style.height = newH + 'px';
                  textarea.style.overflowY = textarea.scrollHeight > maxH ? 'auto' : 'hidden';
                }}
                maxLength={500}
                placeholder="Escribe algo para tu historia... (máx. 500)"
                rows={1}
                className="w-full px-4 py-2 rounded-lg border theme-border bg-black/30 text-white text-base outline-none focus:ring-2 focus:ring-teal-500 resize-none transition-all duration-300 ease-in-out hover:shadow-[0_0_16px_2px_#14b8a6] pr-14"
                style={{
                  whiteSpace: 'pre-line',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  minHeight: '40px',
                  maxHeight: '140px',
                  overflowY: 'hidden'
                }}
              />
              <div className="absolute bottom-1 right-2 text-[10px] font-medium text-white/60 select-none bg-black/40 px-2 py-0.5 rounded-md">
                {storyText.length}/500
              </div>
            </div>
          </div>
        </div>

        {/* Acciones inferiores */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg theme-bg-secondary/90 backdrop-blur hover:opacity-90 shadow">Cancelar</button>
          <button onClick={handleUse} className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-primary to-teal-secondary text-white hover:opacity-90 shadow">Usar</button>
        </div>
      </div>
    </div>
  );
}
