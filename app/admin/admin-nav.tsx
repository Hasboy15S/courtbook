"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "OVERVIEW", exact: true },
    { href: "/admin/bookings", label: "KELOLA BOOKING", exact: false },
    { href: "/admin/venues", label: "VENUE & LAPANGAN", exact: false },
    { href: "/admin/schedule", label: "KALENDER & BLOKIR SLOT", exact: false },
  ];

  return (
    <nav className="admin-nav-bar container">
      <div className="admin-nav-links font-mono text-xs">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-link ${isActive ? "active" : ""}`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <style>{`
        .admin-nav-bar {
          display: flex;
          overflow-x: auto;
          border-top: 1px solid var(--color-border);
        }

        .admin-nav-links {
          display: flex;
          gap: 0.25rem;
          padding-top: 0.25rem;
          padding-bottom: 0.25rem;
        }

        .admin-nav-link {
          padding: 0.5rem 0.85rem;
          color: var(--color-text-secondary);
          border-bottom: 2px solid transparent;
          transition: all var(--transition-fast);
          white-space: nowrap;
          letter-spacing: 0.05em;
        }

        .admin-nav-link:hover {
          color: var(--color-text);
        }

        .admin-nav-link.active {
          color: var(--color-accent);
          border-bottom-color: var(--color-accent);
          font-weight: 700;
        }
      `}</style>
    </nav>
  );
}
