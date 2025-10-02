'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { PageLoader, OperationLoader, ConnectionStatus } from './enhanced-loaders'

interface LoadingState {
  page: boolean
  search: boolean
  cart: boolean
  barcode: boolean
  operation: {
    active: boolean
    type: string
    progress?: number | undefined
    message?: string | undefined
  }
}

interface LoadingContextType {
  loading: LoadingState
  setPageLoading: (loading: boolean) => void
  setSearchLoading: (loading: boolean) => void
  setCartLoading: (loading: boolean) => void
  setBarcodeLoading: (loading: boolean) => void
  setOperationLoading: (operation: string, progress?: number, message?: string) => void
  clearOperationLoading: () => void
  isOnline: boolean
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState<LoadingState>({
    page: false,
    search: false,
    cart: false,
    barcode: false,
    operation: {
      active: false,
      type: '',
      progress: undefined,
      message: undefined
    }
  })

  const [isOnline, setIsOnline] = useState(true)

  // Monitor connection status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  const setPageLoading = useCallback((pageLoading: boolean) => {
    setLoading(prev => ({ ...prev, page: pageLoading }))
  }, [])

  const setSearchLoading = useCallback((searchLoading: boolean) => {
    setLoading(prev => ({ ...prev, search: searchLoading }))
  }, [])

  const setCartLoading = useCallback((cartLoading: boolean) => {
    setLoading(prev => ({ ...prev, cart: cartLoading }))
  }, [])

  const setBarcodeLoading = useCallback((barcodeLoading: boolean) => {
    setLoading(prev => ({ ...prev, barcode: barcodeLoading }))
  }, [])

  const setOperationLoading = useCallback((operation: string, progress?: number, message?: string) => {
    setLoading(prev => ({
      ...prev,
      operation: {
        active: true,
        type: operation,
        progress: progress ?? undefined,
        message: message ?? undefined
      }
    }))
  }, [])

  const clearOperationLoading = useCallback(() => {
    setLoading(prev => ({
      ...prev,
      operation: {
        active: false,
        type: '',
        progress: undefined,
        message: undefined
      }
    }))
  }, [])

  const value: LoadingContextType = {
    loading,
    setPageLoading,
    setSearchLoading,
    setCartLoading,
    setBarcodeLoading,
    setOperationLoading,
    clearOperationLoading,
    isOnline
  }

  return (
    <LoadingContext.Provider value={value}>
      {children}
      
      {/* Global loading overlays */}
      {loading.page && <PageLoader />}
      {loading.operation.active && (
        <OperationLoader
          operation={loading.operation.type}
          {...(loading.operation.progress !== undefined && { progress: loading.operation.progress })}
          {...(loading.operation.message !== undefined && { message: loading.operation.message })}
        />
      )}
      <ConnectionStatus isOnline={isOnline} />
    </LoadingContext.Provider>
  )
}

// Hook for simulating realistic loading times
export function useRealisticLoading() {
  const { setOperationLoading, clearOperationLoading } = useLoading()

  const simulateOperation = useCallback(async (
    operationType: string,
    duration: number = 2000,
    progressSteps: boolean = true
  ) => {
    if (progressSteps) {
      // Simulate progress steps
      setOperationLoading(operationType, 0, 'Starting...')
      
      const steps = 10
      const stepDelay = duration / steps
      
      for (let i = 1; i <= steps; i++) {
        await new Promise(resolve => setTimeout(resolve, stepDelay))
        const progress = (i / steps) * 100
        
        let message = 'Processing...'
        if (i === 1) message = 'Initializing...'
        else if (i < steps / 2) message = 'Processing data...'
        else if (i < steps * 0.8) message = 'Preparing results...'
        else if (i < steps) message = 'Finalizing...'
        else message = 'Complete!'
        
        setOperationLoading(operationType, progress, message)
      }
    } else {
      // Simple loading without progress
      setOperationLoading(operationType, undefined, 'Processing...')
      await new Promise(resolve => setTimeout(resolve, duration))
    }
    
    clearOperationLoading()
  }, [setOperationLoading, clearOperationLoading])

  return { simulateOperation }
}