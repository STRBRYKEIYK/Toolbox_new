"use client"

import React, { useState, useEffect } from "react"
import { Search, Home, ShoppingCart, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { CartStatusIndicator } from "@/components/cart-recovery-panel"
import type { ViewType } from "@/app/page"

interface HeaderProps {
  cartItemCount: number
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  onSearch?: (query: string) => void
}

export function Header({ cartItemCount, currentView, onViewChange, onSearch }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Real search suggestions based on product data
  const [products, setProducts] = useState<Array<{id: string, name: string, brand: string, itemType: string}>>([])
  
  // Load products for autocomplete
  useEffect(() => {
    const loadProductsForSearch = () => {
      try {
        const cached = localStorage.getItem('cached-products')
        if (cached) {
          const productData = JSON.parse(cached)
          setProducts(productData.map((p: any) => ({
            id: p.id || p.item_no,
            name: p.name || p.item_name || 'Unknown',
            brand: p.brand || 'Unknown',
            itemType: p.itemType || p.item_type || 'General'
          })))
        }
      } catch (error) {
        console.warn('Failed to load products for search:', error)
      }
    }
    loadProductsForSearch()
  }, [])
  
  // Generate smart suggestions
  const suggestions = React.useMemo(() => {
    if (searchQuery.length < 2) return []
    
    const query = searchQuery.toLowerCase()
    const matches = new Set<string>()
    
    products.forEach(product => {
      // Match product names
      if (product.name.toLowerCase().includes(query)) {
        matches.add(product.name)
      }
      // Match brands
      if (product.brand.toLowerCase().includes(query)) {
        matches.add(`${product.brand} (Brand)`)
      }
      // Match categories
      if (product.itemType.toLowerCase().includes(query)) {
        matches.add(`${product.itemType} (Category)`)
      }
    })
    
    return Array.from(matches).slice(0, 6) // Limit to 6 suggestions
  }, [searchQuery, products])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (onSearch) {
        onSearch(searchQuery)
      }
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [searchQuery, onSearch])

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setShowSuggestions(value.length > 0)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setShowSuggestions(false)
    if (onSearch) {
      onSearch("")
    }
  }

  const selectSuggestion = (suggestion: string) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
    if (onSearch) {
      onSearch(suggestion)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 dark:from-slate-950/95 dark:via-slate-900/95 dark:to-slate-950/95 backdrop-blur-md border-b border-slate-700/50 dark:border-slate-600/30 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-8 py-3 sm:py-4 gap-3 sm:gap-0">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 via-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <div className="w-5 h-5 bg-white/90 rounded-md shadow-sm"></div>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <span className="text-xl font-bold tracking-wide bg-gradient-to-r from-white via-slate-100 to-white bg-clip-text text-transparent">TOOLBOX</span>
            <div className="text-xs text-slate-400 font-medium">Inventory System</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-full sm:max-w-3xl sm:mx-10 mx-0 relative order-2 sm:order-none">
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <Input
              placeholder="Search products, categories, or brands..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-12 pr-12 h-12 bg-white/10 border border-slate-600/50 dark:border-slate-500/30 text-white placeholder:text-slate-400 focus:bg-white/15 dark:bg-white/5 dark:focus:bg-white/10 rounded-xl backdrop-blur-sm focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/50 dark:border-slate-600/30 z-50 overflow-hidden">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className="w-full px-5 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700/60 transition-all duration-150 flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 dark:group-hover:from-slate-600 dark:group-hover:to-slate-500 transition-all duration-200">
                    <Search className="w-4 h-4 text-blue-600 dark:text-slate-300" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{suggestion}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Product search</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Icons */}
        <div className="flex items-center space-x-3 sm:space-x-4 order-1 sm:order-none">
          <div className="hidden sm:flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1">
              <CartStatusIndicator />
            </div>
            <div className="w-px h-6 bg-slate-600/50"></div>
            <ThemeToggle />
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl p-1 gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange("dashboard")}
              className={`relative px-3 py-2 rounded-lg transition-all duration-200 ${
                currentView === "dashboard" 
                  ? "bg-white/20 text-white shadow-sm" 
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="ml-2 hidden sm:inline font-medium">Dashboard</span>
              {currentView === "dashboard" && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-1 h-1 bg-white rounded-full"></div>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewChange("cart")}
              className={`relative px-3 py-2 rounded-lg transition-all duration-200 ${
                currentView === "cart" 
                  ? "bg-white/20 text-white shadow-sm" 
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="ml-2 hidden sm:inline font-medium">Cart</span>
              {cartItemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-gradient-to-br from-red-500 to-red-600 border-2 border-slate-800 shadow-lg"
                >
                  {cartItemCount}
                </Badge>
              )}
              {currentView === "cart" && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-1 h-1 bg-white rounded-full"></div>
              )}
            </Button>
          </div>
          
          <div className="sm:hidden">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  )
}
