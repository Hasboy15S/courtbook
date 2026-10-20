"use client";

import React, { useState, useEffect, useTransition } from "react";
import type { ComputedSlot, CourtAvailabilityResult } from "@/lib/availability";
import { useRouter } from "next/navigation";

interface CourtAvailabilityGridProps {
  courtId: string;
  courtName: string;
  sportType: string;
  initialDate: string;
  initialData?: CourtAvailabilityResult | null;
}

export function CourtAvailabilityGrid({
  courtId,
  courtName,
  sportType,
  initialDate,
  initialData,
}: CourtAvailabilityGridProps) {
  const router = useRouter();
  const [data, setData] = useState<CourtAvailabilityResult | null>(
    initialData || null
  );
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [prevKey, setPrevKey] = useState(`${courtId}-${initialDate}`);

  // React recommended pattern: adjust state during render when prop keys change
  const currentKey = `${courtId}-${initialDate}`;
  if (currentKey !== prevKey) {
    setPrevKey(currentKey);
    setSelectedHours([]);
    if (initialData && initialData.date === initialDate && initialData.courtId === courtId) {
      setData(initialData);
    }
  }

  // Fetch updated availability only when not matching initialData
  useEffect(() => {
    if (initialData && initialData.date === initialDate && initialData.courtId === courtId) {
      return;
    }

    let active = true;
    startTransition(async () => {
      try {
        setError(null);
        const res = await fetch(`/api/courts/${courtId}/availability?date=${initialDate}`);
        if (!res.ok) {
          throw new Error("Gagal memuat jadwal lapangan");
        }
        const json: CourtAvailabilityResult = await res.json();
        if (active) {
          setData(json);
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        }
      }
    });

    return () => {
      active = false;
    };
  }, [courtId, initialDate, initialData]);

  // Handle slot clicking (rule: must be consecutive within 1 court)
  const toggleSlot = (slot: ComputedSlot) => {
    if (slot.status !== "AVAILABLE") return;

    const hour = slot.hour;
    if (selectedHours.includes(hour)) {
      // Unselect: keep connected selection or reset
      setSelectedHours((prev) => prev.filter((h) => h !== hour));
    } else {
      if (selectedHours.length === 0) {
        setSelectedHours([hour]);
      } else {
        // Enforce consecutive slots rule
        const sorted = [...selectedHours, hour].sort((a, b) => a - b);
        const isConsecutive = sorted.every(
          (val, idx) => idx === 0 || val === sorted[idx - 1] + 1
        );
        if (isConsecutive) {
          setSelectedHours(sorted);
        } else {
          // If non-consecutive, restart selection at this new slot
          setSelectedHours([hour]);
        }
      }
    }
  };

  const selectedSlots = (data?.slots || []).filter((s) =>
    selectedHours.includes(s.hour)
  );

  const totalPrice = selectedSlots.reduce((sum, s) => sum + s.price, 0);

  const startFormatted =
    selectedSlots.length > 0 ? selectedSlots[0].startTime : "";
  const endFormatted =
    selectedSlots.length > 0
      ? selectedSlots[selectedSlots.length - 1].endTime
      : "";

  const handleCreateBooking = async () => {
    if (selectedHours.length === 0 || isSubmitting) return;
    setIsSubmitting(true);
    setBookingError(null);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId,
          date: initialDate,
          slots: selectedHours,
        }),
      });

      const json = await res.json();

      if (res.status === 401) {
        const returnUrl = encodeURIComponent(
          typeof window !== "undefined"
            ? window.location.pathname + window.location.search
            : `/venues`
        );
        router.push(`/login?redirectTo=${returnUrl}`);
        return;
      }

      if (!res.ok || !json.success) {
        setBookingError(json.message || "Gagal membuat booking slot.");
        try {
          const fresh = await fetch(
            `/api/courts/${courtId}/availability?date=${initialDate}`
          );
          if (fresh.ok) {
            const freshData = await fresh.json();
            setData(freshData);
            setSelectedHours([]);
          }
        } catch {
          // secondary refresh failure ignored
        }
        return;
      }

      router.push(`/booking/${json.booking.id}`);
    } catch (err: unknown) {
      setBookingError(
        err instanceof Error ? err.message : "Terjadi kesalahan koneksi."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="court-grid-block card-technical">
      {/* Alert Error / Conflict */}
      {bookingError && (
        <div className="alert-conflict card-technical font-mono text-xs">
          <span className="badge-dot" style={{ backgroundColor: "var(--color-booked)" }} />
          <span>{bookingError}</span>
        </div>
      )}

      {/* Court Subheader */}
      <div className="court-grid-header">
        <div>
          <div className="court-meta-row">
            <span className="sport-chip font-mono">{sportType}</span>
            <span className="font-mono text-xs text-muted">
              TARIF REGULER: RP {data ? data.basePricePerHour.toLocaleString("id-ID") : "..."}/JAM
            </span>
          </div>
          <h3 className="court-title">{courtName}</h3>
        </div>

        {/* Legend */}
        <div className="grid-legend font-mono">
          <span className="legend-item">
            <span className="legend-box legend-avail" /> KOSONG
          </span>
          <span className="legend-item">
            <span className="legend-box legend-selected" /> DIPILIH
          </span>
          <span className="legend-item">
            <span className="legend-box legend-held" /> HOLD (15M)
          </span>
          <span className="legend-item">
            <span className="legend-box legend-booked" /> DIPESAN
          </span>
          <span className="legend-item">
            <span className="legend-box legend-blocked" /> MAINTENANCE
          </span>
        </div>
      </div>

      {/* Slots Matrix */}
      {isPending ? (
        <div className="slots-loading font-mono text-xs">
          <span className="spinner-sm" /> MEMUAT STATUS SLOT TERKINI...
        </div>
      ) : error ? (
        <div className="alert alert-error font-mono text-xs">{error}</div>
      ) : !data ? (
        <div className="font-mono text-xs text-muted">Data jadwal tidak tersedia.</div>
      ) : (
        <div className="slots-grid">
          {data.slots.map((slot) => {
            const isSelected = selectedHours.includes(slot.hour);

            let slotClass = "slot-available";
            let statusText = `Rp ${(slot.price / 1000).toFixed(0)}k`;

            if (slot.status === "PAST") {
              slotClass = "slot-past";
              statusText = "LEWAT";
            } else if (slot.status === "BOOKED") {
              slotClass = "slot-booked";
              statusText = "DIPESAN";
            } else if (slot.status === "HELD") {
              slotClass = "slot-held";
              statusText = "HOLD";
            } else if (slot.status === "BLOCKED") {
              slotClass = "slot-blocked";
              statusText = "BLOK";
            } else if (isSelected) {
              slotClass = "slot-selected";
            }

            return (
              <button
                key={slot.hour}
                type="button"
                disabled={slot.status !== "AVAILABLE"}
                onClick={() => toggleSlot(slot)}
                title={
                  slot.blockedReason
                    ? `Alasan: ${slot.blockedReason}`
                    : slot.status === "HELD"
                    ? "Sedang di-hold pembayaran (15 menit)"
                    : `${slot.startTime} - ${slot.endTime}`
                }
                className={`slot-cell font-mono ${slotClass}`}
              >
                <span className="slot-time">{slot.startTime}</span>
                <span className="slot-status-text">{statusText}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selection Action Bar (Appears when 1+ slot is selected) */}
      {selectedHours.length > 0 && (
        <div className="selection-bar animate-fadeIn">
          <div className="selection-info">
            <span className="tech-label text-accent">
              {selectedHours.length} JAM TERPILIH // BERURUTAN
            </span>
            <p className="selection-summary font-mono">
              {startFormatted} – {endFormatted} WIB •{" "}
              <span className="text-accent font-bold">
                Rp {totalPrice.toLocaleString("id-ID")}
              </span>
            </p>
          </div>

          <div className="selection-actions">
            <button
              onClick={() => setSelectedHours([])}
              disabled={isSubmitting}
              className="btn btn-ghost btn-sm font-mono"
            >
              BATAL
            </button>
            <button
              onClick={handleCreateBooking}
              disabled={isSubmitting}
              className="btn btn-primary btn-sm font-mono"
            >
              {isSubmitting ? "MEMPROSES..." : "LANJUTKAN BOOKING →"}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .court-grid-block {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .alert-conflict {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #f87171;
          border-radius: var(--radius-xs);
        }

        .court-grid-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--color-border);
        }

        .court-meta-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .sport-chip {
          font-size: 0.625rem;
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-xs);
          background-color: var(--color-surface-elevated);
          border: 1px solid var(--color-border-pitch);
          color: var(--color-accent);
          letter-spacing: 0.05em;
        }

        .court-title {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .grid-legend {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          font-size: 0.6875rem;
          color: var(--color-text-secondary);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .legend-box {
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }

        .legend-avail {
          border: 1px solid var(--color-border-pitch);
          background: var(--color-surface);
        }
        .legend-selected {
          background: var(--color-accent);
        }
        .legend-held {
          background: var(--color-held);
        }
        .legend-booked {
          background: var(--color-booked);
        }
        .legend-blocked {
          background: var(--color-blocked);
        }

        /* Slots Grid */
        .slots-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
          gap: 0.5rem;
        }

        .slot-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.625rem 0.25rem;
          border-radius: var(--radius-xs);
          border: 1px solid var(--color-border);
          background-color: var(--color-surface);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .slot-time {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--color-text);
          line-height: 1.2;
        }

        .slot-status-text {
          font-size: 0.625rem;
          color: var(--color-text-muted);
          margin-top: 0.15rem;
        }

        /* Available */
        .slot-available:hover {
          border-color: var(--color-accent);
          background-color: var(--color-accent-subtle);
        }
        .slot-available:hover .slot-status-text {
          color: var(--color-accent);
        }

        /* Selected */
        .slot-selected {
          background-color: var(--color-accent) !important;
          border-color: var(--color-accent) !important;
        }
        .slot-selected .slot-time,
        .slot-selected .slot-status-text {
          color: var(--color-accent-contrast) !important;
          font-weight: 800;
        }

        /* Past */
        .slot-past {
          opacity: 0.35;
          cursor: not-allowed;
          background-color: transparent;
        }

        /* Booked */
        .slot-booked {
          background-color: rgba(248, 113, 113, 0.12);
          border-color: rgba(248, 113, 113, 0.3);
          cursor: not-allowed;
        }
        .slot-booked .slot-time,
        .slot-booked .slot-status-text {
          color: var(--color-booked);
        }

        /* Held */
        .slot-held {
          background-color: rgba(251, 191, 36, 0.12);
          border-color: rgba(251, 191, 36, 0.3);
          cursor: not-allowed;
        }
        .slot-held .slot-time,
        .slot-held .slot-status-text {
          color: var(--color-held);
        }

        /* Blocked */
        .slot-blocked {
          background-color: rgba(100, 116, 139, 0.12);
          border-color: rgba(100, 116, 139, 0.3);
          cursor: not-allowed;
        }
        .slot-blocked .slot-time,
        .slot-blocked .slot-status-text {
          color: var(--color-blocked);
        }

        .slots-loading {
          padding: 2rem 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--color-text-secondary);
        }

        /* Selection Bar */
        .selection-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          background-color: var(--color-surface-elevated);
          border: 1px solid var(--color-border-pitch);
          border-radius: var(--radius-xs);
          flex-wrap: wrap;
          gap: 1rem;
        }

        .selection-summary {
          font-size: 0.875rem;
          margin-top: 0.15rem;
        }

        .selection-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
}
