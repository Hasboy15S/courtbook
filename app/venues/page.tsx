import Link from "next/link";
import { db } from "@/lib/db";
import { SportType } from "@prisma/client";

interface VenuesPageProps {
  searchParams: Promise<{
    sport?: string;
    city?: string;
    minPrice?: string;
    maxPrice?: string;
    date?: string;
    search?: string;
  }>;
}

export default async function VenuesPage({ searchParams }: VenuesPageProps) {
  const params = await searchParams;
  const currentSport = (params.sport?.toUpperCase() as SportType) || "";
  const currentCity = params.city || "";
  const minPriceNum = params.minPrice ? Number(params.minPrice) : undefined;
  const maxPriceNum = params.maxPrice ? Number(params.maxPrice) : undefined;
  const currentDate = params.date || new Date().toISOString().split("T")[0];
  const searchQuery = params.search || "";

  // Ambil daftar kota unik untuk dropdown filter
  const allVenues = await db.venue.findMany({
    where: { isActive: true },
    select: { city: true },
  });
  const uniqueCities = Array.from(new Set(allVenues.map((v) => v.city)));

  // Query filter database
  const venues = await db.venue.findMany({
    where: {
      isActive: true,
      ...(currentCity
        ? { city: { contains: currentCity, mode: "insensitive" } }
        : {}),
      ...(searchQuery
        ? {
            OR: [
              { name: { contains: searchQuery, mode: "insensitive" } },
              { address: { contains: searchQuery, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(currentSport
        ? {
            courts: {
              some: {
                sportType: currentSport,
                isActive: true,
              },
            },
          }
        : {}),
    },
    include: {
      courts: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          sportType: true,
          pricePerHour: true,
        },
      },
      reviews: {
        select: {
          rating: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter berdasarkan rentang harga (minimum price per hour pada lapangan aktif)
  const filteredVenues = venues.filter((venue) => {
    if (venue.courts.length === 0) return false;
    const lowestCourtPrice = Math.min(
      ...venue.courts.map((c) => Number(c.pricePerHour))
    );
    if (minPriceNum && lowestCourtPrice < minPriceNum) return false;
    if (maxPriceNum && lowestCourtPrice > maxPriceNum) return false;
    return true;
  });

  const isFiltered =
    Boolean(currentSport) ||
    Boolean(currentCity) ||
    Boolean(minPriceNum) ||
    Boolean(maxPriceNum) ||
    Boolean(searchQuery);

  const sportsList: { id: string; label: string }[] = [
    { id: "", label: "SEMUA OLAHRAGA" },
    { id: "FUTSAL", label: "FUTSAL" },
    { id: "BADMINTON", label: "BADMINTON" },
    { id: "TENNIS", label: "TENIS" },
    { id: "BASKETBALL", label: "BASKET" },
    { id: "GOLF", label: "GOLF" },
    { id: "PADEL", label: "PADEL" },
    { id: "MINI_SOCCER", label: "MINI SOCCER" },
    { id: "VOLLEYBALL", label: "BOLA VOLI" },
    { id: "TABLE_TENNIS", label: "TENIS MEJA" },
  ];

  return (
    <div className="venues-catalog-page container">
      {/* Catalog Header */}
      <div className="catalog-header">
        <div className="catalog-meta">
          <span className="tech-label text-accent">{"// DIRECTORY VENUE OLAHRAGA"}</span>
          <h1 className="catalog-title">TEMUKAN LAPANGAN TERBAIK</h1>
          <p className="catalog-subtitle">
            Cari dan bandingkan venue olahraga dengan fasilitas lengkap dan slot real-time.
          </p>
        </div>

        <div className="catalog-status-badge font-mono">
          <span className="badge-dot badge-dot-live" />
          <span>{filteredVenues.length} VENUE DITEMUKAN</span>
        </div>
      </div>

      {/* Filter Bar Panel */}
      <div className="filter-panel card-technical">
        <form method="GET" action="/venues" className="filter-form">
          <input type="hidden" name="date" value={currentDate} />

          {/* Sport Filter Tabs */}
          <div className="filter-group-sport">
            <span className="tech-label">CABANG:</span>
            <div className="sport-pill-group">
              {sportsList.map((s) => {
                const isActive = (currentSport || "") === s.id;
                return (
                  <Link
                    key={s.id}
                    href={`/venues?sport=${s.id}&city=${encodeURIComponent(
                      currentCity
                    )}&date=${currentDate}${
                      minPriceNum ? `&minPrice=${minPriceNum}` : ""
                    }${maxPriceNum ? `&maxPrice=${maxPriceNum}` : ""}`}
                    className={`sport-pill font-mono ${isActive ? "active" : ""}`}
                  >
                    {s.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="filter-row-secondary">
            {/* Search Input */}
            <div className="filter-input-wrap">
              <label htmlFor="search" className="tech-label">
                PENCARIAN NAMA / JALAN
              </label>
              <input
                id="search"
                name="search"
                type="text"
                defaultValue={searchQuery}
                placeholder="Contoh: Champion, Dago..."
                className="form-input form-input-sm font-mono"
              />
            </div>

            {/* City Dropdown */}
            <div className="filter-input-wrap">
              <label htmlFor="city" className="tech-label">
                KOTA
              </label>
              <select
                id="city"
                name="city"
                defaultValue={currentCity}
                className="form-select font-mono"
              >
                <option value="">SEMUA KOTA</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div className="filter-input-wrap filter-price-range">
              <label htmlFor="minPrice" className="tech-label">
                RENTANG TARIF (RP)
              </label>
              <div className="price-inputs-row">
                <input
                  id="minPrice"
                  name="minPrice"
                  type="number"
                  step="10000"
                  defaultValue={minPriceNum || ""}
                  placeholder="Min"
                  className="form-input form-input-sm font-mono"
                />
                <span className="font-mono text-muted">–</span>
                <input
                  name="maxPrice"
                  type="number"
                  step="10000"
                  defaultValue={maxPriceNum || ""}
                  placeholder="Max"
                  className="form-input form-input-sm font-mono"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="filter-actions-wrap">
              <button type="submit" className="btn btn-primary btn-sm">
                TERAPKAN
              </button>

              {isFiltered && (
                <Link href={`/venues?date=${currentDate}`} className="btn btn-outline btn-sm">
                  RESET
                </Link>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Venues Grid / Empty State */}
      {filteredVenues.length === 0 ? (
        <div className="empty-state card-technical">
          <div className="empty-state-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </div>
          <span className="tech-label text-accent">{"// STATUS: 0 MATCHES"}</span>
          <h3 className="empty-title">TIDAK ADA VENUE DITEMUKAN</h3>
          <p className="empty-desc">
            Tidak ada lapangan yang sesuai dengan kriteria filter saat ini.
            Coba kurangi filter pencarian atau ubah cabang olahraga.
          </p>
          <Link href="/venues" className="btn btn-primary btn-sm">
            RESET SEMUA FILTER
          </Link>
        </div>
      ) : (
        <div className="venues-grid">
          {filteredVenues.map((venue) => {
            const minPrice = Math.min(
              ...venue.courts.map((c) => Number(c.pricePerHour))
            );
            const sports = Array.from(new Set(venue.courts.map((c) => c.sportType)));
            const avgRating =
              venue.reviews.length > 0
                ? (
                    venue.reviews.reduce((acc, r) => acc + r.rating, 0) /
                    venue.reviews.length
                  ).toFixed(1)
                : null;

            return (
              <div key={venue.id} className="venue-card-tech card-technical">
                {/* Photo & Badges */}
                <div
                  className="venue-tech-photo"
                  style={{
                    backgroundImage: `url(${
                      venue.photos[0] ||
                      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80"
                    })`,
                  }}
                >
                  <div className="venue-tech-overlay" />
                  <div className="venue-tech-badges">
                    <span className="badge font-mono">{venue.city.toUpperCase()}</span>
                    {avgRating && (
                      <span className="badge badge-volt font-mono">
                        ★ {avgRating} ({venue.reviews.length})
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="venue-tech-body">
                  <div className="venue-tech-sports">
                    {sports.map((sport) => (
                      <span key={sport} className="venue-sport-chip font-mono">
                        {sport}
                      </span>
                    ))}
                    <span className="venue-courts-count font-mono">
                      {venue.courts.length} LAPANGAN
                    </span>
                  </div>

                  <h2 className="venue-tech-title">{venue.name}</h2>
                  <p className="venue-tech-address font-mono text-xs">{venue.address}</p>

                  <div className="venue-tech-hours">
                    <span className="tech-label">JAM OPERASIONAL:</span>
                    <span className="font-mono text-xs text-secondary">
                      {venue.openTime.toString().padStart(2, "0")}:00 – {venue.closeTime.toString().padStart(2, "0")}:00 WIB
                    </span>
                  </div>

                  {venue.facilities.length > 0 && (
                    <div className="venue-facilities-preview">
                      {venue.facilities.slice(0, 3).map((f) => (
                        <span key={f} className="facility-tag font-mono text-xs">
                          • {f}
                        </span>
                      ))}
                      {venue.facilities.length > 3 && (
                        <span className="font-mono text-xs text-muted">
                          +{venue.facilities.length - 3} lainnya
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="venue-tech-footer">
                    <div>
                      <span className="tech-label">TARIF MULAI</span>
                      <p className="venue-price-val font-mono">
                        Rp {minPrice.toLocaleString("id-ID")}
                        <span className="venue-price-unit">/JAM</span>
                      </p>
                    </div>

                    <Link
                      href={`/venues/${venue.id}?date=${currentDate}`}
                      className="btn btn-primary btn-sm"
                    >
                      PILIH LAPANGAN →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .venues-catalog-page {
          padding-top: 2.5rem;
          padding-bottom: 5rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .catalog-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--color-border);
        }

        .catalog-title {
          font-size: clamp(2rem, 4vw, 2.75rem);
          font-weight: 800;
          text-transform: uppercase;
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
          letter-spacing: -0.03em;
        }

        .catalog-subtitle {
          color: var(--color-text-secondary);
          font-size: 0.9375rem;
        }

        .catalog-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.85rem;
          border-radius: var(--radius-xs);
          background-color: var(--color-surface);
          border: 1px solid var(--color-border-pitch);
          color: var(--color-accent);
          font-size: 0.75rem;
        }

        /* Filter Panel */
        .filter-panel {
          padding: 1.25rem;
        }

        .filter-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .filter-group-sport {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .sport-pill-group {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .sport-pill {
          padding: 0.35rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.06em;
          border-radius: var(--radius-xs);
          border: 1px solid var(--color-border);
          background-color: var(--color-surface);
          color: var(--color-text-secondary);
          transition: all var(--transition-fast);
        }

        .sport-pill:hover {
          border-color: var(--color-border-strong);
          color: var(--color-text);
        }

        .sport-pill.active {
          background-color: var(--color-accent-subtle);
          border-color: var(--color-border-pitch);
          color: var(--color-accent);
        }

        .filter-row-secondary {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1.3fr auto;
          gap: 1rem;
          align-items: flex-end;
        }

        @media (max-width: 900px) {
          .filter-row-secondary {
            grid-template-columns: 1fr 1fr;
          }
          .filter-actions-wrap {
            grid-column: span 2;
          }
        }

        @media (max-width: 600px) {
          .filter-row-secondary {
            grid-template-columns: 1fr;
          }
          .filter-actions-wrap {
            grid-column: span 1;
          }
        }

        .filter-input-wrap {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .price-inputs-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-input-sm {
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
        }

        .form-select {
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
          background-color: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          color: var(--color-text);
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .form-select:focus {
          border-color: var(--color-accent);
        }

        .filter-actions-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        /* Venues Grid */
        .venues-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.75rem;
        }

        .venue-card-tech {
          display: flex;
          flex-direction: column;
        }

        .venue-tech-photo {
          height: 200px;
          background-size: cover;
          background-position: center;
          position: relative;
          padding: 1rem;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }

        .venue-tech-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(8, 12, 9, 0.15) 0%, rgba(8, 12, 9, 0.9) 100%);
        }

        .venue-tech-badges {
          position: relative;
          z-index: 2;
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .venue-tech-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 0.625rem;
        }

        .venue-tech-sports {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .venue-sport-chip {
          font-size: 0.6875rem;
          padding: 0.15rem 0.5rem;
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          color: var(--color-accent);
          letter-spacing: 0.05em;
        }

        .venue-courts-count {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          letter-spacing: 0.05em;
        }

        .venue-tech-title {
          font-size: 1.3rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .venue-tech-address {
          color: var(--color-text-muted);
          margin-bottom: 0.25rem;
        }

        .venue-tech-hours {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0;
          border-top: 1px dashed var(--color-border);
          border-bottom: 1px dashed var(--color-border);
        }

        .venue-facilities-preview {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          padding: 0.25rem 0;
        }

        .facility-tag {
          color: var(--color-text-secondary);
        }

        .venue-tech-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 1rem;
          border-top: 1px solid var(--color-border);
        }

        .venue-price-val {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--color-text);
          letter-spacing: -0.01em;
        }

        .venue-price-unit {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          margin-left: 0.25rem;
        }

        /* Empty State */
        .empty-state {
          padding: 4rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          max-width: 540px;
          margin: 2rem auto;
        }

        .empty-state-icon {
          color: var(--color-text-muted);
          margin-bottom: 0.5rem;
        }

        .empty-title {
          font-size: 1.35rem;
          font-weight: 800;
        }

        .empty-desc {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin-bottom: 1rem;
        }
      `}</style>
    </div>
  );
}
