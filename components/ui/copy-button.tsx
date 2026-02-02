"use client"

import { Copy, Check } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface CopyButtonProps {
  content: string
  className?: string
  variant?: "default" | "subtle"
}

export function CopyButton({ content, className, variant = "default" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("[copy-button]: Failed to copy to clipboard", err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "transition-all duration-200",
        variant === "default" && "hover:opacity-70",
        variant === "subtle" && "opacity-60 hover:opacity-100",
        className
      )}
      title={copied ? "Copied!" : "Copy to clipboard"}
      aria-label="Copy message"
    >
      {copied ? (
        <Check className="w-4 h-4" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  )
}
