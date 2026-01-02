'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  useTheme,
  type ThemeProviderProps,
} from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <NextThemesProvider {...props}>
      <ThemeHandler />
      {children}
    </NextThemesProvider>
  )
}

function ThemeHandler() {
  const { theme } = useTheme()

  React.useEffect(() => {
    if (theme) {
      const html = document.documentElement
      
      // Remove all theme classes
      html.classList.remove('dark', 'theme-warm', 'theme-cool', 'theme-cyberpunk', 'theme-forest', 'theme-sunset')
      
      // Apply base theme
      if (theme === 'dark' || theme === 'cyberpunk' || theme === 'forest' || theme === 'sunset') {
        html.classList.add('dark')
      }
      
      // Apply theme variant
      if (theme !== 'light' && theme !== 'dark') {
        html.classList.add(`theme-${theme}`)
      }
    }
  }, [theme])

  return null
}
