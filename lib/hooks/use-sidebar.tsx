'use client'

import * as React from 'react'

const LOCAL_STORAGE_KEY = 'sidebar'

interface SidebarContext {
  isSidebarOpen: boolean
  toggleSidebar: () => void
  isLoading: boolean
}

const SidebarContext = React.createContext<SidebarContext | undefined>(
  undefined
)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebarContext must be used within a SidebarProvider')
  }
  return context
}

interface SidebarProviderProps {
  children: React.ReactNode
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isSidebarOpen, setSidebarOpen] = React.useState(true)
  const [isLoading, setLoading] = React.useState(true)

  React.useEffect(() => {
    try {
      const value = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (value === 'true' || value === 'false')
        setSidebarOpen(value === 'true')
    } catch {
      // Storage can be unavailable in private browsing or browser policies.
      // Keep the usable default rather than preventing the app from rendering.
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleSidebar = () => {
    const next = !isSidebarOpen
    setSidebarOpen(next)
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // The menu still works for this tab when the preference cannot be saved.
    }
  }

  return (
    <SidebarContext.Provider
      value={{ isSidebarOpen, toggleSidebar, isLoading }}
    >
      {children}
    </SidebarContext.Provider>
  )
}
