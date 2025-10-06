import { ApiItemSchema, rateLimiter, sanitizeForLog } from '../validation'
import type { ApiConfig } from '../api-config'
import { API_ENDPOINTS } from '../api-config'

/**
 * Items Service
 * Handles all item-related API operations
 */
export class ItemsService {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  updateConfig(config: ApiConfig) {
    this.config = config
  }

  /**
   * Fetch all items from the API
   */
  async fetchItems(): Promise<any[]> {
    try {
      // Rate limiting check
      if (!rateLimiter.isAllowed('fetchItems', 30, 60000)) {
        throw new Error("Rate limit exceeded for fetching items")
      }

      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.items}?limit=1000`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Toolbox-App/1.0",
        },
        mode: "cors",
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new Error(`Failed to fetch items: ${response.status} ${response.statusText} - ${sanitizeForLog(errorText)}`)
      }

      const responseData = await response.json()
      
      let items: any[] = []
      
      if (responseData && typeof responseData === 'object') {
        if (responseData.success && Array.isArray(responseData.data)) {
          items = responseData.data
          console.log("[ItemsService] Successfully fetched items from API:", items.length, "items")
          
          if (responseData.pagination) {
            console.log("[ItemsService] API pagination info:", sanitizeForLog(responseData.pagination))
          }
        } else if (Array.isArray(responseData)) {
          items = responseData
          console.log("[ItemsService] Successfully fetched items from API (direct array):", items.length, "items")
        } else {
          console.log("[ItemsService] API response structure unexpected:", Object.keys(responseData))
          throw new Error("API response does not contain expected data structure")
        }
      } else {
        throw new Error("Invalid API response format")
      }
      
      // Validate each item (optional - can be disabled for performance)
      if (process.env.NODE_ENV === 'development' && items.length > 0) {
        const sampleValidation = ApiItemSchema.safeParse(items[0])
        if (!sampleValidation.success) {
          console.warn("[ItemsService] Item validation failed for sample item:", sampleValidation.error?.errors)
        }
      }
      
      return items
    } catch (error) {
      console.error("[ItemsService] Failed to fetch items:", sanitizeForLog(error))
      throw error
    }
  }

  /**
   * Commit item changes to the API
   */
  async commitItemChanges(items: any[]): Promise<boolean> {
    try {
      console.log("[ItemsService] Committing changes for", items.length, "items using new API endpoints...")
      
      // Try the bulk checkout endpoint first, but fall back gracefully to individual endpoints
      try {
        const checkoutPayload = {
          items: items.map(item => ({
            item_no: item.item_no || item.id,
            quantity: item.quantity || 1,
            item_name: item.item_name || item.name || 'Unknown'
          })),
          checkout_by: "pos_system",
          notes: `Checkout via POS system - ${items.length} items processed`,
          timestamp: new Date().toISOString()
        }

        console.log("[ItemsService] Attempting bulk checkout:", checkoutPayload)

        const checkoutResponse = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.checkout}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          mode: "cors",
          body: JSON.stringify(checkoutPayload),
          signal: AbortSignal.timeout(15000),
        })

        if (checkoutResponse.ok) {
          const result = await checkoutResponse.json()
          if (result.success) {
            console.log("[ItemsService] ✅ Successfully committed changes via bulk checkout endpoint!")
            console.log("[ItemsService] Checkout result:", result)
            return true
          }
        }
        
        console.log("[ItemsService] Bulk checkout endpoint not available or failed, using individual endpoints...")
        
      } catch (checkoutError) {
        console.log("[ItemsService] Bulk checkout failed, falling back to individual endpoints:", checkoutError)
      }
      
      // Use individual POST /api/items/:id/out endpoints
      console.log("[ItemsService] Using individual item out endpoints...")
      const updatePromises = items.map(async (item) => {
        try {
          const itemOutPayload = {
            quantity: item.quantity || 1,
            out_by: "pos_system",
            notes: `POS checkout - ${item.quantity || 1} units taken`,
            item_name: item.item_name || item.name
          }

          console.log(`[ItemsService] Recording item ${item.item_no || item.id} (${item.item_name || item.name || 'Unknown'}) going out:`, itemOutPayload)

          const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.itemStock}/${item.item_no || item.id}/out`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            mode: "cors",
            body: JSON.stringify(itemOutPayload),
            signal: AbortSignal.timeout(10000),
          })

          if (response.ok) {
            const result = await response.json()
            if (result.success) {
              console.log(`[ItemsService] ✅ Successfully recorded item ${item.item_no || item.id} going out - Balance: ${result.data.transaction.previous_balance} → ${result.data.transaction.new_balance}`)
              return { 
                success: true, 
                item_id: item.item_no || item.id, 
                data: result.data,
                previous_balance: result.data.transaction.previous_balance,
                new_balance: result.data.transaction.new_balance
              }
            } else {
              throw new Error(`Item out failed: ${result.error}`)
            }
          } else {
            const errorText = await response.text()
            throw new Error(`Item out endpoint returned ${response.status}: ${errorText}`)
          }

        } catch (error) {
          console.warn(`[ItemsService] ❌ Failed to record item ${item.item_no || item.id} going out:`, error)
          return { success: false, item_id: item.item_no || item.id, error: error instanceof Error ? error.message : String(error) }
        }
      })

      // Wait for all individual updates to complete
      const results = await Promise.all(updatePromises)
      
      const successfulUpdates = results.filter(r => r.success)
      const failedUpdates = results.filter(r => !r.success)
      
      console.log(`[ItemsService] Individual update results: ${successfulUpdates.length} successful, ${failedUpdates.length} failed`)
      
      // Log successful updates
      successfulUpdates.forEach(result => {
        if (result.success && result.previous_balance !== undefined) {
          console.log(`[ItemsService] Item ${result.item_id}: ${result.previous_balance} → ${result.new_balance}`)
        }
      })
      
      if (successfulUpdates.length > 0) {
        console.log("[ItemsService] ✅ Item changes committed successfully via individual endpoints!")
        return true
      } else {
        throw new Error("All individual item updates failed")
      }
      
    } catch (error) {
      console.error("[ItemsService] Failed to commit item changes:", error)
      throw error
    }
  }

  /**
   * Update item quantity using the PUT /api/items/:id/quantity endpoint
   */
  async updateItemQuantity(itemId: number, updateType: 'set_balance' | 'adjust_in' | 'adjust_out' | 'manual', value: number, notes?: string): Promise<any> {
    try {
      const payload = {
        update_type: updateType,
        value: value,
        notes: notes || `Quantity update via POS system`,
        updated_by: "pos_system"
      }

      console.log(`[ItemsService] Updating quantity for item ${itemId}:`, payload)

      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.items}/${itemId}/quantity`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Quantity update failed: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      if (result.success) {
        console.log(`[ItemsService] Successfully updated quantity for item ${itemId}:`, result.data)
        return result
      } else {
        throw new Error(`Quantity update failed: ${result.error}`)
      }
    } catch (error) {
      console.error(`[ItemsService] Failed to update quantity for item ${itemId}:`, error)
      throw error
    }
  }
}