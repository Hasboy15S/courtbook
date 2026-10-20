"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import type { SportMode } from "./court-3d-scene";

// -----------------------------------------------------------------------------
// Isometric 2.5D SVG Fallback Poster (No-WebGL & SSR & Loading State)
// -----------------------------------------------------------------------------
export function CourtStaticFallback({ mode }: { mode: SportMode }) {
  const configs = {
    FUTSAL: {
      color: "#123d2b",
      tag: "FUTSAL PITCH 40×20M",
      dims: "40.0 × 20.0 METER",
    },
    BADMINTON: {
      color: "#165b40",
      tag: "BADMINTON COURT 13.4×6.1M",
      dims: "13.4 × 6.1 METER",
    },
    TENNIS: {
      color: "#1e4675",
      tag: "TENNIS COURT 23.77×10.97M",
      dims: "23.77 × 10.97 METER",
    },
    BASKETBALL: {
      color: "#9c5421",
      tag: "BASKETBALL COURT 28×15M",
      dims: "28.0 × 15.0 METER",
    },
  };

  const current = configs[mode];

  return (
    <div className="court-fallback-container">
      <svg
        viewBox="0 0 600 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="court-fallback-svg"
      >
        {/* Stadium Floor Ground */}
        <polygon
          points="300,50 560,190 300,330 40,190"
          fill="#0c130e"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.5"
        />

        {/* In-court Surface Isometric Polygon */}
        <polygon
          points="300,85 520,200 300,310 80,200"
          fill={current.color}
          stroke="#ffffff"
          strokeWidth="2"
        />

        {/* Center Division Line */}
        <line
          x1="300"
          y1="85"
          x2="300"
          y2="310"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />

        {/* Center Circle / Mark */}
        <ellipse
          cx="300"
          cy="198"
          rx="50"
          ry="26"
          stroke="#ccff00"
          strokeWidth="2"
          fill="none"
        />
        <circle cx="300" cy="198" r="3" fill="#ccff00" />

        {/* Net/Goal Highlights */}
        {mode === "BADMINTON" || mode === "TENNIS" ? (
          <g>
            <polygon
              points="300,75 300,85 300,310 300,320"
              stroke="#ccff00"
              strokeWidth="1"
              fill="rgba(255,255,255,0.2)"
            />
            <line x1="300" y1="75" x2="300" y2="320" stroke="#ffffff" strokeWidth="2.5" />
          </g>
        ) : (
          <g>
            {/* Futsal Penalty Arcs */}
            <path
              d="M 190,140 Q 240,200 190,255"
              stroke="#ffffff"
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d="M 410,140 Q 360,200 410,255"
              stroke="#ffffff"
              strokeWidth="1.5"
              fill="none"
            />
          </g>
        )}
      </svg>

      <div className="court-fallback-badge">
        <span className="badge-dot badge-dot-live" />
        <span className="font-mono text-xs">{current.tag}</span>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Dynamic Import of 3D Canvas
// -----------------------------------------------------------------------------
const Court3DScene = dynamic(() => import("./court-3d-scene"), {
  ssr: false,
  loading: () => <CourtStaticFallback mode="FUTSAL" />,
});

function getWebGLSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

function subscribeNoop() {
  return () => {};
}

// -----------------------------------------------------------------------------
// Main Exported Court3D Component
// -----------------------------------------------------------------------------
export function Court3D() {
  const [activeSport, setActiveSport] = useState<SportMode>("FUTSAL");
  const [autoRotate, setAutoRotate] = useState<boolean>(true);

  const hasWebGL = React.useSyncExternalStore(
    subscribeNoop,
    getWebGLSnapshot,
    () => true
  );

  const sports: { id: SportMode; label: string; dim: string }[] = [
    { id: "FUTSAL", label: "FUTSAL", dim: "40×20M" },
    { id: "BADMINTON", label: "BADMINTON", dim: "13.4×6.1M" },
    { id: "TENNIS", label: "TENIS", dim: "23.77×10.97M" },
    { id: "BASKETBALL", label: "BASKET", dim: "28×15M" },
  ];

  return (
    <div className="court-3d-wrapper card-technical">
      {/* Top Controls Bar */}
      <div className="court-3d-header">
        {/* Sport Mode Tabs */}
        <div className="court-tab-group" role="tablist">
          {sports.map((sport) => {
            const isActive = activeSport === sport.id;
            return (
              <button
                key={sport.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveSport(sport.id)}
                className={`court-tab-btn ${isActive ? "active" : ""}`}
              >
                <span className="court-tab-label font-mono">{sport.label}</span>
                <span className="court-tab-dim font-mono">{sport.dim}</span>
              </button>
            );
          })}
        </div>

        {/* Viewport Meta & Rotate Toggle */}
        <div className="court-3d-meta">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`btn-rotate-toggle font-mono ${autoRotate ? "active" : ""}`}
            title="Toggle rotasi otomatis"
            aria-label="Toggle rotasi otomatis"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span className="text-xs">{autoRotate ? "ROTASI: ON" : "ROTASI: OFF"}</span>
          </button>
        </div>
      </div>

      {/* 3D Canvas / Fallback Viewport */}
      <div className="court-3d-viewport">
        {hasWebGL === false ? (
          <CourtStaticFallback mode={activeSport} />
        ) : (
          <Court3DScene mode={activeSport} autoRotate={autoRotate} />
        )}

        {/* Overlay Technical Indicator */}
        <div className="court-overlay-hud">
          <span className="hud-badge font-mono">
            <span className="badge-dot badge-dot-live" />
            <span>MODEL: {activeSport}</span>
          </span>
          <span className="hud-note font-mono text-xs">
            ARAHKAN MOUSE UNTUK PARALLAX 3D
          </span>
        </div>
      </div>

      <style>{`
        .court-3d-wrapper {
          width: 100%;
          height: 100%;
          min-height: 440px;
          display: flex;
          flex-direction: column;
          background-color: var(--color-surface-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-lg);
          overflow: hidden;
          position: relative;
        }

        .court-3d-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
          background-color: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .court-tab-group {
          display: flex;
          gap: 0.375rem;
        }

        .court-tab-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 0.35rem 0.65rem;
          background-color: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          cursor: pointer;
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
        }

        .court-tab-btn:hover {
          color: var(--color-text);
          border-color: var(--color-border-strong);
        }

        .court-tab-btn.active {
          background-color: var(--color-accent-subtle);
          border-color: var(--color-border-pitch);
          color: var(--color-accent);
        }

        .court-tab-label {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          line-height: 1.1;
        }

        .court-tab-dim {
          font-size: 0.625rem;
          color: var(--color-text-muted);
          letter-spacing: 0.03em;
        }

        .court-tab-btn.active .court-tab-dim {
          color: rgba(204, 255, 0, 0.75);
        }

        .btn-rotate-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.35rem 0.625rem;
          background-color: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-rotate-toggle:hover,
        .btn-rotate-toggle.active {
          color: var(--color-text);
          border-color: var(--color-border-strong);
        }

        .court-3d-viewport {
          position: relative;
          flex: 1;
          width: 100%;
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        @media (max-width: 640px) {
          .court-3d-wrapper {
            min-height: 380px;
          }
          .court-3d-viewport {
            min-height: 320px;
          }
        }

        .court-overlay-hud {
          position: absolute;
          bottom: 1rem;
          left: 1rem;
          right: 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          pointer-events: none;
        }

        .hud-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.5rem;
          background-color: rgba(8, 12, 9, 0.85);
          backdrop-filter: blur(8px);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          font-size: 0.6875rem;
          color: var(--color-accent);
          letter-spacing: 0.08em;
        }

        .hud-note {
          display: none;
          color: var(--color-text-muted);
          background-color: rgba(8, 12, 9, 0.7);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-xs);
        }

        @media (min-width: 640px) {
          .hud-note {
            display: block;
          }
        }

        /* Fallback Container */
        .court-fallback-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 2rem;
        }

        .court-fallback-svg {
          width: 100%;
          max-width: 460px;
          height: auto;
          filter: drop-shadow(0 10px 25px rgba(0, 0, 0, 0.6));
        }

        .court-fallback-badge {
          position: absolute;
          bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.3rem 0.75rem;
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          color: var(--color-accent);
        }
      `}</style>
    </div>
  );
}
