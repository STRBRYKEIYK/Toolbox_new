"use client"

import { useState } from "react"
import { ArrowLeft, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/app/page"

interface ItemDetailViewProps {
  product: Product
  onAddToCart: (product: Product, quantity: number) => void
  onBack: () => void
}

export function ItemDetailView({ product, onAddToCart, onBack }: ItemDetailViewProps) {
  const [quantity, setQuantity] = useState(1)

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

  const handleAddToCart = () => {
    onAddToCart(product, quantity)
    setQuantity(1) // Reset quantity after adding
  }

  const incrementQuantity = () => {
    if (quantity < product.balance) {
      setQuantity((prev) => prev + 1)
    }
  }

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Section */}
        <Card>
          <CardContent className="p-8">
            <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-lg">
              image here
            </div>
          </CardContent>
        </Card>

        {/* Product Information */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">{product.name}</h1>

            <div className="space-y-3 text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium">Brand:</span>
                <span>{product.brand}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Item Type:</span>
                <span>{product.itemType}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Location:</span>
                <span>{product.location}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Current Balance:</span>
                <span className="font-bold text-slate-900">{product.balance}</span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div>
            <Badge className={`${getStatusColor(product.status)} text-white text-sm px-4 py-2`}>
              {getStatusText(product.status)}
            </Badge>
          </div>

          {/* Quantity Selection */}
          {product.status !== "out-of-stock" && (
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <h3 className="font-medium text-slate-900">Select Quantity</h3>

                  <div className="flex items-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className="w-10 h-10 p-0 bg-transparent"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>

                    <div className="text-2xl font-bold w-16 text-center">{quantity}</div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={incrementQuantity}
                      disabled={quantity >= product.balance}
                      className="w-10 h-10 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <p className="text-sm text-slate-500">Maximum available: {product.balance}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add to Cart Button */}
          <div className="space-y-3">
            <Button
              size="lg"
              onClick={handleAddToCart}
              disabled={product.status === "out-of-stock"}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {product.status === "out-of-stock" ? "Out of Stock" : `Add ${quantity} to Toolbox`}
            </Button>

            {product.status === "out-of-stock" && (
              <p className="text-sm text-red-600 text-center">This item is currently out of stock</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h3 className="font-medium text-slate-900 mb-4">Item Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <p className="font-medium text-slate-700 mb-1">Status</p>
              <p className="text-slate-600">{getStatusText(product.status)}</p>
            </div>
            <div>
              <p className="font-medium text-slate-700 mb-1">Available Stock</p>
              <p className="text-slate-600">{product.balance} units</p>
            </div>
            <div>
              <p className="font-medium text-slate-700 mb-1">Category</p>
              <p className="text-slate-600">{product.itemType}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
