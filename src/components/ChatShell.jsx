import React, { Suspense } from 'react';
import ChatSkeleton from './ChatSkeleton.jsx';

export default function ChatShell({ children }) {
  return (
    <div style={{ height: '100vh', width: '100vw', margin: 0, padding: 0 }}>
      <Suspense fallback={<ChatSkeleton />}>
        {children}
      </Suspense>
    </div>
  );
}
