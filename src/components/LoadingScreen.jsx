import React from 'react';

// Pantalla de carga personalizada a pantalla completa
// - Muestra logo/imagen (si existe) y un spinner animado con un mensaje
// - Ligera y sin dependencias adicionales
export default function LoadingScreen({ message = 'Preparando AguacateChat…' }) {
  return (
  <div className="min-h-screen w-full flex items-center justify-center theme-bg-primary theme-text-primary">
      <div className="flex flex-col items-center gap-6 p-6">
        <div className="relative">
          {/* Logo si existe, con un sutil efecto de pulso */}
          <img
            src="/vite.svg"
            alt="AguacateChat"
            className="h-16 w-16 animate-pulse drop-shadow"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-bounce [animation-delay:0ms]"></div>
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]"></div>
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]"></div>
        </div>
  <p className="text-sm font-medium" style={{ color: '#10b981' }}>{message}</p>
      </div>
    </div>
  );
}
