"use client"

import React, { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface Character {
  id: number
  x: number
  y: number
  duration: number
  delay: number
  size: number
  symbol: string
}

export function AnimatedLoginPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const chars: Character[] = []
    const symbols = ["{ }", "< >", "[ ]", "( )", "/ *", "+ -", "= =", "| |", "@ #", "$ %", "^ &", "* !"]

    for (let i = 0; i < 30; i++) {
      chars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: 15 + Math.random() * 20,
        delay: Math.random() * 10,
        size: 14 + Math.random() * 18,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
      })
    }
    setCharacters(chars)
  }, [])

  if (!mounted) return null

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated characters background */}
      <div className="absolute inset-0 overflow-hidden">
        {characters.map((char) => (
          <div
            key={char.id}
            className="absolute text-purple-400/20 font-mono font-bold animate-float"
            style={{
              left: `${char.x}%`,
              top: `${char.y}%`,
              fontSize: `${char.size}px`,
              animationDuration: `${char.duration}s`,
              animationDelay: `${char.delay}s`,
            }}
          >
            {char.symbol}
          </div>
        ))}

        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}

function childrenDiv({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export default function Component({ children }: { children: React.ReactNode }) {
  const [characters, setCharacters] = useState<Character[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const chars: Character[] = []
    const symbols = ["{ }", "< >", "[ ]", "( )", "/ *", "+ -", "= =", "| |", "@ #", "$ %", "^ &", "* !"]

    for (let i = 0; i < 30; i++) {
      chars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: 15 + Math.random() * 20,
        delay: Math.random() * 10,
        size: 14 + Math.random() * 18,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
      })
    }
    setCharacters(chars)
  }, [])

  if (!mounted) return null

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated characters background */}
      <div className="absolute inset-0 overflow-hidden">
        {characters.map((char) => (
          <div
            key={char.id}
            className="absolute text-purple-400/20 font-mono font-bold"
            style={{
              left: `${char.x}%`,
              top: `${char.y}%`,
              fontSize: `${char.size}px`,
              animation: `float ${char.duration}s ease-in-out ${char.delay}s infinite`,
            }}
          >
            {char.symbol}
          </div>
        ))}

        {/* Gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        {children}
      </div>
    </div>
  )
}
