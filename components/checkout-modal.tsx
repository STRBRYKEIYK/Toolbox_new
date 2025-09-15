"use client"

import { useState } from "react"
import { X, Scan, User, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { apiService } from "@/lib/api-config"
import type { CartItem } from "@/app/page"

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onConfirmCheckout: (userId: string) => void
  isCommitting?: boolean
}

export function CheckoutModal({ isOpen, onClose, items, onConfirmCheckout, isCommitting = false }: CheckoutModalProps) {
  const [userId, setUserId] = useState("")
  const [isScanning, setIsScanning] = useState(false)

  if (!isOpen) return null

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = items.reduce((sum, item) => sum + item.quantity * 10, 0) // Assuming $10 per item
  const apiConfig = apiService.getConfig()

  const handleScanBarcode = () => {
    setIsScanning(true)
    // Simulate barcode scanning
    setTimeout(() => {
      const mockUserId = `USER${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, "0")}`
      setUserId(mockUserId)
      setIsScanning(false)
    }, 2000)
  }

  const handleConfirm = () => {
    if (!userId.trim()) {
      alert("Please enter or scan a User ID to proceed.")
      return
    }
    onConfirmCheckout(userId)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold dark:text-slate-100">Checkout Summary</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isCommitting}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center space-x-2">
              {apiConfig.isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">API Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">API Disconnected</span>
                </>
              )}
            </div>
            <Badge variant={apiConfig.isConnected ? "default" : "secondary"} className="text-xs">
              {apiConfig.isConnected ? "Changes will be committed to API" : "Local checkout only"}
            </Badge>
          </div>

          {/* Order Summary */}
          <div>
            <h3 className="font-semibold mb-3 dark:text-slate-100">Order Summary</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-600"
                >
                  <div className="flex-1">
                    <p className="font-medium dark:text-slate-100">{item.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {item.brand} • {item.itemType}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      Balance: {item.balance} → {Math.max(0, item.balance - item.quantity)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium dark:text-slate-100">Qty: {item.quantity}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">${(item.quantity * 10).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="dark:text-slate-300">Total Items:</span>
              <span className="font-medium dark:text-slate-100">{totalItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-slate-300">Unique Products:</span>
              <span className="font-medium dark:text-slate-100">{items.length}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span className="dark:text-slate-100">Total Amount:</span>
              <span className="dark:text-slate-100">${totalValue.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* User ID Input */}
          <div className="space-y-4">
            <Label htmlFor="userId" className="text-base font-semibold dark:text-slate-100">
              User ID <span className="text-red-500">*</span>
            </Label>

            <div className="flex space-x-2">
              <div className="flex-1">
                <Input
                  id="userId"
                  placeholder="Enter User ID manually"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                  disabled={isCommitting}
                />
              </div>
              <Button
                variant="outline"
                onClick={handleScanBarcode}
                disabled={isScanning || isCommitting}
                className="px-4 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700 bg-transparent"
              >
                {isScanning ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    <span>Scanning...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Scan className="w-4 h-4" />
                    <span>Scan</span>
                  </div>
                )}
              </Button>
            </div>

            <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
              <User className="w-4 h-4" />
              <span>You can manually type the User ID or scan their barcode</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCommitting}
              className="flex-1 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!userId.trim() || isCommitting}
              className="flex-1 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
            >
              {isCommitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Committing...</span>
                </div>
              ) : (
                "Confirm Checkout"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
