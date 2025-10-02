import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { ErrorBoundary } from "@/components/error-boundary"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "TOOLBOX - Shopping Application",
  description: "Professional inventory management system",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable} bg-background text-foreground`}>
        <ErrorBoundary>
          <Suspense fallback={null}>
            <ThemeProvider defaultTheme="system" storageKey="toolbox-theme">
              {children}
            </ThemeProvider>
          </Suspense>
        </ErrorBoundary>
        <Analytics />
      </body>
    </html>
  )
}
