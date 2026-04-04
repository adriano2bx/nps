import React from 'react';

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="animate-pulse space-y-4">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 py-4 px-6 border-b border-zinc-100 dark:border-zinc-800/60">
        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/4"></div>
        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/4"></div>
        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-1/6 ml-auto"></div>
        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-12 ml-auto"></div>
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ cards = 3 }: { cards?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(cards)].map((_, i) => (
      <div key={i} className="animate-pulse border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 bg-white dark:bg-zinc-900 h-44">
        <div className="flex justify-between mb-4">
          <div className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded w-24"></div>
          <div className="h-8 w-8 bg-zinc-100 dark:bg-zinc-800 rounded-full"></div>
        </div>
        <div className="space-y-3">
          <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-full"></div>
          <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded w-2/3"></div>
        </div>
      </div>
    ))}
  </div>
);

export const StatsSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl h-32">
        <div className="h-4 bg-zinc-50 dark:bg-zinc-800 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-zinc-50 dark:bg-zinc-800 rounded w-3/4"></div>
      </div>
    ))}
  </div>
);

export const FormSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6 h-64 bg-white dark:bg-zinc-900">
        <div className="h-4 bg-zinc-50 dark:bg-zinc-800 rounded w-1/3"></div>
        <div className="space-y-4">
          <div className="h-10 bg-zinc-50 dark:bg-zinc-800 rounded w-full"></div>
          <div className="h-10 bg-zinc-50 dark:bg-zinc-800 rounded w-full"></div>
        </div>
      </div>
      <div className="rounded-3xl p-8 bg-zinc-900 dark:bg-zinc-100 h-64"></div>
    </div>
  </div>
);
