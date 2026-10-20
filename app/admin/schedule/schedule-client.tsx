"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/utils";
import type { SportType } from "@prisma/client";

export interface ScheduleCourt {
  id: string;
  name: string;
  sportType: SportType;
  pricePerHour: number;
}

export interface ScheduleVenue {
  id: string;
  name: string;
  city: string;
  openTime: number;
  closeTime: number;
  courts: ScheduleCourt[];
}

export interface AdminSlot {
  hour: number;
  startTime: string;
  endTime: string;
  price: number;
  status: "AVAILABLE" | "BOOKED" | "HELD" | "BLOCKED";
  blocked: {
    id: string;
    reason: string;
    startTime: number;
    endTime: number;
  } | null;
  booking: {
    id: string;
    orderId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    status: string;
    paymentStatus: string;
    totalPrice: number;
    holdExpiresAt?: string;
  } | null;
}

interface AdminScheduleClientProps {
  venues: ScheduleVenue[];
  defaultDate: string;
}

export function AdminScheduleClient({
  venues,
  defaultDate,
}: AdminScheduleClientProps) {
  const [selectedVenueId, setSelectedVenueId] = useState<string>(
    venues[0]?.id || ""
  );
  const activeVenue = venues.find((v) => v.id === selectedVenueId) || venues[0];

  const [selectedCourtId, setSelectedCourtId] = useState<string>(
    activeVenue?.courts[0]?.id || ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);

  const [slots, setSlots] = useState<AdminSlot[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal State for Blocking
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockData, setBlockData] = useState({
    startHour: 8,
    endHour: 10,
    reason: "Perawatan Rutin Lapangan",
  });
  const [actionLoading, setActionLoading] = useState(false);

  // Modal State for Booking Detail
  const [detailModalBooking, setDetailModalBooking] = useState<
    AdminSlot["booking"] | null
  >(null);

  // Synchronize court when venue changes
  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId);
    const v = venues.find((item) => item.id === venueId);
    if (v && v.courts.length > 0) {
      setSelectedCourtId(v.courts[0].id);
    } else {
      setSelectedCourtId("");
    }
  };

  const fetchSchedule = useCallback(
    async (courtId: string, date: string) => {
      if (!courtId || !date) return;
      setLoadingSchedule(true);
      setFeedback(null);
      try {
        const res = await fetch(
          `/api/admin/schedule?courtId=${encodeURIComponent(
            courtId
          )}&date=${encodeURIComponent(date)}`
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setSlots(data.slots || []);
        } else {
          setFeedback({
            type: "error",
            message: data.message || "Gagal memuat data jadwal.",
          });
        }
      } catch (err: unknown) {
        const error = err as { message?: string };
        setFeedback({
          type: "error",
          message: error.message || "Terjadi kesalahan jaringan.",
        });
      } finally {
        setLoadingSchedule(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedCourtId && selectedDate) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchSchedule(selectedCourtId, selectedDate);
    }
  }, [selectedCourtId, selectedDate, fetchSchedule]);

  // Quick Date Helpers
  const getOffsetDate = (offsetDays: number) => {
    const now = new Date();
    const target = new Date(now.getTime() + offsetDays * 86400000);
    // Convert to UTC+7 string
    const utcMs = target.getTime() + target.getTimezoneOffset() * 60000;
    const jkt = new Date(utcMs + 7 * 3600000);
    const y = jkt.getUTCFullYear();
    const m = String(jkt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(jkt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const todayStr = getOffsetDate(0);
  const tomorrowStr = getOffsetDate(1);
  const dayAfterTomorrowStr = getOffsetDate(2);

  // Open Block Modal for single slot
  const handleOpenBlockSingle = (hour: number) => {
    setBlockData({
      startHour: hour,
      endHour: hour + 1,
      reason: "Perawatan Rutin Lapangan",
    });
    setBlockModalOpen(true);
  };

  // Submit Block Slot
  const handleBlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourtId || !selectedDate) return;
    setActionLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/schedule/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: selectedCourtId,
          date: selectedDate,
          startHour: Number(blockData.startHour),
          endHour: Number(blockData.endHour),
          reason: blockData.reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal memblokir slot.");
      }

      setFeedback({
        type: "success",
        message: data.message || "Slot berhasil diblokir.",
      });
      setBlockModalOpen(false);
      fetchSchedule(selectedCourtId, selectedDate);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setFeedback({
        type: "error",
        message: error.message || "Gagal memblokir slot.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Unblock Slot
  const handleUnblock = async (blockedId: string) => {
    if (
      !confirm(
        "Buka kembali slot ini agar dapat dipesan oleh pelanggan umum?"
      )
    ) {
      return;
    }

    setActionLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/schedule/unblock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: blockedId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal membuka blokir slot.");
      }

      setFeedback({
        type: "success",
        message: data.message || "Blokir slot berhasil dibuka.",
      });
      fetchSchedule(selectedCourtId, selectedDate);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setFeedback({
        type: "error",
        message: error.message || "Gagal membuka blokir slot.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const activeCourt = activeVenue?.courts.find(
    (c) => c.id === selectedCourtId
  );

  return (
    <div className="admin-schedule-container space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1f2e22] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ccff00]"></span>
            <span className="font-mono text-xs uppercase tracking-wider text-[#ccff00]">
              TIMETABLE & AVAILABILITY OVERRIDE
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-mono">
            KALENDER & BLOKIR SLOT
          </h1>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Atur ketersediaan jam bermain per lapangan, tutup slot sementara untuk turnamen atau maintenance berkala, dan lihat booking aktif.
          </p>
        </div>

        <button
          onClick={() => {
            setBlockData({
              startHour: activeVenue?.openTime || 8,
              endHour: Math.min((activeVenue?.openTime || 8) + 2, activeVenue?.closeTime || 22),
              reason: "Turnamen & Reservasi Khusus",
            });
            setBlockModalOpen(true);
          }}
          className="btn-accent px-4 py-2.5 text-xs font-mono font-bold tracking-wider flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          + BLOKIR RANGE JAM
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-sm border font-mono text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-[#0f2415] border-[#22c55e] text-[#86efac]"
              : "bg-[#291114] border-[#ef4444] text-[#fca5a5]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{feedback.type === "success" ? "✓" : "⚠"}</span>
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-neutral-400 hover:text-white ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter / Selector Panel */}
      <div className="bg-[#0b120c] border border-[#1f2e22] p-4 md:p-5 rounded-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Venue Selector */}
          <div>
            <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5">
              PILIH VENUE
            </label>
            <select
              value={selectedVenueId}
              onChange={(e) => handleVenueChange(e.target.value)}
              className="w-full bg-[#121c14] border border-[#233527] text-white text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#ccff00] font-mono"
            >
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.city})
                </option>
              ))}
            </select>
          </div>

          {/* Court Selector */}
          <div>
            <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5">
              PILIH LAPANGAN ({activeVenue?.courts.length || 0} TERSEDIA)
            </label>
            <select
              value={selectedCourtId}
              onChange={(e) => setSelectedCourtId(e.target.value)}
              className="w-full bg-[#121c14] border border-[#233527] text-white text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#ccff00] font-mono"
            >
              {activeVenue?.courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — [{c.sportType}] (Rp {c.pricePerHour.toLocaleString("id-ID")}/jam)
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-xs font-mono uppercase text-neutral-400 mb-1.5">
              TANGGAL JADWAL
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 bg-[#121c14] border border-[#233527] text-white text-sm px-3 py-2.5 rounded-sm focus:outline-none focus:border-[#ccff00] font-mono"
              />
            </div>
          </div>
        </div>

        {/* Quick Date Buttons & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#18241a]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-neutral-400">PINTASAN:</span>
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1 text-xs font-mono rounded-sm border cursor-pointer transition ${
                selectedDate === todayStr
                  ? "bg-[#ccff00] text-black border-[#ccff00] font-bold"
                  : "bg-[#142017] text-neutral-300 border-[#233527] hover:border-neutral-500"
              }`}
            >
              HARI INI
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-3 py-1 text-xs font-mono rounded-sm border cursor-pointer transition ${
                selectedDate === tomorrowStr
                  ? "bg-[#ccff00] text-black border-[#ccff00] font-bold"
                  : "bg-[#142017] text-neutral-300 border-[#233527] hover:border-neutral-500"
              }`}
            >
              BESOK
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(dayAfterTomorrowStr)}
              className={`px-3 py-1 text-xs font-mono rounded-sm border cursor-pointer transition ${
                selectedDate === dayAfterTomorrowStr
                  ? "bg-[#ccff00] text-black border-[#ccff00] font-bold"
                  : "bg-[#142017] text-neutral-300 border-[#233527] hover:border-neutral-500"
              }`}
            >
              LUSA
            </button>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs border border-[#ccff00] bg-[#142918]"></span>
              <span className="text-neutral-300">TERSEDIA</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#22c55e]"></span>
              <span className="text-neutral-300">BOOKED (LUNAS)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#eab308]"></span>
              <span className="text-neutral-300">HELD (MENUNGGU)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#ef4444]"></span>
              <span className="text-neutral-300">DITUTUP (BLOCKED)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Information Header on Active Selection */}
      {activeCourt && (
        <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0a120b] border border-[#1b2b1e] px-4 py-3 rounded-sm">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-[#142918] text-[#ccff00] border border-[#ccff00]/40 rounded-xs">
              {activeCourt.sportType}
            </span>
            <div>
              <span className="text-sm font-bold text-white font-mono">
                {activeCourt.name}
              </span>
              <span className="text-xs text-neutral-400 font-mono ml-2">
                @ {activeVenue?.name} ({activeVenue?.city})
              </span>
            </div>
          </div>
          <div className="text-xs font-mono text-neutral-300">
            Jam Operasional:{" "}
            <span className="text-white font-bold">
              {String(activeVenue?.openTime).padStart(2, "0")}:00 —{" "}
              {String(activeVenue?.closeTime).padStart(2, "0")}:00 WIB
            </span>
          </div>
        </div>
      )}

      {/* Time Slots Grid */}
      {loadingSchedule ? (
        <div className="p-12 text-center bg-[#0a120b] border border-[#1b2b1e] rounded-sm">
          <div className="animate-spin inline-block w-8 h-8 border-2 border-[#ccff00] border-t-transparent rounded-full mb-3"></div>
          <p className="font-mono text-sm text-neutral-400">
            Memuat slot jadwal lapangan...
          </p>
        </div>
      ) : slots.length === 0 ? (
        <div className="p-12 text-center bg-[#0a120b] border border-[#1b2b1e] rounded-sm">
          <p className="font-mono text-sm text-neutral-400">
            Tidak ada jam operasional yang ditemukan untuk lapangan ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {slots.map((slot) => {
            const isBlocked = slot.status === "BLOCKED";
            const isBooked = slot.status === "BOOKED";
            const isHeld = slot.status === "HELD";
            const isAvailable = slot.status === "AVAILABLE";

            return (
              <div
                key={slot.hour}
                className={`p-4 rounded-sm border transition-all flex flex-col justify-between min-h-[148px] relative ${
                  isBlocked
                    ? "bg-[#1a0f11] border-[#ef4444]/60"
                    : isBooked
                    ? "bg-[#0c1c11] border-[#22c55e]/50"
                    : isHeld
                    ? "bg-[#1c1a0c] border-[#eab308]/60"
                    : "bg-[#0b140d] border-[#1e3022] hover:border-[#ccff00]"
                }`}
              >
                {/* Slot Top Bar */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-base text-white tracking-wide">
                    {slot.startTime} - {slot.endTime}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs uppercase tracking-wider ${
                      isBlocked
                        ? "bg-[#ef4444] text-white"
                        : isBooked
                        ? "bg-[#22c55e] text-black"
                        : isHeld
                        ? "bg-[#eab308] text-black"
                        : "bg-[#1b2b1e] text-[#ccff00] border border-[#ccff00]/40"
                    }`}
                  >
                    {isBlocked
                      ? "DITUTUP"
                      : isBooked
                      ? "CONFIRMED"
                      : isHeld
                      ? "HELD"
                      : "TERSEDIA"}
                  </span>
                </div>

                {/* Slot Content Body */}
                <div className="my-auto py-1">
                  {isAvailable && (
                    <div className="text-xs font-mono text-neutral-400">
                      Tarif per Jam:{" "}
                      <span className="text-[#ccff00] font-bold">
                        {formatRupiah(slot.price)}
                      </span>
                    </div>
                  )}

                  {isBlocked && (
                    <div>
                      <div className="text-[11px] font-mono text-[#fca5a5] font-semibold line-clamp-2">
                        {slot.blocked?.reason || "Ditutup untuk pemeliharaan"}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        Dibatasi oleh Admin
                      </div>
                    </div>
                  )}

                  {isBooked && slot.booking && (
                    <div>
                      <div className="text-xs font-mono font-bold text-white truncate">
                        {slot.booking.customerName}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-400 truncate">
                        Order #{slot.booking.orderId}
                      </div>
                      <div className="text-[10px] font-mono text-[#86efac]">
                        {formatRupiah(slot.booking.totalPrice)} • {slot.booking.paymentStatus}
                      </div>
                    </div>
                  )}

                  {isHeld && slot.booking && (
                    <div>
                      <div className="text-xs font-mono font-bold text-white truncate">
                        {slot.booking.customerName}
                      </div>
                      <div className="text-[11px] font-mono text-[#fde047] truncate">
                        Hold 15 menit (Belum Bayar)
                      </div>
                    </div>
                  )}
                </div>

                {/* Slot Bottom Action */}
                <div className="pt-2 border-t border-neutral-800/60 mt-2 flex items-center justify-between">
                  {isAvailable && (
                    <button
                      type="button"
                      onClick={() => handleOpenBlockSingle(slot.hour)}
                      className="w-full text-center py-1 text-xs font-mono text-neutral-300 hover:text-[#ccff00] bg-[#142116] hover:bg-[#1a2d1d] border border-[#233527] rounded-xs cursor-pointer transition"
                    >
                      + BLOKIR JAM INI
                    </button>
                  )}

                  {isBlocked && slot.blocked && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleUnblock(slot.blocked!.id)}
                      className="w-full text-center py-1 text-xs font-mono font-bold text-[#ef4444] hover:text-white bg-[#2e1518] hover:bg-[#ef4444] border border-[#ef4444]/40 rounded-xs cursor-pointer transition disabled:opacity-50"
                    >
                      BUKA BLOKIR (UNBLOCK)
                    </button>
                  )}

                  {(isBooked || isHeld) && slot.booking && (
                    <button
                      type="button"
                      onClick={() => setDetailModalBooking(slot.booking)}
                      className="w-full text-center py-1 text-xs font-mono text-neutral-300 hover:text-white bg-[#142017] hover:bg-[#1f3324] border border-[#233527] rounded-xs cursor-pointer transition"
                    >
                      LIHAT DETAIL CUSTOMER
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: BLOKIR SLOT RANGE */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0e1610] border border-[#2a402f] rounded-sm p-6 w-full max-w-md shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[#1f2e22] pb-3">
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <span className="text-[#ccff00]">■</span> BLOKIR SLOT LAPANGAN
              </h2>
              <button
                onClick={() => setBlockModalOpen(false)}
                className="text-neutral-400 hover:text-white font-mono text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBlockSubmit} className="space-y-4">
              <div className="p-3 bg-[#131d15] border border-[#223326] rounded-xs text-xs font-mono space-y-1">
                <div>
                  <span className="text-neutral-400">Lapangan:</span>{" "}
                  <span className="text-white font-bold">{activeCourt?.name}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Tanggal:</span>{" "}
                  <span className="text-[#ccff00] font-bold">{selectedDate}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                    JAM MULAI
                  </label>
                  <select
                    value={blockData.startHour}
                    onChange={(e) =>
                      setBlockData({
                        ...blockData,
                        startHour: Number(e.target.value),
                        endHour: Math.max(
                          Number(e.target.value) + 1,
                          blockData.endHour
                        ),
                      })
                    }
                    className="w-full bg-[#121c14] border border-[#233527] text-white text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-[#ccff00] font-mono"
                  >
                    {Array.from({ length: 24 }).map((_, h) => {
                      if (
                        activeVenue &&
                        (h < activeVenue.openTime || h >= activeVenue.closeTime)
                      ) {
                        return null;
                      }
                      return (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                    JAM SELESAI
                  </label>
                  <select
                    value={blockData.endHour}
                    onChange={(e) =>
                      setBlockData({
                        ...blockData,
                        endHour: Number(e.target.value),
                      })
                    }
                    className="w-full bg-[#121c14] border border-[#233527] text-white text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-[#ccff00] font-mono"
                  >
                    {Array.from({ length: 25 }).map((_, h) => {
                      if (
                        activeVenue &&
                        (h <= activeVenue.openTime || h > activeVenue.closeTime)
                      ) {
                        return null;
                      }
                      if (h <= blockData.startHour) return null;
                      return (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-neutral-400 mb-1">
                  ALASAN PENUTUPAN / KEPERLUAN
                </label>
                <input
                  type="text"
                  required
                  value={blockData.reason}
                  onChange={(e) =>
                    setBlockData({ ...blockData, reason: e.target.value })
                  }
                  placeholder="Mis: Maintenance Rumput Sintetis, Turnamen Internal"
                  className="w-full bg-[#121c14] border border-[#233527] text-white text-sm px-3 py-2 rounded-sm focus:outline-none focus:border-[#ccff00] font-mono"
                />
              </div>

              <div className="pt-3 border-t border-[#1f2e22] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setBlockModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-neutral-400 hover:text-white cursor-pointer"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-accent px-5 py-2 text-xs font-mono font-bold tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "MEMPROSES..." : "KONFIRMASI BLOKIR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL BOOKING CUSTOMER */}
      {detailModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0e1610] border border-[#2a402f] rounded-sm p-6 w-full max-w-md shadow-2xl space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-[#1f2e22] pb-3">
              <h2 className="text-lg font-bold font-mono text-white flex items-center gap-2">
                <span className="text-[#22c55e]">●</span> INFORMASI RESERVASI
              </h2>
              <button
                onClick={() => setDetailModalBooking(null)}
                className="text-neutral-400 hover:text-white font-mono text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#18241a]">
                <span className="text-neutral-400">Order ID:</span>
                <span className="text-[#ccff00] font-bold">
                  #{detailModalBooking.orderId}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#18241a]">
                <span className="text-neutral-400">Nama Pelanggan:</span>
                <span className="text-white font-bold">
                  {detailModalBooking.customerName}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#18241a]">
                <span className="text-neutral-400">Email:</span>
                <span className="text-white">{detailModalBooking.customerEmail}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#18241a]">
                <span className="text-neutral-400">Nomor Telepon:</span>
                <span className="text-white">{detailModalBooking.customerPhone}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#18241a]">
                <span className="text-neutral-400">Status Booking:</span>
                <span className="font-bold text-[#86efac]">
                  {detailModalBooking.status}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#18241a]">
                <span className="text-neutral-400">Status Pembayaran:</span>
                <span className="font-bold text-[#ccff00]">
                  {detailModalBooking.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#18241a]">
                <span className="text-neutral-400">Total Biaya:</span>
                <span className="text-white font-bold text-sm">
                  {formatRupiah(detailModalBooking.totalPrice)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1f2e22] flex items-center justify-between">
              <Link
                href="/admin/bookings"
                className="text-xs font-mono text-[#ccff00] hover:underline"
              >
                Buka Menu Kelola Booking →
              </Link>
              <button
                type="button"
                onClick={() => setDetailModalBooking(null)}
                className="px-4 py-2 text-xs font-mono text-neutral-300 bg-[#162419] hover:bg-[#1f3324] border border-[#233527] rounded-xs cursor-pointer"
              >
                TUTUP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
