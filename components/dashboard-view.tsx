import type React from "react"
import { useState, useMemo, useEffect, useRef } from "react"
import { Filter, Grid, List, BarChart3, Scan, ChevronDown, RefreshCw, ZapIcon, Settings, Wifi, WifiOff, Download, FileText, FileSpreadsheet, Code } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-config"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { exportToCSV, exportToXLSX, exportToJSON, prepareExportData, exportLogsToXLSX } from "@/lib/export-utils"
import type { Product } from "@/app/page"

interface DashboardViewProps {
  onAddToCart: (product: Product, quantity?: number) => void
  onViewItem: (product: Product) => void
  searchQuery?: string
  onRefreshData?: (refreshFunction: () => void) => void // Callback to expose refresh function
  apiUrl?: string
  onApiUrlChange?: (url: string) => void
  isConnected?: boolean
}

export function DashboardView({ 
  onAddToCart, 
  onViewItem, 
  searchQuery = "", 
  onRefreshData,
  apiUrl = "",
  onApiUrlChange,
  isConnected = false
}: DashboardViewProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [dataSource, setDataSource] = useState<"api" | "cached">("cached")
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)
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
  const [sortBy, setSortBy] = useState("name-asc")
  const [barcodeInput, setBarcodeInput] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isBarcodeScanned, setIsBarcodeScanned] = useState(false)
  const [lastKeyTime, setLastKeyTime] = useState<number>(0)
  const [isExporting, setIsExporting] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("api")
  const [hasLoadedLogs, setHasLoadedLogs] = useState(false)
  const { toast } = useToast()

  const ITEMS_PER_PAGE = 50
  const BARCODE_SPEED_THRESHOLD = 100 // ms between characters to detect barcode scanner vs manual typing

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

  const fetchProductsFromAPI = async () => {
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

      setProducts(transformedProducts)
      setDataSource("api")
      setLastFetchTime(new Date())
      
      // Save the API data to localStorage for offline use
      saveProductsToLocalStorage(transformedProducts);

      toast({
        title: "Data Loaded",
        description: `Successfully loaded ${transformedProducts.length} items from API`,
      })
    } catch (error) {
      console.error("[v0] Failed to fetch from API, trying to use cached data:", error)
      
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
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleRefreshData = () => {
    fetchProductsFromAPI()
  }
  
  const handleSaveSettings = () => {
    if (onApiUrlChange) {
      onApiUrlChange(tempApiUrl)
    }
    setIsSettingsOpen(false)
    // Refresh data after changing API URL
    setTimeout(() => {
      fetchProductsFromAPI()
    }, 500)
  }

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
    // Try to load cached data immediately while we wait for API response
    const { products: cachedProducts, timestamp } = loadProductsFromLocalStorage();
    
    if (cachedProducts && cachedProducts.length > 0) {
      console.log("[v0] Using cached data while fetching from API");
      setProducts(cachedProducts);
      setDataSource("cached");
      setLastFetchTime(timestamp);
      setIsLoadingData(false); // Show cached data immediately
      
      // Then fetch fresh data from API
      fetchProductsFromAPI();
    } else {
      // No cached data, just fetch from API
      fetchProductsFromAPI();
    }
  }, [])

  /**
   * Validates that the entered value corresponds to a valid item ID
   * Supports both direct item IDs and barcode format (ITM001, ITM002, etc.)
   * @returns The found product or null if not found
   */
  const validateItemId = (value: string): Product | null => {
    if (!value.trim()) return null;

    let searchId = value.trim();
    console.log("[validateItemId] Input:", value, "-> initial searchId:", searchId);

    // Check if it's a barcode format (ITM followed by digits)
    const barcodeMatch = value.trim().match(/^ITM(\d+)$/i);
    if (barcodeMatch) {
      // Convert barcode digits to number (removes leading zeros)
      // ITM001 -> "001" -> 1 -> "1"
      // ITM010 -> "010" -> 10 -> "10"
      // ITM100 -> "100" -> 100 -> "100"
      const itemNumber = parseInt(barcodeMatch[1], 10);
      searchId = itemNumber.toString();
      console.log("[validateItemId] Barcode detected:", value, "-> extracted:", barcodeMatch[1], "-> parsed:", itemNumber, "-> searchId:", searchId);
    }

    // Search for product by exact ID match
    const foundProduct = products.find((p) => p.id === searchId);
    console.log("[validateItemId] Searching for item ID:", searchId, "-> found:", foundProduct ? foundProduct.name : "NOT FOUND");

    return foundProduct || null;
  }
  useEffect(() => {
    if (onRefreshData) {
      onRefreshData(handleRefreshData)
    }
  }, [onRefreshData])
  
  // Global barcode scanner detection
  useEffect(() => {
    let barcodeBuffer = "";
    
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // If this is likely from a barcode scanner based on typing speed
      const isLikelyScanner = currentTime - lastKeyTime < BARCODE_SPEED_THRESHOLD;
      setLastKeyTime(currentTime);
      
      // If there's a long pause, reset the buffer (manual typing)
      if (!isLikelyScanner && barcodeBuffer.length > 0) {
        barcodeBuffer = "";
        setIsScanning(false);
      }
      
      // Handle Enter key (typical end of barcode scan)
      if (event.key === 'Enter' && barcodeBuffer.length > 0) {
        console.log("[Global Scanner] Enter pressed, barcodeBuffer:", barcodeBuffer);
        // Process barcode scan regardless of focus
        // Set the barcode input and trigger scan detection
        setBarcodeInput(barcodeBuffer);
        setIsScanning(true);
        setIsBarcodeScanned(true);
        
        // Process the barcode after a short delay to ensure UI updates
        setTimeout(() => {
          const foundProduct = validateItemId(barcodeBuffer);
          
          if (foundProduct) {
            console.log("[Global Scanner] Adding item:", foundProduct.name);
            onAddToCart(foundProduct);
            toast({
              title: "Item Added",
              description: `${foundProduct.name} has been added to your toolbox`,
            });
          } else {
            console.log("[Global Scanner] Item not found for:", barcodeBuffer);
            toast({
              title: "Item Not Found",
              description: `No item found with ID: ${barcodeBuffer}`,
              variant: "destructive",
            });
          }
          
          // Reset state
          setBarcodeInput("");
          setIsScanning(false);
          setIsBarcodeScanned(false);
        }, 1000);
        
        // Reset buffer and prevent default Enter behavior
        barcodeBuffer = "";
        event.preventDefault();
        return;
      }
      
      // Only add printable characters to buffer
      if (event.key.length === 1 && /[\w\d]/.test(event.key)) {
        barcodeBuffer += event.key;
        
        if (isLikelyScanner) {
          // Don't set scanning UI unless we have multiple chars (to avoid false positives)
          if (barcodeBuffer.length > 1) {
            setIsScanning(true);
          }
        }
      }
    };
    
    // Add global listener
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [lastKeyTime, onAddToCart, toast]);

  // Update local search when header search changes
  useEffect(() => {
    setLocalSearchQuery(searchQuery)
  }, [searchQuery])
  
  // Update tempApiUrl when apiUrl prop changes
  useEffect(() => {
    setTempApiUrl(apiUrl)
  }, [apiUrl])

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedCategory, showAvailable, showUnavailable, searchQuery, localSearchQuery, sortBy])

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueTypes = [...new Set(products.map((p) => p.itemType))]
    return ["all", ...uniqueTypes]
  }, [products])

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
  const getScanFeedbackText = (): string => {
    if (isScanning) {
      return "Barcode scan detected! Processing item...";
    } else if (isBarcodeScanned) {
      return "Barcode scan processed! Item will be added automatically.";
    } else if (barcodeInput.trim()) {
      return "Manual entry detected. Press Enter or click Add to add this item.";
    } else {
      return "Ready to scan barcode (ITM001, ITM002, etc.) or enter item ID manually.";
    }
  }

  /**
   * Detects whether input is from a barcode scanner or manual typing
   * based on the timing between keystrokes
   */
  const detectScanMethod = (currentTime: number): boolean => {
    // If time between keystrokes is less than threshold, likely a scanner
    const isScanner = currentTime - lastKeyTime < BARCODE_SPEED_THRESHOLD;
    setLastKeyTime(currentTime);
    return isScanner;
  }

  /**
   * Handles the barcode input change
   * Detects if input is from scanner and acts accordingly
   */
  const handleBarcodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setBarcodeInput(value);
    
    // Detect if this is likely from a scanner based on typing speed
    const currentTime = Date.now();
    const isLikelyScanner = detectScanMethod(currentTime);
    
    // Only set scanning indicator if the input is fast enough to be from a scanner
    // and there are multiple characters
    if (isLikelyScanner && value.length > 1) {
      setIsScanning(true);
      setIsBarcodeScanned(true);
    } else {
      setIsBarcodeScanned(false);
    }
  }

  /**
   * Handles the submission of a barcode/item ID
   * Called either manually by button press or automatically from scanner
   */
  const handleBarcodeSubmit = () => {
    console.log("[Manual Submit] Submitting barcodeInput:", barcodeInput);
    setIsScanning(false);
    
    if (!barcodeInput.trim()) {
      toast({
        title: "Invalid Item ID",
        description: "Please enter a valid item ID or scan a barcode",
        variant: "destructive",
      })
      return
    }

    // Validate the item ID
    const foundProduct = validateItemId(barcodeInput);

    if (foundProduct) {
      console.log("[Manual Submit] Adding item:", foundProduct.name);
      onAddToCart(foundProduct)
      setBarcodeInput("")
      setIsBarcodeScanned(false)
      toast({
        title: "Item Added",
        description: `${foundProduct.name} has been added to your toolbox`,
      })
    } else {
      toast({
        title: "Item Not Found",
        description: `No item found with ID: ${barcodeInput}`,
        variant: "destructive",
      })
    }
  }

  /**
   * Handles key presses in the barcode input field
   * Auto-submits on Enter key
   */
  const handleBarcodeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBarcodeSubmit()
      e.preventDefault()
    }
  }
  
  /**
   * Effect to automatically submit when a barcode is scanned
   * Only triggers when input is determined to be from a scanner
   */
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isScanning && isBarcodeScanned && barcodeInput.trim()) {
      // Short delay to ensure complete barcode is captured
      timer = setTimeout(() => {
        console.log("[Dashboard] Auto-adding item from barcode scan:", barcodeInput);
        handleBarcodeSubmit();
      }, 50);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [barcodeInput, isScanning, isBarcodeScanned]);

  if (isLoadingData) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading products...</p>
        </div>
      </div>
    )
  }
  
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
      {/* Left Sidebar */}
      <div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 space-y-6 sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters</span>
          </div>
          <div className="flex space-x-1">
            <Button variant="ghost" size="sm" onClick={() => setIsSettingsOpen(true)} className="p-1">
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleRefreshData} disabled={isLoadingData} className="p-1">
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-700/30 p-2 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-orange-500" />
              )}
              <span>API Status:</span>
            </div>
            <Badge 
              variant={isConnected ? "default" : "outline"} 
              className="text-xs"
            >
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Data Source:</span>
            <Badge 
              variant={dataSource === "api" ? "default" : "outline"} 
              className="text-xs"
            >
              {dataSource === "api" ? "API" : "Cached API"}
            </Badge>
          </div>
          {lastFetchTime && <div>Last updated: {lastFetchTime.toLocaleTimeString()}</div>}
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="api">API Configuration</TabsTrigger>
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

        {/* Categories */}
        <div className="space-y-3">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">Categories</h3>
          <div className="space-y-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "secondary" : "ghost"}
                size="sm"
                className={`w-full justify-start ${
                  selectedCategory === category
                    ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                    : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-200 dark:hover:text-slate-100 dark:hover:bg-slate-700"
                }`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === "all" ? "All Items" : category}
              </Button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-3">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">Status</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="available" 
                checked={showAvailable} 
                onCheckedChange={(checked) => setShowAvailable(checked === true)} 
              />
              <label htmlFor="available" className="text-sm dark:text-slate-300">
                Available
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="unavailable" 
                checked={showUnavailable} 
                onCheckedChange={(checked) => setShowUnavailable(checked === true)} 
              />
              <label htmlFor="unavailable" className="text-sm dark:text-slate-300">
                Unavailable
              </label>
            </div>
          </div>
        </div>

        {/* Barcode Scanner */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-slate-900 dark:text-slate-100">Item Scanner</h3>
            {isScanning && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 animate-pulse">
                Scanning...
              </Badge>
            )}
          </div>
          
          <div className="text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded-md text-slate-600 dark:text-slate-300 space-y-1">
            <div className="flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              <span><strong>Barcode scan:</strong> Items added automatically</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 bg-teal-500 rounded-full mr-2"></span>
              <span><strong>Manual entry:</strong> Requires button press</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="relative">
              <Scan className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                isScanning ? "text-green-500" : "text-slate-400"
              }`} />
              <Input
                placeholder="Scan barcode (ITM001, ITM002...) or enter item ID..."
                value={barcodeInput}
                onChange={handleBarcodeInputChange}
                onKeyPress={handleBarcodeKeyPress}
                className={`pl-10 ${
                  isScanning 
                    ? "border-green-500 ring-1 ring-green-500 dark:border-green-500" 
                    : ""
                }`}
              />
              {isScanning && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            {/* Only show button if not scanning (for manual entry) */}
            <Button
              size="sm"
              className={`w-full transition-all duration-200 ${
                isBarcodeScanned
                  ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                  : "bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
              }`}
              onClick={handleBarcodeSubmit}
              disabled={!barcodeInput.trim()}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Add to Toolbox
            </Button>
            
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {getScanFeedbackText()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-900 overflow-y-auto">
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

          {/* Products Display */}
          {paginatedProducts.length === 0 ? (
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
                <div className="grid grid-cols-4 gap-6 pb-6">
                  {paginatedProducts.map((product) => (
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
                  ))}
                </div>
              ) : (
                <div className="space-y-3 pb-6">
                  {paginatedProducts.map((product) => (
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
                  ))}
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
