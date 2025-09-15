"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { DashboardView } from "@/components/dashboard-view"
import { CartView } from "@/components/cart-view"
import { ItemDetailView } from "@/components/item-detail-view"
import { StartPage } from "@/components/start-page"
import { Toaster } from "@/components/ui/toaster"
import { apiService, DEFAULT_API_CONFIG } from "@/lib/api-config"

export type ViewType = "dashboard" | "cart" | "item-detail"

export interface CartItem {
  id: string
  name: string
  brand: string
  itemType: string
  location: string
  balance: number
  quantity: number
  status: "in-stock" | "low-stock" | "out-of-stock"
}

export interface Product {
  id: string
  name: string
  brand: string
  itemType: string
  location: string
  balance: number
  status: "in-stock" | "low-stock" | "out-of-stock"
}

export default function HomePage() {
  const [isAppStarted, setIsAppStarted] = useState(false)
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_CONFIG.baseUrl)
  const [isApiConnected, setIsApiConnected] = useState(false)

  const [currentView, setCurrentView] = useState<ViewType>("dashboard")
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [headerSearchQuery, setHeaderSearchQuery] = useState("")

  useEffect(() => {
    const testConnection = async () => {
      const connected = await apiService.testConnection()
      setIsApiConnected(connected)
    }

    if (apiUrl) {
      apiService.updateConfig({ baseUrl: apiUrl })
      testConnection()
    }
  }, [apiUrl])

  const handleApiUrlChange = (newUrl: string) => {
    setApiUrl(newUrl)
    apiService.updateConfig({ baseUrl: newUrl })
  }

  const handleStartApp = () => {
    if (isApiConnected) {
      setIsAppStarted(true)
    }
  }

  const addToCart = (product: Product, quantity = 1) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === product.id)
      if (existingItem) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: Math.min(item.quantity + quantity, product.balance) } : item,
        )
      }
      return [...prev, { ...product, quantity: Math.min(quantity, product.balance) }]
    })
  }

  const updateCartItemQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== id))
    } else {
      setCartItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)))
    }
  }

  const removeFromCart = (id: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const viewItemDetail = (product: Product) => {
    setSelectedProduct(product)
    setCurrentView("item-detail")
  }

  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  if (!isAppStarted) {
    return (
      <StartPage
        onStart={handleStartApp}
        apiUrl={apiUrl}
        onApiUrlChange={handleApiUrlChange}
        isConnected={isApiConnected}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        cartItemCount={totalCartItems}
        currentView={currentView}
        onViewChange={setCurrentView}
        onSearch={setHeaderSearchQuery}
      />

      <main className="pt-16">
        {currentView === "dashboard" && (
          <DashboardView onAddToCart={addToCart} onViewItem={viewItemDetail} searchQuery={headerSearchQuery} />
        )}

        {currentView === "cart" && (
          <CartView items={cartItems} onUpdateQuantity={updateCartItemQuantity} onRemoveItem={removeFromCart} />
        )}

        {currentView === "item-detail" && selectedProduct && (
          <ItemDetailView
            product={selectedProduct}
            onAddToCart={addToCart}
            onBack={() => setCurrentView("dashboard")}
          />
        )}
      </main>

      <Toaster />
    </div>
  )
}
