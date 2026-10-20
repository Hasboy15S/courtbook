"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

interface BookingStatusData {
  id: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  paymentStatus: "UNPAID" | "WAITING_VERIFICATION" | "PAID" | "REJECTED";
  totalPrice: number;
  court: {
    name: string;
    sportType: string;
    venue: {
      name: string;
      city: string;
    };
  };
}

interface StatusClientProps {
  bookingId: string;
  initialBooking: BookingStatusData;
}

export function StatusClient({ bookingId, initialBooking }: StatusClientProps) {
  const [booking, setBooking] = useState<BookingStatusData>(initialBooking);
  const [pollCount, setPollCount] = useState(0);

  const isConfirmed = booking.status === "CONFIRMED" || booking.paymentStatus === "PAID";
  const isFailed = booking.status === "CANCELLED" || booking.status === "EXPIRED";

  // Polling logic
  useEffect(() => {
    if (isConfirmed || isFailed) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.booking) {
            setBooking(json.booking);
            setPollCount((prev) => prev + 1);
          }
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [bookingId, isConfirmed, isFailed]);

  const handleManualRefresh = async () => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.booking) {
          setBooking(json.booking);
        }
      }
    } catch {
      // noop
    }
  };

  return (
    <div className="container py-12">
      <div className="status-card-wrap max-w-xl mx-auto">
        <div className="card-technical p-8 text-center flex flex-col items-center gap-6">
          {/* Confirmed State */}
          {isConfirmed ? (
            <>
              <div className="status-icon-wrap confirmed">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>

              <div>
                <span className="tech-label text-accent mb-1">
                  TRANSAKSI MIDTRANS TERVERIFIKASI
                </span>
                <h1 className="status-heading font-mono">
                  PEMBAYARAN BERHASIL!
                </h1>
                <p className="font-mono text-xs text-secondary mt-2">
                  Booking Anda untuk {booking.court.venue.name} telah dikonfirmasi dan slot lapangan resmi diamankan.
                </p>
              </div>

              <div className="recap-box card-technical p-4 w-full font-mono text-xs text-left">
                <div className="recap-row">
                  <span className="text-secondary">ORDER ID</span>
                  <span className="text-accent font-bold">
                    #{booking.id.slice(-8).toUpperCase()}
                  </span>
                </div>
                <div className="recap-row">
                  <span className="text-secondary">LAPANGAN</span>
                  <span className="text-primary font-bold">
                    {booking.court.name} ({booking.court.sportType})
                  </span>
                </div>
                <div className="recap-row">
                  <span className="text-secondary">STATUS</span>
                  <span className="badge badge-volt">DIKONFIRMASI // SIAP MAIN</span>
                </div>
              </div>

              <div className="action-btns flex flex-col gap-3 w-full">
                <Link
                  href={`/booking/${booking.id}`}
                  className="btn btn-primary btn-block font-mono"
                >
                  LIHAT DETAIL TIKET & BUKTI BOOKING →
                </Link>
                <Link
                  href="/my-bookings"
                  className="btn btn-secondary btn-block font-mono text-xs"
                >
                  KE DAFTAR BOOKING SAYA
                </Link>
              </div>
            </>
          ) : isFailed ? (
            /* Failed / Expired State */
            <>
              <div className="status-icon-wrap failed">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>

              <div>
                <span className="tech-label text-danger mb-1">
                  STATUS FINAL
                </span>
                <h1 className="status-heading font-mono text-danger">
                  {booking.status === "EXPIRED"
                    ? "WAKTU HOLD KEDALUWARSA"
                    : "PEMBAYARAN DIBATALKAN"}
                </h1>
                <p className="font-mono text-xs text-secondary mt-2">
                  Slot tidak lagi ditahan. Anda dapat memilih kembali jadwal yang tersedia.
                </p>
              </div>

              <div className="action-btns flex flex-col gap-3 w-full">
                <Link
                  href="/venues"
                  className="btn btn-primary btn-block font-mono text-xs"
                >
                  CARI JADWAL LAPANGAN LAIN →
                </Link>
                <Link
                  href="/my-bookings"
                  className="btn btn-ghost btn-block font-mono text-xs text-muted"
                >
                  KEMBALI KE RIWAYAT BOOKING
                </Link>
              </div>
            </>
          ) : (
            /* Pending / Waiting Polling State */
            <>
              <div className="status-icon-wrap pending">
                <span className="pending-spinner" />
              </div>

              <div>
                <span className="tech-label text-accent mb-1">
                  MENUNGGU WEBHOOK MIDTRANS
                </span>
                <h1 className="status-heading font-mono">
                  MEMVERIFIKASI PEMBAYARAN...
                </h1>
                <p className="font-mono text-xs text-secondary mt-2">
                  Kami sedang menunggu notifikasi resmi dari gateway Midtrans. Halaman ini akan otomatis diperbarui saat pembayaran diterima.
                </p>
                <span className="font-mono text-xs text-muted mt-1 block">
                  (Pemeriksaan ke-{pollCount} • Interval 2 detik)
                </span>
              </div>

              <div className="action-btns flex flex-col gap-3 w-full">
                <button
                  onClick={handleManualRefresh}
                  className="btn btn-secondary btn-block font-mono text-xs"
                >
                  PERIKSA STATUS SEKARANG
                </button>
                <Link
                  href={`/booking/${booking.id}`}
                  className="btn btn-ghost btn-block font-mono text-xs text-muted"
                >
                  KEMBALI KE RINGKASAN ORDER
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mt-1 { margin-top: 0.25rem; }
        .mt-2 { margin-top: 0.5rem; }
        .p-4 { padding: 1rem; }
        .p-8 { padding: 2rem; }
        .max-w-xl { max-width: 36rem; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .w-full { width: 100%; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .gap-3 { gap: 0.75rem; }
        .gap-6 { gap: 1.5rem; }
        .block { display: block; }

        .status-icon-wrap {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .status-icon-wrap.confirmed {
          background-color: var(--color-accent-subtle);
          border: 1px solid var(--color-border-pitch);
          color: var(--color-accent);
        }

        .status-icon-wrap.failed {
          background-color: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
        }

        .status-icon-wrap.pending {
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
        }

        .pending-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--color-border);
          border-top-color: var(--color-accent);
          border-radius: 50%;
          animation: spin 1s infinite linear;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .status-heading {
          font-size: 1.375rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: var(--color-text);
        }

        .recap-box {
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .recap-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>
    </div>
  );
}
