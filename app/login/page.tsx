"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import type { ActionState } from "@/types";

const initialState: ActionState = { success: false };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass animate-fadeIn">
        <div className="auth-header">
          <div className="auth-icon-badge">🏟️</div>
          <h1 className="auth-title">Masuk ke CourtBook</h1>
          <p className="auth-subtitle">
            Pesan lapangan futsal, badminton, dan tenis dengan cepat dan tanpa ribet.
          </p>
        </div>

        {/* Global Error Banner */}
        {state.message && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{state.message}</span>
          </div>
        )}

        <form action={formAction} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              required
              autoComplete="email"
              className={`form-input ${state.errors?.email ? "input-error" : ""}`}
            />
            {state.errors?.email && (
              <span className="field-error">{state.errors.email[0]}</span>
            )}
          </div>

          <div className="form-group">
            <div className="flex-between">
              <label htmlFor="password" className="form-label">
                Password
              </label>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className={`form-input ${state.errors?.password ? "input-error" : ""}`}
            />
            {state.errors?.password && (
              <span className="field-error">{state.errors.password[0]}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn btn-primary btn-block btn-lg"
          >
            {isPending ? (
              <span className="flex-center gap-2">
                <span className="spinner-sm" /> Masuk...
              </span>
            ) : (
              "Masuk Sekarang"
            )}
          </button>
        </form>

        {/* Demo Quick Fill for Reviewer (Hanya aktif di mode development/staging) */}
        {process.env.NODE_ENV !== "production" && (
          <div className="demo-credentials-box">
            <p className="demo-title">Akun Demo (Klik untuk isi cepat):</p>
            <div className="demo-buttons">
              <button
                type="button"
                onClick={() => fillDemo("admin@courtbook.com", "admin123")}
                className="demo-btn demo-btn-admin"
              >
                👑 Admin (admin@courtbook.com)
              </button>
              <button
                type="button"
                onClick={() => fillDemo("budi@example.com", "password123")}
                className="demo-btn demo-btn-user"
              >
                👤 User (budi@example.com)
              </button>
            </div>
          </div>
        )}

        <div className="auth-footer">
          <p>
            Belum punya akun?{" "}
            <Link href="/register" className="auth-link">
              Daftar gratis di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
