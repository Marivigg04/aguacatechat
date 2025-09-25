import React from 'react';

export default function SidebarSkeleton() {
  return (
    <aside className="w-80 theme-border border-r p-3 flex flex-col theme-bg-secondary h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="h-6 w-24 rounded animate-pulse theme-bg-chat" />
        <div className="h-6 w-6 rounded-full animate-pulse theme-bg-chat" />
      </div>
      {/* Search */}
      <div className="h-9 theme-bg-chat rounded mb-3 animate-pulse" />
      {/* Conversations */}
      <div className="flex-1 space-y-3 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full theme-bg-chat animate-pulse" />
            <div className="flex-1">
              <div className="h-3 w-3/5 theme-bg-chat rounded animate-pulse mb-2" />
              <div className="h-3 w-2/5 theme-bg-chat rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
