import type React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import { validateSearchQuery } from "../lib/validation"
import { 
  processBarcodeInput,
  type Product
} from "../lib/barcode-scanner"
import { Filter, Grid, List, Scan, ChevronDown, RefreshCw, Settings, Wifi, Download, FileText, FileSpreadsheet, Code, Plus, Package } from "lucide-react"
import { useLoading } from "./loading-context"
import { SearchLoader } from "./enhanced-loaders"
import { OfflineStatusPanel } from "./offline-status"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Checkbox } from "./ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { useToast } from "../hooks/use-toast"
import { apiService } from "../lib/api_service"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Label } from "./ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { exportToCSV, exportToXLSX, exportToJSON, prepareExportData, exportLogsToXLSX } from "../lib/export-utils"
import { EnhancedItemCard } from "./enhanced-item-card"
import { BulkOperationsBar, useBulkSelection } from "./bulk-operations"


interface DashboardViewProps {
  onAddToCart: (product: Product, quantity?: number, isFromBarcode?: boolean) => void
  onViewItem: (product: Product) => void
  searchQuery?: string
  onRefreshData?: (refreshFunction: () => void) => void
  apiUrl?: string
  onApiUrlChange?: (url: string) => void
  isConnected?: boolean
  // New props to accept state from parent
  products?: Product[]
  setProducts?: React.Dispatch<React.SetStateAction<Product[]>>
  isLoadingProducts?: boolean
  setIsLoadingProducts?: React.Dispatch<React.SetStateAction<boolean>>
  dataSource?: "api" | "cached"
  setDataSource?: React.Dispatch<React.SetStateAction<"api" | "cached">>
  lastFetchTime?: Date | null
  setLastFetchTime?: React.Dispatch<React.SetStateAction<Date | null>>
}

