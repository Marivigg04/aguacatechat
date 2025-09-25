import React from 'react';
import SidebarSkeleton from './SidebarSkeleton';
import ChatAreaSkeleton from './ChatAreaSkeleton';
import LeftToolbarSkeleton from './LeftToolbarSkeleton';

export default function ChatSkeleton() {
  return (
    <div className="h-screen w-screen theme-bg-primary theme-text-primary overflow-hidden">
      <div className="h-full flex">
        <LeftToolbarSkeleton />
        <SidebarSkeleton />
        <ChatAreaSkeleton />
      </div>
    </div>
  );
}
