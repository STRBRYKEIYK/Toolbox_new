"use client"

import { useState } from "react"
import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckoutModal } from "./checkout-modal"
import { CheckoutSuccessCountdown } from "./checkout-success-countdown"
import { apiService } from "@/lib/api-config"
import { useToast } from "@/hooks/use-toast"
import type { CartItem } from "@/app/page"

interface CartViewProps {
  items: CartItem[]
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemoveItem: (id: string) => void
  onReturnToBrowsing?: () => void // Added callback to return to dashboard
  onRefreshData?: () => void // Added callback to refresh inventory data
}

export function CartView({ items, onUpdateQuantity, onRemoveItem, onReturnToBrowsing, onRefreshData }: CartViewProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState("name-asc")
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [showSuccessCountdown, setShowSuccessCountdown] = useState(false) // Added success countdown state
  const [checkoutData, setCheckoutData] = useState<{ userId: string; totalItems: number } | null>(null) // Store checkout data for countdown
  const { toast } = useToast()

  const sortedItems = [...items].sort((a, b) => {
    switch (sortBy) {
      case "name-asc":
        return a.name.localeCompare(b.name)
      case "name-desc":
        return b.name.localeCompare(a.name)
      default:
        return 0
    }
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(items.map((item) => item.id)))
    } else {
      setSelectedItems(new Set())
    }
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedItems(newSelected)
  }

  const handleBulkDelete = () => {
    selectedItems.forEach((id) => onRemoveItem(id))
    setSelectedItems(new Set())
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const allSelected = items.length > 0 && selectedItems.size === items.length

  const handleCheckout = () => {
    if (items.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Your cart is empty. Add items to proceed with checkout.",
        variant: "destructive",
      })
      return
    }
    setIsCheckoutOpen(true)
  }

  const handleConfirmCheckout = async (userId: string) => {
    setIsCommitting(true)

    try {
      console.log("[v0] Starting checkout process...")

      const itemUpdates = items.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        itemType: item.itemType,
        location: item.location,
        balance: Math.max(0, item.balance - item.quantity), // Reduce balance by quantity taken
        status:
          item.balance - item.quantity > 10
            ? "in-stock"
            : item.balance - item.quantity > 0
              ? "low-stock"
              : "out-of-stock",
      }))

      console.log("[v0] Item updates prepared:", itemUpdates)

      const apiConfig = apiService.getConfig()
      if (apiConfig.isConnected) {
        try {
          await apiService.commitItemChanges(itemUpdates)
          console.log("[v0] Successfully committed changes to API")

          // Try to log the transaction for audit trail
          try {
            await apiService.logTransaction({
              userId,
              items: itemUpdates,
              totalItems,
              timestamp: new Date().toISOString(),
            })
          } catch (transactionError) {
            console.log("[v0] Transaction logging failed (non-critical):", transactionError)
          }

          toast({
            title: "Checkout Successful! ✅",
            description: `${totalItems} items processed. API updated successfully.`,
          })

          // Trigger data refresh to update inventory
          if (onRefreshData) {
            console.log("[v0] Triggering inventory data refresh...")
            onRefreshData()
          }
        } catch (apiError) {
          console.error("[v0] API commit failed:", apiError)

          // Show specific error message based on the error
          const errorMessage = apiError instanceof Error && apiError.message.includes("API might not support inventory updates")
            ? "API endpoints for inventory updates are not available yet. Items removed from cart locally."
            : "API commit failed, but checkout logged locally."

          toast({
            title: "Checkout Completed (Local Only) ⚠️",
            description: `${errorMessage} User: ${userId}`,
            variant: "default", // Changed from destructive since it's not really an error
          })

          // Still trigger refresh in case API has some data
          if (onRefreshData) {
            console.log("[v0] Triggering inventory data refresh...")
            onRefreshData()
          }
        }
      } else {
        console.log("[v0] API not connected, logging checkout locally only")

        toast({
          title: "Checkout Completed (Local Only) 📝",
          description: `API not connected. User: ${userId}, Total: ${totalItems} items`,
        })
      }

      const checkoutSummary = {
        userId,
        totalItems: totalItems,
        itemCount: items.length,
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          brand: item.brand,
          originalBalance: item.balance,
          newBalance: Math.max(0, item.balance - item.quantity),
        })),
        timestamp: new Date().toISOString(),
        apiCommitted: apiConfig.isConnected,
        itemUpdates: itemUpdates,
      }

      console.log("[v0] Checkout completed:", checkoutSummary)

      setIsCheckoutOpen(false)

      setCheckoutData({ userId, totalItems })
      setShowSuccessCountdown(true)
    } catch (error) {
      console.error("[v0] Checkout process failed:", error)

      toast({
        title: "Checkout Failed",
        description: "An error occurred during checkout. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCommitting(false)
    }
  }

  const handleCountdownComplete = () => {
    setShowSuccessCountdown(false)
    setCheckoutData(null)

    // Clear cart items
    items.forEach((item) => onRemoveItem(item.id))

    // Return to browsing/dashboard view
    if (onReturnToBrowsing) {
      onReturnToBrowsing()
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-slate-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Toolbox</h1>
          <Badge variant="secondary" className="dark:bg-slate-700 dark:text-slate-100">
            {items.length} items
          </Badge>
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 dark:text-slate-100">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cart Items */}
      <div className="space-y-4 mb-6">
        {sortedItems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-lg">Your toolbox is empty</p>
              <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                Add items from the dashboard to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  {/* Checkbox */}
                  <Checkbox
                    checked={selectedItems.has(item.id)}
                    onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                  />

                  {/* Image */}
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs">
                    image here
                  </div>

                  {/* Item Details */}
                  <div className="flex-1">
                    <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">{item.name}</h3>
                    <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                      <p>Brand: {item.brand}</p>
                      <p>Item Type: {item.itemType}</p>
                      <p>Location: {item.location}</p>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
                      BAL: {item.balance.toString().padStart(2, "0")}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Available</p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-8 h-8 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>

                    <div className="w-12 text-center font-medium dark:text-slate-100">
                      {item.quantity.toString().padStart(2, "0")}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      disabled={item.quantity >= item.balance}
                      className="w-8 h-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Footer */}
      {items.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              {/* Bulk Actions */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
                  <span className="text-sm dark:text-slate-300">Select all ({selectedItems.size})</span>
                </div>

                {selectedItems.size > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkDelete}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 bg-transparent"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>

              {/* Summary and Checkout */}
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-slate-600 dark:text-slate-400">Total Items</p>
                  <p className="text-lg font-bold dark:text-slate-100">({totalItems})</p>
                </div>

                <Button
                  size="lg"
                  className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
                  onClick={handleCheckout}
                  disabled={isCommitting}
                >
                  {isCommitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    "Proceed to checkout"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={items}
        onConfirmCheckout={handleConfirmCheckout}
        isCommitting={isCommitting}
      />

      <CheckoutSuccessCountdown
        isOpen={showSuccessCountdown}
        onComplete={handleCountdownComplete}
        userId={checkoutData?.userId || ""}
        totalItems={checkoutData?.totalItems || 0}
        countdownSeconds={5}
      />
    </div>
  )
}
