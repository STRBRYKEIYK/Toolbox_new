'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useCartPersistence } from '@/hooks/use-cart-persistence'
import { Clock, Download, Upload, History, ShoppingCart, RefreshCw, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface CartRecoveryPanelProps {
  trigger?: React.ReactNode
}

export function CartRecoveryPanel({ trigger }: CartRecoveryPanelProps) {
  const { 
    cartState, 
    metadata, 
    history, 
    getCartSummary, 
    restoreFromHistory, 
    exportCart, 
    importCart,
    clearCart,
    refreshCart 
  } = useCartPersistence()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [importData, setImportData] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const { toast } = useToast()

  const handleExport = () => {
    try {
      const data = exportCart()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `toolbox-cart-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast({
        title: "Cart Exported",
        description: "Cart backup downloaded successfully",
      })
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Unable to export cart data",
        variant: "destructive",
      })
    }
  }

  const handleImport = async () => {
    if (!importData.trim()) return
    
    setIsImporting(true)
    try {
      const success = await importCart(importData)
      if (success) {
        setImportData('')
        setIsDialogOpen(false)
      }
    } finally {
      setIsImporting(false)
    }
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setImportData(content)
    }
    reader.readAsText(file)
  }

  const handleRestoreFromHistory = async (sessionId: string) => {
    const success = await restoreFromHistory(sessionId)
    if (success) {
      setIsDialogOpen(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const summary = getCartSummary()

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="flex items-center gap-2">
      <History className="w-4 h-4" />
      Cart Recovery
    </Button>
  )

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Cart Persistence & Recovery
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Cart Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Current Cart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cartState ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Items:</span> {summary.itemCount}
                    </div>
                    <div>
                      <span className="font-medium">Session:</span> {summary.sessionAge}
                    </div>
                    {metadata && (
                      <>
                        <div>
                          <span className="font-medium">Created:</span> {formatDate(metadata.createdAt)}
                        </div>
                        <div>
                          <span className="font-medium">Last Access:</span> {formatDate(metadata.lastAccessedAt)}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={refreshCart}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </Button>
                    
                    <Button
                      onClick={() => clearCart()}
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear Cart
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-500">
                  No active cart session
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export & Import */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Backup & Restore</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={!cartState || cartState.items.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Export Cart
                </Button>
                
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                    id="cart-import-file"
                  />
                  <label htmlFor="cart-import-file">
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                      asChild
                    >
                      <span>
                        <Upload className="w-4 h-4" />
                        Import File
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              {importData && (
                <div className="space-y-2">
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste cart backup JSON data here..."
                    className="w-full h-24 p-2 border rounded text-xs font-mono"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => setImportData('')}
                      variant="outline"
                      size="sm"
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={handleImport}
                      size="sm"
                      disabled={isImporting}
                    >
                      {isImporting ? 'Importing...' : 'Import Cart'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Cart History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {history.map((historyItem) => (
                    <div
                      key={historyItem.sessionId}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-sm">
                            {historyItem.totalItems} item{historyItem.totalItems !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDate(historyItem.lastUpdated)}
                          </div>
                        </div>
                        
                        <Badge variant="secondary" className="text-xs">
                          {historyItem.sessionId.includes('history_') ? 'Auto-saved' : 'Manual'}
                        </Badge>
                      </div>
                      
                      <Button
                        onClick={() => handleRestoreFromHistory(historyItem.sessionId)}
                        size="sm"
                        variant="outline"
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-slate-500">
                  No cart history available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Session Info */}
          {metadata && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Session Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Platform:</span> {metadata.deviceInfo.platform}
                  </div>
                  <div>
                    <span className="font-medium">Browser:</span> {
                      metadata.deviceInfo.userAgent.includes('Chrome') ? 'Chrome' :
                      metadata.deviceInfo.userAgent.includes('Firefox') ? 'Firefox' :
                      metadata.deviceInfo.userAgent.includes('Safari') ? 'Safari' :
                      metadata.deviceInfo.userAgent.includes('Edge') ? 'Edge' :
                      'Unknown'
                    }
                  </div>
                  <div>
                    <span className="font-medium">Version:</span> {metadata.version}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Quick cart status indicator for header
 */
export function CartStatusIndicator() {
  const { cartState, isLoading } = useCartPersistence()
  
  if (isLoading) return null
  if (!cartState || cartState.items.length === 0) return null
  
  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      <ShoppingCart className="w-3 h-3" />
      {cartState.totalItems} item{cartState.totalItems !== 1 ? 's' : ''} saved
    </Badge>
  )
}