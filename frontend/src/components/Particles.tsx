import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789{ }< >[ ]";

function generateRandomString(length: number) {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function Particles() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const [randomStrings, setRandomStrings] = useState<string[]>([]);

  // Smooth spring animation for mouse following
  const springConfig = { damping: 25, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  useEffect(() => {
    // Generate random strings for the background
    const strings = [];
    for (let i = 0; i < 8; i++) {
      strings.push(generateRandomString(800));
    }
    setRandomStrings(strings);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  // Create mask image for the effect
  const maskImage = `radial-gradient(350px at ${smoothX.get()}px ${smoothY.get()}px, rgba(108,63,245,0.15), transparent)`;

  return (
    <div className="particles-layer">
      {/* Base gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(108,63,245,0.03) 0%, rgba(139,92,246,0.02) 50%, rgba(167,139,250,0.03) 100%)',
        }}
      />

      {/* Matrix-like floating characters - revealed by mouse position */}
      <motion.div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{
          maskImage,
          WebkitMaskImage: maskImage,
        }}
      >
        {randomStrings.map((str, index) => (
          <div
            key={index}
            className="absolute text-[10px] font-mono break-all leading-relaxed whitespace-nowrap"
            style={{
              top: `${10 + index * 12}%`,
              left: '-20%',
              width: '140%',
              color: 'rgba(108, 63, 245, 0.25)',
              transform: `rotate(${index % 2 === 0 ? '-2deg' : '2deg'})`,
              animation: `float-chars-${index % 4 + 1} ${25 + index * 3}s linear infinite`,
            }}
          >
            {str}
          </div>
        ))}
      </motion.div>

      {/* Subtle gradient orbs for ambient effect */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(108,63,245,0.12) 0%, transparent 70%)',
          top: '20%',
          left: '10%',
          animation: 'orb-float-1 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          bottom: '15%',
          right: '10%',
          animation: 'orb-float-2 25s ease-in-out infinite',
        }}
      />

      {/* Mouse-following glow */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(108,63,245,0.08) 0%, transparent 70%)',
          x: smoothX,
          y: smoothY,
          translateX: '-50%',
          translateY: '-50%',
        }}
      />

      <style>{`
        @keyframes float-chars-1 {
          0% { transform: translateX(0) rotate(-2deg); }
          100% { transform: translateX(20%) rotate(-2deg); }
        }
        @keyframes float-chars-2 {
          0% { transform: translateX(0) rotate(2deg); }
          100% { transform: translateX(-15%) rotate(2deg); }
        }
        @keyframes float-chars-3 {
          0% { transform: translateX(0) rotate(-1deg); }
          100% { transform: translateX(25%) rotate(-1deg); }
        }
        @keyframes float-chars-4 {
          0% { transform: translateX(0) rotate(1deg); }
          100% { transform: translateX(-20%) rotate(1deg); }
        }
        @keyframes orb-float-1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, -20px); }
        }
        @keyframes orb-float-2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 30px); }
        }
      `}</style>
    </div>
  );
}
