import React, { Suspense } from 'react';
import ChatSkeleton from '../skeletons/ChatSkeleton.jsx';

export default function ChatShell({ children }) {
  return (
    <div style={{ height: '100vh', width: '100vw', margin: 0, padding: 0 }}>
      <Suspense fallback={<ChatSkeleton />}>
        {children}
      </Suspense>
    </div>
  );
}
