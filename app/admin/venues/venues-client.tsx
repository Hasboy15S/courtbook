"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { SportType } from "@prisma/client";

export interface SerializedPriceRule {
  id: string;
  courtId: string;
  dayType: "WEEKDAY" | "WEEKEND";
  startHour: number;
  endHour: number;
  pricePerHour: number;
}

export interface SerializedCourt {
  id: string;
  venueId: string;
  name: string;
  sportType: SportType;
  pricePerHour: number;
  description: string | null;
  isActive: boolean;
  priceRules: SerializedPriceRule[];
}

export interface SerializedVenue {
  id: string;
  name: string;
  description: string | null;
  city: string;
  address: string;
  phone: string | null;
  openTime: number;
  closeTime: number;
  facilities: string[];
  photos: string[];
  isActive: boolean;
  courts: SerializedCourt[];
}

interface AdminVenuesClientProps {
  initialVenues: SerializedVenue[];
}

export function AdminVenuesClient({ initialVenues }: AdminVenuesClientProps) {
  const router = useRouter();
  const [venues, setVenues] = useState<SerializedVenue[]>(initialVenues);
  const [expandedVenueId, setExpandedVenueId] = useState<string | null>(
    venues[0]?.id || null
  );

  // Modal States
  const [venueModalOpen, setVenueModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<SerializedVenue | null>(null);
  const [venueFormData, setVenueFormData] = useState({
    name: "",
    city: "",
    address: "",
    phone: "",
    description: "",
    openTime: 6,
    closeTime: 23,
    facilities: "Parkir, Musholla, Toilet, Kantin",
    photos: "",
    isActive: true,
  });

  const [courtModalOpen, setCourtModalOpen] = useState(false);
  const [targetVenueId, setTargetVenueId] = useState<string | null>(null);
  const [editingCourt, setEditingCourt] = useState<SerializedCourt | null>(null);
  const [courtFormData, setCourtFormData] = useState({
    name: "",
    sportType: "FUTSAL" as SportType,
    pricePerHour: 150000,
    description: "",
    isActive: true,
  });

  const [priceRuleModalOpen, setPriceRuleModalOpen] = useState(false);
  const [targetCourtId, setTargetCourtId] = useState<string | null>(null);
  const [priceRuleFormData, setPriceRuleFormData] = useState({
    dayType: "WEEKEND" as "WEEKDAY" | "WEEKEND",
    startHour: 18,
    endHour: 23,
    pricePerHour: 180000,
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- Handlers Venue ---
  const openNewVenueModal = () => {
    setEditingVenue(null);
    setVenueFormData({
      name: "",
      city: "Jakarta Selatan",
      address: "",
      phone: "0812-3456-7890",
      description: "",
      openTime: 6,
      closeTime: 23,
      facilities: "Parkir Luas, Musholla, Shower, Kantin, WiFi",
      photos: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
    });
    setErrorMsg(null);
    setVenueModalOpen(true);
  };

  const openEditVenueModal = (venue: SerializedVenue) => {
    setEditingVenue(venue);
    setVenueFormData({
      name: venue.name,
      city: venue.city,
      address: venue.address,
      phone: venue.phone || "",
      description: venue.description || "",
      openTime: venue.openTime,
      closeTime: venue.closeTime,
      facilities: venue.facilities.join(", "),
      photos: venue.photos.join("\n"),
      isActive: venue.isActive,
    });
    setErrorMsg(null);
    setVenueModalOpen(true);
  };

  const handleSaveVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const facilitiesArr = venueFormData.facilities
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const photosArr = venueFormData.photos
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean);

    const payload = {
      name: venueFormData.name,
      city: venueFormData.city,
      address: venueFormData.address,
      phone: venueFormData.phone || undefined,
      description: venueFormData.description || undefined,
      openTime: Number(venueFormData.openTime),
      closeTime: Number(venueFormData.closeTime),
      facilities: facilitiesArr,
      photos: photosArr.length > 0 ? photosArr : ["https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80"],
      isActive: venueFormData.isActive,
    };

    try {
      const url = editingVenue
        ? `/api/admin/venues/${editingVenue.id}`
        : `/api/admin/venues`;
      const method = editingVenue ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menyimpan venue.");
      }

      setVenueModalOpen(false);
      router.refresh();

      // Refresh list
      const freshRes = await fetch("/api/admin/venues");
      const freshData = await freshRes.json();
      if (freshData.success) {
        setVenues(freshData.venues);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVenue = async (venueId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus/menonaktifkan venue ini?")) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/venues/${venueId}`, { method: "DELETE" });
      const data = await res.json();
      alert(data.message || "Venue berhasil diproses.");

      const freshRes = await fetch("/api/admin/venues");
      const freshData = await freshRes.json();
      if (freshData.success) {
        setVenues(freshData.venues);
      }
    } catch {
      alert("Gagal menghapus venue.");
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers Court ---
  const openNewCourtModal = (venueId: string) => {
    setTargetVenueId(venueId);
    setEditingCourt(null);
    setCourtFormData({
      name: "",
      sportType: "FUTSAL",
      pricePerHour: 150000,
      description: "Permukaan vinyl berstandar kompetisi dengan pencahayaan LED terang.",
      isActive: true,
    });
    setErrorMsg(null);
    setCourtModalOpen(true);
  };

  const openEditCourtModal = (court: SerializedCourt) => {
    setTargetVenueId(court.venueId);
    setEditingCourt(court);
    setCourtFormData({
      name: court.name,
      sportType: court.sportType,
      pricePerHour: court.pricePerHour,
      description: court.description || "",
      isActive: court.isActive,
    });
    setErrorMsg(null);
    setCourtModalOpen(true);
  };

  const handleSaveCourt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetVenueId) return;
    setLoading(true);
    setErrorMsg(null);

    const payload = {
      venueId: targetVenueId,
      name: courtFormData.name,
      sportType: courtFormData.sportType,
      pricePerHour: Number(courtFormData.pricePerHour),
      description: courtFormData.description || undefined,
      isActive: courtFormData.isActive,
    };

    try {
      const url = editingCourt
        ? `/api/admin/courts/${editingCourt.id}`
        : `/api/admin/courts`;
      const method = editingCourt ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menyimpan lapangan.");
      }

      setCourtModalOpen(false);
      router.refresh();

      const freshRes = await fetch("/api/admin/venues");
      const freshData = await freshRes.json();
      if (freshData.success) {
        setVenues(freshData.venues);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourt = async (courtId: string) => {
    if (!confirm("Hapus atau nonaktifkan lapangan ini?")) return;
    try {
      const res = await fetch(`/api/admin/courts/${courtId}`, { method: "DELETE" });
      const data = await res.json();
      alert(data.message || "Lapangan diproses.");
      const freshRes = await fetch("/api/admin/venues");
      const freshData = await freshRes.json();
      if (freshData.success) setVenues(freshData.venues);
    } catch {
      alert("Gagal memproses lapangan.");
    }
  };

  // --- Handlers Price Rule ---
  const openNewPriceRuleModal = (courtId: string, currentPrice: number) => {
    setTargetCourtId(courtId);
    setPriceRuleFormData({
      dayType: "WEEKEND",
      startHour: 18,
      endHour: 23,
      pricePerHour: Math.round(currentPrice * 1.25),
    });
    setErrorMsg(null);
    setPriceRuleModalOpen(true);
  };

  const handleSavePriceRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCourtId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/admin/price-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: targetCourtId,
          dayType: priceRuleFormData.dayType,
          startHour: Number(priceRuleFormData.startHour),
          endHour: Number(priceRuleFormData.endHour),
          pricePerHour: Number(priceRuleFormData.pricePerHour),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal membuat aturan harga.");
      }

      setPriceRuleModalOpen(false);
      const freshRes = await fetch("/api/admin/venues");
      const freshData = await freshRes.json();
      if (freshData.success) setVenues(freshData.venues);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePriceRule = async (ruleId: string) => {
    if (!confirm("Hapus aturan harga khusus ini?")) return;
    try {
      await fetch(`/api/admin/price-rules/${ruleId}`, { method: "DELETE" });
      const freshRes = await fetch("/api/admin/venues");
      const freshData = await freshRes.json();
      if (freshData.success) setVenues(freshData.venues);
    } catch {
      alert("Gagal menghapus aturan harga.");
    }
  };

  return (
    <div className="container py-8 flex flex-col gap-6">
      {/* Top Action Bar */}
      <div className="flex-between items-center flex-wrap gap-4">
        <div>
          <span className="tech-label text-accent mb-1">MANAJEMEN FASILITAS</span>
          <h1 className="admin-page-title font-mono">KELOLA VENUE & LAPANGAN</h1>
          <p className="font-mono text-xs text-secondary mt-1">
            Konfigurasi lokasi, jam operasional, jenis olahraga, dan aturan harga dinamis (PriceRule).
          </p>
        </div>

        <button
          onClick={openNewVenueModal}
          className="btn btn-primary btn-sm font-mono"
        >
          + TAMBAH VENUE BARU
        </button>
      </div>

      {/* Venues Accordion List */}
      <div className="venues-list flex flex-col gap-6">
        {venues.map((venue) => {
          const isExpanded = expandedVenueId === venue.id;

          return (
            <div key={venue.id} className="venue-card card-technical">
              {/* Venue Header Summary */}
              <div className="venue-header p-5 flex-between items-start flex-wrap gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${venue.isActive ? "badge-volt" : "badge-muted"} font-mono text-[10px]`}>
                      {venue.isActive ? "VENUE AKTIF" : "NONAKTIF"}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      KOTA: <span className="text-primary font-bold">{venue.city}</span>
                    </span>
                    <span className="font-mono text-xs text-muted">
                      OPERASIONAL: <span className="text-accent font-bold">{venue.openTime}:00 – {venue.closeTime}:00 WIB</span>
                    </span>
                  </div>

                  <h2 className="venue-name font-mono">{venue.name}</h2>
                  <p className="font-mono text-xs text-secondary mt-1">{venue.address}</p>

                  {/* Facilities Chips */}
                  <div className="facilities-chips flex flex-wrap gap-1 mt-3">
                    {venue.facilities.map((fac, i) => (
                      <span key={i} className="facility-chip font-mono text-[10px]">
                        ✓ {fac}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Venue Actions */}
                <div className="venue-actions flex items-center gap-2">
                  <button
                    onClick={() => setExpandedVenueId(isExpanded ? null : venue.id)}
                    className="btn btn-secondary btn-sm font-mono text-xs"
                  >
                    {isExpanded ? "TUTUP LAPANGAN ▲" : `LIHAT ${venue.courts.length} LAPANGAN ▼`}
                  </button>
                  <button
                    onClick={() => openNewCourtModal(venue.id)}
                    className="btn btn-primary btn-sm font-mono text-xs"
                  >
                    + LAPANGAN
                  </button>
                  <button
                    onClick={() => openEditVenueModal(venue)}
                    className="btn btn-ghost btn-sm font-mono text-xs"
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => handleDeleteVenue(venue.id)}
                    className="btn btn-ghost btn-sm font-mono text-xs text-booked"
                  >
                    HAPUS
                  </button>
                </div>
              </div>

              {/* Courts Sub-Section (When Expanded) */}
              {isExpanded && (
                <div className="courts-section p-5 pt-0 border-t border-[var(--color-border)] mt-2">
                  <div className="flex-between items-center my-3">
                    <span className="tech-label text-accent">
                      DAFTAR LAPANGAN DI {venue.name.toUpperCase()} ({venue.courts.length})
                    </span>
                  </div>

                  {venue.courts.length === 0 ? (
                    <div className="card-technical p-4 text-center font-mono text-xs text-muted">
                      Belum ada lapangan yang terdaftar di venue ini. Klik tombol &quot;+ LAPANGAN&quot; untuk menambahkan.
                    </div>
                  ) : (
                    <div className="courts-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                      {venue.courts.map((court) => (
                        <div key={court.id} className="court-item-card card-technical p-4 flex flex-col justify-between gap-3">
                          <div>
                            <div className="flex-between items-center mb-1">
                              <span className="sport-chip font-mono text-accent">
                                {court.sportType}
                              </span>
                              <span className={`badge ${court.isActive ? "badge-volt" : "badge-muted"} text-[10px]`}>
                                {court.isActive ? "AKTIF" : "OFF"}
                              </span>
                            </div>

                            <h3 className="court-item-name font-mono">{court.name}</h3>
                            <div className="font-mono text-xs text-primary font-bold mt-1">
                              Tarif Dasar: <span className="text-accent">Rp {court.pricePerHour.toLocaleString("id-ID")}/jam</span>
                            </div>
                            {court.description && (
                              <p className="font-mono text-[11px] text-muted mt-1">
                                {court.description}
                              </p>
                            )}

                            {/* Price Rules List */}
                            <div className="price-rules-wrap mt-3 pt-3 border-t border-[var(--color-border)]">
                              <span className="tech-label text-[10px] text-secondary mb-1 block">
                                ATURAN HARGA KHUSUS (PRICE RULES):
                              </span>

                              {court.priceRules.length === 0 ? (
                                <span className="font-mono text-[11px] text-muted block italic">
                                  Menggunakan tarif flat standar setiap hari.
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1 mt-1">
                                  {court.priceRules.map((rule) => (
                                    <div key={rule.id} className="price-rule-item font-mono text-[11px] flex-between items-center">
                                      <span>
                                        {rule.dayType} ({rule.startHour}:00 - {rule.endHour}:00) →{" "}
                                        <span className="text-accent font-bold">
                                          Rp {rule.pricePerHour.toLocaleString("id-ID")}
                                        </span>
                                      </span>
                                      <button
                                        onClick={() => handleDeletePriceRule(rule.id)}
                                        className="text-booked hover:underline ml-2"
                                        title="Hapus aturan harga ini"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Court Action Buttons */}
                          <div className="court-item-actions flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                            <button
                              onClick={() => openNewPriceRuleModal(court.id, court.pricePerHour)}
                              className="btn btn-ghost btn-sm text-[10px] font-mono py-1 px-2 text-accent"
                            >
                              + ATURAN HARGA
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditCourtModal(court)}
                                className="btn btn-ghost btn-sm text-[10px] font-mono py-1 px-2"
                              >
                                EDIT
                              </button>
                              <button
                                onClick={() => handleDeleteCourt(court.id)}
                                className="btn btn-ghost btn-sm text-[10px] font-mono text-booked py-1 px-2"
                              >
                                HAPUS
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL VENUE (CREATE / EDIT) */}
      {venueModalOpen && (
        <div className="modal-backdrop animate-fadeIn">
          <div className="modal-card card-technical max-w-lg">
            <div className="modal-header">
              <span className="badge-dot badge-dot-live" />
              <h3 className="modal-title font-mono">
                {editingVenue ? "EDIT INFORMASI VENUE" : "TAMBAH VENUE BARU"}
              </h3>
            </div>

            {errorMsg && (
              <div className="modal-error font-mono text-xs text-booked">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveVenue} className="flex flex-col gap-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted block mb-1">Nama Venue:</label>
                  <input
                    type="text"
                    required
                    value={venueFormData.name}
                    onChange={(e) => setVenueFormData({ ...venueFormData, name: e.target.value })}
                    className="modal-input w-full"
                    placeholder="Contoh: Arena Sport Center"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-1">Kota:</label>
                  <input
                    type="text"
                    required
                    value={venueFormData.city}
                    onChange={(e) => setVenueFormData({ ...venueFormData, city: e.target.value })}
                    className="modal-input w-full"
                    placeholder="Contoh: Jakarta Selatan"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted block mb-1">Alamat Lengkap:</label>
                <input
                  type="text"
                  required
                  value={venueFormData.address}
                  onChange={(e) => setVenueFormData({ ...venueFormData, address: e.target.value })}
                  className="modal-input w-full"
                  placeholder="Jl. Lapangan Olahraga No. 12"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-muted block mb-1">Telepon:</label>
                  <input
                    type="text"
                    value={venueFormData.phone}
                    onChange={(e) => setVenueFormData({ ...venueFormData, phone: e.target.value })}
                    className="modal-input w-full"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-1">Buka (Jam WIB):</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={venueFormData.openTime}
                    onChange={(e) => setVenueFormData({ ...venueFormData, openTime: Number(e.target.value) })}
                    className="modal-input w-full"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-1">Tutup (Jam WIB):</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={venueFormData.closeTime}
                    onChange={(e) => setVenueFormData({ ...venueFormData, closeTime: Number(e.target.value) })}
                    className="modal-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted block mb-1">Fasilitas (Pisahkan koma):</label>
                <input
                  type="text"
                  value={venueFormData.facilities}
                  onChange={(e) => setVenueFormData({ ...venueFormData, facilities: e.target.value })}
                  className="modal-input w-full"
                  placeholder="Parkir, Musholla, Kantin, Shower"
                />
              </div>

              <div>
                <label className="text-muted block mb-1">URL Foto (1 baris per URL):</label>
                <textarea
                  rows={2}
                  value={venueFormData.photos}
                  onChange={(e) => setVenueFormData({ ...venueFormData, photos: e.target.value })}
                  className="modal-textarea w-full"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="venue-active-check"
                  checked={venueFormData.isActive}
                  onChange={(e) => setVenueFormData({ ...venueFormData, isActive: e.target.checked })}
                />
                <label htmlFor="venue-active-check" className="text-primary cursor-pointer">
                  Venue Aktif (Terlihat & Dapat Dipesan Publik)
                </label>
              </div>

              <div className="modal-actions flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setVenueModalOpen(false)}
                  className="btn btn-ghost btn-sm font-mono text-xs"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-sm font-mono text-xs"
                >
                  {loading ? "MENYIMPAN..." : "SIMPAN VENUE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COURT (CREATE / EDIT) */}
      {courtModalOpen && (
        <div className="modal-backdrop animate-fadeIn">
          <div className="modal-card card-technical max-w-md">
            <div className="modal-header">
              <span className="badge-dot badge-dot-live" />
              <h3 className="modal-title font-mono">
                {editingCourt ? "EDIT LAPANGAN" : "TAMBAH LAPANGAN BARU"}
              </h3>
            </div>

            {errorMsg && (
              <div className="modal-error font-mono text-xs text-booked">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveCourt} className="flex flex-col gap-3 font-mono text-xs">
              <div>
                <label className="text-muted block mb-1">Nama Lapangan:</label>
                <input
                  type="text"
                  required
                  value={courtFormData.name}
                  onChange={(e) => setCourtFormData({ ...courtFormData, name: e.target.value })}
                  className="modal-input w-full"
                  placeholder="Contoh: Lapangan Futsal Vinyl B"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted block mb-1">Cabang Olahraga:</label>
                  <select
                    value={courtFormData.sportType}
                    onChange={(e) => setCourtFormData({ ...courtFormData, sportType: e.target.value as SportType })}
                    className="modal-select w-full"
                  >
                    <option value="FUTSAL">FUTSAL</option>
                    <option value="BADMINTON">BADMINTON</option>
                    <option value="TENNIS">TENIS</option>
                    <option value="BASKETBALL">BASKET</option>
                    <option value="GOLF">GOLF</option>
                    <option value="PADEL">PADEL</option>
                    <option value="MINI_SOCCER">MINI SOCCER</option>
                    <option value="VOLLEYBALL">BOLA VOLI</option>
                    <option value="TABLE_TENNIS">TENIS MEJA</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted block mb-1">Tarif Standar / Jam (Rp):</label>
                  <input
                    type="number"
                    step="1000"
                    min="10000"
                    required
                    value={courtFormData.pricePerHour}
                    onChange={(e) => setCourtFormData({ ...courtFormData, pricePerHour: Number(e.target.value) })}
                    className="modal-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted block mb-1">Deskripsi Spesifikasi:</label>
                <textarea
                  rows={2}
                  value={courtFormData.description}
                  onChange={(e) => setCourtFormData({ ...courtFormData, description: e.target.value })}
                  className="modal-textarea w-full"
                  placeholder="Jenis lantai, karpet PBSI, jaring, dll..."
                />
              </div>

              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="court-active-check"
                  checked={courtFormData.isActive}
                  onChange={(e) => setCourtFormData({ ...courtFormData, isActive: e.target.checked })}
                />
                <label htmlFor="court-active-check" className="text-primary cursor-pointer">
                  Lapangan Aktif
                </label>
              </div>

              <div className="modal-actions flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setCourtModalOpen(false)}
                  className="btn btn-ghost btn-sm font-mono text-xs"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-sm font-mono text-xs"
                >
                  {loading ? "MENYIMPAN..." : "SIMPAN LAPANGAN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRICE RULE (ADD) */}
      {priceRuleModalOpen && (
        <div className="modal-backdrop animate-fadeIn">
          <div className="modal-card card-technical max-w-sm">
            <div className="modal-header">
              <span className="badge-dot badge-dot-live" />
              <h3 className="modal-title font-mono">TAMBAH ATURAN HARGA DINAMIS</h3>
            </div>

            {errorMsg && (
              <div className="modal-error font-mono text-xs text-booked">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSavePriceRule} className="flex flex-col gap-3 font-mono text-xs">
              <div>
                <label className="text-muted block mb-1">Tipe Hari:</label>
                <select
                  value={priceRuleFormData.dayType}
                  onChange={(e) => setPriceRuleFormData({ ...priceRuleFormData, dayType: e.target.value as "WEEKDAY" | "WEEKEND" })}
                  className="modal-select w-full"
                >
                  <option value="WEEKEND">WEEKEND (Sabtu & Minggu)</option>
                  <option value="WEEKDAY">WEEKDAY (Senin - Jumat)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted block mb-1">Mulai Jam (WIB):</label>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    required
                    value={priceRuleFormData.startHour}
                    onChange={(e) => setPriceRuleFormData({ ...priceRuleFormData, startHour: Number(e.target.value) })}
                    className="modal-input w-full"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-1">Selesai Jam (WIB):</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    required
                    value={priceRuleFormData.endHour}
                    onChange={(e) => setPriceRuleFormData({ ...priceRuleFormData, endHour: Number(e.target.value) })}
                    className="modal-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-muted block mb-1">Tarif Khusus / Jam (Rp):</label>
                <input
                  type="number"
                  step="1000"
                  min="10000"
                  required
                  value={priceRuleFormData.pricePerHour}
                  onChange={(e) => setPriceRuleFormData({ ...priceRuleFormData, pricePerHour: Number(e.target.value) })}
                  className="modal-input w-full"
                />
              </div>

              <div className="modal-actions flex justify-end gap-2 mt-4 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => setPriceRuleModalOpen(false)}
                  className="btn btn-ghost btn-sm font-mono text-xs"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-sm font-mono text-xs"
                >
                  {loading ? "MENYIMPAN..." : "TAMBAH ATURAN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mt-1 { margin-top: 0.25rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-3 { margin-top: 0.75rem; }
        .mt-4 { margin-top: 1rem; }
        .my-3 { margin-top: 0.75rem; margin-bottom: 0.75rem; }
        .pt-0 { padding-top: 0; }
        .pt-2 { padding-top: 0.5rem; }
        .pt-3 { padding-top: 0.75rem; }
        .p-4 { padding: 1rem; }
        .p-5 { padding: 1.25rem; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .flex-wrap { flex-wrap: wrap; }
        .flex-1 { flex: 1; }
        .items-center { align-items: center; }
        .items-start { align-items: flex-start; }
        .justify-between { justify-content: space-between; }
        .flex-between { display: flex; justify-content: space-between; }
        .justify-end { justify-content: flex-end; }
        .gap-1 { gap: 0.25rem; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .w-full { width: 100%; }
        .max-w-md { max-width: 28rem; }
        .max-w-lg { max-width: 32rem; }
        .max-w-sm { max-width: 24rem; }
        .grid { display: grid; }
        .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .ml-2 { margin-left: 0.5rem; }
        .block { display: block; }
        .italic { font-style: italic; }

        .admin-page-title {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .venue-name {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--color-text);
        }

        .facility-chip {
          padding: 0.15rem 0.45rem;
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          color: var(--color-text-secondary);
        }

        .court-item-card {
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
        }

        .court-item-name {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--color-text);
        }

        .price-rule-item {
          padding: 0.25rem 0.5rem;
          background-color: var(--color-surface-elevated);
          border-radius: var(--radius-xs);
          border: 1px solid var(--color-border);
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
          padding: 1.5rem;
          background: #080c09;
          border: 1px solid var(--color-border-pitch);
          display: flex;
          flex-direction: column;
          gap: 1rem;
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
          letter-spacing: 0.05em;
        }

        .modal-input,
        .modal-select,
        .modal-textarea {
          padding: 0.45rem 0.65rem;
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          color: var(--color-text);
          font-family: inherit;
        }

        .modal-input:focus,
        .modal-select:focus,
        .modal-textarea:focus {
          border-color: var(--color-accent);
          outline: none;
        }

        .modal-error {
          padding: 0.5rem 0.75rem;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: var(--radius-xs);
        }
      `}</style>
    </div>
  );
}
