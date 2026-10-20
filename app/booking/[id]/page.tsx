import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getBookingById, checkCanCancel } from "@/lib/booking";
import { BookingCountdown } from "@/components/booking-countdown";
import { BookingCancelButton } from "@/components/booking-cancel-button";

interface BookingPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: BookingPageProps) {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const { id } = await params;
  const booking = await getBookingById(
    id,
    session.userId,
    session.role === "ADMIN"
  );

  if (!booking) {
    notFound();
  }

  // Format tanggal & jam
  const bookingDate = new Date(booking.date);
  const dateFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(bookingDate);

  const startHour = booking.startTime.getUTCHours();
  const endHour = booking.endTime.getUTCHours();
  const duration = endHour - startHour;
  const timeFormatted = `${String(startHour).padStart(2, "0")}:00 – ${String(
    endHour
  ).padStart(2, "0")}:00 WIB`;

  // Cek apakah pembatalan masih boleh (minimal 2 jam sebelum main)
  const canCancelConfirmed = checkCanCancel(
    booking.date,
    booking.startTime,
    session.role === "ADMIN"
  );

  const isPending = booking.status === "PENDING";
  const isConfirmed = booking.status === "CONFIRMED";
  const isCancelled = booking.status === "CANCELLED";
  const isExpired = booking.status === "EXPIRED";
  const isCompleted = booking.status === "COMPLETED";

