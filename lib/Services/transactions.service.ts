import type { ApiConfig, TransactionFilters, TransactionResponse, TransactionStats } from '../api-config'
import { API_ENDPOINTS } from '../api-config'

/**
 * Transaction Log Data interface matching the database schema
 * Database fields: id (auto), log_date, log_time, username, details, created_at (auto)
 */
export interface TransactionLogData {
  username: string
  details: string
  log_date?: string  // YYYY-MM-DD format, optional (database defaults to curdate())
  log_time?: string  // HH:MM:SS format, optional (database defaults to curtime())
}

/**
 * Internal interface for enhanced logging with full item details
 * Used internally before converting to TransactionLogData
 */
export interface EnhancedTransactionData {
  userId: string
  items: Array<{
    id: string
    name: string
    brand?: string
    itemType?: string
    location?: string
    quantity: number
    originalBalance?: number
    newBalance?: number
  }>
  username: string
  totalItems: number
  timestamp: string
}

/**
 * Transactions Service
 * Handles all transaction and logging-related API operations
 */
export class TransactionsService {
  private config: ApiConfig

  constructor(config: ApiConfig) {
    this.config = config
  }

  updateConfig(config: ApiConfig) {
    this.config = config
  }

  /**
   * Fetch transactions with optional filters
   */
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
      
      console.log("[TransactionsService] Fetching transactions from:", url)

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
      
      console.log("[TransactionsService] Successfully fetched transactions:", data.data?.length || 0, "transactions")
      console.log("[TransactionsService] Transaction pagination:", { total: data.total, limit: data.limit, offset: data.offset })
      
      return data as TransactionResponse
    } catch (error) {
      console.error("[TransactionsService] Failed to fetch transactions:", error)
      throw error
    }
  }

  /**
   * Fetch transaction statistics
   */
  async fetchTransactionStats(days: number = 30): Promise<TransactionStats> {
    try {
      const url = `${this.config.baseUrl}${API_ENDPOINTS.transactions}/stats?days=${days}`
      
      console.log("[TransactionsService] Fetching transaction stats for", days, "days")

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
      
      console.log("[TransactionsService] Successfully fetched transaction stats:", data)
      
      return data as TransactionStats
    } catch (error) {
      console.error("[TransactionsService] Failed to fetch transaction stats:", error)
      throw error
    }
  }

  /**
   * Fetch transactions for a specific user
   */
  async fetchUserTransactions(username: string, filters: Omit<TransactionFilters, 'username'> = {}): Promise<any> {
    try {
      const queryParams = new URLSearchParams()
      
      if (filters.date_from) queryParams.append('date_from', filters.date_from)
      if (filters.date_to) queryParams.append('date_to', filters.date_to)
      if (filters.limit) queryParams.append('limit', filters.limit.toString())
      if (filters.offset) queryParams.append('offset', filters.offset.toString())

      const url = `${this.config.baseUrl}${API_ENDPOINTS.transactions}/user/${encodeURIComponent(username)}${queryParams.toString() ? '?' + queryParams.toString() : ''}`
      
      console.log("[TransactionsService] Fetching transactions for user:", username)

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
      
      console.log("[TransactionsService] Successfully fetched transactions for user", username, ":", data.data?.length || 0, "transactions")
      console.log("[TransactionsService] User activity summary:", data.activity_summary)
      
      return data
    } catch (error) {
      console.error(`[TransactionsService] Failed to fetch transactions for user ${username}:`, error)
      throw error
    }
  }

  /**
   * Log a transaction to the API
   */
  async logTransaction(transactionData: TransactionLogData): Promise<boolean> {
    try {
      console.log("[TransactionsService] Logging transaction to API...")
      console.log(`[TransactionsService] User: ${transactionData.username}`)
      console.log(`[TransactionsService] Details: ${transactionData.details}`)
      console.log(`[TransactionsService] Date/Time: ${transactionData.log_date} ${transactionData.log_time}`)
      
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
          console.log("[TransactionsService] Transactions endpoint not available, skipping transaction log")
          return false
        }
        throw new Error(`Failed to log transaction: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success) {
        console.log("[TransactionsService] Successfully logged transaction to API")
        return true
      } else {
        console.warn("[TransactionsService] Transaction log failed:", result.error)
        return false
      }
    } catch (error) {
      console.warn("[TransactionsService] Failed to log transaction (non-critical):", error)
      return false
    }
  }
}