import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const UploadTextStoryModal = ({ open, onClose, onSubmit }) => {
  const [text, setText] = useState('');
  const [bg, setBg] = useState('#10b981');
  const [color, setColor] = useState('#ffffff');
  const [align, setAlign] = useState('center'); // 'center' | 'left'
  const [fontSize, setFontSize] = useState(20);
  const editableRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const presets = [
    '#10b981', '#0ea5e9', '#f43f5e', '#a855f7', '#f59e0b',
    'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
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
          {/* Controles de color y presets */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm theme-text-primary/80">Fondo</label>
              <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm theme-text-primary/80">Texto</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {presets.map((p, idx) => (
              <button
                key={idx}
                className="w-7 h-7 rounded-full ring-1 ring-black/10 dark:ring-white/10 shrink-0"
                style={{ background: p }}
                title="Preset"
                onClick={() => setBg(p)}
              />
            ))}
          </div>

          {/* Controles de alineación y tamaño */}
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex rounded-lg p-0.5 bg-teal-500/10">
              <button
                className={`px-3 py-1.5 text-sm rounded-md ${align === 'center' ? 'bg-teal-500/15 theme-text-primary' : 'theme-text-secondary'}`}
                onClick={() => setAlign('center')}
              >Centro</button>
              <button
                className={`px-3 py-1.5 text-sm rounded-md ${align === 'left' ? 'bg-teal-500/15 theme-text-primary' : 'theme-text-secondary'}`}
                onClick={() => setAlign('left')}
              >Izquierda</button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs theme-text-secondary">Tamaño</span>
              <input
                type="range"
                min={16}
                max={36}
                step={1}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
              <span className="text-xs theme-text-secondary w-6 text-right">{fontSize}</span>
            </div>
          </div>

          {/* Lienzo de texto */}
          <div className="relative rounded-xl h-56 overflow-hidden ring-1 ring-teal-500/10" style={{ background: bg }}>
            {(!text || !text.trim()) && (
              <span
                className={`absolute inset-0 flex items-center ${align === 'center' ? 'justify-center text-center' : 'justify-start text-left'} pointer-events-none opacity-60 font-semibold px-4`}
                style={{ color, fontSize }}
              >
                Escribe tu historia...
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
                onInput={(e) => setText(e.currentTarget.innerText)}
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2">
            <button className="px-3 py-2 rounded-lg theme-text-secondary hover:bg-teal-500/10" onClick={onClose}>Cancelar</button>
            <button
              className="px-3 py-2 rounded-lg theme-bg-chat theme-text-primary hover:opacity-90 shadow-sm"
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
