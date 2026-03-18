import React, { Suspense } from 'react';
import ChatSkeleton from '../skeletons/ChatSkeleton.jsx';

export default function ChatShell({ children, isDemo }) {
  return (
    // contenedor principal: asegura no overflow X y ocupa el viewport
    <div className="flex flex-col h-screen w-screen max-w-screen overflow-x-hidden m-0 p-0" style={{ minHeight: '100vh' }}>
      {isDemo && (
        <div className="w-full px-3 py-2 text-center text-xs font-semibold tracking-wide bg-amber-200 text-amber-900 border-b border-amber-300">
          MODO DEMO: datos ficticios para prueba
        </div>
      )}
      <Suspense fallback={<ChatSkeleton />}>{children}</Suspense>
    </div>
  );
}
