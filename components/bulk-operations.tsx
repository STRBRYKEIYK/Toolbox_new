import React, { useState } from 'react'
import { 
  ShoppingCart, 
  Download, 
  Trash2, 
  X
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import { Badge } from '../components/ui/badge'
import { useLoading } from '../components/loading-context'
import { InlineLoader } from '../components/enhanced-loaders'
import type { Product } from '../lib/barcode-scanner'

interface BulkOperationsBarProps {
  selectedItems: string[]
  products: Product[]
  onSelectAll: (selectAll: boolean) => void
  onClearSelection: () => void
  onBulkAddToCart?: (products: Product[]) => void
  onBulkExport?: (products: Product[], format: 'csv' | 'xlsx' | 'json') => void
  onBulkDelete?: (productIds: string[]) => void
  className?: string
}

export function BulkOperationsBar({
  selectedItems,
  products,
  onSelectAll,
  onClearSelection,
  onBulkAddToCart,
  onBulkExport,
  onBulkDelete,
  className = ""
}: BulkOperationsBarProps) {
  const [isExporting, setIsExporting] = useState(false)
  const { setOperationLoading, clearOperationLoading } = useLoading()

  const selectedProducts = products.filter(product => selectedItems.includes(product.id))
  const allSelected = products.length > 0 && selectedItems.length === products.length
  const someSelected = selectedItems.length > 0 && selectedItems.length < products.length

  const handleBulkAddToCart = () => {
    if (onBulkAddToCart && selectedProducts.length > 0) {
      const availableProducts = selectedProducts.filter(p => p.status !== 'out-of-stock')
      if (availableProducts.length > 0) {
        onBulkAddToCart(availableProducts)
      }
    }
  }

  const handleBulkExport = async (format: 'csv' | 'xlsx' | 'json') => {
    if (onBulkExport && selectedProducts.length > 0) {
      setIsExporting(true)
      
      // Show enhanced loading with progress
      const operationName = `Exporting ${selectedProducts.length} items to ${format.toUpperCase()}`
      setOperationLoading(operationName, 0, 'Preparing export...')
      
      try {
        // Simulate progress steps for better UX
        setOperationLoading(operationName, 25, 'Processing items...')
        await new Promise(resolve => setTimeout(resolve, 500))
        
        setOperationLoading(operationName, 75, 'Generating file...')
        await onBulkExport(selectedProducts, format)
        
        setOperationLoading(operationName, 100, 'Complete!')
        await new Promise(resolve => setTimeout(resolve, 300))
        
      } finally {
        setIsExporting(false)
        clearOperationLoading()
      }
    }
  }

  const handleBulkDelete = () => {
    if (onBulkDelete && selectedItems.length > 0) {
      if (window.confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) {
        onBulkDelete(selectedItems)
        onClearSelection()
      }
    }
  }

  const availableItemsCount = selectedProducts.filter(p => p.status !== 'out-of-stock').length
  const outOfStockCount = selectedProducts.length - availableItemsCount

  if (selectedItems.length === 0) return null

  return (
    <div className={`bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={(checked) => onSelectAll(!!checked)}
              className="data-[state=indeterminate]:bg-blue-500 data-[state=indeterminate]:border-blue-500"
              {...(someSelected && !allSelected ? { 'data-state': 'indeterminate' } : {})}
            />
            <span className="text-sm font-medium">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            {availableItemsCount > 0 && (
              <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                {availableItemsCount} available
              </Badge>
            )}
            {outOfStockCount > 0 && (
              <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                {outOfStockCount} out of stock
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-xs px-2"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Add to Cart */}
          {availableItemsCount > 0 && onBulkAddToCart && (
            <Button
              onClick={handleBulkAddToCart}
              size="sm"
              className="flex items-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart ({availableItemsCount})
            </Button>
          )}

          {/* Export Options */}
          {onBulkExport && (
            <div className="flex items-center gap-1">
              <Button
                onClick={() => handleBulkExport('csv')}
                variant="outline"
                size="sm"
                disabled={isExporting}
                className="flex items-center gap-2 text-xs"
              >
                {isExporting ? <InlineLoader size="xs" /> : <Download className="w-3 h-3" />}
                CSV
              </Button>
              <Button
                onClick={() => handleBulkExport('xlsx')}
                variant="outline"
                size="sm"
                disabled={isExporting}
                className="flex items-center gap-2 text-xs"
              >
                {isExporting ? <InlineLoader size="xs" /> : <Download className="w-3 h-3" />}
                Excel
              </Button>
            </div>
          )}

          {/* Delete */}
          {onBulkDelete && (
            <Button
              onClick={handleBulkDelete}
              variant="outline"
              size="sm"
              className="flex items-center gap-2 text-red-600 hover:bg-red-50 hover:border-red-200 dark:text-red-400 dark:hover:bg-red-950 dark:hover:border-red-800"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper component for item selection checkbox
interface ItemSelectionCheckboxProps {
  productId: string
  isSelected: boolean
  onSelectionChange: (productId: string, selected: boolean) => void
  className?: string
}

export function ItemSelectionCheckbox({
  productId,
  isSelected,
  onSelectionChange,
  className = ""
}: ItemSelectionCheckboxProps) {
  return (
    <div className={`absolute top-2 left-2 z-10 ${className}`}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onSelectionChange(productId, !!checked)}
        className="bg-white/90 dark:bg-slate-800/90 border-2 shadow-sm"
      />
    </div>
  )
}

// Bulk selection hook for managing multi-select state
export function useBulkSelection() {
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const toggleSelection = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const selectAll = (items: string[], selectAll: boolean) => {
    setSelectedItems(selectAll ? items : [])
  }

  const clearSelection = () => {
    setSelectedItems([])
  }

  const isSelected = (itemId: string) => selectedItems.includes(itemId)

  return {
    selectedItems,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount: selectedItems.length
  }
}