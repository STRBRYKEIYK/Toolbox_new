'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  CartState, 
  CartMetadata,
  loadCartState, 
  saveCartState, 
  addToCart as persistAddToCart,
  removeFromCart as persistRemoveFromCart,
  updateCartItemQuantity as persistUpdateQuantity,
  clearCartState as persistClearCart,
  loadCartMetadata,
  getCartHistory,
  restoreCartFromHistory,
  exportCartData,
  importCartData
} from '../lib/cart-persistence'
import type { Product } from '../lib/barcode-scanner'
import { useToast } from './use-toast'

export interface UseCartPersistenceReturn {
  // State
  cartState: CartState | null
  metadata: CartMetadata | null
  isLoading: boolean
  
  // Actions
  addToCart: (product: Product, quantity?: number, notes?: string) => Promise<boolean>
  removeFromCart: (productId: string) => Promise<boolean>
  updateQuantity: (productId: string, quantity: number) => Promise<boolean>
  clearCart: () => Promise<boolean>
  
  // Session management
  refreshCart: () => void
  getCartSummary: () => { itemCount: number; totalValue: number; sessionAge: string }
  
  // History & recovery
  history: CartState[]
  restoreFromHistory: (sessionId: string) => Promise<boolean>
  
  // Import/Export
  exportCart: () => string
  importCart: (data: string) => Promise<boolean>
  
  // Utilities
  isItemInCart: (productId: string) => boolean
  getItemQuantity: (productId: string) => number
  hasUnsavedChanges: boolean
}

/**
 * Custom hook for managing cart persistence across browser sessions
 */
export function useCartPersistence(): UseCartPersistenceReturn {
  const [cartState, setCartState] = useState<CartState | null>(null)
  const [metadata, setMetadata] = useState<CartMetadata | null>(null)
  const [history, setHistory] = useState<CartState[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { toast } = useToast()

  // Load initial cart state
  useEffect(() => {
    const loadInitialState = async () => {
      setIsLoading(true)
      
      try {
        const loadedState = loadCartState()
        const loadedMetadata = loadCartMetadata()
        const loadedHistory = getCartHistory()
        
        setCartState(loadedState)
        setMetadata(loadedMetadata)
        setHistory(loadedHistory)
        
        if (loadedState && loadedState.items.length > 0) {
          const itemCount = loadedState.totalItems
          const sessionAge = getSessionAge(loadedState.lastUpdated)
          
          toast({
            title: "Cart Restored",
            description: `Found ${itemCount} item${itemCount !== 1 ? 's' : ''} from ${sessionAge}`,
            duration: 5000,
          })
        }
      } catch (error) {
        console.error('Failed to load cart state:', error)
        toast({
          title: "Cart Load Error",
          description: "Unable to restore previous cart. Starting fresh.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    loadInitialState()
  }, [toast])

  // Auto-save when cart changes
  useEffect(() => {
    if (hasUnsavedChanges && cartState) {
      const saveTimer = setTimeout(() => {
        saveCartState(cartState)
        setHasUnsavedChanges(false)
      }, 1000) // Auto-save after 1 second of inactivity
      
      return () => clearTimeout(saveTimer)
    }
    
    return undefined // Return undefined when no cleanup needed
  }, [cartState, hasUnsavedChanges])

  const addToCart = useCallback(async (product: Product, quantity: number = 1, notes?: string): Promise<boolean> => {
    try {
      const success = persistAddToCart(product, quantity, notes)
      if (success) {
        const updatedState = loadCartState()
        setCartState(updatedState)
        setHasUnsavedChanges(false) // persistAddToCart already saves
        
        // Only show toast for manual adds, not for barcode scans
        if (!notes || !notes.includes('barcode')) {
          toast({
            title: "Added to Cart",
            description: `${product.name} (${quantity}) added to cart`,
          })
        }
        
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to add to cart:', error)
      toast({
        title: "Add to Cart Failed",
        description: "Unable to add item to cart. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }, [toast])

  const removeFromCart = useCallback(async (productId: string): Promise<boolean> => {
    try {
      const success = persistRemoveFromCart(productId)
      if (success) {
        const updatedState = loadCartState()
        setCartState(updatedState)
        setHasUnsavedChanges(false)
        
        toast({
          title: "Removed from Cart",
          description: "Item removed from cart",
        })
        
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to remove from cart:', error)
      toast({
        title: "Remove Failed",
        description: "Unable to remove item from cart. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }, [toast])

  const updateQuantity = useCallback(async (productId: string, quantity: number): Promise<boolean> => {
    try {
      const success = persistUpdateQuantity(productId, quantity)
      if (success) {
        const updatedState = loadCartState()
        setCartState(updatedState)
        setHasUnsavedChanges(false)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to update quantity:', error)
      return false
    }
  }, [])

  const clearCart = useCallback(async (): Promise<boolean> => {
    try {
      const success = persistClearCart()
      if (success) {
        setCartState(null)
        setHasUnsavedChanges(false)
        
        toast({
          title: "Cart Cleared",
          description: "All items removed from cart",
        })
        
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to clear cart:', error)
      toast({
        title: "Clear Cart Failed",
        description: "Unable to clear cart. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }, [toast])

  const refreshCart = useCallback(() => {
    const updatedState = loadCartState()
    const updatedMetadata = loadCartMetadata()
    const updatedHistory = getCartHistory()
    
    setCartState(updatedState)
    setMetadata(updatedMetadata)
    setHistory(updatedHistory)
  }, [])

  const getCartSummary = useCallback(() => {
    if (!cartState) {
      return { itemCount: 0, totalValue: 0, sessionAge: 'No active cart' }
    }
    
    return {
      itemCount: cartState.totalItems,
      totalValue: cartState.totalValue,
      sessionAge: getSessionAge(cartState.lastUpdated)
    }
  }, [cartState])

  const restoreFromHistory = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const success = restoreCartFromHistory(sessionId)
      if (success) {
        refreshCart()
        toast({
          title: "Cart Restored",
          description: "Cart restored from history successfully",
        })
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to restore from history:', error)
      toast({
        title: "Restore Failed",
        description: "Unable to restore cart from history. Please try again.",
        variant: "destructive",
      })
      return false
    }
  }, [refreshCart, toast])

  const exportCart = useCallback((): string => {
    return exportCartData()
  }, [])

  const importCart = useCallback(async (data: string): Promise<boolean> => {
    try {
      const success = importCartData(data)
      if (success) {
        refreshCart()
        toast({
          title: "Cart Imported",
          description: "Cart imported successfully",
        })
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to import cart:', error)
      toast({
        title: "Import Failed",
        description: "Unable to import cart data. Please check the format.",
        variant: "destructive",
      })
      return false
    }
  }, [refreshCart, toast])

  const isItemInCart = useCallback((productId: string): boolean => {
    return cartState?.items.some(item => item.id === productId) ?? false
  }, [cartState])

  const getItemQuantity = useCallback((productId: string): number => {
    return cartState?.items.find(item => item.id === productId)?.quantity ?? 0
  }, [cartState])

  return {
    // State
    cartState,
    metadata,
    isLoading,
    
    // Actions
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    
    // Session management
    refreshCart,
    getCartSummary,
    
    // History & recovery
    history,
    restoreFromHistory,
    
    // Import/Export
    exportCart,
    importCart,
    
    // Utilities
    isItemInCart,
    getItemQuantity,
    hasUnsavedChanges
  }
}

/**
 * Calculate human-readable session age
 */
function getSessionAge(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
}