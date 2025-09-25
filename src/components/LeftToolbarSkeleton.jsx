import React from 'react';

export default function LeftToolbarSkeleton() {
  return (
    <div className="relative z-40 w-16 h-full theme-bg-secondary theme-border border-r flex flex-col items-center">
      {/* Botón menú */}
      <div className="flex flex-col items-center pt-6">
        <div className="p-2 rounded-lg theme-bg-chat animate-pulse w-10 h-10" />
      </div>
      {/* Botones de navegación */}
      <div className="flex flex-col items-center pt-4 gap-3">
        <div className="p-2 rounded-lg theme-bg-chat animate-pulse w-10 h-10" />
        <div className="p-2 rounded-lg theme-bg-chat animate-pulse w-10 h-10" />
      </div>
      {/* Botones inferiores */}
      <div className="absolute bottom-6 left-0 w-full flex flex-col items-center gap-3">
        <div className="p-2 rounded-lg theme-bg-chat animate-pulse w-9 h-9" />
        <div className="p-2 rounded-lg theme-bg-chat animate-pulse w-9 h-9" />
        <div className="p-2 rounded-lg theme-bg-chat animate-pulse w-9 h-9" />
      </div>
    </div>
  );
}
