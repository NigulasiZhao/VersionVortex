'use client'
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Package, Box, Users } from 'lucide-react';

interface TabItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  gradient: string;
  iconColor: string;
}

const tabs: TabItem[] = [
  { id: 'releases', icon: <Package className="h-4 w-4" />, label: "版本管理", gradient: "radial-gradient(circle, rgba(108,63,245,0.15) 0%, rgba(108,63,245,0.05) 70%, transparent 100%)", iconColor: "group-hover:text-purple-500" },
  { id: 'packages', icon: <Box className="h-4 w-4" />, label: "软件包", gradient: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 70%, transparent 100%)", iconColor: "group-hover:text-blue-500" },
  { id: 'users', icon: <Users className="h-4 w-4" />, label: "用户管理", gradient: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 70%, transparent 100%)", iconColor: "group-hover:text-green-500" },
];

const itemVariants: Variants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
};

const backVariants: Variants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
};

const glowVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  hover: {
    opacity: 1,
    scale: 1,
    transition: {
      opacity: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
      scale: { duration: 0.3, type: "spring" as const, stiffness: 300, damping: 25 },
    },
  },
};

const sharedTransition = {
  type: "spring" as const,
  stiffness: 100,
  damping: 20,
  duration: 0.4,
};

interface HoverTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function HoverTabs({ activeTab, onTabChange }: HoverTabsProps): React.JSX.Element {
  return (
    <div className="flex flex-nowrap items-center gap-1 p-1 rounded-xl border border-[var(--color-border-default)] w-auto overflow-hidden" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(8px)' }}>
      {tabs.map((item) => (
        <motion.div
          key={item.id}
          className="relative cursor-pointer"
          style={{ perspective: "600px", minWidth: "120px" }}
          whileHover="hover"
          initial="initial"
          onClick={() => onTabChange(item.id)}
        >
          {/* Glow background */}
          <motion.div
            className="absolute inset-0 z-0 pointer-events-none rounded-lg"
            variants={glowVariants}
            style={{
              background: item.gradient,
              opacity: 0,
            }}
          />

          {/* Active indicator */}
          {activeTab === item.id && (
            <div
              className="absolute inset-0 z-0 rounded-lg"
              style={{
                background: item.gradient,
                opacity: 0.5,
              }}
            />
          )}

          {/* Front-facing */}
          <motion.button
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 relative z-10 w-full rounded-lg text-[var(--color-fg-muted)] group-hover:text-[var(--color-fg-default)] transition-colors text-xs font-medium whitespace-nowrap"
            variants={itemVariants}
            transition={sharedTransition}
            style={{
              transformStyle: "preserve-3d",
              transformOrigin: "center bottom"
            }}
            onClick={(e) => {
              e.preventDefault();
              onTabChange(item.id);
            }}
          >
            <span className={`transition-colors duration-300 ${item.iconColor}`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </motion.button>

          {/* Back-facing */}
          <motion.button
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 absolute inset-0 z-10 text-[var(--color-fg-default)] transition-colors text-xs font-medium rounded-lg whitespace-nowrap"
            variants={backVariants}
            transition={sharedTransition}
            style={{
              transformStyle: "preserve-3d",
              transformOrigin: "center top",
              transform: "rotateX(90deg)"
            }}
            onClick={(e) => {
              e.preventDefault();
              onTabChange(item.id);
            }}
          >
            <span className={`transition-colors duration-300 ${item.iconColor}`}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </motion.button>
        </motion.div>
      ))}
    </div>
  );
}

export default HoverTabs;
