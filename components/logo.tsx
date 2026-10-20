import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className = "", size = "md" }: LogoProps) {
  const iconSizes = {
    sm: 20,
    md: 26,
    lg: 32,
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-2xl",
  };

  const px = iconSizes[size];

  return (
    <div className={`court-logo ${className}`}>
      {/* Precision Court Pitch SVG Icon */}
      <span className="court-logo-mark" aria-hidden="true">
        <svg
          width={px}
          height={px}
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Pitch Boundary */}
          <rect
            x="2"
            y="4"
            width="24"
            height="20"
            rx="2.5"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          {/* Halfway Division Line */}
          <line
            x1="14"
            y1="4"
            x2="14"
            y2="24"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2 1"
          />
          {/* Center Circle with Volt Accent */}
          <circle
            cx="14"
            cy="14"
            r="3.5"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
          />
          <circle cx="14" cy="14" r="1" fill="var(--color-accent)" />
          {/* Left Goal/Penalty Arc Area */}
          <path
            d="M2 9.5H5.5C6.32843 9.5 7 10.1716 7 11V17C7 17.8284 6.32843 18.5 5.5 18.5H2"
            stroke="currentColor"
            strokeWidth="1.25"
          />
          {/* Right Goal/Penalty Arc Area */}
          <path
            d="M26 9.5H22.5C21.6716 9.5 21 10.1716 21 11V17C21 17.8284 21.6716 18.5 22.5 18.5H26"
            stroke="currentColor"
            strokeWidth="1.25"
          />
        </svg>
      </span>

      {/* Wordmark */}
      <span className={`court-logo-wordmark ${textSizes[size]}`}>
        <span className="court-logo-primary">COURT</span>
        <span className="court-logo-accent">BOOK</span>
        <span className="court-logo-dot" />
      </span>
    </div>
  );
}
