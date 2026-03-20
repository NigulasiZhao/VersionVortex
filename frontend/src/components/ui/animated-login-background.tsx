import { useState, useEffect, type ReactNode } from "react"

interface AnimatedBackgroundProps {
  children: ReactNode
}

export function AnimatedBackground({ children }: AnimatedBackgroundProps) {
  const [characters, setCharacters] = useState<Array<{
    id: number
    x: number
    y: number
    duration: number
    delay: number
    size: number
    symbol: string
  }>>([])

  useEffect(() => {
    const chars = []
    const symbols = ["{ }", "< >", "[ ]", "( )", "/ *", "+ -", "= =", "| |", "@ #", "$ %", "^ &", "* !"]

    for (let i = 0; i < 25; i++) {
      chars.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        duration: 15 + Math.random() * 20,
        delay: Math.random() * 10,
        size: 14 + Math.random() * 16,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
      })
    }
    setCharacters(chars)
  }, [])

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      {/* Animated characters background */}
      <div className="absolute inset-0 overflow-hidden">
        {characters.map((char) => (
          <div
            key={char.id}
            className="absolute text-purple-400/15 font-mono font-bold select-none"
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
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[100px] animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/15 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-pink-500/15 rounded-full blur-[60px] animate-pulse-slow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-8">
        {children}
      </div>
    </div>
  )
}
