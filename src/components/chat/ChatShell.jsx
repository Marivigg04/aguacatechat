import React, { Suspense } from 'react';
import ChatSkeleton from '../skeletons/ChatSkeleton.jsx';

export default function ChatShell({ children }) {
  return (
    // contenedor principal: asegura no overflow X y ocupa el viewport
    <div className="flex flex-col h-screen w-screen max-w-screen overflow-x-hidden m-0 p-0" style={{ minHeight: '100vh' }}>
      <Suspense fallback={<ChatSkeleton />}>{children}</Suspense>
    </div>
  );
}
