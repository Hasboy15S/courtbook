import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getBookingById } from "@/lib/booking";
import { getMidtransConfig } from "@/lib/midtrans";
import { BookingCountdown } from "@/components/booking-countdown";
import { SnapPayButton } from "@/components/snap-pay-button";

interface PayPageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingPayPage({ params }: PayPageProps) {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/login");
  }

  const { id } = await params;
  const booking = await getBookingById(id, session.userId, session.role === "ADMIN");

  if (!booking) {
    notFound();
  }

  // Jika sudah lunas atau dibatalkan, redirect ke halaman detail
  if (booking.status !== "PENDING") {
    redirect(`/booking/${booking.id}`);
  }

  const config = getMidtransConfig();

  const startHour = booking.startTime.getUTCHours();
  const endHour = booking.endTime.getUTCHours();
  const duration = endHour - startHour;
  const timeFormatted = `${String(startHour).padStart(2, "0")}:00 – ${String(
    endHour
  ).padStart(2, "0")}:00 WIB`;

  const dateFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(booking.date));

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <div className="pay-breadcrumb font-mono text-xs mb-4">
        <Link href={`/booking/${booking.id}`} className="text-muted hover-volt">
          ← KEMBALI KE RINGKASAN
        </Link>
        <span className="text-muted">/</span>
        <span className="text-secondary">PEMBAYARAN ONLINE</span>
      </div>

      <div className="pay-layout max-w-2xl mx-auto">
        <div className="card-technical p-6 flex flex-col gap-6">
          {/* Header */}
          <div>
            <span className="tech-label text-accent mb-1">
              GATEWAY PEMBAYARAN MIDTRANS SNAP
            </span>
            <h1 className="pay-title font-mono">
              CHECKOUT ORDER #{booking.id.slice(-8).toUpperCase()}
            </h1>
            <p className="font-mono text-xs text-secondary mt-1">
              Selesaikan pembayaran menggunakan berbagai metode: QRIS (GoPay/ShopeePay/OVO), Virtual Account Bank, atau Kartu Kredit.
            </p>
          </div>

          {/* Countdown timer */}
          {booking.holdExpiresAt && (
            <BookingCountdown expiresAt={booking.holdExpiresAt} />
          )}

          {/* Booking Summary Box */}
          <div className="recap-box card-technical p-4 font-mono text-xs">
            <div className="recap-row">
              <span className="text-secondary">VENUE & LAPANGAN</span>
              <span className="text-primary font-bold">
                {booking.court.venue.name} • {booking.court.name}
              </span>
            </div>
            <div className="recap-row">
              <span className="text-secondary">CABANG OLAHRAGA</span>
              <span className="text-accent">{booking.court.sportType}</span>
            </div>
            <div className="recap-row">
              <span className="text-secondary">JADWAL MAIN</span>
              <span className="text-primary">
                {dateFormatted} ({timeFormatted})
              </span>
            </div>
            <div className="recap-row">
              <span className="text-secondary">DURASI</span>
              <span className="text-primary">{duration} Jam</span>
            </div>
            <div className="recap-divider" />
            <div className="recap-row text-sm">
              <span className="text-secondary font-bold">TOTAL HARGA</span>
              <span className="text-accent font-bold text-lg">
                Rp {Number(booking.totalPrice).toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          {/* Snap Pay Button Component */}
          <SnapPayButton
            bookingId={booking.id}
            grossAmount={Number(booking.totalPrice)}
            clientKey={config.clientKey}
            isProduction={config.isProduction}
          />

          {/* Security & Sandbox Info */}
          <div className="security-note font-mono text-xs text-muted text-center pt-4 border-t border-[var(--color-border)]">
            🔒 Enkripsi TLS 256-bit terverifikasi oleh Midtrans Payment Gateway.
            <br />
            Mode Sandbox: Anda dapat menggunakan Simulator QRIS atau Virtual Account Midtrans.
          </div>
        </div>
      </div>

      <style>{`
        .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mt-1 { margin-top: 0.25rem; }
        .p-4 { padding: 1rem; }
        .p-6 { padding: 1.5rem; }
        .pt-4 { padding-top: 1rem; }
        .max-w-2xl { max-width: 42rem; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .gap-6 { gap: 1.5rem; }

        .pay-breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .hover-volt:hover {
          color: var(--color-accent);
        }

        .pay-title {
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

        .recap-divider {
          height: 1px;
          background-color: var(--color-border);
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }

        .text-lg {
          font-size: 1.125rem;
        }
      `}</style>
    </div>
  );
}
