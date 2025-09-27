import React, { useEffect, useState } from 'react';
import { VideoModal } from './VideoPlayer.jsx';

// Adaptador que reutiliza el mismo modal de reproducción de chat para la previsualización
// y añade una barra de acciones (Cancelar / Subir) encima de los controles personalizados.
export default function StoryVideoPreviewModal({ file, onClose, onSave }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

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
      await onSave?.(file);
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
      {/* Capa de acciones flotantes (se monta aparte para no alterar VideoModal) */}
      <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-end p-6">
        <div className="pointer-events-auto flex gap-2">
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