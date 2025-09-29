
// Externas
import React, { useEffect, useState, useRef } from 'react';

// Componentes internos
import { VideoModal } from '../common/VideoPlayer.jsx';
import EmojiPicker from '../chat/EmojiPicker.jsx';

// Adaptador que reutiliza el mismo modal de reproducción de chat para la previsualización
// y añade una barra de acciones (Cancelar / Subir) encima de los controles personalizados.
export default function StoryVideoPreviewModal({ file, onClose, onSave }) {
  const [videoUrl, setVideoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef(null);
  const emojiButtonRef = useRef(null);

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
          <div className="flex-1 flex items-stretch gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={storyText}
                onChange={e => {
                  const next = e.target.value.slice(0,500);
                  setStoryText(next);
                  const textarea = e.target;
                  textarea.value = next;
                  const maxH = 140;
                  textarea.style.height = 'auto';
                  const newH = Math.min(textarea.scrollHeight, maxH);
                  textarea.style.height = newH + 'px';
                  textarea.style.overflowY = textarea.scrollHeight > maxH ? 'auto' : 'hidden';
                }}
                maxLength={500}
                placeholder="Escribe algo para tu historia... (máx. 500)"
                rows={1}
                className="w-full px-4 py-2 rounded-lg border theme-border bg-black/30 text-white text-base outline-none focus:ring-2 focus:ring-teal-500 resize-none transition-all duration-300 ease-in-out hover:shadow-[0_0_16px_2px_#14b8a6]"
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
            <div className="relative flex" ref={emojiButtonRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(v => !v)}
                className={`self-center h-12 w-12 flex items-center justify-center rounded-xl theme-bg-secondary/70 hover:opacity-80 transition-opacity text-white text-lg shadow border theme-border ${showEmojiPicker ? 'ring-2 ring-teal-500' : ''}`}
                title="Emojis"
              >
                😊
              </button>
              {showEmojiPicker && (
                <EmojiPicker
                  dark={true}
                  anchorRef={emojiButtonRef}
                  onSelect={(emoji) => {
                    const el = textareaRef.current;
                    if (!el) return;
                    const start = el.selectionStart ?? storyText.length;
                    const end = el.selectionEnd ?? storyText.length;
                    const next = (storyText.slice(0, start) + emoji + storyText.slice(end)).slice(0,500);
                    setStoryText(next);
                    requestAnimationFrame(() => {
                      el.focus();
                      const pos = Math.min(start + emoji.length, 500);
                      el.selectionStart = el.selectionEnd = pos;
                      el.style.height = 'auto';
                      const maxH = 140;
                      const newH = Math.min(el.scrollHeight, maxH);
                      el.style.height = newH + 'px';
                      el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
                    });
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>
          </div>
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