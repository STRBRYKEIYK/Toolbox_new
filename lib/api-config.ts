export interface ApiConfig {
  baseUrl: string
  isConnected: boolean
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: "https://qxw.2ee.mytemp.website",
  isConnected: false,
}

export const API_ENDPOINTS = {
  items: "/api/items",
  employees: "/api/employees",
  checkout: "/api/items/checkout",
  transactions: "/api/employeelogs",
} as const

// Interface for transaction filters
export interface TransactionFilters {
  username?: string
  date_from?: string
  date_to?: string
  search?: string
  limit?: number
  offset?: number
}

// Interface for transaction response
export interface TransactionResponse {
  data: any[]
  total: number
  limit: number
  offset: number
  filters: {
    username?: string
    date_from?: string
    date_to?: string
    search?: string
  }
}

// Interface for transaction stats
export interface TransactionStats {
  period_days: number
  total_logs: number
  recent_logs: number
  active_users: number
  logs_by_day: Array<{
    log_date: string
    log_count: number
    unique_users: number
  }>
  top_users: Array<{
    username: string
    log_count: number
    last_activity: string
  }>
}

export class ApiService {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  updateConfig(newConfig: Partial<ApiConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  getConfig(): ApiConfig {
    return { ...this.config }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.items}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        signal: AbortSignal.timeout(5000),
      })

      const isConnected = response.ok
      this.config.isConnected = isConnected

      if (isConnected) {
        console.log("[v0] API connection successful")
      } else {
        console.log("[v0] API connection failed - response not ok:", response.status, response.statusText)
      }

      return isConnected
    } catch (error) {
      console.error("[v0] API connection test failed:", error)

      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        console.error("[v0] This is likely a CORS issue or the API server is not running")
      }

      this.config.isConnected = false
      return false
    }
  }

  async fetchItems(): Promise<any[]> {
    try {
      // Fetch all items with a high limit to get all available items
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.items}?limit=1000`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        signal: AbortSignal.timeout(15000), // Increased timeout for larger responses
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch items: ${response.status} ${response.statusText}`)
      }

      const responseData = await response.json()
      
      // Handle the API response structure: {success: true, data: [...]}
      let items: any[] = []
      
      if (responseData && typeof responseData === 'object') {
        if (responseData.success && Array.isArray(responseData.data)) {
          items = responseData.data
          console.log("[v0] Successfully fetched items from API:", items.length, "items")
          
          // Log pagination info if available
          if (responseData.pagination) {
            console.log("[v0] API pagination info:", responseData.pagination)
          }
        } else if (Array.isArray(responseData)) {
          items = responseData
          console.log("[v0] Successfully fetched items from API (direct array):", items.length, "items")
        } else {
          console.log("[v0] API response structure unexpected:", Object.keys(responseData))
          throw new Error("API response does not contain expected data structure")
        }
      } else {
        throw new Error("Invalid API response format")
      }
      
      return items
    } catch (error) {
      console.error("[v0] Failed to fetch items:", error)
      throw error
    }
  }

 async fetchEmployees(): Promise<any[]> {
  try {
    const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.employees}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      mode: "cors",
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch employees: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Handle response structure consistently
    let employees: any[] = []
    if (data && typeof data === 'object') {
      if (data.success && data.data && data.data.employees && Array.isArray(data.data.employees)) {
        // Handle nested structure: {success: true, data: {employees: [...], ...}}
        employees = data.data.employees
      } else if (data.success && Array.isArray(data.data)) {
        // Handle flat structure: {success: true, data: [...]}
        employees = data.data
      } else if (Array.isArray(data)) {
        // Handle direct array: [...]
        employees = data
      } else {
        console.log("[v0] Unexpected API response structure:", Object.keys(data))
        if (data.data && typeof data.data === 'object') {
          console.log("[v0] data.data structure:", Object.keys(data.data))
        }
        throw new Error("Invalid employees response structure")
      }
    } else {
      throw new Error("Invalid API response format")
    }
    
    console.log("[v0] Successfully fetched employees from API:", employees.length, "employees")
    return employees
  } catch (error) {
    console.error("[v0] Failed to fetch employees:", error)
    throw error
  }
}

  // NEW: Comprehensive fetchTransactions method
  async fetchTransactions(filters: TransactionFilters = {}): Promise<TransactionResponse> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams()
      
      if (filters.username) queryParams.append('username', filters.username)
      if (filters.date_from) queryParams.append('date_from', filters.date_from)
      if (filters.date_to) queryParams.append('date_to', filters.date_to)
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.limit) queryParams.append('limit', filters.limit.toString())
      if (filters.offset) queryParams.append('offset', filters.offset.toString())

      const url = `${this.config.baseUrl}${API_ENDPOINTS.transactions}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      
      console.log("[v0] Fetching transactions from:", url)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      console.log("[v0] Successfully fetched transactions:", data.data?.length || 0, "transactions")
      console.log("[v0] Transaction pagination:", { total: data.total, limit: data.limit, offset: data.offset })
      
      return data as TransactionResponse
    } catch (error) {
      console.error("[v0] Failed to fetch transactions:", error)
      throw error
    }
  }

  // NEW: Fetch transaction statistics
  async fetchTransactionStats(days: number = 30): Promise<TransactionStats> {
    try {
      const url = `${this.config.baseUrl}${API_ENDPOINTS.transactions}/stats?days=${days}`
      
      console.log("[v0] Fetching transaction stats for", days, "days")

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch transaction stats: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      console.log("[v0] Successfully fetched transaction stats:", data)
      
      return data as TransactionStats
    } catch (error) {
      console.error("[v0] Failed to fetch transaction stats:", error)
      throw error
    }
  }

  // NEW: Fetch transactions for specific user
  async fetchUserTransactions(username: string, filters: Omit<TransactionFilters, 'username'> = {}): Promise<any> {
    try {
      const queryParams = new URLSearchParams()
      
      if (filters.date_from) queryParams.append('date_from', filters.date_from)
      if (filters.date_to) queryParams.append('date_to', filters.date_to)
      if (filters.limit) queryParams.append('limit', filters.limit.toString())
      if (filters.offset) queryParams.append('offset', filters.offset.toString())

      const url = `${this.config.baseUrl}${API_ENDPOINTS.transactions}/user/${encodeURIComponent(username)}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      
      console.log("[v0] Fetching transactions for user:", username)

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        signal: AbortSignal.timeout(15000),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch user transactions: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      console.log("[v0] Successfully fetched transactions for user", username, ":", data.data?.length || 0, "transactions")
      console.log("[v0] User activity summary:", data.activity_summary)
      
      return data
    } catch (error) {
      console.error(`[v0] Failed to fetch transactions for user ${username}:`, error)
      throw error
    }
  }

  async commitItemChanges(items: any[]): Promise<boolean> {
    try {
      console.log("[v0] Committing changes for", items.length, "items using new API endpoints...")
      
      // Try the bulk checkout endpoint first, but fall back gracefully to individual endpoints
      try {
        const checkoutPayload = {
          items: items.map(item => ({
            item_no: item.item_no || item.id, // Fixed: use correct field name
            quantity: item.quantity || 1,
            item_name : item.item_name || item.name || 'Unknown'
          })),
          checkout_by: "pos_system",
          notes: `Checkout via POS system - ${items.length} items processed`,
          timestamp: new Date().toISOString()
        }

        console.log("[v0] Attempting bulk checkout:", checkoutPayload)

        // Fixed: Use the correct checkout endpoint from the server code
        const checkoutResponse = await fetch(`${this.config.baseUrl}/api/items/checkout`, {
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
            console.log("[v0] ✅ Successfully committed changes via bulk checkout endpoint!")
            console.log("[v0] Checkout result:", result)
            return true
          }
        }
        
        // If we get here, the bulk checkout didn't work
        console.log("[v0] Bulk checkout endpoint not available or failed, using individual endpoints...")
        
      } catch (checkoutError) {
        console.log("[v0] Bulk checkout failed, falling back to individual endpoints:", checkoutError)
      }
      
      // Use individual POST /api/items/:id/out endpoints (this is working!)
      console.log("[v0] Using individual item out endpoints...")
      const updatePromises = items.map(async (item) => {
        try {
          const itemOutPayload = {
            quantity: item.quantity || 1,
            out_by: "pos_system",
            notes: `POS checkout - ${item.quantity || 1} units taken`,
            item_name: item.item_name || item.name // ✅ Add this if your API needs it
          }

          console.log(`[v0] Recording item ${item.item_no || item.id} (${item.item_name || item.name || 'Unknown'}) going out:`, itemOutPayload)

          const response = await fetch(`${this.config.baseUrl}/api/items/${item.item_no || item.id}/out`, {
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
              console.log(`[v0] ✅ Successfully recorded item ${item.item_no || item.id} going out - Balance: ${result.data.transaction.previous_balance} → ${result.data.transaction.new_balance}`)
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
          console.warn(`[v0] ❌ Failed to record item ${item.item_no || item.id} going out:`, error)
          return { success: false, item_id: item.item_no || item.id, error: error instanceof Error ? error.message : String(error) }
        }
      })

      // Wait for all individual updates to complete
      const results = await Promise.all(updatePromises)
      
      const successfulUpdates = results.filter(r => r.success)
      const failedUpdates = results.filter(r => !r.success)
      
      console.log(`[v0] Individual update results: ${successfulUpdates.length} successful, ${failedUpdates.length} failed`)
      
      // Log successful updates
      successfulUpdates.forEach(result => {
        if (result.success && result.previous_balance !== undefined) {
          console.log(`[v0] Item ${result.item_id}: ${result.previous_balance} → ${result.new_balance}`)
        }
      })
      
      if (successfulUpdates.length > 0) {
        console.log("[v0] ✅ Item changes committed successfully via individual endpoints!")
        return true
      } else {
        throw new Error("All individual item updates failed")
      }
      
    } catch (error) {
      console.error("[v0] Failed to commit item changes:", error)
      throw error
    }
  }

  // New method to use the PUT /api/items/:id/quantity endpoint
  async updateItemQuantity(itemId: number, updateType: 'set_balance' | 'adjust_in' | 'adjust_out' | 'manual', value: number, notes?: string): Promise<any> {
    try {
      const payload = {
        update_type: updateType,
        value: value,
        notes: notes || `Quantity update via POS system`,
        updated_by: "pos_system" // Added missing field
      }

      console.log(`[v0] Updating quantity for item ${itemId}:`, payload)

      const response = await fetch(`${this.config.baseUrl}/api/items/${itemId}/quantity`, {
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
        console.log(`[v0] Successfully updated quantity for item ${itemId}:`, result.data)
        return result
      } else {
        throw new Error(`Quantity update failed: ${result.error}`)
      }
    } catch (error) {
      console.error(`[v0] Failed to update quantity for item ${itemId}:`, error)
      throw error
    }
  }

  async logTransaction(transactionData: {
    userId: string;
    items: any[];
    username: string;
    totalItems: number;
    timestamp: string;
  }): Promise<boolean> {
    try {
      console.log("[v0] Logging transaction to API...")
      
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.transactions}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        body: JSON.stringify(transactionData),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        // If transactions endpoint doesn't exist, that's okay - just log locally
        if (response.status === 404) {
          console.log("[v0] Transactions endpoint not available, skipping transaction log")
          return false
        }
        throw new Error(`Failed to log transaction: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success) {
        console.log("[v0] Successfully logged transaction to API")
        return true
      } else {
        console.warn("[v0] Transaction log failed:", result.error)
        return false
      }
    } catch (error) {
      console.warn("[v0] Failed to log transaction (non-critical):", error)
      return false
    }
  }
}

export const apiService = new ApiService(DEFAULT_API_CONFIG)