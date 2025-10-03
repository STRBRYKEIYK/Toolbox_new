'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Scan, 
  Play, 
  Pause, 
  Square, 
  Target, 
  Package, 
  Clock, 
  TrendingUp,
  Settings,
  History,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useAdvancedBarcodeScanner, BatchScanResult } from '@/hooks/use-advanced-barcode-scanner'
import { useCartPersistence } from '@/hooks/use-cart-persistence'
import type { Product } from '@/lib/barcode-scanner'

interface AdvancedBarcodeScannerProps {
  products: Product[]
  onProductScanned?: (product: Product) => void
  trigger?: React.ReactNode
}

export function AdvancedBarcodeScanner({ 
  products, 
  onProductScanned,
  trigger 
}: AdvancedBarcodeScannerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [manualInput, setManualInput] = useState('')
  const [scanMode, setScanMode] = useState<'single' | 'batch' | 'continuous'>('single')
  const [targetCount, setTargetCount] = useState(10)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [vibrateEnabled, setVibrateEnabled] = useState(true)
  
  const { addToCart } = useCartPersistence()
  
  const {
    isScanning,
    currentSession,
    scanHistory,
    scanProgress,
    startScanSession,
    processScan,
    finishScanSession,
    cancelScanSession,
    simulateScan,
    getStats
  } = useAdvancedBarcodeScanner(
    products,
    async (product, scanResult) => {
      // Auto-add to cart when product is found
      await addToCart(product, 1, `Scanned: ${scanResult.code}`)
      if (onProductScanned) {
        onProductScanned(product)
      }
    },
    (results: BatchScanResult) => {
      console.log('Batch scan complete:', results)
    },
    {
      mode: scanMode,
      targetCount,
      audioFeedback: audioEnabled,
      vibrateFeedback: vibrateEnabled
    }
  )

  const stats = getStats()

  // Handle manual input
  const handleManualScan = () => {
    if (manualInput.trim()) {
      // Auto-start session if not already scanning
      if (!isScanning && !currentSession) {
        startScanSession(scanMode)
      }
      
      processScan(manualInput.trim())
      setManualInput('')
    }
  }

  // Handle Enter key in manual input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualScan()
    }
  }

  // Format time duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const defaultTrigger = (
    <Button variant="outline" className="flex items-center gap-2">
      <Scan className="w-4 h-4" />
      Advanced Scanner
    </Button>
  )

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Advanced Barcode Scanner
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="scanner" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="scanner" className="flex items-center gap-2">
              <Scan className="w-4 h-4" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Batch Mode
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Scanner Tab */}
          <TabsContent value="scanner" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Scan className="w-5 h-5" />
                    Quick Scan Mode
                  </span>
                  <Badge variant={isScanning ? "default" : "secondary"}>
                    {isScanning ? 'Active' : 'Ready'}
                  </Badge>
                </CardTitle>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Enter product IDs manually or use the quick test buttons below. Sessions start automatically when you scan.
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Manual Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter barcode or product ID manually..."
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                    disabled={isScanning && scanMode !== 'continuous'}
                  />
                  <Button
                    onClick={handleManualScan}
                    disabled={!manualInput.trim() || (isScanning && scanMode !== 'continuous')}
                  >
                    Scan
                  </Button>
                </div>

                {/* Scan Controls */}
                <div className="flex items-center gap-2">
                  {!isScanning ? (
                    <>
                      <Button
                        onClick={() => startScanSession('single')}
                        className="flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start Single Scan
                      </Button>
                      <Button
                        onClick={() => startScanSession('continuous')}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Continuous Mode
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={finishScanSession}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Square className="w-4 h-4" />
                        Finish Session
                      </Button>
                      <Button
                        onClick={cancelScanSession}
                        variant="destructive"
                        className="flex items-center gap-2"
                      >
                        <Pause className="w-4 h-4" />
                        Cancel
                      </Button>
                    </>
                  )}
                </div>

                {/* Current Session Info */}
                {currentSession && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Mode:</span>
                          <Badge variant="outline" className="ml-2">
                            {currentSession.mode}
                          </Badge>
                        </div>
                        <div>
                          <span className="font-medium">Items Scanned:</span>
                          <span className="ml-2">{currentSession.results.length}</span>
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span>
                          <span className="ml-2">
                            {formatDuration(Date.now() - currentSession.startTime.getTime())}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Status:</span>
                          <Badge variant={currentSession.isActive ? "default" : "secondary"} className="ml-2">
                            {currentSession.isActive ? 'Active' : 'Completed'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Debug Info for Testing */}
                {products.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Quick Test ({products.length} products available)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        Try scanning these sample product IDs:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {products.slice(0, 8).map((product) => (
                          <Button
                            key={product.id}
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Auto-start session if not already scanning
                              if (!isScanning && !currentSession) {
                                startScanSession(scanMode)
                              }
                              
                              processScan(product.id)
                            }}
                            className="text-xs h-6"
                          >
                            {product.id}
                          </Button>
                        ))}
                      </div>
                      {products.length > 8 && (
                        <div className="text-xs text-gray-500 mt-1">
                          +{products.length - 8} more products available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Batch Mode Tab */}
          <TabsContent value="batch" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Batch Scanning Mode
                </CardTitle>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Scan multiple items efficiently. Set your target and start scanning!
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Target Count</label>
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      value={targetCount}
                      onChange={(e) => setTargetCount(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quick Presets</label>
                    <div className="flex gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTargetCount(5)}
                      >
                        5
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTargetCount(10)}
                      >
                        10
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTargetCount(25)}
                      >
                        25
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTargetCount(50)}
                      >
                        50
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Batch Progress */}
                {isScanning && scanMode === 'batch' && currentSession && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {currentSession.results.length} / {currentSession.targetCount || targetCount}
                      </span>
                    </div>
                    <Progress value={scanProgress} className="w-full" />
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    placeholder="Scan or enter barcode..."
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => {
                      if (manualInput.trim()) {
                        // Auto-start batch session if not already scanning
                        if (!isScanning && !currentSession) {
                          startScanSession('batch')
                        }
                        
                        processScan(manualInput.trim())
                        setManualInput('')
                      }
                    }} 
                    disabled={!manualInput.trim()}
                  >
                    Add to Batch
                  </Button>
                </div>

                <div className="flex gap-2">
                  {!isScanning ? (
                    <Button
                      onClick={() => startScanSession('batch')}
                      className="flex items-center gap-2"
                    >
                      <Target className="w-4 h-4" />
                      Start Batch Scan ({targetCount} items)
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={finishScanSession}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete Batch
                      </Button>
                      <Button
                        onClick={cancelScanSession}
                        variant="destructive"
                        className="flex items-center gap-2"
                      >
                        <AlertCircle className="w-4 h-4" />
                        Cancel Batch
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Scan History
                  </span>
                  <Badge variant="secondary">
                    {stats.totalSessions} session{stats.totalSessions !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{stats.totalScans}</p>
                          <p className="text-xs text-muted-foreground">Total Scans</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">{stats.averageScansPerSession}</p>
                          <p className="text-xs text-muted-foreground">Avg per Session</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <div>
                          <p className="text-2xl font-bold">{stats.totalSessions}</p>
                          <p className="text-xs text-muted-foreground">Sessions</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {scanHistory.length > 0 ? (
                    scanHistory.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {session.mode} scan - {session.results.length} items
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {session.startTime.toLocaleString()}
                            {session.endTime && (
                              <span className="ml-2">
                                ({formatDuration(session.endTime.getTime() - session.startTime.getTime())})
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={session.isActive ? "default" : "secondary"}>
                          {session.isActive ? 'Active' : 'Completed'}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No scan history available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Scanner Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Default Scan Mode</label>
                    <Select value={scanMode} onValueChange={(value: any) => setScanMode(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single Scan</SelectItem>
                        <SelectItem value="batch">Batch Scan</SelectItem>
                        <SelectItem value="continuous">Continuous Scan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Feedback Options</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Audio Feedback</p>
                      <p className="text-xs text-muted-foreground">Play sounds for scan events</p>
                    </div>
                    <Button
                      variant={audioEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAudioEnabled(!audioEnabled)}
                    >
                      {audioEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Haptic Feedback</p>
                      <p className="text-xs text-muted-foreground">Vibrate on scan events (mobile)</p>
                    </div>
                    <Button
                      variant={vibrateEnabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVibrateEnabled(!vibrateEnabled)}
                    >
                      {vibrateEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Test Scanner</h4>
                  <p className="text-xs text-muted-foreground">
                    Test the scanner with sample product IDs
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => simulateScan('test-product-1')}
                    >
                      Test Product 1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => simulateScan('test-product-2')}
                    >
                      Test Product 2
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => simulateScan('invalid-code')}
                    >
                      Test Invalid
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}