import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReleaseButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  className?: string;
}

export function ReleaseButton({
  onClick,
  disabled = false,
  loading = false,
  label = "一键发版",
  className
}: ReleaseButtonProps) {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <button
      className={cn(
        "group relative rounded-full bg-gradient-to-r from-blue-300/30 via-blue-500/30 via-40% to-purple-500/30 p-0.5 text-white transition-all hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        className
      )}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="relative flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-blue-400 via-blue-500 via-40% to-purple-500 px-3 py-1.5 text-white">
        <Sparkles className="size-4 -translate-y-0.5 animate-sparkle fill-white" />
        <Sparkles
          style={{ animationDelay: "1s" }}
          className="absolute bottom-1.5 left-2.5 z-20 size-1.5 rotate-12 animate-sparkle fill-white"
        />
        <Sparkles
          style={{ animationDelay: "1.5s", animationDuration: "2.5s" }}
          className="absolute left-3.5 top-1 size-1 -rotate-12 animate-sparkle fill-white"
        />
        <Sparkles
          style={{ animationDelay: "0.5s", animationDuration: "2.5s" }}
          className="absolute left-2 top-1.5 size-1 animate-sparkle fill-white"
        />
        <span className="font-medium text-xs">
          {loading ? "构建中..." : label}
        </span>
      </div>
    </button>
  );
}

export default ReleaseButton;
