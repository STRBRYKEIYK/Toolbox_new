export interface ApiConfig {
  baseUrl: string
  isConnected: boolean
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  baseUrl: "http://192.168.68.106:3001",
  isConnected: false,
}

export const API_ENDPOINTS = {
  items: "/api/items",
  employees: "/api/employees",
} as const

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
        throw new Error(`Failed to fetch items: ${response.statusText}`)
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
        throw new Error(`Failed to fetch employees: ${response.statusText}`)
      }

      const data = await response.json()
      console.log("[v0] Successfully fetched employees from API:", data.length, "employees")
      return data
    } catch (error) {
      console.error("[v0] Failed to fetch employees:", error)
      throw error
    }
  }

  async commitItemChanges(items: any[]): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}${API_ENDPOINTS.items}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
        body: JSON.stringify(items),
        signal: AbortSignal.timeout(10000),
      })

      if (!response.ok) {
        throw new Error(`Failed to commit changes: ${response.statusText}`)
      }

      console.log("[v0] Successfully committed item changes to API")
      return true
    } catch (error) {
      console.error("[v0] Failed to commit item changes:", error)
      throw error
    }
  }
}

export const apiService = new ApiService(DEFAULT_API_CONFIG)
