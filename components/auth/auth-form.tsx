"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, User, Eye, EyeOff, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { getApiUrl } from "@/lib/api"

interface AuthFormProps {
  onSuccess?: (user: any, token: string) => void
  onError?: (error: string) => void
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess, onError }) => {
  const { login, register } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters"
    }
    
    if (!isLogin && !formData.name) {
      newErrors.name = "Name is required"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setErrors({})
    setSuccessMessage("")
    
    try {
      if (isLogin) {
        await login(formData.email, formData.password)
        setSuccessMessage("Successfully signed in! Redirecting...")
        
        // Clear form data after successful login
        setFormData({ email: "", password: "", name: "" })
        
        // Call the optional onSuccess callback for login
        if (onSuccess) {
          const user = JSON.parse(localStorage.getItem("user") || "{}")
          const token = localStorage.getItem("authToken") || ""
          onSuccess(user, token)
        }
      } else {
        // For registration, don't automatically log in
        // Instead, make a direct API call to register without using the auth context
        const apiUrl = getApiUrl("/api/auth/register");
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name
          }),
        })
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("❌ Non-JSON response received:", text.substring(0, 200));
          throw new Error(`Server returned HTML instead of JSON. Check if backend is running at ${apiUrl}`);
        }
        
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || "Registration failed")
        }
        
        setSuccessMessage("Account created successfully! Please sign in to continue.")
        
        // Clear form data and switch to login mode
        setFormData({ email: formData.email, password: "", name: "" })
        
        // Switch to login mode after a short delay
        setTimeout(() => {
          setIsLogin(true)
          setSuccessMessage("")
        }, 3000)
      }
      
    } catch (error) {
      console.error("Auth error:", error)
      const errorMessage = error instanceof Error ? error.message : "Authentication failed"
      
      // Handle specific error cases more gracefully
      if (errorMessage.includes("already exists")) {
        setErrors({ email: "An account with this email already exists. Please try logging in instead." })
        // Automatically switch to login mode for better UX
        if (!isLogin) {
          setTimeout(() => {
            setIsLogin(true)
            setErrors({})
          }, 2000)
        }
      } else if (errorMessage.includes("Invalid email or password")) {
        setErrors({ password: "Invalid email or password. Please check your credentials." })
      } else {
        if (onError) {
          onError(errorMessage)
        } else {
          setErrors({ general: errorMessage })
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center p-3 sm:p-4 md:p-6"
      style={{ background: "var(--bg-primary)" }}
    >
      <Card className="w-full max-w-[420px] bg-white shadow-lg">
        <CardHeader className="text-center space-y-2 sm:space-y-3 pb-4 sm:pb-6 px-4 sm:px-6 pt-4 sm:pt-6">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900">
            {isLogin ? "Welcome back" : "Create account"}
          </CardTitle>
          <CardDescription className="text-gray-600 text-sm sm:text-base leading-relaxed">
            {isLogin 
              ? "Sign in to continue to Rovoxa" 
              : "You'll get smarter responses and can upload files, images, and more."
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
          {/* Social Login Buttons */}
          <div className="space-y-2 sm:space-y-3">
            <Button
              variant="outline"
              className="w-full bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-10 sm:h-11 text-sm sm:text-base"
              disabled={isLoading}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="truncate">Continue with Google</span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-10 sm:h-11 text-sm sm:text-base"
              disabled={isLoading}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
              </svg>
              <span className="truncate">Continue with Apple</span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-10 sm:h-11 text-sm sm:text-base"
              disabled={isLoading}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 shrink-0" viewBox="0 0 24 24">
                <path fill="#F25022" d="M1 1h10v10H1z"/>
                <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                <path fill="#FFB900" d="M13 13h10v10H13z"/>
              </svg>
              <span className="truncate">Continue with Microsoft</span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full bg-white border-gray-300 text-gray-900 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 h-10 sm:h-11 text-sm sm:text-base"
              disabled={isLoading}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              <span className="truncate">Continue with phone</span>
            </Button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-black text-white px-2 text-[10px] sm:text-xs">Or</span>
            </div>
          </div>
          
          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {!isLogin && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="name" className="text-gray-900 text-sm sm:text-base">Name</Label>
                <div className="relative">
                  <User className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className={cn(
                      "pl-9 sm:pl-10 pr-3 h-10 sm:h-11 text-sm sm:text-base bg-white border-gray-300 text-gray-900 placeholder:text-gray-500",
                      errors.name && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                    )}
                    disabled={isLoading}
                  />
                </div>
                {errors.name && (
                  <p className="text-xs sm:text-sm text-red-500">{errors.name}</p>
                )}
              </div>
            )}
            
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-gray-900 text-sm sm:text-base">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={cn(
                    "pl-9 sm:pl-10 pr-3 h-10 sm:h-11 text-sm sm:text-base bg-white border-gray-300 text-gray-900 placeholder:text-gray-500",
                    errors.email && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-xs sm:text-sm text-red-500">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="password" className="text-gray-900 text-sm sm:text-base">Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 sm:left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className={cn(
                    "pl-9 sm:pl-10 pr-9 sm:pr-10 h-10 sm:h-11 text-sm sm:text-base bg-white border-gray-300 text-gray-900 placeholder:text-gray-500",
                    errors.password && "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  )}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 sm:right-3 top-2.5 sm:top-3 text-gray-500 hover:text-gray-900"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs sm:text-sm text-red-500">{errors.password}</p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 sm:py-3 rounded-md h-10 sm:h-11 text-sm sm:text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isLogin ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                isLogin ? "Sign in" : "Create account"
              )}
            </Button>
          </form>
          
          {/* Success Message */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4"
              >
                <Alert className="bg-green-900/20 border-green-500/30 text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* General Error Message */}
          <AnimatePresence>
            {errors.general && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4"
              >
                <Alert className="bg-destructive/20 border-destructive/30 text-destructive">
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="text-center pt-1 sm:pt-2">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs sm:text-sm text-gray-600 hover:text-blue-600 transition-colors duration-200 hover:underline"
              disabled={isLoading}
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
