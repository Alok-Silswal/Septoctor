"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Send, Bot, User, Loader2, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface AIChatAssistantProps {
  patientContext?: any
  className?: string
}

export function AIChatAssistant({ patientContext, className }: AIChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your AI assistant. I can help you interpret the sepsis risk assessment and answer questions about the patient's data. What would you like to know?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Track scroll position to show/hide "scroll to bottom" button
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollDown(!isNearBottom)
  }, [])

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory,
          patientContext
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("RATE_LIMIT")
        }
        throw new Error(data.error || "Failed to get response")
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      
      let errorMsg = "Sorry, I encountered an error. Please try again."
      
      if (error instanceof Error) {
        if (error.message === "RATE_LIMIT") {
          errorMsg = "⏳ Rate limit reached. Google Gemini has request limits. Please wait 2-3 minutes and try again."
        } else {
          errorMsg = `Sorry, I encountered an error: ${error.message}`
        }
      }
      
      const errorMessage: Message = {
        role: "assistant",
        content: errorMsg,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      // Re-focus the textarea after response
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <Card className={cn("flex flex-col overflow-hidden", !className?.includes("h-full") && "h-[500px] sm:h-[550px] md:h-[600px]", className)}>
      {/* Header - hidden when embedded in side panel with its own header */}
      {!className?.includes("rounded-none") && (
        <CardHeader className="pb-2 pt-4 px-4 md:px-6 flex-shrink-0 border-b">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <MessageSquare className="w-5 h-5 text-purple-500" />
            AI Medical Assistant
          </CardTitle>
          <p className="text-xs md:text-sm text-muted-foreground">
            Ask questions about the risk assessment and patient data
          </p>
        </CardHeader>
      )}

      {/* Messages area - native scrollable div for reliable scrolling */}
      <div className="flex-1 min-h-0 relative">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-auto overscroll-contain px-3 md:px-5 py-4 scroll-smooth"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <div className="space-y-3 md:space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-2 md:gap-3 items-end",
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0",
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-purple-500 text-white"
                  )}
                >
                  {message.role === "user" ? (
                    <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2 md:px-4 md:py-2.5 max-w-[85%] sm:max-w-[78%] break-words",
                    message.role === "user"
                      ? "bg-blue-500 text-white rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  )}
                >
                  {message.role === "assistant" ? (
                    <div className="text-sm [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h1]:font-bold [&_h1]:my-2 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:my-1.5 [&_code]:text-xs [&_code]:bg-black/10 [&_code]:rounded [&_code]:px-1 [&_pre]:my-1 [&_pre]:bg-black/5 [&_pre]:rounded-lg [&_pre]:p-2 [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_strong]:font-semibold [&_a]:text-blue-500 [&_a]:underline">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  )}
                  <p
                    className={cn(
                      "text-[10px] md:text-xs mt-1 select-none",
                      message.role === "user" ? "text-blue-100" : "text-muted-foreground"
                    )}
                  >
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-2 md:gap-3 items-end">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-purple-500 text-white">
                  <Bot className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
                <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-muted">
                  <div className="flex gap-1.5 items-center">
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Scroll to bottom button */}
        {showScrollDown && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 shadow-lg rounded-full p-2 border hover:bg-gray-50 dark:hover:bg-gray-700 transition-all z-10"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t p-3 md:p-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about the patient assessment..."
            disabled={isLoading}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 min-h-[40px] max-h-[120px] overflow-y-auto"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="rounded-xl h-10 w-10 flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
