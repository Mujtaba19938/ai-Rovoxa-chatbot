"use client"

import React from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sun, Moon, Palette, Coffee, Snowflake, Zap, TreePine, Sunset } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThemeOption {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  isDark: boolean
}

const themeOptions: ThemeOption[] = [
  {
    id: "light",
    name: "Default Light",
    description: "Clean and bright",
    icon: <Sun className="h-4 w-4" />,
    isDark: false
  },
  {
    id: "warm",
    name: "Warm Brown",
    description: "Cozy brown tones",
    icon: <Coffee className="h-4 w-4" />,
    isDark: false
  },
  {
    id: "cool",
    name: "Cool Blue",
    description: "Fresh blue tones",
    icon: <Snowflake className="h-4 w-4" />,
    isDark: false
  },
  {
    id: "dark",
    name: "Default Dark",
    description: "Classic dark mode",
    icon: <Moon className="h-4 w-4" />,
    isDark: true
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Neon purple vibes",
    icon: <Zap className="h-4 w-4" />,
    isDark: true
  },
  {
    id: "forest",
    name: "Forest",
    description: "Natural green tones",
    icon: <TreePine className="h-4 w-4" />,
    isDark: true
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm orange glow",
    icon: <Sunset className="h-4 w-4" />,
    isDark: true
  }
]

export const ThemeSelector: React.FC = () => {
  const { theme, setTheme } = useTheme()

  const currentTheme = themeOptions.find(t => t.id === theme) || themeOptions[0]

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {currentTheme.icon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
          Light Themes
        </div>
        {themeOptions.filter(t => !t.isDark).map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.id}
            onClick={() => handleThemeChange(themeOption.id)}
            className={cn(
              "flex items-center space-x-2 cursor-pointer",
              theme === themeOption.id && "bg-accent"
            )}
          >
            {themeOption.icon}
            <div className="flex-1">
              <div className="font-medium">{themeOption.name}</div>
              <div className="text-xs text-muted-foreground">{themeOption.description}</div>
            </div>
            {theme === themeOption.id && (
              <div className="w-2 h-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
        
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground mt-2">
          Dark Themes
        </div>
        {themeOptions.filter(t => t.isDark).map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.id}
            onClick={() => handleThemeChange(themeOption.id)}
            className={cn(
              "flex items-center space-x-2 cursor-pointer",
              theme === themeOption.id && "bg-accent"
            )}
          >
            {themeOption.icon}
            <div className="flex-1">
              <div className="font-medium">{themeOption.name}</div>
              <div className="text-xs text-muted-foreground">{themeOption.description}</div>
            </div>
            {theme === themeOption.id && (
              <div className="w-2 h-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
