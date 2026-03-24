"use client";
import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BeamOptions {
  x: number;
  duration: number;
  delay: number;
  height: number;
}

interface CollisionMechanismProps {
  beamOptions: BeamOptions;
  containerRef: React.RefObject<HTMLDivElement | null>;
  parentRef: React.RefObject<HTMLDivElement | null>;
}

const CollisionMechanism = ({ beamOptions, containerRef, parentRef }: CollisionMechanismProps) => {
  const beamRef = useRef<HTMLDivElement>(null);
  const [collision, setCollision] = useState({
    detected: false,
    coordinates: null as { x: number; y: number } | null,
  });
  const [beamKey, setBeamKey] = useState(0);
  const [cycleCollisionDetected, setCycleCollisionDetected] = useState(false);

  useEffect(() => {
    const checkCollision = () => {
      if (
        beamRef.current &&
        containerRef.current &&
        parentRef.current &&
        !cycleCollisionDetected
      ) {
        const beamRect = beamRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const parentRect = parentRef.current.getBoundingClientRect();

        if (beamRect.bottom >= containerRect.top) {
          const relativeX = beamRect.left - parentRect.left + beamRect.width / 2;
          const relativeY = beamRect.bottom - parentRect.top;

          setCollision({
            detected: true,
            coordinates: { x: relativeX, y: relativeY },
          });
          setCycleCollisionDetected(true);
        }
      }
    };

    const animationInterval = setInterval(checkCollision, 50);
    return () => clearInterval(animationInterval);
  }, [cycleCollisionDetected, containerRef, parentRef]);

  useEffect(() => {
    if (collision.detected && collision.coordinates) {
      const timeout = setTimeout(() => {
        setCollision({ detected: false, coordinates: null });
        setCycleCollisionDetected(false);
      }, 2000);

      const keyTimeout = setTimeout(() => {
        setBeamKey((prevKey) => prevKey + 1);
      }, 2000);

      return () => {
        clearTimeout(timeout);
        clearTimeout(keyTimeout);
      };
    }
  }, [collision]);

  return (
    <>
      <motion.div
        key={beamKey}
        ref={beamRef}
        initial={{
          translateY: "0px",
          translateX: `${beamOptions.x}px`,
        }}
        animate={{
          translateY: "calc(100vh + 100px)",
          translateX: `${beamOptions.x}px`,
        }}
        transition={{
          duration: beamOptions.duration,
          repeat: Infinity,
          repeatType: "loop",
          ease: "linear",
          delay: beamOptions.delay,
        }}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 2,
          height: beamOptions.height,
          borderRadius: 9999,
          background: `linear-gradient(to bottom, transparent 0%, transparent 60%, #6C3FF5 85%, #A78BFA 100%)`,
        }}
      />
      <AnimatePresence>
        {collision.detected && collision.coordinates && (
          <Explosion
            key={`${collision.coordinates.x}-${collision.coordinates.y}`}
            style={{
              left: `${collision.coordinates.x}px`,
              top: `${collision.coordinates.y}px`,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

const Explosion = ({ ...props }: React.HTMLProps<HTMLDivElement>) => {
  const spans = Array.from({ length: 20 }, (_, index) => ({
    id: index,
    directionX: Math.floor(Math.random() * 80 - 40),
    directionY: Math.floor(Math.random() * -60 - 10),
  }));

  return (
    <div
      {...props}
      style={{
        position: "absolute",
        zIndex: 50,
        ...props.style,
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          position: "absolute",
          left: -60,
          right: -60,
          top: 0,
          height: 3,
          borderRadius: 9999,
          background: "linear-gradient(to right, transparent, #6C3FF5, #A78BFA, transparent)",
          boxShadow: "0 0 8px 1px rgba(108, 63, 245, 0.6)",
        }}
      />
      {spans.map((span) => (
        <motion.span
          key={span.id}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: span.directionX,
            y: span.directionY,
            opacity: 0,
          }}
          transition={{ duration: Math.random() * 1.5 + 0.5, ease: "easeOut" }}
          style={{
            position: "absolute",
            height: 3,
            width: 3,
            borderRadius: "50%",
            background: "#A78BFA",
            boxShadow: "0 0 4px 1px rgba(108, 63, 245, 0.6)",
          }}
        />
      ))}
    </div>
  );
};

export function Particles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const beams: BeamOptions[] = [
    { x: 60, duration: 5, delay: 0, height: 55 },
    { x: Math.round(windowWidth * 0.15), duration: 6, delay: 0.5, height: 90 },
    { x: Math.round(windowWidth * 0.3), duration: 4, delay: 1, height: 40 },
    { x: Math.round(windowWidth * 0.45), duration: 7, delay: 0.3, height: 70 },
    { x: Math.round(windowWidth * 0.6), duration: 5, delay: 0.8, height: 50 },
    { x: Math.round(windowWidth * 0.75), duration: 6, delay: 1.2, height: 85 },
    { x: Math.round(windowWidth * 0.9), duration: 4, delay: 0.2, height: 45 },
    { x: Math.round(windowWidth * 0.97), duration: 7, delay: 0.7, height: 65 },
  ];

  return (
    <div
      ref={parentRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        background: "linear-gradient(to bottom, #f8fafc 0%, #f1f5f9 60%, #ede9fe 100%)",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {beams.map((beam, idx) => (
        <CollisionMechanism
          key={`beam-${idx}`}
          beamOptions={beam}
          containerRef={containerRef}
          parentRef={parentRef}
        />
      ))}

      {/* 触底爆炸检测线 */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: "transparent",
        }}
      />
    </div>
  );
}
