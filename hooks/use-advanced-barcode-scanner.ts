/**
 * Advanced Barcode Scanner System
 * Optimized for warehouse operations with batch scanning capabilities
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { useLoading } from '@/components/loading-context'
import type { Product } from '@/app/page'

export interface BarcodeResult {
  code: string
  format?: string
  timestamp: Date
  confidence?: number
}

export interface BatchScanResult {
  scanned: BarcodeResult[]
  processed: number
  errors: string[]
  duplicates: number
  sessionId: string
}

export interface ScanSession {
  id: string
  startTime: Date
  endTime?: Date | undefined
  results: BarcodeResult[]
  mode: 'single' | 'batch' | 'continuous'
  targetCount?: number | undefined
  isActive: boolean
}

interface AdvancedBarcodeScannerOptions {
  mode?: 'single' | 'batch' | 'continuous'
  targetCount?: number
  autoAddToCart?: boolean
  duplicateHandling?: 'allow' | 'skip' | 'warn'
  scanDelay?: number
  audioFeedback?: boolean
  vibrateFeedback?: boolean
}

/**
 * Advanced barcode scanner hook with batch processing
 */
export function useAdvancedBarcodeScanner(
  products: Product[],
  onProductFound?: (product: Product, scanResult: BarcodeResult) => void,
  onBatchComplete?: (results: BatchScanResult) => void,
  options: AdvancedBarcodeScannerOptions = {}
) {
  const {
    mode = 'single',
    targetCount = 10,
    duplicateHandling = 'warn',
    scanDelay = 300,
    audioFeedback = true,
    vibrateFeedback = true
  } = options

  const [isScanning, setIsScanning] = useState(false)
  const [currentSession, setCurrentSession] = useState<ScanSession | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanSession[]>([])
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null)
  const [scanProgress, setScanProgress] = useState(0)
  
  const { toast } = useToast()
  const { setBarcodeLoading } = useLoading()
  const scanTimeoutRef = useRef<NodeJS.Timeout>()
  const audioContextRef = useRef<AudioContext>()

  // Initialize audio context for feedback
  useEffect(() => {
    if (audioFeedback && !audioContextRef.current) {
      try {
        audioContextRef.current = new AudioContext()
      } catch (error) {
        console.warn('Audio feedback not available:', error)
      }
    }
  }, [audioFeedback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  /**
   * Play audio feedback for scan events
   */
  const playAudioFeedback = useCallback((type: 'success' | 'error' | 'duplicate') => {
    if (!audioFeedback || !audioContextRef.current) return

    try {
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      // Different frequencies for different events
      switch (type) {
        case 'success':
          oscillator.frequency.setValueAtTime(800, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1)
          break
        case 'error':
          oscillator.frequency.setValueAtTime(300, ctx.currentTime)
          break
        case 'duplicate':
          oscillator.frequency.setValueAtTime(600, ctx.currentTime)
          oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1)
          break
      }

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.1)
    } catch (error) {
      console.warn('Audio feedback error:', error)
    }
  }, [audioFeedback])

  /**
   * Trigger vibration feedback
   */
  const triggerVibration = useCallback((pattern: number | number[]) => {
    if (vibrateFeedback && navigator.vibrate) {
      try {
        navigator.vibrate(pattern)
      } catch (error) {
        console.warn('Vibration not supported:', error)
      }
    }
  }, [vibrateFeedback])

  /**
   * Find product by barcode or ID
   */
  const findProduct = useCallback((code: string): Product | null => {
    const searchCode = code.trim().toUpperCase()
    
    // First, try to find by exact ID match (case-insensitive)
    let product = products.find(p => p.id.toUpperCase() === searchCode)
    
    if (!product) {
      // Try to find by partial ID match (for barcodes that might have prefixes/suffixes)
      product = products.find(p => 
        p.id.toUpperCase().includes(searchCode) || 
        searchCode.includes(p.id.toUpperCase())
      )
    }
    
    if (!product) {
      // Try to find by name (case-insensitive partial match)
      product = products.find(p => 
        p.name.toUpperCase().includes(searchCode) ||
        searchCode.includes(p.name.toUpperCase())
      )
    }
    
    if (!product) {
      // Try to find by brand
      product = products.find(p => 
        p.brand.toUpperCase().includes(searchCode) ||
        searchCode.includes(p.brand.toUpperCase())
      )
    }

    // Debug logging to help troubleshoot
    if (product) {
      console.log(`[Scanner] Found product for code "${code}":`, product.id, product.name)
    } else {
      console.log(`[Scanner] No product found for code "${code}". Available products:`, products.length)
      if (products.length > 0) {
        console.log(`[Scanner] Sample product IDs:`, products.slice(0, 5).map(p => p.id))
      }
    }

    return product || null
  }, [products])

  /**
   * Start a new scanning session
   */
  const startScanSession = useCallback((sessionMode: typeof mode = mode) => {
    const session: ScanSession = {
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      results: [],
      mode: sessionMode,
      ...(sessionMode === 'batch' && { targetCount }),
      isActive: true
    }
    
    setCurrentSession(session)
    setIsScanning(true)
    setScanProgress(0)
    setBarcodeLoading(true)
    setLastScanTime(new Date())

    toast({
      title: `${sessionMode.charAt(0).toUpperCase() + sessionMode.slice(1)} Scan Started`,
      description: sessionMode === 'batch' 
        ? `Target: ${targetCount} items` 
        : 'Scan items one by one',
    })

    return session
  }, [mode, targetCount, setBarcodeLoading, toast])

  /**
   * Process a scanned barcode
   */
  const processScan = useCallback((code: string) => {
    // Auto-create session if none exists
    let session = currentSession
    if (!session || !session.isActive) {
      console.log('[Scanner] Auto-creating scan session for code:', code)
      session = {
        id: `auto_scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startTime: new Date(),
        results: [],
        mode: 'single',
        isActive: true
      }
      setCurrentSession(session)
      setIsScanning(true)
      setBarcodeLoading(true)
    }

    const now = new Date()
    const timeSinceLastScan = lastScanTime ? now.getTime() - lastScanTime.getTime() : 1000

    // Prevent rapid duplicate scans
    if (timeSinceLastScan < scanDelay) {
      return
    }

    setLastScanTime(now)

    const scanResult: BarcodeResult = {
      code: code.trim(),
      timestamp: now,
      confidence: 1.0
    }

    // Check for duplicates in current session
    const isDuplicate = session.results.some(r => r.code === scanResult.code)
    
    if (isDuplicate && duplicateHandling === 'skip') {
      playAudioFeedback('duplicate')
      triggerVibration(100)
      toast({
        title: "Duplicate Scan",
        description: `${scanResult.code} already scanned in this session`,
        variant: "destructive",
      })
      return
    }

    // Find the product
    const product = findProduct(scanResult.code)
    
    if (!product) {
      playAudioFeedback('error')
      triggerVibration([100, 100, 100])
      toast({
        title: "Product Not Found",
        description: `No product found for: ${scanResult.code}`,
        variant: "destructive",
      })
      return
    }

    // Success feedback
    playAudioFeedback('success')
    triggerVibration(50)

    // Update session
    const updatedSession = {
      ...session,
      results: [...session.results, scanResult]
    }
    setCurrentSession(updatedSession)

    // Update progress
    if (session.mode === 'batch' && session.targetCount) {
      const progress = (updatedSession.results.length / session.targetCount) * 100
      setScanProgress(Math.min(progress, 100))
    }

    // Notify handlers
    if (onProductFound) {
      onProductFound(product, scanResult)
    }

    // Minimal success feedback (removed toast to avoid blocking clicks)

    // Check if batch is complete
    if (session.mode === 'batch' && 
        session.targetCount && 
        updatedSession.results.length >= session.targetCount) {
      finishScanSession()
    }

  }, [currentSession, lastScanTime, scanDelay, duplicateHandling, findProduct, 
      onProductFound, playAudioFeedback, triggerVibration, toast])

  /**
   * Finish the current scanning session
   */
  const finishScanSession = useCallback(() => {
    if (!currentSession) return

    const completedSession: ScanSession = {
      ...currentSession,
      endTime: new Date(),
      isActive: false
    }

    setCurrentSession(completedSession)
    setIsScanning(false)
    setBarcodeLoading(false)
    setScanHistory(prev => [completedSession, ...prev.slice(0, 9)]) // Keep last 10 sessions

    // Generate batch results
    const batchResult: BatchScanResult = {
      scanned: completedSession.results,
      processed: completedSession.results.length,
      errors: [], // Could be enhanced to track errors
      duplicates: completedSession.results.length - new Set(completedSession.results.map(r => r.code)).size,
      sessionId: completedSession.id
    }

    if (onBatchComplete) {
      onBatchComplete(batchResult)
    }

    const duration = completedSession.endTime ? 
      completedSession.endTime.getTime() - completedSession.startTime.getTime() : 
      0
    const itemsPerMinute = duration > 0 ? 
      (completedSession.results.length / (duration / 60000)).toFixed(1) : 
      '0'

    toast({
      title: "Scan Session Complete",
      description: `${completedSession.results.length} items scanned (${itemsPerMinute}/min)`,
    })

    setScanProgress(0)
  }, [currentSession, setBarcodeLoading, onBatchComplete, toast])

  /**
   * Cancel the current scanning session
   */
  const cancelScanSession = useCallback(() => {
    if (currentSession) {
      setCurrentSession(null)
      setIsScanning(false)
      setBarcodeLoading(false)
      setScanProgress(0)
      
      toast({
        title: "Scan Cancelled",
        description: "Scanning session was cancelled",
        variant: "destructive",
      })
    }
  }, [currentSession, setBarcodeLoading, toast])

  /**
   * Simulate barcode scan (for testing)
   */
  const simulateScan = useCallback((code: string) => {
    processScan(code)
  }, [processScan])

  /**
   * Get scanning statistics
   */
  const getStats = useCallback(() => {
    const totalScans = scanHistory.reduce((sum, session) => sum + session.results.length, 0)
    const totalSessions = scanHistory.length
    const averageScansPerSession = totalSessions > 0 ? (totalScans / totalSessions).toFixed(1) : '0'
    
    return {
      totalScans,
      totalSessions,
      averageScansPerSession,
      currentSessionProgress: scanProgress,
      isActiveSession: isScanning
    }
  }, [scanHistory, scanProgress, isScanning])

  return {
    // State
    isScanning,
    currentSession,
    scanHistory,
    scanProgress,
    
    // Actions
    startScanSession,
    processScan,
    finishScanSession,
    cancelScanSession,
    simulateScan,
    
    // Utilities
    getStats,
    findProduct
  }
}