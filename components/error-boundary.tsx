"use client"

import React from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error | undefined
  errorInfo?: React.ErrorInfo | undefined
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{
    error?: Error | undefined
    resetError: () => void
  }>
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error("[ErrorBoundary] Error caught:", error)
    console.error("[ErrorBoundary] Error info:", errorInfo)
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    })

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Replace with your error tracking service
      console.error("Production error:", {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      })
    }
  }

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: undefined as Error | undefined, 
      errorInfo: undefined as React.ErrorInfo | undefined 
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error as Error | undefined} resetError={this.resetError} />
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 text-red-500">
                <AlertTriangle className="w-full h-full" />
              </div>
              <CardTitle className="text-xl text-red-600 dark:text-red-400">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-slate-600 dark:text-slate-400 text-center">
                An unexpected error occurred. This might be a temporary issue.
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Error Details (Development)
                  </summary>
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded text-xs font-mono overflow-auto max-h-40">
                    <div className="text-red-600 dark:text-red-400 mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400">
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  </div>
                </details>
              )}

              <div className="flex space-x-2">
                <Button
                  onClick={this.resetError}
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  Reload Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error("[useErrorHandler] Error:", error)
    if (errorInfo) {
      console.error("[useErrorHandler] Error info:", errorInfo)
    }
    
    // Could integrate with error reporting service here
    if (process.env.NODE_ENV === 'production') {
      console.error("Production error from hook:", {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

// Wrapper component for async operations
interface AsyncErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: Error) => void
}

export function AsyncErrorBoundary({ children, onError }: AsyncErrorBoundaryProps) {
  const handleError = useErrorHandler()

  React.useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("[AsyncErrorBoundary] Unhandled promise rejection:", event.reason)
      handleError(new Error(event.reason))
      if (onError) {
        onError(new Error(event.reason))
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [handleError, onError])

  return <ErrorBoundary>{children}</ErrorBoundary>
}