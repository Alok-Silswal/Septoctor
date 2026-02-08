import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { Toaster } from "@/components/ui/sonner"
import { OCRProvider } from "@/context/ocr-context"
import ClientWrapper from "./client-wrapper"

import "./globals.css"

export const metadata: Metadata = {
  title: "Septoctor - AI Driven Sepsis Prediction",
  description: "AI-powered neonatal sepsis prediction and risk scoring tool",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ClientWrapper>
          <OCRProvider>
            {children}
          </OCRProvider>
        </ClientWrapper>
      </body>
    </html>
  )
}

