"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

let cachedClock = typeof window !== "undefined" ? Date.now() : 0;

function subscribeClock(callback: () => void) {
  const timer = setInterval(() => {
    cachedClock = Date.now();
    callback();
  }, 30000);
  return () => clearInterval(timer);
}

const getClockSnapshot = () => cachedClock;
const getClockServerSnapshot = () => 0;

function formatRelativeTime(dateStr: string, nowMs: number) {
  if (nowMs === 0) return "Baru saja";
  const diffMs = nowMs - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins}m lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}j lalu`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}h lalu`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentTimestamp = useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getClockServerSnapshot
  );

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 25000); // Polling 25s
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside or ESC key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleMarkAsRead = async (id: string, link: string | null) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore
    }
    if (link) {
      setOpen(false);
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notif-bell-container" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Lihat Notifikasi"
        className={`notif-bell-trigger ${open ? "active" : ""}`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <div className="notif-title-group">
              <span className="notif-header-dot"></span>
              <span className="notif-header-title">NOTIFIKASI</span>
              {unreadCount > 0 && (
                <span className="notif-unread-tag">{unreadCount} BARU</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={handleMarkAllRead}
                className="notif-mark-all-btn"
              >
                {loading ? "..." : "Tandai dibaca"}
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <div className="notif-empty-icon">🔔</div>
                <div className="notif-empty-title">BELUM ADA NOTIFIKASI</div>
                <p className="notif-empty-desc">
                  Pembaruan booking, pembayaran, dan jadwal akan muncul di sini.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isSuccess =
                  n.type === "PAYMENT_SUCCESS" ||
                  n.type === "BOOKING_CONFIRMED" ||
                  n.type === "REVIEW_SUBMITTED";
                const isCancelled = n.type === "BOOKING_CANCELLED";

                return (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id, n.link)}
                    className={`notif-item ${!n.isRead ? "unread" : ""}`}
                  >
                    <div className="notif-icon-col">
                      <span
                        className={`notif-type-icon ${
                          isSuccess
                            ? "notif-icon-success"
                            : isCancelled
                            ? "notif-icon-danger"
                            : "notif-icon-warning"
                        }`}
                      >
                        {isSuccess ? "✓" : isCancelled ? "✕" : "!"}
                      </span>
                    </div>

                    <div className="notif-content-col">
                      <div className="notif-item-top">
                        <span className="notif-item-title">{n.title}</span>
                        <span className="notif-item-time">
                          {formatRelativeTime(n.createdAt, currentTimestamp)}
                        </span>
                      </div>
                      <p className="notif-item-message">{n.message}</p>

                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => setOpen(false)}
                          className="notif-item-link"
                        >
                          Lihat Rincian →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>{`
        .notif-bell-container {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .notif-bell-trigger {
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-surface, #121a14);
          border: 1px solid var(--color-border-strong, rgba(255, 255, 255, 0.16));
          border-radius: var(--radius-xs, 2px);
          color: var(--color-text-secondary, #9da89e);
          cursor: pointer;
          transition: all var(--transition-fast, 150ms);
          padding: 0;
        }

        .notif-bell-trigger:hover,
        .notif-bell-trigger.active {
          color: var(--color-accent, #ccff00);
          border-color: var(--color-accent, #ccff00);
          background: var(--color-surface-elevated, #18231c);
        }

        .notif-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          background: var(--color-accent, #ccff00);
          color: #080c09;
          font-family: var(--font-mono), monospace;
          font-size: 0.625rem;
          font-weight: 800;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 10px rgba(204, 255, 0, 0.6);
          pointer-events: none;
        }

        .notif-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 360px;
          max-width: min(360px, calc(100vw - 2rem));
          background: #09100a;
          border: 1px solid rgba(204, 255, 0, 0.3);
          border-radius: var(--radius-sm, 4px);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 20px rgba(204, 255, 0, 0.08);
          z-index: 1000;
          overflow: hidden;
          animation: notif-fade-in 140ms ease-out;
        }

        @keyframes notif-fade-in {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .notif-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: #0e1710;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .notif-title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .notif-header-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--color-accent, #ccff00);
          box-shadow: 0 0 8px var(--color-accent, #ccff00);
        }

        .notif-header-title {
          font-family: var(--font-mono), monospace;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #ffffff;
        }

        .notif-unread-tag {
          font-family: var(--font-mono), monospace;
          font-size: 0.625rem;
          font-weight: 700;
          padding: 0.1rem 0.35rem;
          border-radius: 2px;
          background: rgba(204, 255, 0, 0.15);
          color: var(--color-accent, #ccff00);
          border: 1px solid rgba(204, 255, 0, 0.25);
        }

        .notif-mark-all-btn {
          background: transparent;
          border: none;
          font-family: var(--font-mono), monospace;
          font-size: 0.6875rem;
          color: var(--color-accent, #ccff00);
          cursor: pointer;
          padding: 0;
          transition: opacity var(--transition-fast, 150ms);
        }

        .notif-mark-all-btn:hover {
          text-decoration: underline;
          opacity: 0.8;
        }

        .notif-list {
          max-height: 360px;
          overflow-y: auto;
          overscroll-behavior: contain;
          background: #09100a;
        }

        .notif-list::-webkit-scrollbar {
          width: 4px;
        }
        .notif-list::-webkit-scrollbar-track {
          background: #070c08;
        }
        .notif-list::-webkit-scrollbar-thumb {
          background: rgba(204, 255, 0, 0.25);
          border-radius: 2px;
        }

        .notif-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          background: #09100a;
          cursor: pointer;
          transition: background-color var(--transition-fast, 150ms);
          text-decoration: none;
          color: inherit;
        }

        .notif-item:hover {
          background: #111a12;
        }

        .notif-item.unread {
          background: rgba(204, 255, 0, 0.04);
          border-left: 3px solid var(--color-accent, #ccff00);
        }

        .notif-icon-col {
          flex-shrink: 0;
          padding-top: 1px;
        }

        .notif-type-icon {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6875rem;
          font-weight: 800;
        }

        .notif-icon-success {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          border: 1px solid rgba(34, 197, 94, 0.35);
        }

        .notif-icon-danger {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.35);
        }

        .notif-icon-warning {
          background: rgba(234, 179, 8, 0.15);
          color: #eab308;
          border: 1px solid rgba(234, 179, 8, 0.35);
        }

        .notif-content-col {
          flex: 1;
          min-width: 0;
        }

        .notif-item-top {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.2rem;
        }

        .notif-item-title {
          font-family: var(--font-mono), monospace;
          font-size: 0.75rem;
          font-weight: 700;
          color: #ffffff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .notif-item-time {
          font-family: var(--font-mono), monospace;
          font-size: 0.625rem;
          color: #5e6b60;
          flex-shrink: 0;
        }

        .notif-item-message {
          font-size: 0.75rem;
          color: #9da89e;
          line-height: 1.4;
          margin: 0 0 0.35rem 0;
          word-break: break-word;
        }

        .notif-item-link {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-family: var(--font-mono), monospace;
          font-size: 0.6875rem;
          color: var(--color-accent, #ccff00);
          text-decoration: none;
          font-weight: 600;
        }

        .notif-item-link:hover {
          text-decoration: underline;
        }

        .notif-empty {
          padding: 2.5rem 1.5rem;
          text-align: center;
        }

        .notif-empty-icon {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }

        .notif-empty-title {
          font-family: var(--font-mono), monospace;
          font-size: 0.75rem;
          font-weight: 700;
          color: #9da89e;
          margin-bottom: 0.25rem;
        }

        .notif-empty-desc {
          font-size: 0.6875rem;
          color: #5e6b60;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
