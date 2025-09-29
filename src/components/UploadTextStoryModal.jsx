import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from './chat/EmojiPicker.jsx';
import { XMarkIcon } from '@heroicons/react/24/outline';

const UploadTextStoryModal = ({ open, onClose, onSubmit }) => {
  const [text, setText] = useState('');
  const [bg, setBg] = useState('#10b981');
  const [color, setColor] = useState('#ffffff');
  // Alineación y tamaño fijos (se eliminan controles interactivos)
  const align = 'center';
  const fontSize = 20;
  const editableRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Paletas predefinidas (sin selectores libres)
  const bgPalette = [
    '#000000', '#FFFFFF', '#1E293B', '#16A34A', '#BE123C', '#FBBF24', '#2563EB', '#9333EA'
  ];
  const textPalette = [
    '#FFFFFF', '#000000', '#F8FAFC', '#172554', '#FFEDD5', '#FDE68A'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[24rem] rounded-2xl shadow-2xl ring-1 ring-teal-500/10 theme-border border overflow-hidden bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl">
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between bg-gradient-to-r from-teal-500/10 to-emerald-500/10">
          <h2 className="text-base font-bold theme-text-primary">Historia de texto</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-teal-500/10">
            <XMarkIcon className="w-5 h-5 theme-text-secondary" />
          </button>
        </div>

        <div className="p-5 pt-3 space-y-4">
          {/* Paletas de colores */}
          {/* Paleta de Fondo */}
          <div className="space-y-2">
            <span className="text-xs font-medium theme-text-secondary tracking-wide">Color de fondo</span>
            <div className="flex flex-wrap gap-2">
              {bgPalette.map((p, idx) => (
                <button
                  key={idx}
                  className={`relative w-8 h-8 rounded-full ring-2 transition focus:outline-none focus:ring-4 focus:ring-teal-500/40 ${bg === p ? 'ring-teal-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : 'ring-black/10 dark:ring-white/10'}`}
                  style={{ background: p }}
                  onClick={() => setBg(p)}
                  aria-label={`Seleccionar fondo ${idx + 1}`}
                >
                  {bg === p && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Paleta de Texto */}
          <div className="space-y-2">
            <span className="text-xs font-medium theme-text-secondary tracking-wide">Color del texto</span>
            <div className="flex flex-wrap gap-2">
              {textPalette.map((p, idx) => (
                <button
                  key={idx}
                  className={`relative w-8 h-8 rounded-full ring-2 transition focus:outline-none focus:ring-4 focus:ring-teal-500/40 ${color === p ? 'ring-teal-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : 'ring-black/10 dark:ring-white/10'}`}
                  style={{ background: p }}
                  onClick={() => setColor(p)}
                  aria-label={`Seleccionar color de texto ${idx + 1}`}
                >
                  {color === p && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Lienzo de texto + botón emoji */}
          <div className="flex items-stretch gap-3">
            <div className="relative rounded-xl h-56 flex-1 overflow-hidden ring-1 ring-teal-500/10" style={{ background: bg }}>
            {(!text || !text.trim()) && (
              <span
                className={`absolute inset-0 flex items-center ${align === 'center' ? 'justify-center text-center' : 'justify-start text-left'} pointer-events-none opacity-60 font-semibold px-4`}
                style={{ color, fontSize }}
              >
                Escribe algo aqui
              </span>
            )}
            <div
              className={`absolute inset-0 flex items-center ${align === 'center' ? 'justify-center' : 'justify-start'} p-4 overflow-auto`}
              onClick={() => editableRef.current?.focus()}
            >
              <div
                ref={editableRef}
                contentEditable
                suppressContentEditableWarning
                className={`w-full max-h-full ${align === 'center' ? 'text-center' : 'text-left'} font-semibold outline-none whitespace-pre-wrap break-words cursor-text`}
                style={{ color, fontSize }}
                onInput={(e) => {
                  // innerText puede contener \n al final; limpiamos espacios y saltos redundantes
                  const raw = e.currentTarget.innerText.replace(/\u200B/g, ''); // eliminar zero-width space si existe
                  // No forzamos trim completo aquí para que el cursor no salte, solo almacenamos para validación
                  setText(raw);
                }}
                onBlur={() => {
                  // Limpieza final al perder foco (quitar espacios extremos múltiples)
                  setText(t => t.replace(/\s+$/g, ''));
                }}
              />
            </div>
              <div className="absolute bottom-1 right-2 text-[10px] font-medium px-2 py-0.5 rounded-md bg-black/30 text-white/80 select-none">
                {text.trim().length}/500
              </div>
          </div>
            <div className="relative flex" ref={emojiButtonRef}>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(v => !v)}
                className={`self-center h-12 w-12 flex items-center justify-center rounded-xl theme-bg-secondary/70 hover:opacity-80 transition-opacity text-lg shadow border theme-border ${showEmojiPicker ? 'ring-2 ring-teal-500' : ''}`}
                title="Emojis"
              >
                😊
              </button>
              {showEmojiPicker && (
                <EmojiPicker
                  dark={true}
                  anchorRef={emojiButtonRef}
                  onSelect={(emoji) => {
                    // Insertar emoji en caret dentro del contentEditable
                    const el = editableRef.current;
                    if (!el) return;
                    el.focus();
                    let sel = window.getSelection();
                    if (!sel || sel.rangeCount === 0) {
                      // Append al final
                      el.innerText = (el.innerText + emoji).slice(0,500);
                      setText(el.innerText);
                      return;
                    }
                    const range = sel.getRangeAt(0);
                    // Asegurarnos de que el rango esté dentro del editable
                    if (!el.contains(range.startContainer)) {
                      el.innerText = (el.innerText + emoji).slice(0,500);
                      setText(el.innerText);
                      return;
                    }
                    // Insertar nodo de texto con el emoji
                    const node = document.createTextNode(emoji);
                    range.deleteContents();
                    range.insertNode(node);
                    // Mover el caret después del emoji
                    range.setStartAfter(node);
                    range.setEndAfter(node);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    // Limitar a 500 caracteres
                    if (el.innerText.length > 500) {
                      el.innerText = el.innerText.slice(0,500);
                      // Reposicionar caret al final
                      sel = window.getSelection();
                      const r = document.createRange();
                      r.selectNodeContents(el);
                      r.collapse(false);
                      sel.removeAllRanges();
                      sel.addRange(r);
                    }
                    setText(el.innerText);
                  }}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2">
            <button className="px-3 py-2 rounded-lg theme-text-secondary hover:bg-teal-500/10" onClick={onClose}>Cancelar</button>
            <button
              className="px-3 py-2 rounded-lg theme-bg-chat theme-text-primary hover:opacity-90 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                const cleaned = text.trim().slice(0,500);
                if (!cleaned) return; // guard adicional
                onSubmit?.({ type: 'text', text: cleaned, bg, color });
              }}
              disabled={!text.trim()}
            >
              Publicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadTextStoryModal;
