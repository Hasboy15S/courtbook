import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { Court3D } from "@/components/court-3d";

export default async function HomePage() {
  const session = await getSession();

  // Ambil data asli dari database (NO fake stats!)
  const [venuesCount, courtsCount, venues] = await Promise.all([
    db.venue.count({ where: { isActive: true } }),
    db.court.count({ where: { isActive: true } }),
    db.venue.findMany({
      where: { isActive: true },
      include: {
        courts: {
          select: { sportType: true, pricePerHour: true, name: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
      take: 3,
    }),
  ]);

  const uniqueCities = Array.from(new Set(venues.map((v) => v.city)));
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="home-showcase">
      {/* Hero Showcase Section with 3D Split Layout */}
      <section className="hero-technical container">
        <div className="hero-split-grid">
          {/* Left Column: Headline & Functional Search */}
          <div className="hero-technical-content">
            <div className="hero-system-pill">
              <span className="badge-dot badge-dot-live" />
              <span className="font-mono text-xs">{"COURT RESERVATION ENGINE // 2026"}</span>
            </div>

            <h1 className="hero-technical-title">
              SEWA LAPANGAN OLAHRAGA.
              <span className="hero-technical-subline">
                PRESISI TINGGI. ANTI-BENTROK.
              </span>
            </h1>

            <p className="hero-technical-desc">
              Sistem pemesanan lapangan futsal, badminton, dan tenis dengan visualisasi
              marka 3D dan ketersediaan slot real-time. Anti-bentrok di level transaksi database.
            </p>

            {/* Functional Search Panel */}
            <form action="/venues" method="GET" className="hero-search-panel card-technical">
              <div className="search-field">
                <label htmlFor="sport" className="tech-label">OLAHRAGA</label>
                <select id="sport" name="sport" className="search-select font-mono" defaultValue="">
                  <option value="">SEMUA OLAHRAGA</option>
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

              <div className="search-field">
                <label htmlFor="city" className="tech-label">KOTA</label>
                <select id="city" name="city" className="search-select font-mono" defaultValue="">
                  <option value="">SEMUA KOTA</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>{city.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div className="search-field">
                <label htmlFor="date" className="tech-label">TANGGAL MAIN</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  defaultValue={todayStr}
                  className="search-input-date font-mono"
                />
              </div>

              <button type="submit" className="btn btn-primary search-submit-btn">
                <span>CARI</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </form>

            <div className="hero-technical-actions">
              <Link href="/venues" className="btn btn-secondary btn-sm">
                <span>SEMUA VENUE ({venuesCount})</span>
              </Link>

              {!session ? (
                <Link href="/register" className="btn btn-outline btn-sm">
                  DAFTAR AKUN
                </Link>
              ) : session.role === "ADMIN" ? (
                <Link href="/admin" className="btn btn-outline btn-sm">
                  DASHBOARD ADMIN
                </Link>
              ) : (
                <Link href="/my-bookings" className="btn btn-outline btn-sm">
                  BOOKING SAYA
                </Link>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Procedural 3D Sports Court */}
          <div className="hero-3d-column">
            <Court3D />
          </div>
        </div>

        {/* Real Scoreboard Bar (Data Asli Database) */}
        <div className="scoreboard-bar">
          <div className="scoreboard-cell">
            <span className="tech-label">TERDAFTAR</span>
            <span className="scoreboard-value font-mono">{venuesCount.toString().padStart(2, "0")}</span>
            <span className="scoreboard-caption">VENUE AKTIF</span>
          </div>

          <div className="scoreboard-cell">
            <span className="tech-label">KAPASITAS</span>
            <span className="scoreboard-value font-mono">{courtsCount.toString().padStart(2, "0")}</span>
            <span className="scoreboard-caption">LAPANGAN RESMI</span>
          </div>

          <div className="scoreboard-cell">
            <span className="tech-label">CAKUPAN</span>
            <span className="scoreboard-value font-mono">{uniqueCities.length.toString().padStart(2, "0")}</span>
            <span className="scoreboard-caption">KOTA UTAMA</span>
          </div>

          <div className="scoreboard-cell scoreboard-cell-accent">
            <span className="tech-label">HOLD DURATION</span>
            <span className="scoreboard-value font-mono">15m</span>
            <span className="scoreboard-caption">KUNCI SLOT OTOMATIS</span>
          </div>
        </div>
      </section>

      {/* Sport Disciplines Selector */}
      <section className="container discipline-section">
        <div className="section-meta">
          <span className="tech-label text-accent">{"// 01 DISIPLIN OLAHRAGA"}</span>
          <h2 className="section-heading">KATEGORI LAPANGAN TERVERIFIKASI</h2>
        </div>

        <div className="discipline-grid">
          <Link href="/venues?sport=FUTSAL" className="discipline-card card-technical">
            <div className="discipline-header">
              <span className="discipline-tag font-mono">{"FUTSAL // 40×20M"}</span>
              <span className="discipline-indicator font-mono">01</span>
            </div>
            <h3 className="discipline-name">FUTSAL PITCH</h3>
            <p className="discipline-desc">
              Vinyl interlock & rumput sintetis standar FIFA dengan pencahayaan LED 500 lux tanpa silau.
            </p>
            <div className="discipline-footer">
              <span className="font-mono text-xs text-accent">LIHAT JADWAL →</span>
            </div>
          </Link>

          <Link href="/venues?sport=BADMINTON" className="discipline-card card-technical">
            <div className="discipline-header">
              <span className="discipline-tag font-mono">{"BADMINTON // 13.4×6.1M"}</span>
              <span className="discipline-indicator font-mono">02</span>
            </div>
            <h3 className="discipline-name">BADMINTON COURT</h3>
            <p className="discipline-desc">
              Karpet vinyl standar PBSI 4.5mm, sirkulasi udara terkontrol tanpa hembusan angin langsung.
            </p>
            <div className="discipline-footer">
              <span className="font-mono text-xs text-accent">LIHAT JADWAL →</span>
            </div>
          </Link>

          <Link href="/venues?sport=TENNIS" className="discipline-card card-technical">
            <div className="discipline-header">
              <span className="discipline-tag font-mono">{"TENIS // 23.77×10.97M"}</span>
              <span className="discipline-indicator font-mono">03</span>
            </div>
            <h3 className="discipline-name">TENNIS COURT</h3>
            <p className="discipline-desc">
              Hardcourt cushion 9 lapis standar ITF untuk outdoor & indoor berlampu floodlight malam.
            </p>
            <div className="discipline-footer">
              <span className="font-mono text-xs text-accent">LIHAT JADWAL →</span>
            </div>
          </Link>

          <Link href="/venues?sport=BASKETBALL" className="discipline-card card-technical">
            <div className="discipline-header">
              <span className="discipline-tag font-mono">{"BASKET // 28×15M"}</span>
              <span className="discipline-indicator font-mono">04</span>
            </div>
            <h3 className="discipline-name">BASKETBALL COURT</h3>
            <p className="discipline-desc">
              Lantai hardwood maple kayu asli standar FIBA, ring hidrolik profesional, dan scoreboard LED.
            </p>
            <div className="discipline-footer">
              <span className="font-mono text-xs text-accent">LIHAT JADWAL →</span>
            </div>
          </Link>

          <Link href="/venues?sport=GOLF" className="discipline-card card-technical">
            <div className="discipline-header">
              <span className="discipline-tag font-mono">{"GOLF // RANGE & SIMULATOR"}</span>
              <span className="discipline-indicator font-mono">05</span>
            </div>
            <h3 className="discipline-name">GOLF ARENA</h3>
            <p className="discipline-desc">
              Driving range otomatis 250 yard berteknologi TrackMan & private room simulator 4K 18-hole.
            </p>
            <div className="discipline-footer">
              <span className="font-mono text-xs text-accent">LIHAT JADWAL →</span>
            </div>
          </Link>

          <Link href="/venues?sport=PADEL" className="discipline-card card-technical">
            <div className="discipline-header">
              <span className="discipline-tag font-mono">{"PADEL // 20×10M CAGE"}</span>
              <span className="discipline-indicator font-mono">06</span>
            </div>
            <h3 className="discipline-name">PADEL COURT</h3>
            <p className="discipline-desc">
              Dinding kaca panoramic tempered 12mm standar FIP, rumput sintetis berpasir silika halus.
            </p>
            <div className="discipline-footer">
              <span className="font-mono text-xs text-accent">LIHAT JADWAL →</span>
            </div>
          </Link>

          <Link href="/venues?sport=MINI_SOCCER" className="discipline-card card-technical">
            <div className="discipline-header">
              <span className="discipline-tag font-mono">{"MINI SOCCER // 50×30M"}</span>
              <span className="discipline-indicator font-mono">07</span>
            </div>
            <h3 className="discipline-name">MINI SOCCER</h3>
            <p className="discipline-desc">
              Rumput monofilament 50mm empuk dengan infill karet daur ulang, ideal untuk laga 7 vs 7 malam hari.
            </p>
            <div className="discipline-footer">
              <span className="font-mono text-xs text-accent">LIHAT JADWAL →</span>
            </div>
          </Link>
        </div>
      </section>

      {/* Featured Venues Scoreboard Grid */}
      <section className="container venues-section">
        <div className="section-meta flex-between">
          <div>
            <span className="tech-label text-accent">{"// 02 DAFTAR VENUE"}</span>
            <h2 className="section-heading">VENUE PILIHAN TERBAIK</h2>
          </div>
          <Link href="/venues" className="btn btn-outline btn-sm">
            SEMUA VENUE ({venues.length})
          </Link>
        </div>

        <div className="venues-technical-grid">
          {venues.map((venue) => {
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
                {/* Photo Header */}
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

                {/* Details */}
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

                  <h3 className="venue-tech-title">{venue.name}</h3>
                  <p className="venue-tech-address font-mono text-xs">{venue.address}</p>

                  <div className="venue-tech-hours">
                    <span className="tech-label">OPERASIONAL:</span>
                    <span className="font-mono text-xs text-secondary">
                      {venue.openTime.toString().padStart(2, "0")}:00 – {venue.closeTime.toString().padStart(2, "0")}:00 WIB
                    </span>
                  </div>

                  <div className="venue-tech-footer">
                    <div>
                      <span className="tech-label">TARIF MULAI</span>
                      <p className="venue-price-val font-mono">
                        Rp {minPrice.toLocaleString("id-ID")}
                        <span className="venue-price-unit">/JAM</span>
                      </p>
                    </div>

                    <Link href={`/venues/${venue.id}`} className="btn btn-primary btn-sm">
                      PILIH SLOT
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Technical Protocol / Anti-Conflict Proof Section */}
      <section className="container protocol-section">
        <div className="protocol-box card-technical">
          <div className="protocol-header">
            <span className="tech-label text-accent">{"// 03 ENGINE SPECIFICATION"}</span>
            <h2 className="protocol-title">SISTEM RESERVASI ATOMIK</h2>
            <p className="protocol-subtitle">
              Setiap pemesanan dikelola melalui transaksi database tingkat serializable
              untuk mengeliminasi kondisi balapan (*race condition*) antar pengguna.
            </p>
          </div>

          <div className="protocol-grid">
            <div className="protocol-item">
              <span className="protocol-step font-mono">01</span>
              <h4 className="protocol-name">LOCKING 15 MENIT</h4>
              <p className="protocol-text">
                Slot terkunci otomatis dengan timestamp kadaluarsa instan begitu
                dipesan untuk memberi Anda waktu verifikasi pembayaran.
              </p>
            </div>

            <div className="protocol-item">
              <span className="protocol-step font-mono">02</span>
              <h4 className="protocol-name">ISOLASI TRANSAKSI</h4>
              <p className="protocol-text">
                Pengecekan overlap hanya mengevaluasi status aktif (PENDING & CONFIRMED).
                Slot dibatalkan dapat dipesan ulang tanpa deadlock.
              </p>
            </div>

            <div className="protocol-item">
              <span className="protocol-step font-mono">03</span>
              <h4 className="protocol-name">TARIF BERJENJANG</h4>
              <p className="protocol-text">
                Perhitungan tarif peak hours dan akhir pekan terkomputasi otomatis
                secara presisi per jam pemakaian.
              </p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .home-showcase {
          display: flex;
          flex-direction: column;
          gap: 4.5rem;
          padding-bottom: 5rem;
        }

        /* Hero */
        .hero-technical {
          padding-top: 2.5rem;
        }

        .hero-split-grid {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 2.5rem;
          align-items: stretch;
          margin-bottom: 2.5rem;
        }

        .hero-technical-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .hero-3d-column {
          display: flex;
          width: 100%;
          min-height: 440px;
        }

        @media (max-width: 992px) {
          .hero-split-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .hero-3d-column {
            order: -1;
            min-height: 380px;
          }
        }

        /* Functional Search Panel */
        .hero-search-panel {
          display: grid;
          grid-template-columns: 1.1fr 1.1fr 1.1fr auto;
          gap: 0.75rem;
          padding: 1rem;
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
          margin-bottom: 1.75rem;
          align-items: flex-end;
        }

        .search-field {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .search-select,
        .search-input-date {
          width: 100%;
          padding: 0.55rem 0.65rem;
          background-color: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          color: var(--color-text);
          font-size: 0.75rem;
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .search-select:focus,
        .search-input-date:focus {
          border-color: var(--color-accent);
        }

        .search-submit-btn {
          height: 34px;
          padding: 0 1rem;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
        }

        @media (max-width: 768px) {
          .hero-search-panel {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .search-submit-btn {
            height: 40px;
            width: 100%;
          }
        }

        .hero-system-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.85rem;
          border-radius: var(--radius-xs);
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          color: var(--color-accent);
          margin-bottom: 1.5rem;
        }

        .hero-technical-title {
          font-size: clamp(2.5rem, 6vw, 4.25rem);
          font-weight: 800;
          line-height: 1.05;
          letter-spacing: -0.04em;
          margin-bottom: 1.25rem;
          text-transform: uppercase;
        }

        .hero-technical-subline {
          display: block;
          color: var(--color-accent);
          text-shadow: 0 0 30px var(--color-accent-glow);
        }

        .hero-technical-desc {
          font-size: clamp(1rem, 2vw, 1.15rem);
          color: var(--color-text-secondary);
          line-height: 1.6;
          max-width: 640px;
          margin-bottom: 2.25rem;
        }

        .hero-technical-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 3rem;
        }

        /* Scoreboard Bar */
        .scoreboard-bar {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: var(--color-surface-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-sm);
        }

        .scoreboard-cell {
          padding: 1.5rem 1.25rem;
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .scoreboard-cell:last-child {
          border-right: none;
        }

        .scoreboard-cell-accent .scoreboard-value {
          color: var(--color-accent);
        }

        .scoreboard-value {
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1;
          color: var(--color-text);
          margin: 0.25rem 0;
        }

        .scoreboard-caption {
          font-family: var(--font-mono), monospace;
          font-size: 0.6875rem;
          color: var(--color-text-secondary);
          letter-spacing: 0.05em;
        }

        @media (max-width: 768px) {
          .scoreboard-bar {
            grid-template-columns: repeat(2, 1fr);
          }
          .scoreboard-cell:nth-child(2) {
            border-right: none;
          }
          .scoreboard-cell:nth-child(1),
          .scoreboard-cell:nth-child(2) {
            border-bottom: 1px solid var(--color-border);
          }
        }

        /* Disciplines */
        .section-meta {
          margin-bottom: 1.75rem;
        }

        .section-heading {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          margin-top: 0.35rem;
        }

        .discipline-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        .discipline-card {
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .discipline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .discipline-tag {
          font-size: 0.6875rem;
          letter-spacing: 0.1em;
          color: var(--color-text-muted);
        }

        .discipline-indicator {
          font-size: 0.8125rem;
          color: var(--color-accent);
          font-weight: 700;
        }

        .discipline-name {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .discipline-desc {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          line-height: 1.55;
          flex: 1;
        }

        .discipline-footer {
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid var(--color-border);
        }

        /* Venues Section */
        .venues-technical-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .venue-card-tech {
          display: flex;
          flex-direction: column;
        }

        .venue-tech-photo {
          height: 190px;
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
          background: linear-gradient(180deg, rgba(8, 12, 9, 0.2) 0%, rgba(8, 12, 9, 0.85) 100%);
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
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }

        .venue-tech-address {
          color: var(--color-text-muted);
          margin-bottom: 0.5rem;
        }

        .venue-tech-hours {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0;
          border-top: 1px dashed var(--color-border);
          border-bottom: 1px dashed var(--color-border);
        }

        .venue-tech-footer {
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.75rem;
        }

        .venue-price-val {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text);
          letter-spacing: -0.01em;
        }

        .venue-price-unit {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          margin-left: 0.25rem;
        }

        /* Protocol Box */
        .protocol-box {
          padding: 2.5rem;
          border-left: 3px solid var(--color-accent);
        }

        .protocol-header {
          max-width: 680px;
          margin-bottom: 2rem;
        }

        .protocol-title {
          font-size: clamp(1.5rem, 3vw, 2.25rem);
          font-weight: 800;
          text-transform: uppercase;
          margin-top: 0.25rem;
          margin-bottom: 0.5rem;
        }

        .protocol-subtitle {
          color: var(--color-text-secondary);
          font-size: 0.9375rem;
          line-height: 1.6;
        }

        .protocol-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .protocol-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1.25rem;
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
        }

        .protocol-step {
          font-size: 0.8125rem;
          color: var(--color-accent);
          font-weight: 700;
        }

        .protocol-name {
          font-size: 0.9375rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .protocol-text {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          line-height: 1.55;
        }
      `}</style>
    </div>
  );
}
