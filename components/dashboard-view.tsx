import type React from "react"
import { useState, useMemo, useEffect, useRef } from "react"
import { Filter, Grid, List, BarChart3, Scan, ChevronDown, RefreshCw, ZapIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-config"
import type { Product } from "@/app/page"

interface DashboardViewProps {
  onAddToCart: (product: Product, quantity?: number) => void
  onViewItem: (product: Product) => void
  searchQuery?: string
  onRefreshData?: (refreshFunction: () => void) => void // Callback to expose refresh function
}

export function DashboardView({ onAddToCart, onViewItem, searchQuery = "", onRefreshData }: DashboardViewProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [dataSource, setDataSource] = useState<"api" | "cached">("cached")
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null)

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
   * @returns The found product or null if not found
   */
  const validateItemId = (value: string): Product | null => {
    if (!value.trim()) return null;
    
    // Search for product by ID (primary) or name (secondary)
    return products.find(
      (p) => p.id === value || p.name.toLowerCase().includes(value.toLowerCase())
    ) || null;
  }

  // Expose refresh function to parent component
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
        // Only process if not in an input field
        if (document.activeElement?.tagName !== 'INPUT' && 
            document.activeElement?.tagName !== 'TEXTAREA') {
          
          // Set the barcode input and trigger scan detection
          setBarcodeInput(barcodeBuffer);
          setIsScanning(true);
          setIsBarcodeScanned(true);
          
          // Process the barcode after a short delay to ensure UI updates
          setTimeout(() => {
            const foundProduct = validateItemId(barcodeBuffer);
            
            if (foundProduct) {
              onAddToCart(foundProduct);
              toast({
                title: "Item Added",
                description: `${foundProduct.name} has been added to your toolbox`,
              });
            } else {
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
          }, 50);
        }
        
        // Reset buffer regardless
        barcodeBuffer = "";
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
      return "Ready to scan item barcode (auto-adds) or enter item ID manually.";
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
          <Button variant="ghost" size="sm" onClick={handleRefreshData} disabled={isLoadingData} className="p-1">
            <RefreshCw className={`w-4 h-4 ${isLoadingData ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
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
                placeholder="Scan item barcode or enter ID..."
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
