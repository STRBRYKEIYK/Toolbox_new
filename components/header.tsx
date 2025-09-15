"use client"

import { useState, useEffect } from "react"
import { Search, Home, ShoppingCart, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
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

  // Mock search suggestions - in a real app this would come from an API
  const suggestions = ["Lorem ipsum tools", "Praesent equipment", "Ornare supplies", "Malesuada items"].filter(
    (suggestion) => suggestion.toLowerCase().includes(searchQuery.toLowerCase()) && searchQuery.length > 0,
  )

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-800 dark:bg-slate-900 text-white shadow-lg">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-white rounded-sm"></div>
          </div>
          <span className="text-xl font-bold tracking-wider">TOOLBOX</span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl mx-8 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-10 pr-10 bg-white/10 border-slate-600 text-white placeholder:text-slate-400 focus:bg-white/20 dark:bg-white/5 dark:border-slate-700 dark:focus:bg-white/10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => selectSuggestion(suggestion)}
                  className="w-full px-4 py-2 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg"
                >
                  <Search className="w-4 h-4 inline mr-2 text-slate-400" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Icons */}
        <div className="flex items-center space-x-4">
          <ThemeToggle />

          <Button
            variant={currentView === "dashboard" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewChange("dashboard")}
            className="text-white hover:bg-white/10 dark:hover:bg-white/5"
          >
            <Home className="w-5 h-5" />
          </Button>

          <Button
            variant={currentView === "cart" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onViewChange("cart")}
            className="text-white hover:bg-white/10 dark:hover:bg-white/5 relative"
          >
            <ShoppingCart className="w-5 h-5" />
            {cartItemCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {cartItemCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
