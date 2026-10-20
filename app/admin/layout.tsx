import React from "react";
import Link from "next/link";
import { verifyAdminSession } from "@/lib/session";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifyAdminSession();

  return (
    <div className="admin-layout">
      {/* Top Admin Sub-Header */}
      <header className="admin-header">
        <div className="container admin-header-inner">
          <div className="admin-brand-group">
            <Link href="/admin" className="admin-brand font-mono">
              <span className="text-accent font-bold">COURTBOOK</span>
              <span className="admin-tag font-mono">ADMIN CONSOLE</span>
            </Link>
          </div>

          <div className="admin-header-right">
            <span className="badge badge-volt font-mono text-xs">
              <span className="badge-dot badge-dot-live" />
              <span>ROLE: {session.role} ({session.name})</span>
            </span>

            <Link href="/" className="btn btn-ghost btn-sm font-mono text-xs">
              ← KE BERANDA PUBLIK
            </Link>
          </div>
        </div>

        {/* Admin Navigation Bar */}
        <AdminNav />
      </header>

      {/* Main Admin Content */}
      <main className="admin-content">{children}</main>

      <style>{`
        .admin-layout {
          min-height: calc(100vh - var(--navbar-height));
          background-color: var(--color-bg);
          display: flex;
          flex-direction: column;
        }

        .admin-header {
          background-color: var(--color-surface);
          border-bottom: 1px solid var(--color-border);
          position: sticky;
          top: var(--navbar-height);
          z-index: 40;
        }

        .admin-header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.875rem;
          padding-bottom: 0.875rem;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .admin-brand-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .admin-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1rem;
          letter-spacing: 0.05em;
        }

        .admin-tag {
          font-size: 0.625rem;
          padding: 0.15rem 0.4rem;
          border-radius: var(--radius-xs);
          background-color: var(--color-surface-elevated);
          border: 1px solid var(--color-border-pitch);
          color: var(--color-accent);
          letter-spacing: 0.08em;
        }

        .admin-header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .admin-content {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
