import React from 'react'
import { Card, CardContent } from './ui/card'
import { Skeleton } from './ui/skeleton'

interface ItemCardSkeletonProps {
  viewMode: 'grid' | 'list'
  count?: number
}

export const ItemCardSkeleton = React.memo<ItemCardSkeletonProps>(({ viewMode, count = 12 }) => {
  const skeletonItems = Array.from({ length: count }, (_, i) => i)

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 pb-6">
        {skeletonItems.map((i) => (
          <Card key={i} className="overflow-hidden relative animate-pulse">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 dark:via-slate-600/30 to-transparent z-10"></div>
            <CardContent className="p-4">
              <Skeleton className="aspect-square bg-slate-200 dark:bg-slate-700 rounded-lg mb-3" />
              <Skeleton className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
              <Skeleton className="h-3 bg-slate-200 dark:bg-slate-700 rounded mb-2 w-3/4" />
              <Skeleton className="h-3 bg-slate-200 dark:bg-slate-700 rounded mb-3 w-1/2" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                <Skeleton className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-6">
      {skeletonItems.map((i) => (
        <Card key={i} className="overflow-hidden relative animate-pulse">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/30 dark:via-slate-600/30 to-transparent z-10"></div>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                <Skeleton className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <Skeleton className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                <Skeleton className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-16" />
              </div>
              <Skeleton className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-12" />
              <Skeleton className="w-2 h-16 bg-slate-200 dark:bg-slate-700 rounded-r-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
})

ItemCardSkeleton.displayName = 'ItemCardSkeleton'