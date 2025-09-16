"use client"

import { useState, useEffect } from "react"
import { CheckCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface CheckoutSuccessCountdownProps {
  isOpen: boolean
  onComplete: () => void
  userId: string
  totalItems: number
  countdownSeconds?: number
}

export function CheckoutSuccessCountdown({
  isOpen,
  onComplete,
  userId,
  totalItems,
  countdownSeconds = 5,
}: CheckoutSuccessCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(countdownSeconds)
  const [isSkipped, setIsSkipped] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(countdownSeconds)
      setIsSkipped(false)
      return
    }

    if (isSkipped) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isOpen, onComplete, countdownSeconds, isSkipped])

  const handleSkip = () => {
    setIsSkipped(true)
    onComplete()
  }

  const progressValue = ((countdownSeconds - timeLeft) / countdownSeconds) * 100

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-slate-800">
        <CardContent className="p-8 text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Checkout Successful!</h2>
            <p className="text-slate-600 dark:text-slate-400">Your order has been processed successfully.</p>
          </div>

          {/* Order Details */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">User ID:</span>
              <span className="font-medium dark:text-slate-100">{userId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Total Items:</span>
              <span className="font-medium dark:text-slate-100">{totalItems}</span>
            </div>
          </div>

          {/* Countdown */}
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                Returning to browsing in {timeLeft} seconds...
              </p>
              <Progress value={progressValue} className="h-2" />
            </div>

            {/* Skip Button */}
            <Button
              onClick={handleSkip}
              variant="outline"
              className="w-full dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700 bg-transparent"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Continue Browsing Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