export function DashboardView({ 
  onAddToCart, 
  onViewItem, 
  searchQuery = "", 
  onRefreshData,
  apiUrl = "",
  onApiUrlChange,
  isConnected = false,
  // Parent state props
  products: parentProducts,
  setProducts: parentSetProducts,
  isLoadingProducts: parentIsLoadingData,
  setIsLoadingProducts: parentSetIsLoadingData,
  dataSource: parentDataSource,
  setDataSource: parentSetDataSource,
  lastFetchTime: parentLastFetchTime,
  setLastFetchTime: parentSetLastFetchTime
}: DashboardViewProps) {
  // Use parent state if available, otherwise fallback to local state
  const [localProducts, setLocalProducts] = useState<Product[]>([])
  const [localIsLoadingData, setLocalIsLoadingData] = useState(true)
  const [localDataSource, setLocalDataSource] = useState<"api" | "cached">("cached")
  const [localLastFetchTime, setLocalLastFetchTime] = useState<Date | null>(null)
  
  // Use parent state if provided, otherwise use local state
  const products = parentProducts ?? localProducts
  const setProducts = parentSetProducts ?? setLocalProducts
  const isLoadingData = parentIsLoadingData ?? localIsLoadingData
  const setIsLoadingData = parentSetIsLoadingData ?? setLocalIsLoadingData
  const dataSource = parentDataSource ?? localDataSource
  const setDataSource = parentSetDataSource ?? setLocalDataSource
  const lastFetchTime = parentLastFetchTime ?? localLastFetchTime
  const setLastFetchTime = parentSetLastFetchTime ?? setLocalLastFetchTime
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl)

  // Keep tempApiUrl in sync with apiUrl prop
  useEffect(() => {
    setTempApiUrl(apiUrl)
  }, [apiUrl])

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [showAvailable, setShowAvailable] = useState(true)
  const [showUnavailable, setShowUnavailable] = useState(true)
  const [localSearchQuery, setLocalSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [sortBy, setSortBy] = useState("name-asc")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const [isExporting, setIsExporting] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [useEnhancedCards] = useState(true)

  // Bulk selection state
  const {
    selectedItems,
    selectAll,
    clearSelection
  } = useBulkSelection()
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("api")
  const [hasLoadedLogs, setHasLoadedLogs] = useState(false)
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true)
  const [isCategoriesCollapsed, setIsCategoriesCollapsed] = useState(false)
  const { toast } = useToast()
  const { setSearchLoading } = useLoading()

  // Online/Offline status tracking
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

  // Debounced search with loading states
  useEffect(() => {
    const searchTimer = setTimeout(() => {
      setIsSearching(false)
      setSearchLoading(false)
    }, 300)

    if (localSearchQuery.length > 0) {
      setIsSearching(true)
      setSearchLoading(true)
    }

    return () => {
      clearTimeout(searchTimer)
    }
  }, [localSearchQuery, setSearchLoading, setIsSearching])



  const ITEMS_PER_PAGE = 50


  // Check if localStorage is available (not server-side rendering)
  const isLocalStorageAvailable = () => {
    if (typeof window === 'undefined') return false;
    try {
      // Test if localStorage is accessible
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Function to save products to localStorage
  const saveProductsToLocalStorage = (products: Product[]) => {
    if (!isLocalStorageAvailable()) {
      console.log("[v0] localStorage not available, skipping save");
      return;
    }
    
    try {
      localStorage.setItem('cached-products', JSON.stringify(products));
      localStorage.setItem('cached-products-timestamp', new Date().toISOString());
      console.log("[v0] Saved products to local storage:", products.length);
    } catch (error) {
      console.error("[v0] Error saving products to local storage:", error);
    }
  };

  // Function to load products from localStorage
  const loadProductsFromLocalStorage = (): { products: Product[] | null, timestamp: Date | null } => {
    if (!isLocalStorageAvailable()) {
      console.log("[v0] localStorage not available, cannot load products");
      return { products: null, timestamp: null };
    }
    
    try {
      const productsJson = localStorage.getItem('cached-products');
      const timestampStr = localStorage.getItem('cached-products-timestamp');
      
      if (!productsJson) {
        console.log("[v0] No products found in local storage");
        return { products: null, timestamp: null };
      }
      
      const products = JSON.parse(productsJson) as Product[];
      const timestamp = timestampStr ? new Date(timestampStr) : null;
      
      console.log("[v0] Loaded products from local storage:", products.length);
      console.log("[v0] Local data timestamp:", timestamp);
      
      return { products, timestamp };
    } catch (error) {
      console.error("[v0] Error loading products from local storage:", error);
      return { products: null, timestamp: null };
    }
  };

  const fetchProductsFromAPI = async (showSuccessToast = true) => {
    try {
      setIsLoadingData(true)
      console.log("[v0] Attempting to fetch products from API...")

      const apiItems = await apiService.fetchItems()
      console.log("[v0] API items received:", apiItems?.length)

      // Check if apiItems is an array before mapping
      if (!Array.isArray(apiItems)) {
        throw new Error("API did not return an array of items")
      }

      console.log(apiItems)

      // Transform API data to match our Product interface
      const transformedProducts: Product[] = apiItems.map((item: any, index: number) => ({
        id: item.item_no?.toString() || item.id?.toString() || (index + 1).toString(),
        name: item.item_name || item.name || item.title || `Item ${index + 1}`,
        brand: item.brand || item.manufacturer || "Unknown Brand",
        itemType: item.item_type || item.itemType || item.category || item.type || "General",
        location: item.location || item.warehouse || "Unknown Location",
        balance: item.balance || item.stock || item.quantity || item.in_qty || 0,
        status: (() => {
          const balance = item.balance || item.stock || item.quantity || item.in_qty || 0;
          if (item.item_status) {
            // Map API status to our status format
            const apiStatus = item.item_status.toLowerCase();
            if (apiStatus.includes('out of stock')) return "out-of-stock";
            if (apiStatus.includes('low')) return "low-stock";
            return "in-stock";
          }
          // Fallback to balance-based logic
          return balance > 10 ? "in-stock" : balance > 0 ? "low-stock" : "out-of-stock";
        })(),
      }))

      // Only update state if we got new/different data
      const hasNewData = JSON.stringify(transformedProducts) !== JSON.stringify(products);
      if (hasNewData) {
        setProducts(transformedProducts)
        setDataSource("api")
        setLastFetchTime(new Date())
        
        // Save the API data to localStorage for offline use
        saveProductsToLocalStorage(transformedProducts);

        if (showSuccessToast) {
          toast({
            title: "Data Loaded",
            description: `Successfully loaded ${transformedProducts.length} items from API`,
          })
        }
      } else {
        console.log("[v0] API returned same data, no update needed");
        if (showSuccessToast) {
          toast({
            title: "Data Up to Date",
            description: `${transformedProducts.length} items are already current`,
          })
        }
      }
    } catch (error) {
      console.error("[v0] Failed to fetch from API, trying to use cached data:", error)
      
      // Only show fallback logic if we don't already have products loaded
      if (products.length === 0) {
        // Try to get data from localStorage first
        const { products: cachedProducts, timestamp } = loadProductsFromLocalStorage();
        
        if (cachedProducts && cachedProducts.length > 0) {
          // Use cached API data if available
          setProducts(cachedProducts)
          setDataSource("cached") // Mark as cached API data
          setLastFetchTime(timestamp)
          
          const timeDiff = timestamp ? Math.round((new Date().getTime() - timestamp.getTime()) / (1000 * 60 * 60)) : null;
          const timeMsg = timeDiff ? ` (from ${timeDiff} hour${timeDiff === 1 ? '' : 's'} ago)` : '';
          
          toast({
            title: "Using Cached API Data",
            description: `API unavailable. Using previously downloaded data${timeMsg}`,
            variant: "default",
          })
        } else {
          // No cached data available and API is down - show empty state
          console.error("[v0] No cached data available and API is down");
          setProducts([])
          setDataSource("cached")
          
          toast({
            title: "No Data Available",
            description: "API unavailable and no previously downloaded data found. Please restore connection to load data.",
            variant: "destructive",
          })
        }
      }
    } finally {
      setIsLoadingData(false)
    }
  }

  // Handlers are now defined above with useCallback

  // Export handlers
  const handleExportCSV = async () => {
    try {
      setIsExporting(true)
      const exportData = prepareExportData(
        products, 
        apiUrl, 
        isConnected, 
        lastFetchTime?.toISOString() || null
      )
      
      const filename = `toolbox-inventory-${new Date().toISOString().split('T')[0]}`
      exportToCSV(exportData, { filename, includeMetadata: true })
      
      toast({
        title: "Export Successful",
        description: `Inventory data exported to ${filename}.csv`,
      })
    } catch (error) {
      console.error('Export to CSV failed:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export data to CSV. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportXLSX = async () => {
    try {
      setIsExporting(true)
      const exportData = prepareExportData(
        products, 
        apiUrl, 
        isConnected, 
        lastFetchTime?.toISOString() || null
      )
      
      const filename = `toolbox-inventory-${new Date().toISOString().split('T')[0]}`
      exportToXLSX(exportData, { filename, includeMetadata: true })
      
      toast({
        title: "Export Successful",
        description: `Inventory data exported to ${filename}.xlsx`,
      })
    } catch (error) {
      console.error('Export to XLSX failed:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export data to Excel. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportJSON = async () => {
    try {
      setIsExporting(true)
      const exportData = prepareExportData(
        products, 
        apiUrl, 
        isConnected, 
        lastFetchTime?.toISOString() || null
      )
      
      const filename = `toolbox-inventory-${new Date().toISOString().split('T')[0]}`
      exportToJSON(exportData, { filename, includeMetadata: true })
      
      toast({
        title: "Export Successful",
        description: `Inventory data exported to ${filename}.json`,
      })
    } catch (error) {
      console.error('Export to JSON failed:', error)
      toast({
        title: "Export Failed",
        description: "Failed to export data to JSON. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Logs fetching and export
  const fetchLogsFromAPI = async () => {
    try {
      setIsLoadingLogs(true)
      setLogsError(null)
      
      const resp = await apiService.fetchTransactions()

      // TransactionResponse shape is { data: any[], ... }
      const fetched = Array.isArray(resp) ? resp : (resp && Array.isArray(resp.data) ? resp.data : [])

      // Normalize fields: Username, details, log_date, log_time
      const normalized = fetched.map((entry: any) => {
        // Try common timestamp fields
        const ts = entry.timestamp || entry.created_at || entry.log_timestamp || entry.datetime || entry.date
        let logDate = ''
        let logTime = ''
        if (ts) {
          try {
            const d = new Date(ts)
            if (!isNaN(d.getTime())) {
              logDate = d.toLocaleDateString()
              logTime = d.toLocaleTimeString()
            }
          } catch (e) {
            // fallthrough
          }
        }

        // Better details formatting - try to extract meaningful text from JSON
        let details = entry.details || entry.action || entry.message || 'No details'
        if (details === 'No details' && entry) {
          // If it's a POS checkout, format it nicely
          if (entry.action && entry.action.includes('POS Checkout')) {
            details = entry.action
          } else {
            // Otherwise, show a shortened JSON
            const jsonStr = JSON.stringify(entry)
            details = jsonStr.length > 100 ? jsonStr.substring(0, 100) + '...' : jsonStr
          }
        }

        return {
          username: entry.username || entry.user || entry.user_name || entry.employee || 'Unknown',
          details: details,
          log_date: logDate,
          log_time: logTime,
          raw: entry,
        }
      })

      setLogs(normalized)
      setHasLoadedLogs(true)
    } catch (error) {
      console.error('[v0] Failed to fetch logs:', error)
      setLogsError(String(error))
      toast({ title: 'Failed to load logs', description: String(error), variant: 'destructive' })
    } finally {
      setIsLoadingLogs(false)
    }
  }

  // Auto-load logs when Logs tab is opened
  const handleTabChange = (value: string) => {
    setActiveTab(value)
    if (value === 'logs' && !hasLoadedLogs && !isLoadingLogs) {
      fetchLogsFromAPI()
    }
  }

  const handleExportLogsXLSX = async () => {
    try {
      if (!logs || logs.length === 0) {
        toast({ title: 'No Logs', description: 'No logs available to export', variant: 'destructive' })
        return
      }

      setIsExporting(true)
      const filename = `toolbox-logs-${new Date().toISOString().split('T')[0]}`
      exportLogsToXLSX(logs, { filename })

      toast({ title: 'Export Successful', description: `Logs exported to ${filename}.xlsx` })
    } catch (error) {
      console.error('Export logs failed:', error)
      toast({ title: 'Export Failed', description: 'Failed to export logs to Excel', variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    // Skip initial data loading if parent is providing products state
    if (parentProducts !== undefined) {
      console.log("[v0] Using products from parent component, skipping initial fetch");
      return;
    }
    
    // Prevent duplicate API calls by checking if data is already loading or loaded
    if (products.length > 0) {
      console.log("[v0] Products already loaded, skipping fetch");
      return;
    }
    
    // Try to load cached data immediately while we wait for API response
    const { products: cachedProducts, timestamp } = loadProductsFromLocalStorage();
    
    if (cachedProducts && cachedProducts.length > 0) {
      console.log("[v0] Using cached data while fetching from API");
      setProducts(cachedProducts);
      setDataSource("cached");
      setLastFetchTime(timestamp);
      setIsLoadingData(false); // Show cached data immediately
      
      // Only fetch fresh data if cache is older than 5 minutes
      const cacheAge = timestamp ? (Date.now() - timestamp.getTime()) / (1000 * 60) : Infinity;
      if (cacheAge > 5) {
        console.log("[v0] Cache is old, fetching fresh data");
        fetchProductsFromAPI(false); // Don't show toast for background refresh
      } else {
        console.log("[v0] Cache is fresh, skipping API call");
      }
    } else {
      // No cached data, just fetch from API
      fetchProductsFromAPI(true); // Show toast for initial load
    }
  }, [parentProducts, products.length])


  useEffect(() => {
    if (onRefreshData) {
      onRefreshData(handleRefreshData)
    }
  }, [onRefreshData])
  
  // Simple barcode processing function
  const processBarcodeSubmit = useCallback((barcodeValue: string) => {
    if (!barcodeValue.trim()) return;
    
    console.log("[Barcode Scanner] Processing:", barcodeValue);
    
    const result = processBarcodeInput(barcodeValue, products);
    
    if (result.success && result.product) {
      console.log("[Barcode Scanner] Found item:", result.product.name);
      onAddToCart(result.product, 1, true); // Pass true for isFromBarcode
      
      // Show success feedback for barcode scanning specifically
      toast({
        title: "✅ Item Scanned & Added",
        description: `${result.product.name} (${barcodeValue}) added to cart`,
      });
      
      // Clear input after success
      setBarcodeInput("");
    } else {
      console.log("[Barcode Scanner] Error:", result.error);
      toast({
        title: "❌ Item Not Found",
        description: result.error || `Barcode ${barcodeValue} not found in inventory`,
        variant: "destructive",
      });
    }
  }, [products, onAddToCart, toast]);

  // Update local search when header search changes
  useEffect(() => {
    // Validate and sanitize search query
    if (searchQuery) {
      const validation = validateSearchQuery(searchQuery);
      if (validation.isValid) {
        setLocalSearchQuery(validation.value!);
      } else {
        console.warn("[Dashboard] Invalid search query:", validation.error);
        setLocalSearchQuery(""); // Clear invalid query
      }
    } else {
      setLocalSearchQuery("");
    }
  }, [searchQuery])
  
  // Update tempApiUrl when apiUrl prop changes
  useEffect(() => {
    setTempApiUrl(apiUrl)
  }, [apiUrl])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, showAvailable, showUnavailable, searchQuery, localSearchQuery, sortBy])

  // Get unique categories (memoized)
  const categories = useMemo(() => {
    const uniqueTypes = [...new Set(products.map((p) => p.itemType))]
    return ["all", ...uniqueTypes]
  }, [products])

  // Memoized handlers to prevent unnecessary re-renders
  const handleRefreshData = useCallback(() => {
    fetchProductsFromAPI(true) // Show toast for manual refresh
  }, []) // fetchProductsFromAPI will be stable
  
  const handleSaveSettings = useCallback(() => {
    if (onApiUrlChange) {
      onApiUrlChange(tempApiUrl)
    }
    setIsSettingsOpen(false)
    // Refresh data after changing API URL
    setTimeout(() => {
      fetchProductsFromAPI(true) // Show toast for settings change
    }, 500)
  }, [tempApiUrl, onApiUrlChange]) // Dependencies are stable

  // Handle barcode input submission
  const handleBarcodeSubmit = useCallback(() => {
    processBarcodeSubmit(barcodeInput)
  }, [barcodeInput, processBarcodeSubmit])

  // Handle Enter key in barcode input
  const handleBarcodeKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleBarcodeSubmit()
    }
  }, [handleBarcodeSubmit])

  // Filter and sort products
  const { paginatedProducts, totalFilteredCount, hasMorePages } = useMemo(() => {
    const filtered = products.filter((product) => {
      // Category filter
      if (selectedCategory !== "all" && product.itemType !== selectedCategory) {
        return false
      }

      // Status filter
      if (!showAvailable && (product.status === "in-stock" || product.status === "low-stock")) {
        return false
      }
      if (!showUnavailable && product.status === "out-of-stock") {
        return false
      }

      // Search filter (use both header search and local search)
      const effectiveSearchQuery = searchQuery || localSearchQuery
      if (effectiveSearchQuery) {
        const query = effectiveSearchQuery.toLowerCase()
        return (
          product.name.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query) ||
          product.itemType.toLowerCase().includes(query) ||
          product.location.toLowerCase().includes(query)
        )
      }

      return true
    })

    // Sort products
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.name.localeCompare(b.name)
        case "name-desc":
          return b.name.localeCompare(a.name)
        case "stock-high":
          return b.balance - a.balance
        case "stock-low":
          return a.balance - b.balance
        default:
          return 0
      }
    })

    // Paginate results
    const totalItems = filtered.length
    const itemsToShow = currentPage * ITEMS_PER_PAGE
    const paginatedResults = filtered.slice(0, itemsToShow)
    const hasMore = itemsToShow < totalItems

    return {
      paginatedProducts: paginatedResults,
      totalFilteredCount: totalItems,
      hasMorePages: hasMore,
    }
  }, [products, selectedCategory, showAvailable, showUnavailable, searchQuery, localSearchQuery, sortBy, currentPage])

  const handleLoadMore = () => {
    setIsLoadingMore(true)
    // Simulate loading delay
    setTimeout(() => {
      setCurrentPage((prev) => prev + 1)
      setIsLoadingMore(false)
    }, 500)
  }

  const getStatusColor = (status: Product["status"]) => {
    switch (status) {
      case "in-stock":
        return "bg-green-500"
      case "low-stock":
        return "bg-orange-500"
      case "out-of-stock":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: Product["status"]) => {
    switch (status) {
      case "in-stock":
        return "In Stock"
      case "low-stock":
        return "Low Stock"
      case "out-of-stock":
        return "Out of Stock"
      default:
        return "Unknown"
    }
  }
  
  /**
   * Formats feedback messages for barcode scanning vs manual entry
   */




  /**
   * Handles the barcode input change
   * Detects if input is from scanner and acts accordingly
   */
  const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarcodeInput(value);
  };

  // handleBarcodeSubmit is defined above with useCallback




  
  // Show empty state if no products are available
  if (!isLoadingData && (!products || products.length === 0)) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
          <div className="w-16 h-16 mx-auto text-slate-400 dark:text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4M8 16l-4-4 4-4M16 16l4-4-4-4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">No Data Available</h3>
          <p className="text-slate-600 dark:text-slate-400">
            There are no items available. Please check your API connection and try again.
          </p>
          <Button 
            onClick={handleRefreshData} 
            className="mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Connection
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Modern Sidebar */}
      <div className="w-72 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-r border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm sticky top-0 h-screen overflow-y-auto custom-scrollbar">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-teal-500 rounded-lg flex items-center justify-center shadow-lg">
                <Filter className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">Controls</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Filter & manage items</p>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsSettingsOpen(true)} 
                className="w-8 h-8 p-0 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-all duration-200"
              >
                <Settings className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRefreshData} 
                disabled={isLoadingData} 
                className="w-8 h-8 p-0 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-all duration-200"
              >
                <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${isLoadingData ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar Content */}
        <div className="p-6 space-y-8">

          {/* System Status Card */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 shadow-sm">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-md flex items-center justify-center">
                  <Wifi className="w-3 h-3 text-white" />
                </div>
                System Status
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-orange-500'}`}></div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">API</span>
                  </div>
                  <Badge 
                    variant={isConnected ? "default" : "outline"} 
                    className="text-xs px-2 py-0.5 rounded-full"
                  >
                    {isConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs text-slate-600 dark:text-slate-400">Network</span>
                  </div>
                  <Badge 
                    variant={isOnline ? "default" : "outline"} 
                    className="text-xs px-2 py-0.5 rounded-full"
                  >
                    {isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400">Source</span>
                  <Badge 
                    variant={dataSource === "api" ? "default" : "outline"} 
                    className="text-xs px-2 py-0.5 rounded-full"
                  >
                    {dataSource === "api" ? "Live" : "Cache"}
                  </Badge>
                </div>
                
                {lastFetchTime && (
                  <div className="text-xs text-slate-500 dark:text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    Updated {lastFetchTime.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        
        {/* Settings Dialog with Tabs */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Dashboard Settings</span>
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Tabs defaultValue="api" className="w-full" value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="api">API Configuration</TabsTrigger>
                  <TabsTrigger value="offline">Offline & PWA</TabsTrigger>
                  <TabsTrigger value="export">Export Data</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>
                
                <TabsContent value="api" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="dashboard-api-url">API Base URL</Label>
                    <Input
                      id="dashboard-api-url"
                      placeholder="http://192.168.68.106:3001"
                      value={tempApiUrl}
                      onChange={(e) => setTempApiUrl(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the base URL for your API server. Changes will take effect after saving.
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleSaveSettings} className="flex-1">
                      Save Settings
                    </Button>
                    <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="offline" className="space-y-4 mt-4">
                  <OfflineStatusPanel className="w-full" />
                </TabsContent>
                
                <TabsContent value="export" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Export your inventory data in different formats. All exports include {products.length} items.
                      <br />
                      <span className="text-xs">
                        Data source: {dataSource === 'api' ? 'Live API' : 'Cached'} 
                        {lastFetchTime && ` (last updated: ${lastFetchTime.toLocaleString()})`}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-8 h-8 text-green-600" />
                            <div>
                              <h4 className="font-medium">CSV Format</h4>
                              <p className="text-sm text-muted-foreground">
                                Comma-separated values, ideal for spreadsheets
                              </p>
                            </div>
                          </div>
                          <Button 
                            onClick={handleExportCSV} 
                            disabled={isExporting || products.length === 0}
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export CSV
                          </Button>
                        </div>
                      </Card>
                      
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                            <div>
                              <h4 className="font-medium">Excel Format</h4>
                              <p className="text-sm text-muted-foreground">
                                Excel workbook with multiple sheets and summaries
                              </p>
                            </div>
                          </div>
                          <Button 
                            onClick={handleExportXLSX} 
                            disabled={isExporting || products.length === 0}
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export XLSX
                          </Button>
                        </div>
                      </Card>
                      
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Code className="w-8 h-8 text-orange-600" />
                            <div>
                              <h4 className="font-medium">JSON Format</h4>
                              <p className="text-sm text-muted-foreground">
                                Structured data format for developers and APIs
                              </p>
                            </div>
                          </div>
                          <Button 
                            onClick={handleExportJSON} 
                            disabled={isExporting || products.length === 0}
                            size="sm"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Export JSON
                          </Button>
                        </div>
                      </Card>
                    </div>
                    
                    {products.length === 0 && (
                      <div className="text-center p-4 text-muted-foreground">
                        <p>No data available to export. Please load inventory data first.</p>
                      </div>
                    )}
                    
                    {isExporting && (
                      <div className="text-center p-4">
                        <Progress value={undefined} className="w-full h-2" />
                        <p className="text-sm text-muted-foreground mt-2">Preparing export...</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="logs" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Employee Logs</h4>
                        <p className="text-sm text-muted-foreground">Recent employee activity logs loaded automatically from the API.</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={fetchLogsFromAPI} size="sm" disabled={isLoadingLogs} variant="outline">
                          <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                        <Button onClick={handleExportLogsXLSX} size="sm" disabled={isExporting || logs.length === 0}>
                          <Download className="w-4 h-4 mr-2" />
                          Export XLSX
                        </Button>
                      </div>
                    </div>

                    {isLoadingLogs && (
                      <div className="flex items-center justify-center p-8 bg-slate-800/30 rounded-md border border-slate-700">
                        <div className="text-center">
                          <div className="w-8 h-8 border-2 border-slate-400 border-t-slate-200 rounded-full animate-spin mx-auto mb-3"></div>
                          <p className="text-sm text-slate-400">Loading employee logs...</p>
                        </div>
                      </div>
                    )}

                    {logsError && (
                      <div className="p-4 text-sm text-destructive">Error loading logs: {logsError}</div>
                    )}

                    {!isLoadingLogs && logs.length > 0 && (
                      <div className="overflow-hidden bg-slate-900 rounded-md border border-slate-600">
                        <div className="overflow-auto max-h-96">
                          <table className="w-full text-sm table-fixed">
                            <thead>
                              <tr>
                                <th className="p-2 text-left bg-slate-800 text-slate-100 sticky top-0 z-10 border-b border-slate-600 font-medium w-24">Username</th>
                                <th className="p-2 text-left bg-slate-800 text-slate-100 sticky top-0 z-10 border-b border-slate-600 font-medium">Details</th>
                                <th className="p-2 text-left bg-slate-800 text-slate-100 sticky top-0 z-10 border-b border-slate-600 font-medium w-24">Log Date</th>
                                <th className="p-2 text-left bg-slate-800 text-slate-100 sticky top-0 z-10 border-b border-slate-600 font-medium w-20">Log Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {logs.map((l, idx) => (
                                <tr key={idx} className={`${idx % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-700/50'} text-slate-100 hover:bg-slate-600/30 transition-colors`}>
                                  <td className="p-2 align-top border-b border-slate-700/50 w-24">
                                    <div className="break-words font-medium text-slate-200 text-xs">
                                      {l.username}
                                    </div>
                                  </td>
                                  <td className="p-2 align-top border-b border-slate-700/50">
                                    <div className="break-words text-slate-300 text-xs leading-relaxed">
                                      {l.details}
                                    </div>
                                  </td>
                                  <td className="p-2 align-top border-b border-slate-700/50 w-24">
                                    <div className="text-slate-200 text-xs whitespace-nowrap">
                                      {l.log_date}
                                    </div>
                                  </td>
                                  <td className="p-2 align-top border-b border-slate-700/50 w-20">
                                    <div className="text-slate-200 text-xs whitespace-nowrap">
                                      {l.log_time}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {!isLoadingLogs && logs.length === 0 && !logsError && (
                      <div className="p-4 text-sm text-muted-foreground">No logs loaded. Click Fetch Logs to retrieve entries from the API.</div>
                    )}

                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </DialogContent>
        </Dialog>

          {/* Barcode Scanner Card */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 shadow-sm">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-md flex items-center justify-center">
                  <Scan className="w-3 h-3 text-white" />
                </div>
                Barcode Scanner
              </h3>
              
              <div className="space-y-3">
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-blue-50/80 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                  📱 Click input field first, then scan Code-128 barcode (ITM001, ITM004, etc.)
                </div>
                
                <Input
                  id="barcode-scanner-input"
                  placeholder="Click here first, then scan ITM001, ITM004..."
                  value={barcodeInput}
                  onChange={handleBarcodeInputChange}
                  onKeyPress={handleBarcodeKeyPress}
                  className="font-mono text-sm bg-white/80 dark:bg-slate-700/80 border-slate-200 dark:border-slate-600 rounded-lg transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/50"
                />
                
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                  onClick={handleBarcodeSubmit}
                  disabled={!barcodeInput.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
                

              </div>
            </div>
          </div>

          {/* Categories Card - Collapsible */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 shadow-sm">
            <div className="space-y-3">
              <button 
                onClick={() => setIsCategoriesCollapsed(!isCategoriesCollapsed)}
                className="w-full flex items-center justify-between group hover:bg-slate-100/50 dark:hover:bg-slate-700/30 -mx-2 -my-1 px-2 py-1 rounded-lg transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-pink-500 rounded-md flex items-center justify-center">
                    <Package className="w-3 h-3 text-white" />
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Categories
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                    {categories.length}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isCategoriesCollapsed ? 'rotate-180' : ''
                }`} />
              </button>
              
              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isCategoriesCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
              }`}>
                <div className="space-y-1 pt-1">
                  {categories.map((category) => (
                    <button
                      key={category}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                        selectedCategory === category
                          ? "bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-100 dark:to-slate-200 text-white dark:text-slate-900 shadow-sm"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-slate-100"
                      }`}
                      onClick={() => setSelectedCategory(category)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {category === "all" ? "All Items" : category}
                        </span>
                        {selectedCategory === category && (
                          <div className="w-2 h-2 rounded-full bg-white dark:bg-slate-900"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Availability Filter Card */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 shadow-sm">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-green-500 rounded-md flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                Availability
              </h3>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox 
                    id="available" 
                    checked={showAvailable} 
                    onCheckedChange={(checked) => setShowAvailable(checked === true)}
                    className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                    Available Items
                  </span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer group">
                  <Checkbox 
                    id="unavailable" 
                    checked={showUnavailable} 
                    onCheckedChange={(checked) => setShowUnavailable(checked === true)}
                    className="border-slate-300 dark:border-slate-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                    Out of Stock
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 overflow-y-auto content-scrollbar">
        <div className="p-6">
          {/* Top Controls */}
          <div className="bg-slate-50 dark:bg-slate-900 relative z-10 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">All Items</h1>
                <Badge
                  variant="secondary"
                  className="bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100"
                >
                  {paginatedProducts.length} of {totalFilteredCount} items
                </Badge>
                {(searchQuery || localSearchQuery) && (
                  <Badge
                    variant="outline"
                    className="border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200"
                  >
                    Searching: "{searchQuery || localSearchQuery}"
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-4 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">
                <Input
                  placeholder="Search items..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  className="w-64 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                />

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                    <SelectItem value="name-asc" className="text-slate-900 dark:text-slate-100">
                      Name A-Z
                    </SelectItem>
                    <SelectItem value="name-desc" className="text-slate-900 dark:text-slate-100">
                      Name Z-A
                    </SelectItem>
                    <SelectItem value="stock-high" className="text-slate-900 dark:text-slate-100">
                      Stock High-Low
                    </SelectItem>
                    <SelectItem value="stock-low" className="text-slate-900 dark:text-slate-100">
                      Stock Low-High
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex border rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`${
                      viewMode === "grid"
                        ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-200 dark:hover:text-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={`${
                      viewMode === "list"
                        ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-200 dark:hover:text-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Operations */}
          <BulkOperationsBar
            selectedItems={selectedItems}
            products={products}
            onSelectAll={(shouldSelectAll) => selectAll(products.map(p => p.id), shouldSelectAll)}
            onClearSelection={clearSelection}
            onBulkAddToCart={(bulkProducts) => {
              bulkProducts.forEach(product => onAddToCart(product))
              toast({
                title: `Added ${bulkProducts.length} items to cart`,
                description: `${bulkProducts.length} products were successfully added to your cart.`,
              })
            }}
            onBulkExport={async (selectedProducts, format) => {
              try {
                // Use existing export functionality
                const { exportToCSV, exportToXLSX, exportToJSON, prepareExportData } = await import('../lib/export-utils')
                const exportData = prepareExportData(selectedProducts)
                
                let filename = `selected_products_${new Date().toISOString().split('T')[0]}`
                
                switch (format) {
                  case 'csv':
                    exportToCSV(exportData, { filename: `${filename}.csv` })
                    break
                  case 'xlsx':
                    exportToXLSX(exportData, { filename: `${filename}.xlsx` })
                    break
                  case 'json':
                    exportToJSON(exportData, { filename: `${filename}.json` })
                    break
                }
                
                toast({
                  title: "Export Successful",
                  description: `${selectedProducts.length} items exported as ${format.toUpperCase()}`
                })
              } catch (error) {
                console.error('Export failed:', error)
                toast({
                  title: "Export Failed",
                  description: "Failed to export selected items",
                  variant: "destructive"
                })
              }
            }}
          />

          {/* Products Display */}
          {isLoadingData || isSearching ? (
            <SearchLoader query={searchQuery || localSearchQuery} />
          ) : paginatedProducts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-lg">No items found</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">
                  {searchQuery || localSearchQuery
                    ? "Try adjusting your search or filters"
                    : "Try adjusting your filters"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 pb-6">
                  {paginatedProducts.map((product) => 
                    useEnhancedCards ? (
                      <EnhancedItemCard
                        key={product.id}
                        product={product}
                        onAddToCart={onAddToCart}
                        onViewItem={onViewItem}
                        viewMode="grid"
                      />
                    ) : (
                      <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4" onClick={() => onViewItem(product)}>
                          <div className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg mb-3 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
                            image here
                          </div>

                          <h3 className="font-medium text-sm mb-2 line-clamp-2 dark:text-slate-100">{product.name}</h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">Brand: {product.brand}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Balance: {product.balance}</p>

                          <div className="flex items-center justify-between">
                            <Badge className={`${getStatusColor(product.status)} text-white text-xs`}>
                              {getStatusText(product.status)}
                            </Badge>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                onAddToCart(product)
                              }}
                              disabled={product.status === "out-of-stock"}
                            >
                              Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3 pb-4 sm:pb-6">
                  {paginatedProducts.map((product) => 
                    useEnhancedCards ? (
                      <EnhancedItemCard
                        key={product.id}
                        product={product}
                        onAddToCart={onAddToCart}
                        onViewItem={onViewItem}
                        viewMode="list"
                      />
                    ) : (
                      <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4" onClick={() => onViewItem(product)}>
                          <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs">
                              image here
                            </div>

                            <div className="flex-1">
                              <h3 className="font-medium mb-1 dark:text-slate-100">{product.name}</h3>
                              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                <p>Brand: {product.brand}</p>
                                <p>Item Type: {product.itemType}</p>
                                <p>Location: {product.location}</p>
                              </div>
                            </div>

                            <div className="text-right space-y-2">
                              <div className="text-lg font-bold dark:text-slate-100">
                                BAL: {product.balance.toString().padStart(2, "0")}
                              </div>
                              <Badge className={`${getStatusColor(product.status)} text-white text-xs`}>
                                {getStatusText(product.status)}
                              </Badge>
                            </div>

                            <div className="flex flex-col space-y-2">
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onAddToCart(product)
                                }}
                                disabled={product.status === "out-of-stock"}
                              >
                                Add
                              </Button>
                            </div>

                            <div className={`w-2 h-full ${getStatusColor(product.status)} rounded-r-lg`}></div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
              )}

              {/* Load More Button */}
              {hasMorePages && (
                <div className="flex justify-center pb-6">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100"
                  >
                    {isLoadingMore ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                        <span>Loading more items...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <ChevronDown className="w-4 h-4" />
                        <span>Load More ({totalFilteredCount - paginatedProducts.length} remaining)</span>
                      </div>
                    )}
                  </Button>
                </div>
              )}

              {/* Pagination Info */}
              <div className="text-center text-sm text-slate-500 dark:text-slate-400 pb-6 bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded">
                Showing {paginatedProducts.length} of {totalFilteredCount} items
                {currentPage > 1 && (
                  <span className="ml-2">
                    • Page {currentPage} of {Math.ceil(totalFilteredCount / ITEMS_PER_PAGE)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      

      

    </div>
  )
}
