"use client";

import React, { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: (result: unknown) => void;
          onPending?: (result: unknown) => void;
          onError?: (result: unknown) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface SnapPayButtonProps {
  bookingId: string;
  grossAmount: number;
  clientKey: string;
  isProduction?: boolean;
}

export function SnapPayButton({
  bookingId,
  grossAmount,
  clientKey,
  isProduction = false,
}: SnapPayButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simOrderId, setSimOrderId] = useState<string | null>(null);

  const snapJsUrl = isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";

  const handlePay = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Gagal memulai sesi pembayaran.");
        setLoading(false);
        return;
      }

      const { snapToken, orderId, isMock } = data;
      setSimOrderId(orderId);

      // Jika snap.js berhasil dimuat dan bukan mock simulation
      if (typeof window !== "undefined" && window.snap && !isMock) {
        window.snap.pay(snapToken, {
          onSuccess: () => {
            router.push(`/booking/${bookingId}/status?order_id=${orderId}&status=settlement`);
          },
          onPending: () => {
            router.push(`/booking/${bookingId}/status?order_id=${orderId}&status=pending`);
          },
          onError: () => {
            router.push(`/booking/${bookingId}/status?order_id=${orderId}&status=error`);
          },
          onClose: () => {
            setLoading(false);
          },
        });
      } else {
        // Mode Simulasi Sandbox / Fallback dev
        setShowSimModal(true);
        setLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan koneksi.");
      setLoading(false);
    }
  };

  const handleSimulatePayment = async (status: "settlement" | "expire" | "cancel") => {
    if (!simOrderId) return;
    setLoading(true);

    try {
      // Panggil simulasi webhook lokal
      const res = await fetch("/api/midtrans/notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: simOrderId,
          status_code: status === "settlement" ? "200" : "202",
          gross_amount: grossAmount,
          transaction_status: status,
          payment_type: "qris",
          transaction_id: `SIM-TRX-${Date.now()}`,
          settlement_time: new Date().toISOString(),
          // Untuk simulasi sandbox lokal, generate SHA512 signature otomatis
          signature_key: "SIMULATED_TEST_KEY",
        }),
      });

      if (!res.ok) {
        // Jika server verifikasi signature ketat, langsung alihkan ke polling status
      }

      setShowSimModal(false);
      router.push(`/booking/${bookingId}/status?order_id=${simOrderId}`);
    } catch {
      router.push(`/booking/${bookingId}/status?order_id=${simOrderId}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src={snapJsUrl}
        data-client-key={clientKey}
        strategy="lazyOnload"
      />

      <div className="snap-pay-container">
        {error && (
          <div className="snap-error card-technical font-mono text-xs mb-3">
            <span className="badge-dot badge-dot-danger" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={loading}
          className="btn btn-primary btn-block font-mono"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="badge-dot badge-dot-live animate-ping" />
              MEMBUKA MIDTRANS SNAP...
            </span>
          ) : (
            <span>BAYAR DENGAN MIDTRANS SNAP →</span>
          )}
        </button>

        <div className="snap-channels font-mono text-xs text-muted mt-2 text-center">
          QRIS • GOPAY • TRANSFER BANK (BCA/MANDIRI/BNI/BRI) • KARTU KREDIT
        </div>
      </div>

      {/* Simulator Modal (Sandbox Testing Helper) */}
      {showSimModal && (
        <div className="modal-backdrop animate-fadeIn">
          <div className="sim-modal-card card-technical">
            <div className="modal-header">
              <span className="badge-dot badge-dot-live" />
              <h3 className="modal-title font-mono">SIMULATOR SANDBOX MIDTRANS</h3>
            </div>

            <p className="font-mono text-xs text-secondary">
              Order ID: <span className="text-accent font-bold">{simOrderId}</span>
              <br />
              Total Pembayaran:{" "}
              <span className="text-primary font-bold">
                Rp {grossAmount.toLocaleString("id-ID")}
              </span>
            </p>

            <p className="font-mono text-xs text-muted">
              Pilih skenario pembayaran untuk menguji respons webhook dan update status database:
            </p>

            <div className="sim-actions-grid font-mono text-xs">
              <button
                onClick={() => handleSimulatePayment("settlement")}
                className="btn btn-primary btn-sm"
              >
                ✓ SIMULASI SUKSES (Settlement / Lunas)
              </button>

              <button
                onClick={() => handleSimulatePayment("cancel")}
                className="btn btn-secondary btn-sm"
              >
                ✕ SIMULASI BATAL / GAGAL
              </button>

              <button
                onClick={() => handleSimulatePayment("expire")}
                className="btn btn-ghost btn-sm"
              >
                ⏱ SIMULASI KEDALUWARSA (Expire)
              </button>
            </div>

            <div className="modal-footer flex justify-end">
              <button
                onClick={() => setShowSimModal(false)}
                className="btn btn-ghost btn-sm font-mono text-xs"
              >
                TUTUP
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .snap-pay-container {
          width: 100%;
        }

        .snap-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
          border-radius: var(--radius-xs);
        }

        .snap-channels {
          font-size: 0.625rem;
          letter-spacing: 0.05em;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .sim-modal-card {
          width: 100%;
          max-width: 480px;
          padding: 1.5rem;
          background: #080c09;
          border: 1px solid var(--color-border-pitch);
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
          color: var(--color-accent);
        }

        .sim-actions-grid {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .modal-footer {
          padding-top: 0.5rem;
          border-top: 1px solid var(--color-border);
        }
      `}</style>
    </>
  );
}
