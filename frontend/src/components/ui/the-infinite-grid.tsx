"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import {
  motion,
  useMotionValue,
  useMotionTemplate,
  useAnimationFrame
} from "framer-motion";

export function TheInfiniteGrid({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const gridOffsetX = useMotionValue(0);
  const gridOffsetY = useMotionValue(0);

  const speedX = 0.5;
  const speedY = 0.5;

  useAnimationFrame(() => {
    const currentX = gridOffsetX.get();
    const currentY = gridOffsetY.get();
    gridOffsetX.set((currentX + speedX) % 40);
    gridOffsetY.set((currentY + speedY) % 40);
  });

  const maskImage = useMotionTemplate`radial-gradient(300px circle at ${mouseX}px ${mouseY}px, black, transparent)`;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "fixed inset-0 z-[-1] overflow-hidden pointer-events-none",
        className
      )}
      style={{ background: 'var(--color-canvas-default)' }}
    >
      {/* 静态网格层 */}
      <div className="absolute inset-0 opacity-[0.05]">
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </div>

      {/* 跟随鼠标的网格层 */}
      <motion.div
        className="absolute inset-0 opacity-40"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        <GridPattern offsetX={gridOffsetX} offsetY={gridOffsetY} />
      </motion.div>

      {/* 光晕效果 */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute right-[-20%] top-[-20%] w-[40%] h-[40%] rounded-full"
          style={{ background: 'rgba(108, 63, 245, 0.4)', filter: 'blur(120px)' }}
        />
        <div
          className="absolute right-[10%] top-[-10%] w-[20%] h-[20%] rounded-full"
          style={{ background: 'rgba(108, 63, 245, 0.3)', filter: 'blur(100px)' }}
        />
        <div
          className="absolute left-[-10%] bottom-[-20%] w-[40%] h-[40%] rounded-full"
          style={{ background: 'rgba(59, 130, 246, 0.4)', filter: 'blur(120px)' }}
        />
      </div>
    </div>
  );
}

const GridPattern = ({ offsetX, offsetY }: { offsetX: any, offsetY: any }) => {
  return (
    <svg className="w-full h-full">
      <defs>
        <motion.pattern
          id="grid-pattern"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
          x={offsetX}
          y={offsetY}
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            style={{ color: 'var(--color-fg-muted)' }}
          />
        </motion.pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
}
