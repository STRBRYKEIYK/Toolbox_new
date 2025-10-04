import { ItemsService } from './Services/items.service'
import { EmployeesService } from './Services/employees.service'
import { TransactionsService } from './Services/transactions.service'
import { ConnectionService } from './Services/connection.service'
import type { ApiConfig, TransactionFilters, TransactionResponse, TransactionStats } from './api-config'
import { DEFAULT_API_CONFIG } from './api-config'
import type { TransactionLogData } from './Services/transactions.service'

/**
 * API Services
 * 
 * This is the main middleman service that orchestrates all API operations.
 * It provides a unified interface to interact with different API service modules.
 * 
 * Usage:
 * - Use this service instead of directly accessing individual service classes
 * - This provides a centralized point for API operations
 * - Handles service initialization and configuration management
 */
export class ApiServices {
  private config: ApiConfig
  private itemsService: ItemsService
  private employeesService: EmployeesService
  private transactionsService: TransactionsService
  private connectionService: ConnectionService

  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    
    // Initialize all service modules
    this.itemsService = new ItemsService(config)
    this.employeesService = new EmployeesService(config)
    this.transactionsService = new TransactionsService(config)
    this.connectionService = new ConnectionService(config)
  }

  /**
   * Update configuration for all services
   */
  updateConfig(newConfig: Partial<ApiConfig>) {
    this.connectionService.updateConfig(newConfig)
    this.config = this.connectionService.getConfig()
    
    // Update all other services with new config
    this.itemsService.updateConfig(this.config)
    this.employeesService.updateConfig(this.config)
    this.transactionsService.updateConfig(this.config)
  }

  /**
   * Get current configuration
   */
  getConfig(): ApiConfig {
    return this.connectionService.getConfig()
  }

  // ========================================
  // CONNECTION OPERATIONS
  // ========================================

  /**
   * Test connection to the API server
   */
  async testConnection(): Promise<boolean> {
    return this.connectionService.testConnection()
  }

  // ========================================
  // ITEMS OPERATIONS
  // ========================================

  /**
   * Fetch all items from the API
   */
  async fetchItems(): Promise<any[]> {
    return this.itemsService.fetchItems()
  }

  /**
   * Commit item changes to the API
   */
  async commitItemChanges(items: any[]): Promise<boolean> {
    return this.itemsService.commitItemChanges(items)
  }

  /**
   * Update item quantity using the PUT /api/items/:id/quantity endpoint
   */
  async updateItemQuantity(
    itemId: number, 
    updateType: 'set_balance' | 'adjust_in' | 'adjust_out' | 'manual', 
    value: number, 
    notes?: string
  ): Promise<any> {
    return this.itemsService.updateItemQuantity(itemId, updateType, value, notes)
  }

  // ========================================
  // EMPLOYEES OPERATIONS
  // ========================================

  /**
   * Fetch all employees from the API
   */
  async fetchEmployees(): Promise<any[]> {
    return this.employeesService.fetchEmployees()
  }

  // ========================================
  // TRANSACTIONS OPERATIONS
  // ========================================

  /**
   * Fetch transactions with optional filters
   */
  async fetchTransactions(filters: TransactionFilters = {}): Promise<TransactionResponse> {
    return this.transactionsService.fetchTransactions(filters)
  }

  /**
   * Fetch transaction statistics
   */
  async fetchTransactionStats(days: number = 30): Promise<TransactionStats> {
    return this.transactionsService.fetchTransactionStats(days)
  }

  /**
   * Fetch transactions for a specific user
   */
  async fetchUserTransactions(username: string, filters: Omit<TransactionFilters, 'username'> = {}): Promise<any> {
    return this.transactionsService.fetchUserTransactions(username, filters)
  }

  /**
   * Log a transaction to the API
   */
  async logTransaction(transactionData: TransactionLogData): Promise<boolean> {
    return this.transactionsService.logTransaction(transactionData)
  }

  // ========================================
  // CONVENIENCE METHODS
  // ========================================

  /**
   * Check if the API is currently connected
   */
  isConnected(): boolean {
    return this.config.isConnected
  }

  /**
   * Get the current API base URL
   */
  getBaseUrl(): string {
    return this.config.baseUrl
  }

  /**
   * Perform a full health check of all API services
   */
  async healthCheck(): Promise<{
    connection: boolean;
    items: boolean;
    employees: boolean;
    transactions: boolean;
  }> {
    const results = {
      connection: false,
      items: false,
      employees: false,
      transactions: false
    }

    try {
      // Test basic connection
      results.connection = await this.testConnection()

      if (results.connection) {
        // Test items endpoint
        try {
          await this.fetchItems()
          results.items = true
        } catch (error) {
          console.warn("[ApiServices] Items endpoint health check failed:", error)
        }

        // Test employees endpoint
        try {
          await this.fetchEmployees()
          results.employees = true
        } catch (error) {
          console.warn("[ApiServices] Employees endpoint health check failed:", error)
        }

        // Test transactions endpoint
        try {
          await this.fetchTransactions({ limit: 1 })
          results.transactions = true
        } catch (error) {
          console.warn("[ApiServices] Transactions endpoint health check failed:", error)
        }
      }
    } catch (error) {
      console.error("[ApiServices] Health check failed:", error)
    }

    return results
  }
}

// Export the default instance
export const apiService = new ApiServices()

// Also export individual service classes for direct access if needed
export { ItemsService } from './Services/items.service'
export { EmployeesService } from './Services/employees.service'
export { TransactionsService } from './Services/transactions.service'
export { ConnectionService } from './Services/connection.service'

// Export types
export type { ApiConfig, TransactionFilters, TransactionResponse, TransactionStats } from './api-config'