  return (
    <div className="container py-8">
      {/* Breadcrumb Navigation */}
      <div className="booking-breadcrumb font-mono text-xs mb-4">
        <Link href="/my-bookings" className="text-muted hover-volt">
          ← BOOKING SAYA
        </Link>
        <span className="text-muted">/</span>
        <span className="text-secondary">
          ORDER #{booking.id.slice(-8).toUpperCase()}
        </span>
      </div>

      <div className="booking-layout">
        {/* Main Details Column */}
        <div className="booking-main">
          {/* Header Card */}
          <div className="booking-header card-technical p-6">
            <div className="flex-between flex-wrap gap-4 mb-4">
              <div>
                <span className="tech-label text-accent mb-1">
                  STATUS PEMESANAN
                </span>
                <h1 className="booking-title font-mono">
                  ORDER #{booking.id.slice(-8).toUpperCase()}
                </h1>
              </div>

              {/* Status Badges */}
              <div>
                {isPending && (
                  <span className="badge badge-warning font-mono">
                    <span className="badge-dot badge-dot-warning animate-ping" />
                    <span>MENUNGGU PEMBAYARAN</span>
                  </span>
                )}
                {isConfirmed && (
                  <span className="badge badge-volt font-mono">
                    <span className="badge-dot badge-dot-live" />
                    <span>DIKONFIRMASI // SIAP MAIN</span>
                  </span>
                )}
                {isCompleted && (
                  <span className="badge badge-volt font-mono">
                    <span className="badge-dot badge-dot-live" />
                    <span>SELESAI</span>
                  </span>
                )}
                {isCancelled && (
                  <span className="badge badge-danger font-mono">
                    <span className="badge-dot badge-dot-danger" />
                    <span>DIBATALKAN</span>
                  </span>
                )}
                {isExpired && (
                  <span className="badge badge-muted font-mono">
                    <span>KEDALUWARSA</span>
                  </span>
                )}
              </div>
            </div>

            {/* Hold Countdown (if PENDING) */}
            {isPending && booking.holdExpiresAt && (
              <BookingCountdown expiresAt={booking.holdExpiresAt} />
            )}

            {/* Reason if Cancelled */}
            {isCancelled && (
              <div className="cancelled-notice card-technical font-mono text-xs mt-4">
                <span className="text-danger font-bold">ALASAN PEMBATALAN:</span>{" "}
                <span className="text-secondary">{booking.cancelReason || "Dibatalkan oleh pengguna"}</span>
              </div>
            )}
          </div>

          {/* Venue & Court Info */}
          <div className="card-technical p-6">
            <h2 className="section-subtitle font-mono mb-4">
              RINCIAN LAPANGAN & VENUE
            </h2>

            <div className="specs-grid">
              <div className="spec-item">
                <span className="tech-label">NAMA VENUE</span>
                <span className="spec-val font-bold">
                  {booking.court.venue.name}
                </span>
              </div>

              <div className="spec-item">
                <span className="tech-label">CABANG OLAHRAGA</span>
                <span className="spec-val font-mono text-accent">
                  {booking.court.sportType}
                </span>
              </div>

              <div className="spec-item">
                <span className="tech-label">NAMA LAPANGAN</span>
                <span className="spec-val">{booking.court.name}</span>
              </div>

              <div className="spec-item">
                <span className="tech-label">KOTA & ALAMAT</span>
                <span className="spec-val">
                  {booking.court.venue.city} • {booking.court.venue.address}
                </span>
              </div>
            </div>
          </div>

          {/* Schedule & Player Info */}
          <div className="card-technical p-6">
            <h2 className="section-subtitle font-mono mb-4">
              JADWAL & DATA PEMESAN
            </h2>

            <div className="specs-grid">
              <div className="spec-item">
                <span className="tech-label">TANGGAL BERMAIN</span>
                <span className="spec-val font-bold">{dateFormatted}</span>
              </div>

              <div className="spec-item">
                <span className="tech-label">WAKTU & DURASI</span>
                <span className="spec-val font-mono text-accent">
                  {timeFormatted} ({duration} Jam)
                </span>
              </div>

              <div className="spec-item">
                <span className="tech-label">NAMA PEMESAN</span>
                <span className="spec-val">{booking.user.name}</span>
              </div>

              <div className="spec-item">
                <span className="tech-label">EMAIL / KONTAK</span>
                <span className="spec-val font-mono">
                  {booking.user.email} {booking.user.phone ? `• ${booking.user.phone}` : ""}
                </span>
              </div>
            </div>

            {booking.notes && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <span className="tech-label mb-1">CATATAN KHUSUS</span>
                <p className="font-mono text-xs text-secondary">{booking.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Cost & Action Column */}
        <div className="booking-sidebar">
          <div className="card-technical p-6 sticky-sidebar">
            <h3 className="section-subtitle font-mono mb-4">RINCIAN BIAYA</h3>

            <div className="cost-breakdown font-mono text-xs">
              <div className="cost-row">
                <span className="text-secondary">Sewa Lapangan ({duration} Jam)</span>
                <span className="text-primary font-bold">
                  Rp {Number(booking.totalPrice).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="cost-row">
                <span className="text-secondary">Biaya Layanan Platform</span>
                <span className="text-accent font-bold">GRATIS</span>
              </div>
              <div className="cost-divider" />
              <div className="cost-total">
                <div>
                  <span className="tech-label text-accent">TOTAL PEMBAYARAN</span>
                  <div className="total-amount font-mono">
                    Rp {Number(booking.totalPrice).toLocaleString("id-ID")}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sidebar-actions mt-6">
              {isPending && (
                <>
                  <Link
                    href={`/booking/${booking.id}/pay`}
                    className="btn btn-primary btn-block font-mono"
                  >
                    BAYAR SEKARANG →
                  </Link>
                  <BookingCancelButton bookingId={booking.id} />
                </>
              )}

              {isConfirmed && canCancelConfirmed && (
                <div className="flex flex-col gap-3">
                  <div className="confirmed-ready-badge card-technical p-3 font-mono text-xs text-center text-accent">
                    ✓ Tiket bermain aktif. Tunjukkan kode booking saat tiba di venue.
                  </div>
                  <BookingCancelButton
                    bookingId={booking.id}
                    isConfirmed={true}
                  />
                </div>
              )}

              {(isCancelled || isExpired) && (
                <Link
                  href={`/venues/${booking.court.venueId}`}
                  className="btn btn-secondary btn-block font-mono text-xs"
                >
                  PILIH JADWAL LAIN DI VENUE INI →
                </Link>
              )}

              <Link
                href="/my-bookings"
                className="btn btn-ghost btn-block font-mono text-xs text-muted"
              >
                KEMBALI KE DAFTAR BOOKING
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mt-4 { margin-top: 1rem; }
        .mt-6 { margin-top: 1.5rem; }
        .p-6 { padding: 1.5rem; }
        .p-3 { padding: 0.75rem; }
        .pt-4 { padding-top: 1rem; }

        .booking-breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .hover-volt:hover {
          color: var(--color-accent);
        }

        .booking-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 1024px) {
          .booking-layout {
            grid-template-columns: 2fr 1fr;
            align-items: start;
          }
        }

        .booking-main {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .booking-title {
          font-size: 1.375rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          color: var(--color-text);
        }

        .flex-between {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .section-subtitle {
          font-size: 0.875rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: var(--color-text-secondary);
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 0.75rem;
        }

        .specs-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }

        @media (min-width: 640px) {
          .specs-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .spec-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .spec-val {
          font-size: 0.9375rem;
          color: var(--color-text);
        }

        .cost-breakdown {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .cost-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cost-divider {
          height: 1px;
          background-color: var(--color-border);
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }

        .cost-total {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 0.25rem;
        }

        .total-amount {
          font-size: 1.625rem;
          font-weight: 800;
          color: var(--color-accent);
          line-height: 1.2;
        }

        .sidebar-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sticky-sidebar {
          position: sticky;
          top: calc(var(--navbar-height) + 1.5rem);
        }

        .cancelled-notice {
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: var(--radius-xs);
        }

        .confirmed-ready-badge {
          background: rgba(204, 255, 0, 0.08);
          border: 1px solid var(--color-border-pitch);
        }

        .badge-warning {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        .badge-dot-warning {
          background: #fbbf24;
        }

        .badge-danger {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }

        .badge-dot-danger {
          background: #ef4444;
        }

        .badge-muted {
          background: var(--color-surface);
          color: var(--color-text-muted);
          border: 1px solid var(--color-border);
        }
      `}</style>
    </div>
  );
}
