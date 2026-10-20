"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookingCancelButton } from "@/components/booking-cancel-button";

export interface SerializedBooking {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  paymentStatus: "UNPAID" | "WAITING_VERIFICATION" | "PAID" | "REJECTED";
  totalPrice: number;
  notes: string | null;
  holdExpiresAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  canCancel?: boolean;
  court: {
    id: string;
    name: string;
    sportType: string;
    venue: {
      id: string;
      name: string;
      city: string;
      address: string;
    };
  };
  review?: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
}

interface MyBookingsClientProps {
  initialBookings: SerializedBooking[];
}

type TabType = "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export function MyBookingsClient({ initialBookings }: MyBookingsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [bookingsList, setBookingsList] = useState<SerializedBooking[]>(initialBookings);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<SerializedBooking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const handleOpenReview = (b: SerializedBooking) => {
    setReviewBooking(b);
    setRating(5);
    setComment("");
    setReviewError(null);
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setSubmittingReview(true);
    setReviewError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: reviewBooking.id,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal mengirim ulasan.");
      }
      setBookingsList((prev) =>
        prev.map((item) =>
          item.id === reviewBooking.id
            ? {
                ...item,
                review: {
                  id: data.review.id,
                  rating: data.review.rating,
                  comment: data.review.comment,
                  createdAt: new Date().toISOString(),
                },
              }
            : item
        )
      );
      setReviewModalOpen(false);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setReviewError(error.message || "Gagal mengirim ulasan.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredBookings = bookingsList.filter((b) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "PENDING") return b.status === "PENDING";
    if (activeTab === "CONFIRMED") return b.status === "CONFIRMED";
    if (activeTab === "COMPLETED") return b.status === "COMPLETED";
    if (activeTab === "CANCELLED")
      return b.status === "CANCELLED" || b.status === "EXPIRED";
    return true;
  });

  const totalCount = bookingsList.length;
  const activeCount = bookingsList.filter(
    (b) => b.status === "PENDING" || b.status === "CONFIRMED"
  ).length;
  const completedCount = bookingsList.filter(
    (b) => b.status === "COMPLETED"
  ).length;

  return (
    <div className="container py-8">
      {/* Page Header */}
      <div className="bookings-header mb-8">
        <div>
          <span className="tech-label text-accent mb-1">DASHBOARD PENGGUNA</span>
          <h1 className="bookings-title font-mono">RIWAYAT & DAFTAR BOOKING</h1>
          <p className="text-secondary font-mono text-xs mt-1">
            Pantau status pesanan, selesaikan pembayaran, atau kelola jadwal main Anda.
          </p>
        </div>

        {/* Stats Strip */}
        <div className="stats-strip card-technical">
          <div className="stat-box">
            <span className="stat-label font-mono">TOTAL PESANAN</span>
            <span className="stat-number font-mono">{totalCount}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-box">
            <span className="stat-label font-mono text-accent">AKTIF // ONGOING</span>
            <span className="stat-number font-mono text-accent">{activeCount}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-box">
            <span className="stat-label font-mono">SELESAI</span>
            <span className="stat-number font-mono">{completedCount}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs-bar mb-6 font-mono text-xs">
        {[
          { id: "ALL", label: "SEMUA" },
          { id: "PENDING", label: "MENUNGGU BAYAR" },
          { id: "CONFIRMED", label: "DIKONFIRMASI" },
          { id: "COMPLETED", label: "SELESAI" },
          { id: "CANCELLED", label: "BATAL / EXPIRED" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="empty-bookings card-technical p-12 text-center">
          <div className="empty-icon font-mono text-accent mb-3">⌗</div>
          <h3 className="font-mono text-sm font-bold text-primary mb-2">
            TIDAK ADA DATA BOOKING
          </h3>
          <p className="font-mono text-xs text-secondary max-w-md mx-auto mb-6">
            Belum ada jadwal bermain pada kategori ini. Pilih lapangan favorit Anda dan amankan slot sekarang!
          </p>
          <Link href="/venues" className="btn btn-primary btn-sm font-mono inline-flex">
            CARI LAPANGAN SEKARANG →
          </Link>
        </div>
      ) : (
        <div className="bookings-grid">
          {filteredBookings.map((booking) => {
            const dateObj = new Date(booking.date);
            const dateStr = new Intl.DateTimeFormat("id-ID", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            }).format(dateObj);

            const startH = new Date(booking.startTime).getUTCHours();
            const endH = new Date(booking.endTime).getUTCHours();
            const duration = endH - startH;
            const timeStr = `${String(startH).padStart(2, "0")}:00 - ${String(endH).padStart(2, "0")}:00 WIB`;

            // Check if can cancel (>2 hours)
            const canCancel = Boolean(booking.canCancel);

            return (
              <div key={booking.id} className="booking-card card-technical">
                {/* Card Header */}
                <div className="card-top flex-between">
                  <div className="flex items-center gap-2">
                    <span className="sport-chip font-mono">
                      {booking.court.sportType}
                    </span>
                    <span className="order-id font-mono">
                      #{booking.id.slice(-8).toUpperCase()}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {booking.status === "PENDING" && (
                      <span className="badge badge-warning font-mono">
                        <span className="badge-dot badge-dot-warning" />
                        <span>HOLD 15M</span>
                      </span>
                    )}
                    {booking.status === "CONFIRMED" && (
                      <span className="badge badge-volt font-mono">
                        <span className="badge-dot badge-dot-live" />
                        <span>DIKONFIRMASI</span>
                      </span>
                    )}
                    {booking.status === "COMPLETED" && (
                      <span className="badge badge-volt font-mono">
                        <span>SELESAI</span>
                      </span>
                    )}
                    {booking.status === "CANCELLED" && (
                      <span className="badge badge-danger font-mono">
                        <span>DIBATALKAN</span>
                      </span>
                    )}
                    {booking.status === "EXPIRED" && (
                      <span className="badge badge-muted font-mono">
                        <span>EXPIRED</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="card-body">
                  <h3 className="venue-name">{booking.court.venue.name}</h3>
                  <p className="court-desc font-mono text-xs text-secondary mb-3">
                    {booking.court.name} • {booking.court.venue.city}
                  </p>

                  <div className="schedule-box font-mono text-xs">
                    <div className="flex items-center gap-2 text-primary font-bold">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2 text-accent">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>
                        {timeStr} ({duration} Jam)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="card-footer flex-between items-center">
                  <div>
                    <span className="tech-label">TOTAL BIAYA</span>
                    <div className="card-price font-mono">
                      Rp {booking.totalPrice.toLocaleString("id-ID")}
                    </div>
                  </div>

                  <div className="card-actions flex items-center gap-2">
                    {booking.status === "PENDING" && (
                      <>
                        <BookingCancelButton bookingId={booking.id} />
                        <Link
                          href={`/booking/${booking.id}`}
                          className="btn btn-primary btn-sm font-mono"
                        >
                          BAYAR SEKARANG →
                        </Link>
                      </>
                    )}

                    {booking.status === "CONFIRMED" && (
                      <>
                        {canCancel && (
                          <BookingCancelButton
                            bookingId={booking.id}
                            isConfirmed={true}
                          />
                        )}
                        <Link
                          href={`/booking/${booking.id}`}
                          className="btn btn-secondary btn-sm font-mono"
                        >
                          DETAIL TIKET
                        </Link>
                      </>
                    )}

                    {booking.status === "COMPLETED" && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {booking.review ? (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#142017] border border-[#233527] rounded-xs text-xs font-mono">
                            <span className="text-[#facc15]">{"★".repeat(booking.review.rating)}</span>
                            <span className="text-neutral-400">Sudah Diulas</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenReview(booking)}
                            className="btn btn-primary btn-sm font-mono text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>★</span>
                            <span>BERIKAN ULASAN</span>
                          </button>
                        )}
                        <Link
                          href={`/booking/${booking.id}`}
                          className="btn btn-ghost btn-sm font-mono text-xs"
                        >
                          LIHAT RINGKASAN
                        </Link>
                      </div>
                    )}

                    {(booking.status === "CANCELLED" ||
                      booking.status === "EXPIRED") && (
                      <Link
                        href={`/booking/${booking.id}`}
                        className="btn btn-ghost btn-sm font-mono text-xs"
                      >
                        LIHAT RINGKASAN
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL BERIKAN ULASAN */}
      {reviewModalOpen && reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0e1610] border border-[#2a402f] rounded-sm p-6 w-full max-w-md shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[#1f2e22] pb-3">
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <span className="text-[#ccff00]">★</span> ULASAN VENUE
              </h2>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="text-neutral-400 hover:text-white font-mono text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div className="p-3 bg-[#131d15] border border-[#223326] rounded-xs text-xs font-mono space-y-1">
                <div>
                  <span className="text-neutral-400">Venue:</span>{" "}
                  <span className="text-white font-bold">{reviewBooking.court.venue.name}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Lapangan:</span>{" "}
                  <span className="text-[#ccff00] font-bold">{reviewBooking.court.name}</span>
                </div>
              </div>

              {reviewError && (
                <div className="p-3 bg-[#2b1215] border border-[#ef4444] text-[#fca5a5] text-xs font-mono rounded-xs">
                  {reviewError}
                </div>
              )}

              {/* Star Rating Selector */}
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-2">
                  BERIKAN BINTANG (1-5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl transition cursor-pointer p-1 ${
                        star <= rating ? "text-[#facc15] scale-110" : "text-neutral-600 hover:text-neutral-400"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="font-mono text-xs text-neutral-400 ml-2">
                    {rating === 5
                      ? "Luar Biasa!"
                      : rating === 4
                      ? "Sangat Bagus"
                      : rating === 3
                      ? "Cukup Baik"
                      : rating === 2
                      ? "Kurang Memuaskan"
                      : "Sangat Buruk"}
                  </span>
                </div>
              </div>

              {/* Comment Input */}
              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                  KOMENTAR / ULASAN (OPSIONAL)
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ceritakan pengalaman bermain Anda (kondisi rumput/karpet, pencahayaan, fasilitas)..."
                  className="w-full bg-[#121c14] border border-[#233527] text-white text-xs px-3 py-2 rounded-sm focus:outline-none focus:border-[#ccff00] font-mono resize-none"
                />
                <div className="text-[10px] font-mono text-neutral-500 text-right mt-1">
                  {comment.length}/500 karakter
                </div>
              </div>

              <div className="pt-3 border-t border-[#1f2e22] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn-accent px-5 py-2 text-xs font-mono font-bold tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {submittingReview ? "MENGIRIM..." : "KIRIM ULASAN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mb-8 { margin-bottom: 2rem; }
        .mt-1 { margin-top: 0.25rem; }
        .p-12 { padding: 3rem; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .max-w-md { max-width: 28rem; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-2 { gap: 0.5rem; }
        .flex-between { display: flex; justify-content: space-between; }

        .bookings-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .bookings-title {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .stats-strip {
          display: flex;
          align-items: center;
          padding: 0.75rem 1.25rem;
          gap: 1rem;
        }

        .stat-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 0.5rem;
        }

        .stat-label {
          font-size: 0.625rem;
          color: var(--color-text-muted);
          letter-spacing: 0.05em;
        }

        .stat-number {
          font-size: 1.25rem;
          font-weight: 800;
        }

        .stat-divider {
          width: 1px;
          height: 28px;
          background-color: var(--color-border);
        }

        .tabs-bar {
          display: flex;
          gap: 0.375rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
        }

        .tab-btn {
          padding: 0.45rem 0.85rem;
          background: transparent;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          color: var(--color-text-secondary);
          cursor: pointer;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }

        .tab-btn:hover {
          color: var(--color-text);
          border-color: var(--color-border-strong);
        }

        .tab-btn.active {
          background-color: var(--color-accent-subtle);
          border-color: var(--color-border-pitch);
          color: var(--color-accent);
          font-weight: 700;
        }

        .bookings-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
        }

        @media (min-width: 768px) {
          .bookings-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .booking-card {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: border-color var(--transition-fast);
        }

        .booking-card:hover {
          border-color: var(--color-border-strong);
        }

        .order-id {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        .venue-name {
          font-size: 1.0625rem;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 0.25rem;
        }

        .schedule-box {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding: 0.65rem 0.85rem;
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
        }

        .card-footer {
          padding-top: 0.75rem;
          border-top: 1px solid var(--color-border);
        }

        .card-price {
          font-size: 1.125rem;
          font-weight: 800;
          color: var(--color-accent);
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

        .badge-muted {
          background: var(--color-surface);
          color: var(--color-text-muted);
          border: 1px solid var(--color-border);
        }
      `}</style>
    </div>
  );
}
