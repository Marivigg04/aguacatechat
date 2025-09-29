import React, { useState, useMemo } from 'react';

// Configuración de opciones disponibles
const backgrounds = [
  { label: 'Color sólido', value: 'solid', color: '#f8fafc' },
  { label: 'Gradiente', value: 'gradient', gradient: 'linear-gradient(135deg, #10b981, #14b8a6)' },
  { label: 'Imagen', value: 'image', url: '' }
];

function PersonalizationModal({ isOpen, onClose, onApply, personalization, setPersonalization }) {
  const { backgroundType, backgroundColor, backgroundImage, bubbleColors, fontSize } = personalization;

  const isDarkMode = useMemo(() => {
    if (typeof document === 'undefined') return false;
    return document.body.classList.contains('dark-mode');
  }, [typeof document !== 'undefined' ? document.body.className : '']);

  const palettes = useMemo(() => {
    const light = {
      background: ["#FFFFFF", "#F2F2F7", "#E5DDD5", "#D6D9D9"],
      sent: ["#34C759", "#007AFF", "#FF9500", "#FF3B30"],
      received: ["#E5E5EA", "#D1D1D6", "#F2F2F7"]
    };
    const dark = {
      background: ["#000000", "#121212", "#0A1929", "#24292E"],
      sent: ["#4CDA64", "#66C0F4", "#FFBB5E", "#FF453A"],
      received: ["#2C2C2E", "#1C1C1E", "#3A3A3C"]
    };
    return isDarkMode ? dark : light;
  }, [isDarkMode]);

  const [isClosing, setIsClosing] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPersonalization(prev => ({ ...prev, backgroundImage: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    // Persistencia ahora gestionada por cookies en el componente padre (AguacateChat)
    onApply(personalization);
    onClose();
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => { setIsClosing(false); onClose(); }, 400);
  };
  // Hook computations that must precede conditional return
  const previewChatStyle = useMemo(() => {
    if (backgroundType === 'solid') return { background: backgroundColor };
    if (backgroundType === 'gradient') return { background: 'linear-gradient(135deg, #10b981, #14b8a6)' };
    if (backgroundType === 'image' && backgroundImage) return { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    return { background: isDarkMode ? '#0d1a26' : '#f8fafc' };
  }, [backgroundType, backgroundColor, backgroundImage, isDarkMode]);

  const sampleMessages = [
    { id: 1, type: 'received', text: 'Hola 👋 ¿Cómo estás?' },
    { id: 2, type: 'sent', text: 'Todo bien, personalizando el chat 😎' },
    { id: 3, type: 'received', text: 'Los colores se ven geniales. ✅' },
    { id: 4, type: 'sent', text: 'Perfecto, así quedará.' }
  ];

  // Ahora sí: retorno temprano sin alterar orden de hooks previos
  if (!isOpen && !isClosing) return null;
  // Ampliamos el ancho máximo y aseguramos altura casi completa
  const modalClass = `theme-bg-secondary rounded-2xl w-full max-w-5xl max-h-[92vh] h-full flex flex-col shadow-2xl transition-all duration-700 ${isClosing ? 'opacity-0 scale-95 translate-y-6' : 'opacity-100 scale-100 translate-y-0'} modal-transition`;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
      style={{ animation: isClosing ? 'fadeOut 0.3s ease-in forwards' : 'fadeIn 0.3s ease-out forwards' }}
    >
      <div
        className={modalClass}
        style={{
          transitionProperty: 'opacity, transform',
            transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
            animation: isClosing ? 'slideOutRight 0.4s ease-in forwards' : 'slideInLeft 0.4s ease-out forwards'
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Personalización del chat"
      >
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 theme-border border-b mb-2">
          <h2 className="text-xl font-bold theme-text-primary">Personalización del Chat</h2>
          <button
            className="ml-4 p-2 rounded-full transition-all duration-300 ease-out transform hover:scale-110 hover:rotate-90 theme-bg-chat"
            onClick={handleClose}
            title="Cerrar modal"
          >
            <span className="text-lg font-light transition-colors duration-300 theme-text-primary">✕</span>
          </button>
        </div>
  <div className="flex-1 w-full flex flex-col md:flex-row gap-6 px-4 md:px-6 py-2 overflow-hidden">
          {/* Left column */}
          <div className="md:w-1/2 w-full flex flex-col gap-6 overflow-y-auto pr-1 md:pr-2 custom-scroll" style={{ maxHeight: '100%' }}>
            {/* Fondo */}
            <div className="px-6 py-4 rounded-xl theme-bg-chat theme-border border w-full">
              <label className="block font-semibold mb-2 text-teal-primary">Fondo del chat</label>
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  {backgrounds.map(bg => (
                    <button
                      key={bg.value}
                      onClick={() => setPersonalization({ ...personalization, backgroundType: bg.value })}
                      className={`px-3 py-1 rounded-lg text-sm font-medium border theme-border transition-colors ${backgroundType === bg.value ? 'bg-teal-primary text-white border-teal-primary' : 'theme-bg-secondary theme-text-primary hover:bg-opacity-70'}`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
                {backgroundType === 'solid' && (
                  <div>
                    <p className="text-xs uppercase tracking-wide opacity-70 mb-2">Paleta sugerida ({isDarkMode ? 'Oscuro' : 'Claro'})</p>
                    <div className="flex flex-wrap gap-2">
                      {palettes.background.map(col => {
                        const isActive = col.toLowerCase() === backgroundColor.toLowerCase();
                        return (
                          <button
                            key={col}
                            onClick={() => setPersonalization({ ...personalization, backgroundColor: col })}
                            title={col}
                            className={`h-8 w-8 rounded-full border relative transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-primary ${isActive ? 'ring-2 ring-teal-primary ring-offset-2 ring-offset-transparent' : 'border-gray-400/30'}`}
                            style={{ background: col }}
                          >
                            {isActive && (
                              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow">✓</span>
                            )}
                          </button>
                        );
                      })}
                      {!palettes.background.includes(backgroundColor) && (
                        <div className="col-span-2 flex items-center">
                          <span className="text-[10px] px-2 py-1 rounded bg-gray-500/10 theme-text-secondary border theme-border">Custom {backgroundColor}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {backgroundType === 'gradient' && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm opacity-80">Gradiente fijo:</span>
                    <span className="inline-block w-28 h-8 rounded-md border border-white/20" style={{ background: backgrounds[1].gradient }} />
                  </div>
                )}
                {backgroundType === 'image' && (
                  <div className="flex flex-col gap-2 mt-1">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="rounded border p-1 text-sm" />
                    {backgroundImage && <img src={backgroundImage} alt="Fondo" className="mt-1 w-full h-24 object-cover rounded-lg border" />}
                  </div>
                )}
              </div>
            </div>
            {/* Burbujas */}
            <div className="px-6 py-4 rounded-xl theme-bg-chat theme-border border w-full">
              <label className="block font-semibold mb-4 text-teal-primary">Colores de burbujas</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium mb-2 theme-text-secondary">Enviada</p>
                  <div className="flex flex-wrap gap-2">
                    {palettes.sent.map(col => {
                      const isActive = col.toLowerCase() === bubbleColors.sent.toLowerCase();
                      return (
                        <button
                          key={col}
                          onClick={() => setPersonalization({ ...personalization, bubbleColors: { ...bubbleColors, sent: col } })}
                          title={col}
                          className={`h-8 w-8 rounded-full border relative transition transform hover:scale-105 ${isActive ? 'ring-2 ring-teal-primary ring-offset-2 ring-offset-transparent' : 'border-gray-400/30'}`}
                          style={{ background: col }}
                        >
                          {isActive && <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow">✓</span>}
                        </button>
                      );
                    })}
                    {!palettes.sent.includes(bubbleColors.sent) && (
                      <span className="px-2 py-1 text-[10px] rounded bg-gray-500/10 theme-text-secondary border theme-border">Custom {bubbleColors.sent}</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2 theme-text-secondary">Recibida</p>
                  <div className="flex flex-wrap gap-2">
                    {palettes.received.map(col => {
                      const isActive = col.toLowerCase() === bubbleColors.received.toLowerCase();
                      return (
                        <button
                          key={col}
                          onClick={() => setPersonalization({ ...personalization, bubbleColors: { ...bubbleColors, received: col } })}
                          title={col}
                          className={`h-8 w-8 rounded-full border relative transition transform hover:scale-105 ${isActive ? 'ring-2 ring-teal-primary ring-offset-2 ring-offset-transparent' : 'border-gray-400/30'}`}
                          style={{ background: col }}
                        >
                          {isActive && <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white drop-shadow">✓</span>}
                        </button>
                      );
                    })}
                    {!palettes.received.includes(bubbleColors.received) && (
                      <span className="px-2 py-1 text-[10px] rounded bg-gray-500/10 theme-text-secondary border theme-border">Custom {bubbleColors.received}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Fuente */}
            <div className="px-6 py-4 rounded-xl theme-bg-chat theme-border border w-full">
              <label className="block font-semibold text-teal-primary mb-3">Tamaño de fuente de mensajes</label>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Pequeña', value: 14 },
                  { label: 'Mediana', value: 16 },
                  { label: 'Grande', value: 18 }
                ].map(opt => {
                  const active = fontSize === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setPersonalization({ ...personalization, fontSize: opt.value })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border theme-border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-primary/60 flex items-center gap-2 ${active ? 'bg-teal-primary text-white border-teal-primary shadow' : 'theme-bg-secondary theme-text-primary hover:bg-teal-primary/10'}`}
                    >
                      <span style={{ fontSize: opt.value }}>{opt.label}</span>
                      {active && <span className="text-[10px] font-semibold tracking-wide">{opt.value}px</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] opacity-60 theme-text-secondary leading-snug">Pequeña corresponde al tamaño actual de referencia. Cambiarlo afecta sólo a los mensajes, no a la interfaz.</p>
            </div>
          </div>
          {/* Right column - preview */}
          <div className="md:w-1/2 w-full flex flex-col gap-3 h-full">
            <div className="px-6 py-4 rounded-xl theme-bg-chat theme-border border flex flex-col flex-1 min-h-0">
              <p className="text-sm font-semibold theme-text-secondary mb-3">Vista previa</p>
              <div className="rounded-xl border theme-border overflow-hidden shadow-inner flex-1 flex flex-col min-h-0">
                <div className="w-full h-full flex flex-col p-3 overflow-hidden flex-1" style={previewChatStyle}>
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scroll pb-2">
                    {sampleMessages.map(msg => {
                      const own = msg.type === 'sent';
                      const bubbleColor = own ? bubbleColors.sent : bubbleColors.received;
                      return (
                        <div key={msg.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`px-3 py-2 rounded-2xl max-w-[70%] text-sm shadow theme-text-primary ${own ? 'rounded-br-md' : 'rounded-bl-md'}`}
                            style={{
                              background: bubbleColor,
                              fontSize: fontSize,
                              lineHeight: 1.25
                            }}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-2 text-[10px] opacity-70 theme-text-primary text-center select-text">Ejemplo de visualización</div>
                </div>
              </div>
            </div>
            {/* Texto explicativo integrado abajo */}
            <div className="px-4 pb-2 -mt-2">
            </div>
          </div>
        </div>
        <div className="pb-6 w-11/12 mx-auto mt-4">
        </div>
      </div>
    </div>
  );
}

export default PersonalizationModal;
