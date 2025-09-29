import React from 'react';

const shimmer = 'bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700';

export default function StoriesSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-2">
      {/* Header */}
      <div className="px-1 pt-1 pb-2 theme-border border-b">
        <div className="h-7 w-40 rounded-md animate-pulse bg-gray-300 dark:bg-gray-700" />
      </div>

      {/* Subheader: RECENTES */}
      <div className="mt-2 md:mt-3 px-1 pt-2 pb-2">
        <div className="h-4 w-28 rounded-md animate-pulse bg-gray-300 dark:bg-gray-700" />
      </div>

      {/* Grid RECENTES */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-3 p-1">
        {/* Tarjeta de subida (placeholder) */}
        <div className="flex flex-col gap-1">
          <div className="aspect-square w-full rounded-md overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
            <div className="w-8 h-8 rounded-md animate-pulse bg-gray-300 dark:bg-gray-700" />
          </div>
          <div className="h-3 w-24 rounded-md animate-pulse bg-gray-300 dark:bg-gray-700 mt-1" />
        </div>

        {/* Ítems de historias no vistas (placeholders) */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="aspect-square w-full rounded-md overflow-hidden">
              <div className={`w-full h-full animate-pulse ${shimmer}`} />
            </div>
            <div className="mt-1">
              <div className="h-3 w-28 rounded-md animate-pulse bg-gray-300 dark:bg-gray-700" />
              <div className="h-3 w-24 rounded-md animate-pulse bg-gray-300 dark:bg-gray-700 mt-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Subheader: VISTOS */}
      <div className="mt-4 md:mt-6 px-1 pt-2 pb-2">
        <div className="h-4 w-24 rounded-md animate-pulse bg-gray-300 dark:bg-gray-700" />
      </div>

      {/* Grid VISTOS */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-3 p-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="aspect-square w-full rounded-md overflow-hidden">
              <div className={`w-full h-full animate-pulse ${shimmer}`} />
            </div>
            <div className="mt-1">
              <div className="h-3 w-28 rounded-md animate-pulse bg-gray-300 dark:bg-gray-700" />
              <div className="h-3 w-20 rounded-md animate-pulse bg-gray-300 dark:bg-gray-700 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
