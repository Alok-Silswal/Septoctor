"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Baby, Brain, Mail, Loader2 } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"
import { initFirebase, googleProvider } from "@/lib/firebase"
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { toast } from "sonner"

interface LoginPageProps {
  onLogin: (credentials: LoginCredentials) => void
}

export type LoginCredentials = {
  email: string
  password: string
  position: string
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const { auth } = initFirebase()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [position, setPosition] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !password || !position) {
      setError("Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      toast.success("Login successful!", {
        description: `Welcome back, ${user.email}`
      })
      
      onLogin({ email, password, position })
    } catch (err: any) {
      console.error("Login error:", err)
      
      // Handle different Firebase error codes
      const errorMessage = 
        err.code === "auth/invalid-credential" ? "Invalid email or password" :
        err.code === "auth/user-not-found" ? "User not found" :
        err.code === "auth/wrong-password" ? "Incorrect password" :
        err.code === "auth/invalid-email" ? "Invalid email format" :
        err.code === "auth/too-many-requests" ? "Too many attempts. Please try again later" :
        "Login failed. Please try again"
      
      setError(errorMessage)
      toast.error("Login Failed", {
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError("")
    setGoogleLoading(true)
    
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const credential = GoogleAuthProvider.credentialFromResult(result)
      const user = result.user
      
      toast.success("Login successful!", {
        description: `Welcome, ${user.displayName || user.email}`
      })
      
      // Auto-select position if not set
      const defaultPosition = position || "doctor"
      
      onLogin({ 
        email: user.email || "", 
        password: "", 
        position: defaultPosition 
      })
    } catch (err: any) {
      console.error("Google login error:", err)
      
      const errorMessage = 
        err.code === "auth/popup-closed-by-user" ? "Sign-in popup was closed" :
        err.code === "auth/cancelled-popup-request" ? "Sign-in cancelled" :
        err.code === "auth/popup-blocked" ? "Sign-in popup was blocked. Please allow popups" :
        "Google sign-in failed. Please try again"
      
      setError(errorMessage)
      toast.error("Google Sign-in Failed", {
        description: errorMessage
      })
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <ThemeToggle />

      <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm dark:bg-card/95">
        <CardContent className="p-8 md:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 via-teal-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Baby className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center border-2 border-white">
                <Brain className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-teal-600 mb-2">
              Septoctor
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Clinical Decision & Support System
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email/ID Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ID / Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your ID or email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-cyan-500 focus:ring-cyan-500"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-cyan-500 focus:ring-cyan-500"
              />
            </div>

            {/* Position Field */}
            <div className="space-y-2">
              <Label htmlFor="position" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Position
              </Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger className="h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-cyan-500 focus:ring-cyan-500">
                  <SelectValue placeholder="Select your position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                  <SelectItem value="resident">Resident</SelectItem>
                  <SelectItem value="specialist">Specialist</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-red-500 text-center">
                {error}
              </div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-medium text-base shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-card px-2 text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Login Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full h-12 border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span className="text-gray-700 dark:text-gray-300">Signing in...</span>
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5 text-red-500" />
                  <span className="text-gray-700 dark:text-gray-300">Sign in with Gmail</span>
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
<div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
  <p>
    Don&apos;t have an account?{" "}
    <a
      href="mailto:admin@yourhospital.com"
      className="text-cyan-600 hover:text-cyan-700 font-medium underline"
    >
      Contact Administrator
    </a>
  </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
