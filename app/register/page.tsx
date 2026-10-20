"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { register } from "@/app/actions/auth";
import type { ActionState } from "@/types";

const initialState: ActionState = { success: false };

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(register, initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientPassError, setClientPassError] = useState("");

  const handleSubmit = (formData: FormData) => {
    if (password !== confirmPassword) {
      setClientPassError("Konfirmasi password tidak cocok dengan password");
      return;
    }
    setClientPassError("");
    formAction(formData);
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass animate-fadeIn">
        <div className="auth-header">
          <div className="auth-icon-badge">✨</div>
          <h1 className="auth-title">Daftar Akun CourtBook</h1>
          <p className="auth-subtitle">
            Buat akun baru untuk mulai memesan lapangan olahraga favoritmu.
          </p>
        </div>

        {/* Global Error Banner */}
        {(state.message || clientPassError) && (
          <div className="alert alert-error" role="alert">
            <span className="alert-icon">⚠️</span>
            <span>{state.message || clientPassError}</span>
          </div>
        )}

        <form action={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Nama Lengkap
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Contoh: Budi Santoso"
              required
              autoComplete="name"
              className={`form-input ${state.errors?.name ? "input-error" : ""}`}
            />
            {state.errors?.name && (
              <span className="field-error">{state.errors.name[0]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Alamat Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
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
            <label htmlFor="phone" className="form-label">
              Nomor WhatsApp / HP <span className="text-muted text-xs">(Opsional)</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              placeholder="081234567890"
              autoComplete="tel"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password <span className="text-muted text-xs">(Minimal 8 karakter, huruf & angka)</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              required
              autoComplete="new-password"
              className={`form-input ${state.errors?.password ? "input-error" : ""}`}
            />
            {state.errors?.password && (
              <span className="field-error">{state.errors.password[0]}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Ulangi Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang password"
              required
              autoComplete="new-password"
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn btn-primary btn-block btn-lg"
          >
            {isPending ? (
              <span className="flex-center gap-2">
                <span className="spinner-sm" /> Membuat Akun...
              </span>
            ) : (
              "Daftar Sekarang"
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Sudah memiliki akun?{" "}
            <Link href="/login" className="auth-link">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
