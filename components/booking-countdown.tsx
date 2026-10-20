"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

interface BookingCountdownProps {
  expiresAt: string | Date;
  onExpire?: () => void;
}

function subscribeTimer(callback: () => void) {
  const interval = setInterval(callback, 1000);
  return () => clearInterval(interval);
}

export function BookingCountdown({ expiresAt, onExpire }: BookingCountdownProps) {
  const router = useRouter();
  const targetTime = new Date(expiresAt).getTime();

  const secondsLeft = useSyncExternalStore(
    subscribeTimer,
    () => Math.max(0, Math.floor((targetTime - Date.now()) / 1000)),
    () => 900
  );

  const isExpired = secondsLeft <= 0;

  useEffect(() => {
    if (isExpired) {
      if (onExpire) {
        onExpire();
      } else {
        router.refresh();
      }
    }
  }, [isExpired, onExpire, router]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Total 15 menit = 900 detik
  const progressPct = Math.min(100, Math.max(0, (secondsLeft / 900) * 100));
  const isUrgent = secondsLeft < 180; // kurang dari 3 menit

  if (isExpired) {
    return (
      <div className="countdown-expired-card card-technical">
        <div className="countdown-expired-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <h4 className="countdown-expired-title font-mono">HOLD WAKTU TELAH KEDALUWARSA</h4>
          <p className="countdown-expired-desc font-mono text-xs">
            Batas waktu pembayaran 15 menit telah habis. Slot lapangan telah dilepas kembali ke publik.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`countdown-box card-technical ${isUrgent ? "urgent" : ""}`}>
      <div className="countdown-inner">
        <div className="countdown-label-group">
          <span className="countdown-pulse-dot" />
          <span className="countdown-label font-mono">BATAS HOLD PEMBAYARAN:</span>
        </div>

        <div className="countdown-timer font-mono">
          <span className="countdown-time-digits">{timeFormatted}</span>
          <span className="countdown-time-unit">MENIT</span>
        </div>
      </div>

      <div className="countdown-progress-track">
        <div
          className="countdown-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <p className="countdown-warning font-mono text-xs">
        {isUrgent
          ? "⚠️ PERINGATAN: Waktu hold hampir habis! Selesaikan pembayaran sekarang."
          : "Slot lapangan Anda diamankan selama 15 menit dari booking lain."}
      </p>

      <style>{`
        .countdown-box {
          padding: 1.25rem;
          background: rgba(8, 12, 9, 0.95);
          border: 1px solid var(--color-border-pitch);
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }

        .countdown-box.urgent {
          border-color: rgba(239, 68, 68, 0.6);
          background: rgba(30, 10, 10, 0.4);
        }

        .countdown-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .countdown-label-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .countdown-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--color-accent);
          box-shadow: 0 0 10px var(--color-accent);
          animation: pulseDot 1.4s infinite ease-in-out;
        }

        .countdown-box.urgent .countdown-pulse-dot {
          background-color: #ef4444;
          box-shadow: 0 0 10px #ef4444;
        }

        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        .countdown-label {
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          color: var(--color-text-secondary);
        }

        .countdown-timer {
          display: flex;
          align-items: baseline;
          gap: 0.35rem;
        }

        .countdown-time-digits {
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: var(--color-accent);
          line-height: 1;
        }

        .countdown-box.urgent .countdown-time-digits {
          color: #ef4444;
        }

        .countdown-time-unit {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          letter-spacing: 0.05em;
        }

        .countdown-progress-track {
          width: 100%;
          height: 4px;
          background-color: var(--color-surface);
          border-radius: var(--radius-xs);
          overflow: hidden;
        }

        .countdown-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-accent-dim), var(--color-accent));
          transition: width 1s linear;
        }

        .countdown-box.urgent .countdown-progress-fill {
          background: linear-gradient(90deg, #f97316, #ef4444);
        }

        .countdown-warning {
          color: var(--color-text-muted);
          line-height: 1.4;
        }

        .countdown-box.urgent .countdown-warning {
          color: #fca5a5;
        }

        .countdown-expired-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(30, 10, 10, 0.4);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: var(--radius-md);
        }

        .countdown-expired-icon {
          color: #ef4444;
          flex-shrink: 0;
          margin-top: 0.1rem;
        }

        .countdown-expired-title {
          font-size: 0.875rem;
          font-weight: 700;
          color: #ef4444;
          margin-bottom: 0.25rem;
          letter-spacing: 0.05em;
        }

        .countdown-expired-desc {
          color: var(--color-text-secondary);
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
