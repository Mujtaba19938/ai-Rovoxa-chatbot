"use client"

import { useState } from "react"

import type React from "react"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { X, Wifi } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConnectivityTest } from "./connectivity-test"

interface SettingsPanelProps {
  onClose: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  // Dummy states for settings
  const [orbAnimationEnabled, setOrbAnimationEnabled] = useState(true)
  const [voiceInteractionEnabled, setVoiceInteractionEnabled] = useState(false)
  const [aiPersonality, setAiPersonality] = useState("friendly")
  const [showConnectivityTest, setShowConnectivityTest] = useState(false)

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed top-0 right-0 h-full w-full max-w-md bg-background/95 backdrop-blur-lg shadow-2xl z-50 p-6 flex flex-col border-l border-border"
    >
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-foreground">Settings</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={24} />
        </Button>
      </div>

      <div className="space-y-8 overflow-y-auto flex-grow pr-2">
        {/* AI Personality */}
        <div>
          <Label htmlFor="ai-personality" className="text-foreground text-lg mb-2 block">
            AI Personality
          </Label>
          <Select value={aiPersonality} onValueChange={setAiPersonality}>
            <SelectTrigger id="ai-personality" className="w-full">
              <SelectValue placeholder="Select personality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="sarcastic">Sarcastic (Experimental)</SelectItem>
              <SelectItem value="concise">Concise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orb Animation */}
        <div className="flex items-center justify-between">
          <Label htmlFor="orb-animation" className="text-foreground text-lg">
            Orb Animation
          </Label>
          <Switch
            id="orb-animation"
            checked={orbAnimationEnabled}
            onCheckedChange={setOrbAnimationEnabled}
          />
        </div>
        <p className="text-sm text-muted-foreground -mt-6">Toggle the main orb's idle and reactive animations.</p>

        {/* Voice Interaction */}
        <div className="flex items-center justify-between">
          <Label htmlFor="voice-interaction" className="text-foreground text-lg">
            Voice Interaction
          </Label>
          <Switch
            id="voice-interaction"
            checked={voiceInteractionEnabled}
            onCheckedChange={setVoiceInteractionEnabled}
          />
        </div>
        <p className="text-sm text-muted-foreground -mt-6">Enable voice input and output (requires browser permissions).</p>

        {/* Connectivity Test Section */}
        <div>
          <Label className="text-foreground text-lg mb-2 block">System Diagnostics</Label>
          <Button
            variant="outline"
            onClick={() => setShowConnectivityTest(!showConnectivityTest)}
            className="w-full"
          >
            <Wifi className="h-4 w-4 mr-2" />
            {showConnectivityTest ? 'Hide' : 'Show'} Connectivity Test
          </Button>
          {showConnectivityTest && (
            <div className="mt-4">
              <ConnectivityTest />
            </div>
          )}
        </div>

      </div>

      <div className="mt-auto pt-6 border-t border-border">
        <Button onClick={onClose} className="w-full">
          Save & Close
        </Button>
      </div>
    </motion.div>
  )
}
