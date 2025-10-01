import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface ItemCardSkeletonProps {
  viewMode: "grid" | "list"
  count?: number
}

export function ItemCardSkeleton({ viewMode, count = 8 }: ItemCardSkeletonProps) {
  return (
    <>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-4 gap-6 pb-6">
          {Array.from({ length: count }).map((_, index) => (
            <Card key={index} className="cursor-pointer animate-in fade-in-0 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
              <CardContent className="p-4">
                {/* Image placeholder */}
                <Skeleton className="aspect-square w-full rounded-lg mb-3" />

                {/* Title */}
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />

                {/* Brand */}
                <Skeleton className="h-3 w-1/2 mb-2" />

                {/* Balance */}
                <Skeleton className="h-3 w-1/3 mb-3" />

                {/* Status badge and button */}
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-8 w-12 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3 pb-6">
          {Array.from({ length: count }).map((_, index) => (
            <Card key={index} className="cursor-pointer animate-in fade-in-0 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  {/* Image placeholder */}
                  <Skeleton className="w-16 h-16 rounded-lg" />

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>

                  {/* Right side content */}
                  <div className="text-right space-y-2">
                    <Skeleton className="h-6 w-16 ml-auto" />
                    <Skeleton className="h-5 w-20 rounded-full ml-auto" />
                    <Skeleton className="h-8 w-12 rounded ml-auto" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}