import React from 'react';

export default function ChatAreaSkeleton() {
  return (
    <main className="flex-1 flex flex-col theme-bg-secondary h-full anim-slide-up">
      {/* Top bar */}
      <div className="h-14 theme-border border-b px-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full theme-bg-chat animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-40 theme-bg-chat rounded animate-pulse mb-2" />
          <div className="h-3 w-24 theme-bg-chat rounded animate-pulse" />
        </div>
        <div className="h-6 w-6 theme-bg-chat rounded animate-pulse" />
      </div>

      {/* Messages area */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className="max-w-[70%] p-3 rounded-2xl theme-bg-chat animate-pulse">
              <div className="h-3 w-48 theme-bg-secondary rounded mb-2" />
              <div className="h-3 w-32 theme-bg-secondary rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="theme-border border-t p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg theme-bg-chat animate-pulse" />
        <div className="flex-1 h-10 theme-bg-chat rounded animate-pulse" />
        <div className="h-9 w-9 rounded-lg theme-bg-chat animate-pulse" />
      </div>
    </main>
  );
}
