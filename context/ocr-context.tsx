"use client"
import { createContext, useContext, useState } from "react"

type OCRContextType = {
  ocrText: string
  setOcrText: (text: string) => void
}

const OCRContext = createContext<OCRContextType | null>(null)

export function OCRProvider({ children }: { children: React.ReactNode }) {
  const [ocrText, setOcrText] = useState("")

  return (
    <OCRContext.Provider value={{ ocrText, setOcrText }}>
      {children}
    </OCRContext.Provider>
  )
}

export function useOCR() {
  const ctx = useContext(OCRContext)
  if (!ctx) throw new Error("useOCR must be used inside OCRProvider")
  return ctx
}
