"use client"

import { useState, useEffect } from "react"
import { X, User, Wifi, WifiOff, Scan, CreditCard, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiService } from "@/lib/api_service"
import type { CartItem } from "@/app/page"

interface Employee {
  id: number
  fullName: string
  firstName: string
  middleName: string
  lastName: string
  age: number | null
  birthDate: string
  contactNumber: string | null
  createdAt: string
  department: string
  document: string | null
  email: string
  hireDate: string
  idBarcode: string
  idNumber: string
  isNewHire: boolean
  position: string
  profilePicture: string | null
  salary: string | null
  status: string
  address: string | null
  civilStatus: string | null
  pagibigNumber: string | null
  philhealthNumber: string | null
  sssNumber: string | null
  tinNumber: string | null
}

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  items: CartItem[]
  onConfirmCheckout: (employee: Employee) => void
  isCommitting?: boolean
}

export function CheckoutModal({ isOpen, onClose, items, onConfirmCheckout, isCommitting = false }: CheckoutModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [inputMethod, setInputMethod] = useState<'barcode' | 'manual'>('barcode')
  const [userInput, setUserInput] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load employees when modal opens
  useEffect(() => {
    if (isOpen && employees.length === 0) {
      loadEmployees()
    }
  }, [isOpen])

  // Listen for barcode scanner input
  useEffect(() => {
    if (!isOpen || inputMethod !== 'barcode') return

    let barcodeBuffer = ""
    let lastKeyTime = Date.now()

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentTime = Date.now()

      // If more than 100ms has passed, reset buffer (indicates manual typing vs scanner)
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = ""
      }
      lastKeyTime = currentTime

      // Handle Enter key (scanner typically sends this at the end)
      if (event.key === 'Enter') {
        event.preventDefault()
        if (barcodeBuffer.length > 3) { // Minimum barcode length
          handleBarcodeScanned(barcodeBuffer)
          barcodeBuffer = ""
        }
        return
      }

      // Add character to buffer if it's alphanumeric
      if (/^[a-zA-Z0-9]$/.test(event.key)) {
        barcodeBuffer += event.key

        // Prevent the input from appearing in any focused input field
        if (document.activeElement?.tagName !== 'INPUT') {
          event.preventDefault()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, inputMethod, employees])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedEmployee(null)
      setUserInput("")
      setError(null)
      setIsScanning(false)
    }
  }, [isOpen])

  const loadEmployees = async () => {
    setLoadingEmployees(true)
    setError(null)
    try {
      const employeeData = await apiService.fetchEmployees()
      setEmployees(employeeData.filter((emp: Employee) => emp.status === 'Active'))
      console.log("[CheckoutModal] Loaded", employeeData.length, "employees")
      console.log(employeeData)
    } catch (error) {
      console.error("[CheckoutModal] Failed to load employees:", error)
      setError("Failed to load employee data. Please check API connection.")
    } finally {
      setLoadingEmployees(false)
    }
  }

  const handleBarcodeScanned = (barcode: string) => {
    console.log("[CheckoutModal] Barcode scanned:", barcode)
    setIsScanning(true)

    // Find employee by idBarcode
    const employee = employees.find(emp => emp.idBarcode === barcode)

    if (employee) {
      setSelectedEmployee(employee)
      setUserInput(barcode)
      setError(null)
      console.log("[CheckoutModal] Employee found:", employee.firstName, employee.lastName)
    } else {
      setError(`No employee found with barcode: ${barcode}`)
      setUserInput(barcode)
      setSelectedEmployee(null)
      console.warn("[CheckoutModal] No employee found for barcode:", barcode)
    }

    setIsScanning(false)
  }

  const handleManualInput = (value: string) => {
    setUserInput(value)
    setError(null)

    if (value.trim().length === 0) {
      setSelectedEmployee(null)
      return
    }

    // Find employee by idNumber
    const employee = employees.find(emp => emp.idNumber === value.trim())

    if (employee) {
      setSelectedEmployee(employee)
      console.log("[CheckoutModal] Employee found by ID:", employee.firstName, employee.lastName)
    } else {
      setSelectedEmployee(null)
    }
  }

  const handleConfirm = async () => {
    if (!selectedEmployee) {
      setError("Please scan a barcode or enter a valid employee ID.")
      return
    }

    try {
      // Log the transaction to employee logs
      const transactionData = {
        username: selectedEmployee.fullName, // Use email or ID as username
        details: `Checkout - ${totalItems}x items (${items.map(item => `${item.name}(${item.quantity || 1})`).join(', ')})`,
        log_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        log_time: new Date().toTimeString().split(' ')[0] // HH:MM:SS
      }

      console.log("[CheckoutModal] Logging transaction:", transactionData)

      // Save to employee logs using the new service method
      try {
        await apiService.logTransaction({
          userId: selectedEmployee.id?.toString() || selectedEmployee.fullName,
          items: items,
          username: selectedEmployee.fullName,
          totalItems: totalItems,
          timestamp: new Date().toISOString()
        })
      } catch (logError) {
        console.warn("[CheckoutModal] Failed to log transaction (non-critical):", logError)
      }

      // Pass the employee object directly (not wrapped in userId)
      onConfirmCheckout(selectedEmployee)
    } catch (error) {
      console.error("[CheckoutModal] Failed to log transaction:", error)
      setError("Failed to save transaction log. Please try again.")
    }
  }

  if (!isOpen) return null

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalValue = items.reduce((sum, item) => sum + item.quantity * 10, 0) // Assuming $10 per item
  const apiConfig = apiService.getConfig()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold dark:text-slate-100">Checkout Summary</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isCommitting}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* API Status */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center space-x-2">
              {apiConfig.isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">API Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">API Disconnected</span>
                </>
              )}
            </div>
            <Badge variant={apiConfig.isConnected ? "default" : "secondary"} className="text-xs">
              {apiConfig.isConnected ? "Changes will be committed to API" : "Local checkout only"}
            </Badge>
          </div>

          {/* Order Summary */}
          <div>
            <h3 className="font-semibold mb-3 dark:text-slate-100">Order Summary</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-slate-200 dark:border-slate-600"
                >
                  <div className="flex-1">
                    <p className="font-medium dark:text-slate-100">{item.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {item.brand} • {item.itemType}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      Balance: {item.balance} → {Math.max(0, item.balance - item.quantity)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium dark:text-slate-100">Qty: {item.quantity}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">${(item.quantity * 10).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="dark:text-slate-300">Total Items:</span>
              <span className="font-medium dark:text-slate-100">{totalItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="dark:text-slate-300">Unique Products:</span>
              <span className="font-medium dark:text-slate-100">{items.length}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span className="dark:text-slate-100">Total Amount:</span>
              <span className="dark:text-slate-100">${totalValue.toFixed(2)}</span>
            </div>
          </div>

          <Separator />

          {/* Employee Identification */}
          <div className="space-y-4">
            <Label className="text-base font-semibold dark:text-slate-100">
              Employee Identification <span className="text-red-500">*</span>
            </Label>

            {/* Input Method Selection */}
            <div className="flex space-x-2">
              <Select value={inputMethod} onValueChange={(value: 'barcode' | 'manual') => {
                setInputMethod(value)
                setUserInput("")
                setSelectedEmployee(null)
                setError(null)
              }}>
                <SelectTrigger className="w-48 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="barcode">
                    <div className="flex items-center space-x-2">
                      <Scan className="w-4 h-4" />
                      <span>Scan Barcode</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Enter ID Number</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Input Field */}
            <div className="space-y-2">
              {inputMethod === 'barcode' ? (
                <div className="relative">
                  <Input
                    placeholder="Scan employee barcode or type barcode manually"
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value)
                      if (e.target.value.trim().length > 3) {
                        handleBarcodeScanned(e.target.value.trim())
                      } else {
                        setSelectedEmployee(null)
                      }
                    }}
                    className="pr-10 dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                    disabled={isCommitting}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isScanning ? (
                      <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Scan className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
              ) : (
                <Input
                  placeholder="Enter employee ID number"
                  value={userInput}
                  onChange={(e) => handleManualInput(e.target.value)}
                  className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600"
                  disabled={isCommitting}
                />
              )}

              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                <User className="w-4 h-4" />
                <span>
                  {inputMethod === 'barcode'
                    ? "Position scanner to read employee barcode or type it manually"
                    : "Enter the employee's ID number from their badge"
                  }
                </span>
              </div>
            </div>

            {/* Loading State */}
            {loadingEmployees && (
              <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading employee data...</span>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Selected Employee Display */}
            {selectedEmployee && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                <div className="flex items-center space-x-3">
                  <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-800 dark:text-green-300">
                      {selectedEmployee.firstName} {selectedEmployee.middleName && selectedEmployee.middleName + ' '}{selectedEmployee.lastName}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {selectedEmployee.position} • {selectedEmployee.department}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500">
                      ID: {selectedEmployee.idNumber} • Barcode: {selectedEmployee.idBarcode}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isCommitting}
              className="flex-1 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedEmployee || isCommitting || loadingEmployees}
              className="flex-1 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
            >
              {isCommitting ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                "Confirm Checkout"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}