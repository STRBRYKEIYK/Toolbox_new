'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { 
  Wifi, 
  WifiOff, 
  Download, 
  RefreshCw, 
  HardDrive, 
  Clock, 
  Smartphone,
  Trash2,
  AlertCircle,
  CheckCircle,
  Cloud,
  CloudOff
} from 'lucide-react'
import { useOfflineManager } from '../hooks/use-offline-manager'
import { useToast } from '../hooks/use-toast'

interface OfflineStatusProps {
  className?: string
  showDetails?: boolean
}

export function OfflineStatus({ className = "", showDetails = false }: OfflineStatusProps) {
  const { 
    syncStatus, 
    offlineQueue, 
    getCacheStatus, 
    clearOfflineData, 
    prefetchData,
    isOffline,
    isReady 
  } = useOfflineManager()
  const { toast } = useToast()

  const handleRefreshCache = async () => {
    await getCacheStatus()
    toast({
      title: "📊 Cache Updated",
      description: "Cache status has been refreshed.",
    })
  }

  const handleClearData = async () => {
    await clearOfflineData()
  }

  const handlePrefetchData = async () => {
    await prefetchData()
  }

  // Status indicator component
  const StatusIndicator = () => (
    <div className={`flex items-center space-x-2 ${className}`}>
      {isOffline ? (
        <>
          <WifiOff className="w-4 h-4 text-orange-500" />
          <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
            Offline
          </Badge>
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          <Badge variant="default" className="bg-green-600 text-white dark:bg-green-500">
            Online
          </Badge>
        </>
      )}
      
      {syncStatus.syncInProgress && (
        <div className="flex items-center space-x-1">
          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
          <span className="text-xs text-blue-600 dark:text-blue-400">Syncing...</span>
        </div>
      )}
      
      {offlineQueue > 0 && (
        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
          {offlineQueue} queued
        </Badge>
      )}
    </div>
  )

  if (!showDetails) {
    return <StatusIndicator />
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="p-2">
          <StatusIndicator />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <span>Offline Status & PWA Info</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Connection Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center space-x-2">
                {isOffline ? (
                  <CloudOff className="w-4 h-4 text-orange-500" />
                ) : (
                  <Cloud className="w-4 h-4 text-green-500" />
                )}
                <span>Connection Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Network:</span>
                <div className="flex items-center space-x-2">
                  {isOffline ? (
                    <>
                      <WifiOff className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-orange-600 dark:text-orange-400">Offline</span>
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400">Online</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Service Worker:</span>
                <div className="flex items-center space-x-2">
                  {isReady ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400">Ready</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-orange-600 dark:text-orange-400">Loading</span>
                    </>
                  )}
                </div>
              </div>

              {syncStatus.lastSync && (
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Sync:</span>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {syncStatus.lastSync.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cache Status */}
          {syncStatus.cacheStatus && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-blue-500" />
                  <span>Cached Data</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <span className="text-gray-600 dark:text-gray-400">API Cache:</span>
                    <div className="font-mono text-blue-600 dark:text-blue-400">
                      {syncStatus.cacheStatus.api} items
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-gray-600 dark:text-gray-400">Static Assets:</span>
                    <div className="font-mono text-blue-600 dark:text-blue-400">
                      {syncStatus.cacheStatus.static} items
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Cached:</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">
                      {syncStatus.cacheStatus.total} items
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(syncStatus.cacheStatus.total * 10, 100)} 
                    className="h-2" 
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sync Queue */}
          {offlineQueue > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-yellow-500" />
                  <span>Pending Sync</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Queued Actions:</span>
                  <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                    {offlineQueue} pending
                  </Badge>
                </div>
                {syncStatus.syncInProgress && (
                  <div className="mt-2 flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Syncing changes...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p><strong>📱 PWA Features:</strong> This app works offline and can be installed as a native app</p>
              <p><strong>📦 Smart Caching:</strong> Products and data are cached for offline warehouse use</p>
              <p><strong>🔄 Auto Sync:</strong> Changes sync automatically when connection returns</p>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshCache}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Status</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrefetchData}
                disabled={isOffline}
                className="flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Cache Data</span>
              </Button>
            </div>
            
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleClearData}
              className="w-full flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Offline Data</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Simplified status indicator for header use
export function OfflineIndicator({ className = "" }: { className?: string }) {
  return <OfflineStatus className={className} showDetails={false} />
}

// Full status panel for settings/debugging
export function OfflineStatusPanel({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <OfflineStatus showDetails={true} />
    </div>
  )
}