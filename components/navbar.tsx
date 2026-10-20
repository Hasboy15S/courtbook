"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionPayload } from "@/types";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notification-bell";

interface NavbarProps {
  session: SessionPayload | null;
}

export function Navbar({ session }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <>
      <header className="navbar">
        <nav className="navbar-inner container">
          {/* Logo */}
          <Link href="/" className="navbar-logo-wrap" aria-label="CourtBook Home">
            <Logo size="md" />
          </Link>

          {/* Desktop Nav Links */}
          <div className="navbar-links">
            <Link
              href="/venues"
              className={`navbar-link ${pathname.startsWith("/venues") ? "active" : ""}`}
            >
              <span>TEMUKAN VENUE</span>
            </Link>

            {session?.role === "ADMIN" && (
              <Link
                href="/admin"
                className={`navbar-link navbar-link-admin ${pathname.startsWith("/admin") ? "active" : ""}`}
              >
                <span className="navbar-badge-admin">ADMIN</span>
                <span>DASHBOARD</span>
              </Link>
            )}
          </div>

          {/* Desktop Live Status Indicator */}
          <div className="navbar-live-status">
            <span className="badge badge-volt">
              <span className="badge-dot badge-dot-live" />
              <span>SISTEM LIVE</span>
            </span>
          </div>

          {/* Desktop Auth Section */}
          <div className="navbar-auth">
            {session ? (
              <div className="navbar-user">
                {session.role !== "ADMIN" && (
                  <Link
                    href="/my-bookings"
                    className={`navbar-link ${pathname === "/my-bookings" ? "active" : ""}`}
                  >
                    <span>BOOKING SAYA</span>
                  </Link>
                )}

                <NotificationBell />

                <div className="navbar-avatar-group">
                  <Link
                    href="/profile"
                    className="navbar-avatar"
                    title={session.name}
                    aria-label="Profil Pengguna"
                  >
                    <span className="font-mono">{session.name.charAt(0).toUpperCase()}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={isPending}
                    className="btn btn-ghost btn-sm"
                    aria-label="Keluar"
                  >
                    {isPending ? "..." : "KELUAR"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="navbar-auth-btns">
                <Link href="/login" className="btn btn-ghost btn-sm">
                  MASUK
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm">
                  DAFTAR
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            className="navbar-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Buka navigasi"
            aria-expanded={menuOpen}
          >
            <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
            <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
            <span className={`hamburger-bar ${menuOpen ? "open" : ""}`} />
          </button>
        </nav>

        {/* Mobile Dropdown Menu */}
        {menuOpen && (
          <div className="navbar-mobile">
            <Link
              href="/venues"
              className="mobile-item"
              onClick={() => setMenuOpen(false)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="3" x2="12" y2="21" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>TEMUKAN VENUE</span>
            </Link>

            {session ? (
              <>
                {session.role !== "ADMIN" && (
                  <Link
                    href="/my-bookings"
                    className="mobile-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>BOOKING SAYA</span>
                  </Link>
                )}

                <Link
                  href="/profile"
                  className="mobile-item"
                  onClick={() => setMenuOpen(false)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>PROFIL: {session.name}</span>
                </Link>

                {session.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="mobile-item mobile-item-admin"
                    onClick={() => setMenuOpen(false)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span>DASHBOARD ADMIN</span>
                  </Link>
                )}

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    handleLogout();
                  }}
                  disabled={isPending}
                  className="mobile-item mobile-item-logout"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  <span>KELUAR</span>
                </button>
              </>
            ) : (
              <div className="mobile-auth-group">
                <Link
                  href="/login"
                  className="btn btn-secondary btn-block"
                  onClick={() => setMenuOpen(false)}
                >
                  MASUK
                </Link>
                <Link
                  href="/register"
                  className="btn btn-primary btn-block"
                  onClick={() => setMenuOpen(false)}
                >
                  DAFTAR AKUN
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      <style>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(8, 12, 9, 0.94);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--color-border);
          height: var(--navbar-height);
        }

        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          gap: 1.25rem;
        }

        .navbar-logo-wrap {
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .navbar-links {
          display: none;
          align-items: center;
          gap: 0.5rem;
        }

        .navbar-link {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.4rem 0.75rem;
          border-radius: var(--radius-xs);
          font-family: var(--font-mono), monospace;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--color-text-secondary);
          transition: color var(--transition-fast), background-color var(--transition-fast);
        }

        .navbar-link:hover {
          color: var(--color-text);
          background-color: var(--color-surface);
        }

        .navbar-link.active {
          color: var(--color-accent);
          background-color: var(--color-accent-subtle);
          border: 1px solid var(--color-border-pitch);
        }

        .navbar-badge-admin {
          font-size: 0.625rem;
          padding: 0.1rem 0.35rem;
          border-radius: var(--radius-xs);
          background: rgba(204, 255, 0, 0.15);
          color: var(--color-accent);
          border: 1px solid var(--color-border-pitch);
        }

        .navbar-live-status {
          display: none;
        }

        @media (min-width: 1024px) {
          .navbar-live-status {
            display: flex;
            align-items: center;
          }
        }

        .navbar-auth {
          display: none;
          align-items: center;
          gap: 0.75rem;
        }

        .navbar-user {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .navbar-auth-btns {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .navbar-avatar-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .navbar-avatar {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-xs);
          background-color: var(--color-surface-elevated);
          border: 1px solid var(--color-border-strong);
          color: var(--color-accent);
          font-size: 0.8125rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color var(--transition-fast);
        }

        .navbar-avatar:hover {
          border-color: var(--color-accent);
        }

        .navbar-hamburger {
          display: flex;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          background: transparent;
          border: 1px solid var(--color-border);
          padding: 0.5rem;
          border-radius: var(--radius-xs);
          color: var(--color-text);
        }

        .hamburger-bar {
          display: block;
          width: 20px;
          height: 2px;
          background-color: var(--color-text);
          transition: transform var(--transition-fast), opacity var(--transition-fast);
        }

        .hamburger-bar.open:nth-child(1) {
          transform: translateY(7px) rotate(45deg);
        }
        .hamburger-bar.open:nth-child(2) {
          opacity: 0;
        }
        .hamburger-bar.open:nth-child(3) {
          transform: translateY(-7px) rotate(-45deg);
        }

        .navbar-mobile {
          position: absolute;
          top: var(--navbar-height);
          left: 0;
          right: 0;
          background: #080c09;
          border-bottom: 1px solid var(--color-border-strong);
          padding: 1.25rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          z-index: 49;
          box-shadow: 0 16px 32px rgba(0, 0, 0, 0.8);
        }

        .mobile-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-xs);
          font-family: var(--font-mono), monospace;
          font-size: 0.8125rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--color-text);
          border: 1px solid transparent;
          background: var(--color-surface);
          cursor: pointer;
          width: 100%;
          text-align: left;
        }

        .mobile-item:hover {
          border-color: var(--color-border);
        }

        .mobile-item-admin {
          color: var(--color-accent);
          border-color: var(--color-border-pitch);
        }

        .mobile-item-logout {
          color: var(--color-booked);
        }

        .mobile-auth-group {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          margin-top: 0.5rem;
        }

        @media (min-width: 768px) {
          .navbar-links,
          .navbar-auth {
            display: flex;
          }
          .navbar-hamburger,
          .navbar-mobile {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
