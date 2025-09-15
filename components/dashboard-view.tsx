"use client"

import type React from "react"
import { useState, useMemo, useEffect } from "react"
import { Filter, Grid, List, BarChart3, Scan, ChevronDown, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api-config"
import type { Product } from "@/app/page"

const generateMockProducts = (): Product[] => {
  const baseProducts = [
    {
      name: "Lorem ipsum dolor sit amet, consectetur adipiscing elit",
      brand: "Praesent",
      itemType: "sit amet ornare",
      location: "Praesent est odio",
    },
    {
      name: "Sed do eiusmod tempor incididunt ut labore",
      brand: "Ut enim",
      itemType: "sit amet ornare",
      location: "Interdum et malesuada fames",
    },
    {
      name: "Ut enim ad minim veniam quis nostrud",
      brand: "Exercitation",
      itemType: "Interdum et malesuada fames",
      location: "Interdum et malesuada fames",
    },
    {
      name: "Duis aute irure dolor in reprehenderit",
      brand: "Voluptate",
      itemType: "sit amet ornare",
      location: "Praesent est odio",
    },
    {
      name: "Excepteur sint occaecat cupidatat non proident",
      brand: "Sunt in culpa",
      itemType: "Interdum et malesuada fames",
      location: "Interdum et malesuada fames",
    },
  ]

  const products: Product[] = []
  const statuses: Product["status"][] = ["in-stock", "low-stock", "out-of-stock"]

  for (let i = 0; i < 200; i++) {
    const baseProduct = baseProducts[i % baseProducts.length]
    const status = statuses[i % statuses.length]

    products.push({
      id: (i + 1).toString(),
      name: `${baseProduct.name} - Item ${i + 1}`,
      brand: baseProduct.brand,
      itemType: baseProduct.itemType,
      location: baseProduct.location,
      balance: status === "out-of-stock" ? 0 : Math.floor(Math.random() * 20) + 1,
      status,
    })
  }

  return products
}

interface DashboardViewProps {
  onAddToCart: (product: Product, quantity?: number) => void
  onViewItem: (product: Product) => void
  searchQuery?: string
}

export function DashboardView({ onAddToCart, onViewItem, searchQuery = "" }: DashboardViewProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [dataSource, setDataSource] = useState<"api" | "mock">("mock")
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
  const { toast } = useToast()

  const ITEMS_PER_PAGE = 50

  const fetchProductsFromAPI = async () => {
    try {
      setIsLoadingData(true)
      console.log("[v0] Attempting to fetch products from API...")

      const apiItems = await apiService.fetchItems()
      console.log("[v0] API items received:", apiItems.length)

      // Transform API data to match our Product interface
      const transformedProducts: Product[] = apiItems.map((item: any, index: number) => ({
        id: item.id || (index + 1).toString(),
        name: item.name || item.title || `Item ${index + 1}`,
        brand: item.brand || item.manufacturer || "Unknown Brand",
        itemType: item.itemType || item.category || item.type || "General",
        location: item.location || item.warehouse || "Unknown Location",
        balance: item.balance || item.stock || item.quantity || 0,
        status: item.balance > 10 ? "in-stock" : item.balance > 0 ? "low-stock" : "out-of-stock",
      }))

      setProducts(transformedProducts)
      setDataSource("api")
      setLastFetchTime(new Date())

      toast({
        title: "Data Loaded",
        description: `Successfully loaded ${transformedProducts.length} items from API`,
      })
    } catch (error) {
      console.error("[v0] Failed to fetch from API, falling back to mock data:", error)

      const mockProducts = generateMockProducts()
      setProducts(mockProducts)
      setDataSource("mock")

      toast({
        title: "Using Mock Data",
        description: "API unavailable, using sample data for demonstration",
        variant: "destructive",
      })
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleRefreshData = () => {
    fetchProductsFromAPI()
  }

  useEffect(() => {
    fetchProductsFromAPI()
  }, [])

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

  const handleBarcodeSubmit = () => {
    if (!barcodeInput.trim()) {
      toast({
        title: "Invalid Barcode",
        description: "Please enter a valid barcode",
        variant: "destructive",
      })
      return
    }

    // Mock barcode lookup - in a real app this would query an API
    const foundProduct = products.find(
      (p) => p.id === barcodeInput || p.name.toLowerCase().includes(barcodeInput.toLowerCase()),
    )

    if (foundProduct) {
      onAddToCart(foundProduct)
      setBarcodeInput("")
      toast({
        title: "Item Added",
        description: `${foundProduct.name} has been added to your toolbox`,
      })
    } else {
      toast({
        title: "Product Not Found",
        description: "No product found with that barcode",
        variant: "destructive",
      })
    }
  }

  const handleBarcodeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleBarcodeSubmit()
    }
  }

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
            <Badge variant={dataSource === "api" ? "default" : "secondary"} className="text-xs">
              {dataSource === "api" ? "API" : "Mock"}
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
              <Checkbox id="available" checked={showAvailable} onCheckedChange={setShowAvailable} />
              <label htmlFor="available" className="text-sm dark:text-slate-300">
                Available
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="unavailable" checked={showUnavailable} onCheckedChange={setShowUnavailable} />
              <label htmlFor="unavailable" className="text-sm dark:text-slate-300">
                Unavailable
              </label>
            </div>
          </div>
        </div>

        {/* Barcode Scanner */}
        <div className="space-y-3">
          <h3 className="font-medium text-slate-900 dark:text-slate-100">Barcode Scanner</h3>
          <div className="space-y-2">
            <div className="relative">
              <Scan className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                placeholder="Scan barcode..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyPress={handleBarcodeKeyPress}
                className="pl-10"
              />
            </div>
            <Button
              size="sm"
              className="w-full bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
              onClick={handleBarcodeSubmit}
              disabled={!barcodeInput.trim()}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Add to Toolbox
            </Button>
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
