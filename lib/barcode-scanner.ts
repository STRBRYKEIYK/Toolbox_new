/**
 * Simplified Barcode Scanner Utilities
 * Handles Code-128 barcode scanning and ITM to item ID conversion
 */

// Product type definition
export interface Product {
  id: string
  name: string
  brand: string
  itemType: string
  location: string
  balance: number
  status: "in-stock" | "low-stock" | "out-of-stock"
}

/**
 * Converts ITM barcode to item ID
 * ITM001 -> 1, ITM004 -> 4, ITM024 -> 24, etc.
 */
export function convertBarcodeToItemId(barcode: string): string | null {
  const cleaned = barcode.trim().toUpperCase()
  
  // Match ITM followed by digits (Code-128 format)
  const match = cleaned.match(/^ITM(\d+)$/i)
  
  if (match && match[1]) {
    const itemNumber = parseInt(match[1], 10)
    return itemNumber.toString()
  }
  
  return null
}

/**
 * Finds product by item ID
 */
export function findProductByItemId(itemId: string, products: Product[]): Product | null {
  return products.find(product => {
    const productId = String(product.id || '').trim()
    return productId === itemId
  }) || null
}

/**
 * Main barcode processing function
 * Converts ITM barcode to item ID and finds matching product
 */
export function processBarcodeInput(
  barcode: string, 
  products: Product[]
): { success: boolean; product: Product | null; itemId: string | null; error?: string } {
  // Convert barcode to item ID
  const itemId = convertBarcodeToItemId(barcode)
  
  if (!itemId) {
    return {
      success: false,
      product: null,
      itemId: null,
      error: `Invalid barcode format. Expected ITM followed by numbers (e.g., ITM001, ITM004)`
    }
  }
  
  // Find product by item ID
  const product = findProductByItemId(itemId, products)
  
  if (!product) {
    return {
      success: false,
      product: null,
      itemId,
      error: `Product with item ID ${itemId} not found in inventory`
    }
  }
  
  return {
    success: true,
    product,
    itemId
  }
}