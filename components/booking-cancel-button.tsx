"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface BookingCancelButtonProps {
  bookingId: string;
  isConfirmed?: boolean;
}

export function BookingCancelButton({
  bookingId,
  isConfirmed = false,
}: BookingCancelButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Gagal membatalkan booking.");
        return;
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-ghost btn-sm font-mono text-xs text-booked"
        title="Batalkan Pesanan"
      >
        BATALKAN PESANAN
      </button>

      {isOpen && (
        <div className="modal-backdrop animate-fadeIn">
          <div className="modal-card card-technical">
            <div className="modal-header">
              <span className="badge-dot badge-dot-booked" />
              <h3 className="modal-title font-mono">KONFIRMASI PEMBATALAN</h3>
            </div>

            <p className="modal-text font-mono text-xs text-muted">
              {isConfirmed
                ? "Pembatalan hanya dapat dilakukan minimal 2 jam sebelum waktu bermain. Slot akan dilepas dan dana/proses akan disesuaikan dengan kebijakan venue."
                : "Apakah Anda yakin ingin membatalkan pesanan ini? Slot yang sedang di-hold akan langsung dibuka kembali untuk pengguna lain."}
            </p>

            {error && (
              <div className="modal-error font-mono text-xs text-booked">
                {error}
              </div>
            )}

            <div className="modal-input-group">
              <label htmlFor="cancel-reason" className="font-mono text-xs text-secondary">
                Alasan Pembatalan (Opsional):
              </label>
              <textarea
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Misal: Perubahan jadwal anggota tim..."
                rows={2}
                className="modal-textarea font-mono text-xs"
                maxLength={200}
              />
            </div>

            <div className="modal-actions">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="btn btn-ghost btn-sm font-mono"
              >
                KEMBALI
              </button>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="btn btn-danger btn-sm font-mono"
              >
                {isLoading ? "MEMBATALKAN..." : "YA, BATALKAN"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .modal-card {
          width: 100%;
          max-width: 440px;
          padding: 1.5rem;
          background: #080c09;
          border: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.9);
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .modal-title {
          font-size: 0.875rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: var(--color-text);
        }

        .modal-text {
          line-height: 1.5;
        }

        .modal-error {
          padding: 0.5rem 0.75rem;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: var(--radius-xs);
        }

        .modal-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .modal-textarea {
          width: 100%;
          padding: 0.625rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          color: var(--color-text);
          resize: none;
        }

        .modal-textarea:focus {
          border-color: var(--color-accent);
          outline: none;
        }

        .modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        .btn-danger {
          background-color: rgba(239, 68, 68, 0.2);
          border: 1px solid #ef4444;
          color: #f87171;
        }

        .btn-danger:hover:not(:disabled) {
          background-color: #ef4444;
          color: #ffffff;
        }
      `}</style>
    </>
  );
}
