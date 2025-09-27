import React, { useEffect, useState } from 'react';
import { VideoModal } from './VideoPlayer.jsx';

// Adaptador que reutiliza el mismo modal de reproducción de chat para la previsualización
// y añade una barra de acciones (Cancelar / Subir) encima de los controles personalizados.
export default function StoryVideoPreviewModal({ file, onClose, onSave }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [storyText, setStoryText] = useState("");

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => { try { URL.revokeObjectURL(url); } catch {} };
  }, [file]);

  if (!file) return null;

  const handleUpload = async () => {
    if (uploading) return;
    try {
      setUploading(true);
      await onSave?.(file, storyText);
      onClose?.();
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* Reutilizamos VideoModal (mismo look & feel que chat) */}
      <VideoModal
        open={true}
        src={videoUrl}
        onClose={uploading ? undefined : onClose}
        forceVertical={true}
      />
      {/* Input y botones en el mismo nivel, centrados horizontalmente */}
      <div className="pointer-events-none fixed inset-0 z-[62] flex items-end justify-center p-6">
        <div className="pointer-events-auto w-full max-w-2xl flex flex-row items-center gap-4">
          <textarea
            value={storyText}
            onChange={e => {
              setStoryText(e.target.value);
              const textarea = e.target;
              textarea.style.height = 'auto';
              textarea.style.height = textarea.scrollHeight + 'px';
            }}
            maxLength={120}
            placeholder="Escribe algo para tu historia..."
            rows={1}
            className="flex-1 px-4 py-2 rounded-lg border theme-border bg-black/30 text-white text-base outline-none focus:ring-2 focus:ring-teal-500 resize-none transition-all duration-300 ease-in-out hover:shadow-[0_0_16px_2px_#14b8a6]"
            style={{
              whiteSpace: 'pre-line',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              minHeight: '40px',
              maxHeight: '180px',
              overflowY: storyText.length > 80 ? 'auto' : 'hidden'
            }}
          />
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-2 rounded-lg theme-bg-secondary/90 backdrop-blur text-sm font-medium shadow disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
          >Cancelar</button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="relative px-4 py-2 rounded-lg bg-gradient-to-r from-teal-primary to-teal-secondary text-white text-sm font-medium shadow disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          >
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tracking-wide">
                Subiendo...
              </span>
            )}
            <span className={uploading ? 'opacity-0' : 'opacity-100'}>Subir</span>
          </button>
        </div>
      </div>
    </>
  );
}