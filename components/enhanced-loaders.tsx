import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Wifi, WifiOff } from 'lucide-react'

// Enhanced page loading screen for initial app load
export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 mx-auto bg-primary rounded-lg flex items-center justify-center animate-pulse">
            <div className="w-8 h-8 bg-white rounded-sm animate-pulse"></div>
          </div>
          <Loader2 className="w-6 h-6 absolute -bottom-1 -right-1 text-primary animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            Loading Toolbox
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Preparing your inventory workspace...
          </p>
        </div>
        <div className="w-48 mx-auto">
          <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse w-3/4 transition-all duration-1000"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Search loading with real-time feedback
export function SearchLoader({ query }: { query?: string }) {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        {query ? `Searching for "${query}"...` : 'Searching inventory...'}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-4">
              <Skeleton className="aspect-square rounded-lg mb-3" />
              <Skeleton className="h-4 mb-2" />
              <Skeleton className="h-3 mb-2 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Connection status indicator
export function ConnectionStatus({ isOnline }: { isOnline: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-medium transition-all duration-300 ${
      isOnline 
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3" />
          Online
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          Offline
        </>
      )}
    </div>
  )
}

// Cart loading state
export function CartLoader() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm text-slate-600 dark:text-slate-400">Loading cart...</span>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-16" />
          </div>
        </Card>
      ))}
    </div>
  )
}

// Barcode scanning loader
export function BarcodeScanLoader({ isScanning }: { isScanning: boolean }) {
  if (!isScanning) return null
  
  return (
    <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg text-center space-y-4">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-lg"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-lg animate-spin"></div>
          <div className="absolute inset-2 bg-primary/10 rounded flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Scanning...</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">Point at barcode to scan</p>
        </div>
      </div>
    </div>
  )
}

// Data operation loader (for exports, bulk operations, etc.)
export function OperationLoader({ 
  operation, 
  progress, 
  message 
}: { 
  operation: string
  progress?: number
  message?: string 
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4 space-y-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin mb-4" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">{operation}</h3>
          {message && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{message}</p>
          )}
        </div>
        
        {progress !== undefined && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Simple inline loader for buttons and small components
export function InlineLoader({ size = 'sm', className = '' }: { size?: 'xs' | 'sm' | 'md', className?: string }) {
  const sizeMap = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4', 
    md: 'w-5 h-5'
  }
  
  return (
    <Loader2 className={`animate-spin ${sizeMap[size]} ${className}`} />
  )
}