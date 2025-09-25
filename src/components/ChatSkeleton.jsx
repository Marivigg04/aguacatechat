import React from 'react';

export default function ChatSkeleton() {
  return (
    <div className="h-screen w-screen theme-bg-primary theme-text-primary overflow-hidden">
      <div className="h-full grid grid-cols-12">
        {/* Sidebar */}
  <aside className="col-span-4 md:col-span-3 lg:col-span-3 theme-border border-r p-3 hidden sm:flex flex-col theme-bg-secondary">
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

        {/* Chat area */}
  <main className="col-span-12 sm:col-span-8 md:col-span-9 lg:col-span-9 flex flex-col theme-bg-secondary">
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
      </div>
    </div>
  );
}
