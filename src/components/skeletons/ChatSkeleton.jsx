import React from 'react';
import SidebarSkeleton from './SidebarSkeleton';
import ChatAreaSkeleton from './ChatAreaSkeleton';
import LeftToolbarSkeleton from './LeftToolbarSkeleton';

/**
 * ChatSkeleton
 * - variant="full" (por defecto): muestra toolbar + sidebar + chat, pantalla completa.
 * - variant="chat" | "chat-only": muestra solo el área de chat (útil al cargar mensajes del chat seleccionado).
 * - className: clases extra para el contenedor raíz del skeleton.
 */
export default function ChatSkeleton({ variant = 'full', className = '' }) {
  if (variant === 'chat' || variant === 'chat-only') {
    return (
      <div className={`w-full h-full overflow-hidden ${className}`}>
        <div className="flex-1 anim-slide-up anim-delay-1"><ChatAreaSkeleton /></div>
      </div>
    );
  }

  // Variante completa (pantalla completa)
  return (
    <div className={`h-screen w-screen theme-bg-primary theme-text-primary overflow-hidden anim-fade-in ${className}`}>
      <div className="h-full flex">
        <div className="anim-slide-right anim-delay-1"><LeftToolbarSkeleton /></div>
        <div className="anim-slide-right anim-delay-2"><SidebarSkeleton /></div>
        <div className="flex-1 anim-slide-up anim-delay-3"><ChatAreaSkeleton /></div>
      </div>
    </div>
  );
}
