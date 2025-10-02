"use client"

import React, { useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  action: () => void
  description: string
}

interface KeyboardShortcutsProps {
  shortcuts?: KeyboardShortcut[]
  enabled?: boolean
}

const defaultShortcuts: KeyboardShortcut[] = [
  {
    key: '/',
    description: 'Focus search',
    action: () => {
      const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    }
  },
  {
    key: 'Escape',
    description: 'Clear focus',
    action: () => {
      const activeElement = document.activeElement as HTMLElement
      if (activeElement) {
        activeElement.blur()
      }
    }
  },
  {
    key: 'k',
    ctrlKey: true,
    description: 'Quick actions',
    action: () => {
      console.log('Quick actions - Command palette coming soon!')
    }
  }
]

export function KeyboardShortcuts({ shortcuts = defaultShortcuts, enabled = true }: KeyboardShortcutsProps) {
  const { toast } = useToast()

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return
      }

      const matchedShortcut = shortcuts.find(shortcut => {
        return (
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          !!shortcut.ctrlKey === event.ctrlKey &&
          !!shortcut.altKey === event.altKey &&
          !!shortcut.shiftKey === event.shiftKey
        )
      })

      if (matchedShortcut) {
        event.preventDefault()
        matchedShortcut.action()
        
        // Show toast notification for keyboard shortcut
        toast({
          title: "Keyboard Shortcut",
          description: matchedShortcut.description,
          duration: 2000,
        })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled, toast])

  return null // This component doesn't render anything
}

// Hook for easier keyboard shortcut management
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled = true) {
  return <KeyboardShortcuts shortcuts={shortcuts} enabled={enabled} />
}

// Predefined common shortcuts
export const commonShortcuts = {
  search: (action: () => void): KeyboardShortcut => ({
    key: 'k',
    ctrlKey: true,
    action,
    description: 'Open search (Ctrl+K)'
  }),
  
  escape: (action: () => void): KeyboardShortcut => ({
    key: 'Escape',
    action,
    description: 'Close modal/clear search (Esc)'
  }),
  
  refresh: (action: () => void): KeyboardShortcut => ({
    key: 'r',
    ctrlKey: true,
    action,
    description: 'Refresh data (Ctrl+R)'
  }),
  
  addToCart: (action: () => void): KeyboardShortcut => ({
    key: 'a',
    ctrlKey: true,
    action,
    description: 'Add selected item to cart (Ctrl+A)'
  }),
  
  viewCart: (action: () => void): KeyboardShortcut => ({
    key: 'c',
    ctrlKey: true,
    shiftKey: true,
    action,
    description: 'View cart (Ctrl+Shift+C)'
  }),
  
  help: (action: () => void): KeyboardShortcut => ({
    key: '?',
    shiftKey: true,
    action,
    description: 'Show keyboard shortcuts (Shift+?)'
  })
}