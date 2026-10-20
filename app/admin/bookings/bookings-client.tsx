"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface AdminBookingItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  paymentStatus: "UNPAID" | "WAITING_VERIFICATION" | "PAID" | "REJECTED";
  totalPrice: number;
  notes: string | null;
  cancelReason: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  court: {
    id: string;
    name: string;
    sportType: string;
    venue: {
      id: string;
      name: string;
      city: string;
    };
  };
  payment: {
    id: string;
    method: string | null;
    orderId: string | null;
    paymentType: string | null;
    transactionStatus: string | null;
    transactionId: string | null;
    paidAt: string | null;
    verifiedBy: string | null;
  } | null;
}

interface VenueOption {
  id: string;
  name: string;
}

interface AdminBookingsClientProps {
  initialBookings: AdminBookingItem[];
  venues: VenueOption[];
}

export function AdminBookingsClient({
  initialBookings,
  venues,
}: AdminBookingsClientProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState<AdminBookingItem[]>(initialBookings);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [venueFilter, setVenueFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal Detail Pembayaran
  const [selectedBooking, setSelectedBooking] = useState<AdminBookingItem | null>(null);

  // Modal Pembatalan
  const [cancelModalBooking, setCancelModalBooking] = useState<AdminBookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filter Logic
  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== "ALL" && b.status !== statusFilter) return false;
    if (venueFilter !== "ALL" && b.court.venue.id !== venueFilter) return false;
    if (dateFilter) {
      const bDateStr = b.date.split("T")[0];
      if (bDateStr !== dateFilter) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = b.id.toLowerCase().includes(q);
      const matchName = b.user.name.toLowerCase().includes(q);
      const matchEmail = b.user.email.toLowerCase().includes(q);
      if (!matchId && !matchName && !matchEmail) return false;
    }
    return true;
  });

  const handleMarkPaid = async (bookingId: string) => {
    setActionLoading(true);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/mark-paid`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.message || "Gagal menandai pembayaran.");
        return;
      }

      setBookings((prev) =>
        prev.map((item) =>
          item.id === bookingId
            ? {
                ...item,
                status: "CONFIRMED",
                paymentStatus: "PAID",
                payment: {
                  id: item.payment?.id || "manual",
                  method: "MANUAL_TUNAI_ADMIN",
                  orderId: item.payment?.orderId || null,
                  paymentType: "cash",
                  transactionStatus: "settlement",
                  transactionId: null,
                  paidAt: new Date().toISOString(),
                  verifiedBy: "ADMIN",
                },
              }
            : item
        )
      );

      setActionMessage("Booking berhasil ditandai sebagai LUNAS.");
      router.refresh();
    } catch {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminCancel = async () => {
    if (!cancelModalBooking) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/bookings/${cancelModalBooking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || "Dibatalkan oleh Admin" }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || "Gagal membatalkan booking.");
        return;
      }

      setBookings((prev) =>
        prev.map((item) =>
          item.id === cancelModalBooking.id
            ? {
                ...item,
                status: "CANCELLED",
                cancelReason: cancelReason || "Dibatalkan oleh Admin",
              }
            : item
        )
      );

      setCancelModalBooking(null);
      setCancelReason("");
      router.refresh();
    } catch {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container py-8 flex flex-col gap-6">
      {/* Header */}
      <div className="flex-between items-center flex-wrap gap-4">
        <div>
          <span className="tech-label text-accent mb-1">PENGELOLAAN TRANSAKSI</span>
          <h1 className="admin-page-title font-mono">KELOLA SEMUA BOOKING</h1>
          <p className="font-mono text-xs text-secondary mt-1">
            Total {bookings.length} transaksi di database. Filter berdasarkan status, tanggal, atau venue.
          </p>
        </div>

        {actionMessage && (
          <div className="badge badge-volt font-mono text-xs p-2">
            ✓ {actionMessage}
          </div>
        )}
      </div>

      {/* Filter Control Bar */}
      <div className="card-technical p-4 flex flex-wrap gap-3 items-center font-mono text-xs">
        {/* Status Filter */}
        <div className="filter-group">
          <label className="text-muted text-[10px] block">STATUS:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">SEMUA STATUS</option>
            <option value="PENDING">PENDING (HOLD)</option>
            <option value="CONFIRMED">CONFIRMED (LUNAS)</option>
            <option value="COMPLETED">COMPLETED (SELESAI)</option>
            <option value="CANCELLED">CANCELLED (BATAL)</option>
            <option value="EXPIRED">EXPIRED (HABIS WAKTU)</option>
          </select>
        </div>

        {/* Venue Filter */}
        <div className="filter-group">
          <label className="text-muted text-[10px] block">VENUE:</label>
          <select
            value={venueFilter}
            onChange={(e) => setVenueFilter(e.target.value)}
            className="filter-select"
          >
            <option value="ALL">SEMUA VENUE</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filter */}
        <div className="filter-group">
          <label className="text-muted text-[10px] block">TANGGAL MAIN:</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="filter-input"
          />
        </div>

        {/* Search Query */}
        <div className="filter-group flex-1 min-w-[200px]">
          <label className="text-muted text-[10px] block">CARI USER / ORDER ID:</label>
          <input
            type="text"
            placeholder="Ketik ID, nama, atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input w-full"
          />
        </div>

        {/* Reset Filter Button */}
        {(statusFilter !== "ALL" || venueFilter !== "ALL" || dateFilter || searchQuery) && (
          <button
            onClick={() => {
              setStatusFilter("ALL");
              setVenueFilter("ALL");
              setDateFilter("");
              setSearchQuery("");
            }}
            className="btn btn-ghost btn-sm font-mono text-xs mt-3"
          >
            RESET
          </button>
        )}
      </div>

      {/* Bookings Table */}
      <div className="card-technical p-6">
        <div className="overflow-x-auto">
          <table className="admin-table font-mono text-xs">
            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>PEMESAN</th>
                <th>VENUE & LAPANGAN</th>
                <th>JADWAL MAIN</th>
                <th>TOTAL</th>
                <th>STATUS</th>
                <th>PEMBAYARAN</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted">
                    Tidak ditemukan booking yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const dateStr = new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(b.date));

                  const startH = new Date(b.startTime).getUTCHours();
                  const endH = new Date(b.endTime).getUTCHours();
                  const timeStr = `${String(startH).padStart(2, "0")}:00 - ${String(endH).padStart(2, "0")}:00`;

                  return (
                    <tr key={b.id}>
                      <td>
                        <Link
                          href={`/booking/${b.id}`}
                          className="text-accent font-bold hover:underline"
                        >
                          #{b.id.slice(-8).toUpperCase()}
                        </Link>
                      </td>
                      <td>
                        <div className="font-bold text-primary">{b.user.name}</div>
                        <div className="text-muted text-[11px]">{b.user.email}</div>
                        {b.user.phone && (
                          <div className="text-secondary text-[11px]">{b.user.phone}</div>
                        )}
                      </td>
                      <td>
                        <div className="font-bold">{b.court.venue.name}</div>
                        <div className="text-muted text-[11px]">
                          {b.court.name} ({b.court.sportType})
                        </div>
                      </td>
                      <td>
                        <div>{dateStr}</div>
                        <div className="text-accent font-bold">{timeStr} WIB</div>
                      </td>
                      <td className="font-bold text-primary">
                        Rp {b.totalPrice.toLocaleString("id-ID")}
                      </td>
                      <td>
                        <span className={`badge ${
                          b.status === "CONFIRMED" || b.status === "COMPLETED"
                            ? "badge-volt"
                            : b.status === "PENDING"
                            ? "badge-warning"
                            : "badge-danger"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedBooking(b)}
                          className="btn-pay-status font-mono"
                          title="Klik untuk melihat rincian pembayaran"
                        >
                          <span className={`badge ${
                            b.paymentStatus === "PAID"
                              ? "badge-volt"
                              : "badge-muted"
                          }`}>
                            {b.paymentStatus} ℹ️
                          </span>
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {b.paymentStatus !== "PAID" && b.status !== "CANCELLED" && b.status !== "EXPIRED" && (
                            <button
                              onClick={() => handleMarkPaid(b.id)}
                              disabled={actionLoading}
                              className="btn btn-primary btn-sm text-[11px] font-mono py-1 px-2"
                              title="Tandai booking ini lunas secara manual (tunai)"
                            >
                              TANDAI LUNAS
                            </button>
                          )}

                          {b.status !== "CANCELLED" && b.status !== "EXPIRED" && b.status !== "COMPLETED" && (
                            <button
                              onClick={() => setCancelModalBooking(b)}
                              className="btn btn-ghost btn-sm text-[11px] font-mono text-booked py-1 px-2"
                            >
                              BATALKAN
                            </button>
                          )}

                          <Link
                            href={`/booking/${b.id}`}
                            className="btn btn-ghost btn-sm text-[11px] font-mono py-1 px-2"
                          >
                            DETAIL
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Pembayaran */}
      {selectedBooking && (
        <div className="modal-backdrop animate-fadeIn">
          <div className="modal-card card-technical">
            <div className="modal-header">
              <span className="badge-dot badge-dot-live" />
              <h3 className="modal-title font-mono">DETAIL PEMBAYARAN MIDTRANS</h3>
            </div>

            <div className="recap-box p-4 font-mono text-xs flex flex-col gap-2">
              <div className="flex-between">
                <span className="text-secondary">ORDER ID:</span>
                <span className="text-accent font-bold">
                  {selectedBooking.payment?.orderId || `#${selectedBooking.id.slice(-8).toUpperCase()}`}
                </span>
              </div>
              <div className="flex-between">
                <span className="text-secondary">STATUS TRANSAKSI:</span>
                <span className="text-primary font-bold">
                  {selectedBooking.payment?.transactionStatus || "Belum ada transaksi"}
                </span>
              </div>
              <div className="flex-between">
                <span className="text-secondary">METODE PEMBAYARAN:</span>
                <span className="text-primary">
                  {selectedBooking.payment?.method || selectedBooking.payment?.paymentType || "Belum dipilih"}
                </span>
              </div>
              <div className="flex-between">
                <span className="text-secondary">ID TRANSAKSI GATEWAY:</span>
                <span className="text-muted text-[11px]">
                  {selectedBooking.payment?.transactionId || "-"}
                </span>
              </div>
              <div className="flex-between">
                <span className="text-secondary">WAKTU DIBAYAR:</span>
                <span className="text-primary">
                  {selectedBooking.payment?.paidAt
                    ? new Date(selectedBooking.payment.paidAt).toLocaleString("id-ID")
                    : "-"}
                </span>
              </div>
              {selectedBooking.payment?.verifiedBy && (
                <div className="flex-between">
                  <span className="text-secondary">DIVERIFIKASI OLEH:</span>
                  <span className="text-accent font-bold">
                    {selectedBooking.payment.verifiedBy}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedBooking(null)}
                className="btn btn-ghost btn-sm font-mono text-xs"
              >
                TUTUP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pembatalan Admin */}
      {cancelModalBooking && (
        <div className="modal-backdrop animate-fadeIn">
          <div className="modal-card card-technical">
            <div className="modal-header">
              <span className="badge-dot badge-dot-danger" />
              <h3 className="modal-title font-mono">BATALKAN BOOKING (ADMIN)</h3>
            </div>

            <p className="font-mono text-xs text-secondary">
              Anda akan membatalkan Order #{cancelModalBooking.id.slice(-8).toUpperCase()} untuk {cancelModalBooking.user.name}. Slot akan langsung dibuka kembali ke publik.
            </p>

            <div className="flex flex-col gap-1">
              <label className="font-mono text-xs text-muted">Alasan Pembatalan:</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Misal: Permintaan pembatalan via telepon oleh pemesan..."
                rows={2}
                className="modal-textarea font-mono text-xs"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCancelModalBooking(null)}
                className="btn btn-ghost btn-sm font-mono text-xs"
              >
                KEMBALI
              </button>
              <button
                onClick={handleAdminCancel}
                disabled={actionLoading}
                className="btn btn-danger btn-sm font-mono text-xs"
              >
                {actionLoading ? "MEMBATALKAN..." : "YA, BATALKAN BOOKING"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mt-1 { margin-top: 0.25rem; }
        .mt-3 { margin-top: 0.75rem; }
        .p-2 { padding: 0.5rem; }
        .p-4 { padding: 1rem; }
        .p-6 { padding: 1.5rem; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .flex-wrap { flex-wrap: wrap; }
        .items-center { align-items: center; }
        .flex-between { display: flex; justify-content: space-between; }
        .justify-end { justify-content: flex-end; }
        .gap-1 { gap: 0.25rem; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .w-full { width: 100%; }
        .min-w-\\[200px\\] { min-width: 200px; }

        .admin-page-title {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .filter-select,
        .filter-input {
          padding: 0.45rem 0.65rem;
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          color: var(--color-text);
          font-family: inherit;
        }

        .filter-select:focus,
        .filter-input:focus {
          border-color: var(--color-accent);
          outline: none;
        }

        .btn-pay-status {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .admin-table th {
          background-color: var(--color-surface);
          color: var(--color-text-secondary);
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--color-border);
          font-size: 0.6875rem;
          letter-spacing: 0.05em;
        }

        .admin-table td {
          padding: 0.875rem 1rem;
          border-bottom: 1px solid var(--color-border);
        }

        .admin-table tr:hover td {
          background-color: var(--color-surface);
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

        .modal-card {
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
          color: var(--color-accent);
        }

        .recap-box {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
        }

        .modal-textarea {
          width: 100%;
          padding: 0.5rem;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          color: var(--color-text);
          resize: none;
        }

        .btn-danger {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid #ef4444;
          color: #f87171;
        }

        .btn-danger:hover:not(:disabled) {
          background: #ef4444;
          color: white;
        }

        .badge-warning {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.4);
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
