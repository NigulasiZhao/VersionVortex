import React, { InputHTMLAttributes, useState } from 'react';
import { cn } from "@/lib/utils";

interface NeonCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

const NeonCheckbox: React.FC<NeonCheckboxProps> = ({
  label,
  className = '',
  checked: controlledChecked,
  defaultChecked,
  onChange,
  ...props
}) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked || false);

  const isControlled = controlledChecked !== undefined;
  const isChecked = isControlled ? controlledChecked : internalChecked;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setInternalChecked(e.target.checked);
    }
    onChange?.(e);
  };

  return (
    <label
      className={cn(
        "relative inline-flex items-center cursor-pointer",
        className
      )}
    >
      <input
        type="checkbox"
        className="hidden"
        checked={isChecked}
        onChange={handleChange}
        {...props}
      />

      <div className="relative w-8 h-8">
        {/* Glow effect */}
        <div
          className={cn(
            "absolute -inset-1 rounded-md transition-opacity duration-400",
            isChecked ? "opacity-30" : "opacity-0"
          )}
          style={{
            background: 'linear-gradient(135deg, #6C3FF5, #8B5CF6, #A78BFA)',
            filter: 'blur(8px)',
          }}
        />

        {/* Checkbox box */}
        <div
          className={cn(
            "relative w-full h-full rounded border-2 transition-all duration-400 flex items-center justify-center",
            isChecked
              ? "border-[#6C3FF5] bg-[rgba(108,63,245,0.15)]"
              : "border-[#A78BFA]"
          )}
        >
          {/* Animated checkmark */}
          <svg
            viewBox="0 0 24 24"
            className={cn(
              "w-5 h-5 fill-none stroke-[#6C3FF5] stroke-[3] stroke-linecap-round stroke-linejoin-round transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]",
              isChecked
                ? "[stroke-dashoffset:0] scale-110"
                : "[stroke-dashoffset:40]"
            )}
            style={{
              strokeDasharray: 40,
              strokeDashoffset: isChecked ? 0 : 40,
            }}
          >
            <path d="M3,12.5l7,7L21,5" />
          </svg>
        </div>

        {/* Animated border particles when checked */}
        {isChecked && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-md">
            <span
              className="absolute w-6 h-px bg-[#6C3FF5] top-0 animate-neon-border-flow-1"
              style={{ left: '-100%' }}
            />
            <span
              className="absolute w-px h-6 bg-[#6C3FF5] right-0 animate-neon-border-flow-2"
              style={{ top: '-100%' }}
            />
            <span
              className="absolute w-6 h-px bg-[#6C3FF5] bottom-0 animate-neon-border-flow-3"
              style={{ right: '-100%' }}
            />
            <span
              className="absolute w-px h-6 bg-[#6C3FF5] left-0 animate-neon-border-flow-4"
              style={{ bottom: '-100%' }}
            />
          </div>
        )}

        {/* Particle explosion effect */}
        {isChecked && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <span
                key={i}
                className="absolute w-1 h-1 bg-[#6C3FF5] rounded-full animate-neon-particle-explosion"
                style={{
                  top: '50%',
                  left: '50%',
                  '--x': ['20px', '-20px', '20px', '-20px', '28px', '-28px', '0px', '0px'][i],
                  '--y': ['-20px', '-20px', '20px', '20px', '0px', '0px', '28px', '-28px'][i],
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}

        {/* Ring pulse effect */}
        {isChecked && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full border border-[#6C3FF5] animate-neon-ring-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        )}

        {/* Spark flash effect */}
        {isChecked && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-md">
            {[...Array(4)].map((_, i) => (
              <span
                key={i}
                className="absolute w-5 h-px bg-gradient-to-r from-[#6C3FF5] to-transparent top-1/2 left-1/2 animate-neon-spark-flash"
                style={{ '--r': `${i * 90}deg` } as React.CSSProperties}
              />
            ))}
          </div>
        )}
      </div>

      {label && (
        <span className="ml-3 text-sm text-[var(--color-fg-default)]">{label}</span>
      )}
    </label>
  );
};

export { NeonCheckbox }
