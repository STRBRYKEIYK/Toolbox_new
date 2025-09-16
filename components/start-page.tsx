"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Settings, ShoppingCart, Wifi, WifiOff } from "lucide-react"

interface StartPageProps {
  onStart: () => void
  apiUrl: string
  onApiUrlChange: (url: string) => void
  isConnected: boolean
  apiError?: string | null
  isTestingConnection?: boolean
}

export function StartPage({
  onStart,
  apiUrl,
  onApiUrlChange,
  isConnected,
  apiError,
  isTestingConnection,
}: StartPageProps) {
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleSaveSettings = () => {
    onApiUrlChange(tempApiUrl)
    setIsSettingsOpen(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full animate-pulse-glow"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/10 rounded-full animate-pulse-glow"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <Card className="w-full max-w-md relative z-10 shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 animate-float">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <ShoppingCart className="w-10 h-10 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-primary mb-2">TOOLBOX</CardTitle>
          <p className="text-muted-foreground text-sm">Professional Point of Sale System</p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2 p-3 rounded-lg bg-muted/50">
              {isTestingConnection ? (
                <>
                  <div className="w-4 h-4 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                  <span className="text-sm text-muted-foreground">Testing connection...</span>
                </>
              ) : isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 dark:text-green-400">API Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600 dark:text-red-400">API Not Connected</span>
                </>
              )}
            </div>

            {apiError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-700 dark:text-red-300">{apiError}</p>
                <div className="mt-2 text-xs text-red-600 dark:text-red-400 space-y-1">
                  <p>• Make sure your API server is running</p>
                  <p>• Check if the URL is correct</p>
                  <p>• Ensure CORS is enabled on your server</p>
                  <p>• You can still use the app with demo data</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={onStart}
              className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isConnected ? "Start Ordering" : "Start with Demo Data"}
            </Button>

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-12 text-lg font-medium border-2 hover:bg-muted/50 transition-all duration-200 bg-transparent"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>API Configuration</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-url">API Base URL</Label>
                    <Input
                      id="api-url"
                      placeholder="http://192.168.68.106:3001"
                      value={tempApiUrl}
                      onChange={(e) => setTempApiUrl(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the base URL for your API server. This changes daily.
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={handleSaveSettings} className="flex-1">
                      Save Settings
                    </Button>
                    <Button variant="outline" onClick={() => setIsSettingsOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>
              {isConnected ? "API connected - live data available" : "Using demo data - configure API for live data"}
            </p>
            <p>Version 1.0.0</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
