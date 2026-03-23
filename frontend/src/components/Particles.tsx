import React from 'react';

// Generate particle elements
export function Particles() {
  return (
    <div className="particles-layer">
      {/* Large particles - slow floating */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={`large-${i}`} className="particle-large" />
      ))}

      {/* Medium particles - breathing effect */}
      {Array.from({ length: 25 }).map((_, i) => (
        <div key={`medium-${i}`} className="particle-medium" />
      ))}

      {/* Small particles - twinkling */}
      {Array.from({ length: 30 }).map((_, i) => (
        <div key={`small-${i}`} className="particle-small" />
      ))}
    </div>
  );
}
