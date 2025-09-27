import React, { useState } from 'react';

const defaultBubbleColors = {
  sent: '#e2e8f0',
  received: '#10b981',
};

const defaultAccent = '#14B8A6';

const backgrounds = [
  { label: 'Color sólido', value: 'solid', color: '#f8fafc' },
  { label: 'Gradiente', value: 'gradient', gradient: 'linear-gradient(135deg, #10b981, #14b8a6)' },
  { label: 'Imagen', value: 'image', url: '' },
];

function PersonalizationModal({ isOpen, onClose, onApply, personalization, setPersonalization }) {
  const {
    backgroundType,
    backgroundColor,
    backgroundImage,
    bubbleColors,
    accentColor,
    fontSize
  } = personalization;

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPersonalization({
        ...personalization,
        backgroundImage: ev.target.result
      });
      reader.readAsDataURL(file);
    }
  };

  const handleApply = () => {
    // Guarda la personalización en localStorage
    localStorage.setItem('personalization', JSON.stringify(personalization));
    onApply(personalization);
    onClose();
  };

  // Estado para animación de cierre
  const [isClosing, setIsClosing] = useState(false);

  // Función para cerrar el modal con animación (adaptada)
  const handleCloseModal = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 400);
  };

  // Animación de entrada/salida igual que ProfileModal
  const modalClass = `theme-bg-secondary rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl
    transition-all duration-700
    ${isClosing ? 'opacity-0 scale-90 translate-y-8' : 'opacity-100 scale-100 translate-y-0'}
    modal-transition
  `;

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
      onClick={handleCloseModal}
      style={{
        animation: isClosing ? 'fadeOut 0.3s ease-in forwards' : 'fadeIn 0.3s ease-out forwards'
      }}
    >
      <div
        className={modalClass}
        style={{
          transitionProperty: 'opacity, transform',
          transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
          animation: isClosing
            ? 'slideOutRight 0.4s ease-in forwards'
            : 'slideInLeft 0.4s ease-out forwards'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado con icono y color */}
        <div className="relative flex items-center justify-between p-6 theme-border border-b mb-2">
          <h2 className="text-xl font-bold theme-text-primary">Personalización del Chat</h2>
          <button
            className="
              ml-4 p-2 rounded-full
              transition-all duration-300 ease-out transform hover:scale-110 hover:rotate-90
              theme-bg-chat
            "
            onClick={handleCloseModal}
            title="Cerrar modal"
            style={{ zIndex: 10 }}
          >
            <span className="text-lg font-light transition-colors duration-300 theme-text-primary">✕</span>
          </button>
        </div>
        {/* Fondo del chat */}
        <div className="mb-6 px-6 py-4 rounded-xl theme-bg-chat theme-border border w-11/12 mx-auto">
          <label className="block font-semibold mb-2 text-teal-primary">Fondo del chat</label>
          <select
            value={backgroundType}
            onChange={e => setPersonalization({ ...personalization, backgroundType: e.target.value })}
            className="w-full p-2 rounded-lg border focus:ring-2 focus:ring-teal-primary theme-bg-chat theme-text-primary"
            style={{
              // Para navegadores que soportan, el fondo y texto del select se adapta al modo oscuro
              backgroundColor: 'var(--bg-chat)',
              color: 'var(--text-primary)'
            }}
          >
            {backgrounds.map(bg => (
              <option key={bg.value} value={bg.value}>{bg.label}</option>
            ))}
          </select>
          {backgroundType === 'solid' && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm">Color:</span>
              <input type="color" value={backgroundColor} onChange={e => setPersonalization({ ...personalization, backgroundColor: e.target.value })} className="w-8 h-8 rounded border" />
            </div>
          )}
          {backgroundType === 'gradient' && (
            <div className="mt-3 flex items-center gap-2">Gradiente:
              <span className="inline-block w-24 h-6 rounded" style={{background: backgrounds[1].gradient}} />
            </div>
          )}
          {backgroundType === 'image' && (
            <div className="mt-3 flex flex-col gap-2">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="rounded border p-1" />
              {backgroundImage && <img src={backgroundImage} alt="Fondo" className="mt-2 w-full h-24 object-cover rounded-lg border" />}
            </div>
          )}
        </div>
        {/* Colores de burbujas */}
        <div className="mb-6 px-6 py-4 rounded-xl theme-bg-chat theme-border border flex flex-col md:flex-row gap-6 w-11/12 mx-auto">
          <div className="flex-1">
            <label className="block font-semibold mb-2 text-teal-primary">Burbuja enviada</label>
            <input type="color" value={bubbleColors.sent} onChange={e => setPersonalization({ ...personalization, bubbleColors: { ...bubbleColors, sent: e.target.value } })} className="w-10 h-10 rounded border" />
          </div>
          <div className="flex-1">
            <label className="block font-semibold mb-2 text-teal-primary">Burbuja recibida</label>
            <input type="color" value={bubbleColors.received} onChange={e => setPersonalization({ ...personalization, bubbleColors: { ...bubbleColors, received: e.target.value } })} className="w-10 h-10 rounded border" />
          </div>
        </div>
        {/* Tamaño de fuente */}
        <div className="mb-6 px-6 py-4 rounded-xl theme-bg-chat theme-border border flex items-center gap-4 w-11/12 mx-auto">
          <label className="block font-semibold text-teal-primary">Tamaño de fuente de mensajes</label>
          <input type="range" min={12} max={24} value={fontSize} onChange={e => setPersonalization({ ...personalization, fontSize: Number(e.target.value) })} className="w-32" />
          <span className="ml-2 font-semibold theme-text-primary">{fontSize}px</span>
        </div>
        <div className="pb-6 w-11/12 mx-auto">
          <button className="w-full py-3 bg-gradient-to-r from-teal-primary to-teal-secondary text-white rounded-xl font-bold text-lg shadow-lg hover:opacity-90 transition-all duration-300" onClick={handleApply}>Aplicar cambios</button>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(30px) scale(0.95);
          }
        }
      `}</style>
    </div>
  );
}

export default PersonalizationModal;
