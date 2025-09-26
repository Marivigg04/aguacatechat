import React, { useState, useEffect, useRef } from 'react';

const UploadTextStoryModal = ({ open, onClose, onSubmit }) => {
  const [text, setText] = useState('');
  const [bg, setBg] = useState('#10b981');
  const [color, setColor] = useState('#ffffff');
  const editableRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative theme-bg-secondary theme-border border rounded-xl shadow-2xl w-[22rem] p-4">
        <h2 className="text-base font-bold theme-text-primary mb-3">Historia de texto</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm theme-text-primary/80">Fondo</label>
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
            <label className="text-sm theme-text-primary/80 ml-3">Texto</label>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <div className="relative rounded-lg h-40" style={{ background: bg }}>
            {(!text || !text.trim()) && (
              <span className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60 font-semibold" style={{ color }}>
                Escribe tu historia...
              </span>
            )}
            <div
              ref={editableRef}
              contentEditable
              suppressContentEditableWarning
              className="w-full h-full p-4 text-center font-semibold outline-none whitespace-pre-wrap break-words cursor-text flex items-center justify-center"
              style={{ color }}
              onInput={(e) => setText(e.currentTarget.innerText)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-3 py-2 rounded-lg theme-text-secondary" onClick={onClose}>Cancelar</button>
            <button
              className="px-3 py-2 rounded-lg theme-bg-chat theme-text-primary hover:opacity-90"
              onClick={() => onSubmit?.({ type: 'text', text: text.trim(), bg, color })}
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
