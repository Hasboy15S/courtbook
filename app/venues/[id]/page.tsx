import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCourtAvailability } from "@/lib/availability";
import { CourtAvailabilityGrid } from "@/components/court-availability-grid";

interface VenueDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function VenueDetailPage({
  params,
  searchParams,
}: VenueDetailPageProps) {
  const { id: venueId } = await params;
  const { date: dateParam } = await searchParams;

  const todayStr = new Date().toISOString().split("T")[0];
  const currentDate = dateParam || todayStr;

  // Query venue detail
  const venue = await db.venue.findUnique({
    where: { id: venueId },
    include: {
      courts: {
        where: { isActive: true },
        orderBy: { name: "asc" },
      },
      reviews: {
        include: {
          user: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!venue || !venue.isActive) {
    notFound();
  }

  // Pre-fetch initial availability for all courts on this date for fast SSR
  const initialAvailabilities = await Promise.all(
    venue.courts.map((court) => getCourtAvailability(court.id, currentDate))
  );

  // Quick Date calculations
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const nextDay = new Date(now);
  nextDay.setDate(nextDay.getDate() + 2);
  const nextDayStr = nextDay.toISOString().split("T")[0];

  const quickDates = [
    { label: "HARI INI", dateStr: todayStr },
    { label: "BESOK", dateStr: tomorrowStr },
    { label: "LUSA", dateStr: nextDayStr },
  ];

  const avgRating =
    venue.reviews.length > 0
      ? (
          venue.reviews.reduce((acc, r) => acc + r.rating, 0) /
          venue.reviews.length
        ).toFixed(1)
      : null;

  return (
    <div className="venue-detail-page container">
      {/* Breadcrumb */}
      <nav className="detail-breadcrumb font-mono text-xs">
        <Link href="/" className="breadcrumb-link">
          BERANDA
        </Link>
        <span className="text-muted">/</span>
        <Link href="/venues" className="breadcrumb-link">
          VENUE
        </Link>
        <span className="text-muted">/</span>
        <span className="text-accent">{venue.name.toUpperCase()}</span>
      </nav>

      {/* Main Venue Header & Gallery */}
      <section className="venue-header-section card-technical">
        <div className="venue-header-content">
          <div className="venue-meta-top">
            <span className="badge font-mono">{venue.city.toUpperCase()}</span>
            {avgRating && (
              <span className="badge badge-volt font-mono">
                ★ {avgRating} ({venue.reviews.length} ULASAN)
              </span>
            )}
            <span className="badge font-mono text-muted">
              {venue.courts.length} LAPANGAN AKTIF
            </span>
          </div>

          <h1 className="venue-name">{venue.name}</h1>
          <p className="venue-address font-mono text-xs">📍 {venue.address}</p>

          {venue.description && (
            <p className="venue-description">{venue.description}</p>
          )}

          <div className="venue-specs-grid font-mono">
            <div className="spec-item">
              <span className="tech-label">OPERASIONAL</span>
              <span className="spec-val">
                {venue.openTime.toString().padStart(2, "0")}:00 – {venue.closeTime.toString().padStart(2, "0")}:00 WIB
              </span>
            </div>

            {venue.phone && (
              <div className="spec-item">
                <span className="tech-label">KONTAK VENUE</span>
                <span className="spec-val">{venue.phone}</span>
              </div>
            )}

            <div className="spec-item">
              <span className="tech-label">DISIPLIN</span>
              <span className="spec-val text-accent">
                {Array.from(new Set(venue.courts.map((c) => c.sportType))).join(" • ")}
              </span>
            </div>
          </div>

          {/* Facilities Badges */}
          {venue.facilities.length > 0 && (
            <div className="facilities-box">
              <span className="tech-label">FASILITAS VENUE:</span>
              <div className="facilities-list">
                {venue.facilities.map((fac) => (
                  <span key={fac} className="facility-pill font-mono">
                    ✓ {fac}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Photos Grid */}
        {venue.photos.length > 0 && (
          <div className="venue-photos-strip">
            <div
              className="photo-main"
              style={{ backgroundImage: `url(${venue.photos[0]})` }}
            />
            {venue.photos.slice(1, 3).map((photo, i) => (
              <div
                key={i}
                className="photo-thumb"
                style={{ backgroundImage: `url(${photo})` }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Date Selection Bar */}
      <section className="date-picker-section card-technical">
        <div className="date-picker-header">
          <div>
            <span className="tech-label text-accent">{"// JADWAL KETERSEDIAAN SLOT"}</span>
            <h2 className="date-picker-title">PILIH TANGGAL MAIN</h2>
          </div>

          {/* Quick Date Pills */}
          <div className="quick-dates-group">
            {quickDates.map((qd) => {
              const isActive = currentDate === qd.dateStr;
              return (
                <Link
                  key={qd.dateStr}
                  href={`/venues/${venue.id}?date=${qd.dateStr}`}
                  className={`quick-date-btn font-mono ${isActive ? "active" : ""}`}
                >
                  {qd.label} ({qd.dateStr.slice(5)})
                </Link>
              );
            })}
          </div>
        </div>

        {/* Custom Date Input Form */}
        <form method="GET" action={`/venues/${venue.id}`} className="custom-date-form">
          <label htmlFor="venue-date" className="tech-label font-mono">
            PILIH TANGGAL LAIN:
          </label>
          <input
            id="venue-date"
            name="date"
            type="date"
            min={todayStr}
            defaultValue={currentDate}
            className="form-input form-input-sm font-mono w-auto"
          />
          <button type="submit" className="btn btn-primary btn-sm font-mono">
            LIHAT JADWAL
          </button>
        </form>
      </section>

      {/* Courts Availability Grid List */}
      <section className="courts-availability-section">
        <div className="section-meta">
          <span className="tech-label text-accent">
            {"// 01 DAFTAR LAPANGAN & SLOT JAM"}
          </span>
          <h2 className="section-heading">
            KETERSEDIAAN TANGGAL: {currentDate}
          </h2>
        </div>

        <div className="courts-list">
          {venue.courts.map((court, index) => (
            <CourtAvailabilityGrid
              key={court.id}
              courtId={court.id}
              courtName={court.name}
              sportType={court.sportType}
              initialDate={currentDate}
              initialData={initialAvailabilities[index]}
            />
          ))}
        </div>
      </section>

      {/* Verified Reviews Section */}
      <section className="reviews-section card-technical">
        <div className="reviews-header">
          <div>
            <span className="tech-label text-accent">{"// 02 ULASAN PENGGUNA TERVERIFIKASI"}</span>
            <h2 className="reviews-title">RATING & TESTIMONI LAPANGAN</h2>
          </div>

          {avgRating && (
            <div className="rating-score-block">
              <span className="rating-big font-mono">{avgRating}</span>
              <div className="rating-meta font-mono">
                <span className="text-accent">★ ★ ★ ★ ★</span>
                <span className="text-muted text-xs">{venue.reviews.length} Ulasan Terverifikasi</span>
              </div>
            </div>
          )}
        </div>

        {venue.reviews.length === 0 ? (
          <div className="reviews-empty font-mono text-muted text-xs">
            Belum ada ulasan untuk venue ini. Jadilah yang pertama memberikan ulasan setelah bermain!
          </div>
        ) : (
          <div className="reviews-list">
            {venue.reviews.map((rev) => (
              <div key={rev.id} className="review-card">
                <div className="review-top">
                  <div className="reviewer-info">
                    <span className="reviewer-avatar font-mono">
                      {rev.user.name.charAt(0).toUpperCase()}
                    </span>
                    <span className="reviewer-name font-mono">{rev.user.name}</span>
                  </div>
                  <div className="review-stars font-mono text-accent">
                    {"★".repeat(rev.rating)}
                    {"☆".repeat(5 - rev.rating)}
                  </div>
                </div>

                {rev.comment && <p className="review-text">{rev.comment}</p>}
                <span className="review-date font-mono text-xs text-muted">
                  {new Date(rev.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .venue-detail-page {
          padding-top: 2rem;
          padding-bottom: 5rem;
          display: flex;
          flex-direction: column;
          gap: 2.25rem;
        }

        .detail-breadcrumb {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .breadcrumb-link {
          color: var(--color-text-secondary);
          transition: color var(--transition-fast);
        }
        .breadcrumb-link:hover {
          color: var(--color-text);
        }

        /* Venue Header Card */
        .venue-header-section {
          padding: 2rem;
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 2rem;
        }

        @media (max-width: 900px) {
          .venue-header-section {
            grid-template-columns: 1fr;
          }
        }

        .venue-header-content {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }

        .venue-meta-top {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .venue-name {
          font-size: clamp(1.75rem, 3.5vw, 2.5rem);
          font-weight: 800;
          letter-spacing: -0.03em;
        }

        .venue-address {
          color: var(--color-text-muted);
        }

        .venue-description {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          line-height: 1.6;
        }

        .venue-specs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 1rem;
          padding: 1rem;
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          margin-top: 0.5rem;
        }

        .spec-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .spec-val {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text);
        }

        .facilities-box {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .facilities-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }

        .facility-pill {
          padding: 0.2rem 0.5rem;
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xs);
          font-size: 0.6875rem;
          color: var(--color-text-secondary);
        }

        /* Photos Strip */
        .venue-photos-strip {
          display: grid;
          grid-template-rows: 2fr 1fr;
          grid-template-columns: 1fr 1fr;
          gap: 0.625rem;
          min-height: 280px;
        }

        .photo-main {
          grid-column: span 2;
          border-radius: var(--radius-xs);
          background-size: cover;
          background-position: center;
          border: 1px solid var(--color-border);
          min-height: 180px;
        }

        .photo-thumb {
          border-radius: var(--radius-xs);
          background-size: cover;
          background-position: center;
          border: 1px solid var(--color-border);
          min-height: 90px;
        }

        /* Date Picker */
        .date-picker-section {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .date-picker-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .date-picker-title {
          font-size: 1.35rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-top: 0.25rem;
        }

        .quick-dates-group {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .quick-date-btn {
          padding: 0.4rem 0.85rem;
          border-radius: var(--radius-xs);
          border: 1px solid var(--color-border);
          background-color: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .quick-date-btn:hover {
          border-color: var(--color-border-strong);
          color: var(--color-text);
        }

        .quick-date-btn.active {
          background-color: var(--color-accent-subtle);
          border-color: var(--color-border-pitch);
          color: var(--color-accent);
        }

        .custom-date-form {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          padding-top: 0.75rem;
          border-top: 1px dashed var(--color-border);
        }

        .w-auto {
          width: auto;
        }

        /* Courts Availability Section */
        .courts-availability-section {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        /* Reviews Section */
        .reviews-section {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .reviews-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--color-border);
        }

        .reviews-title {
          font-size: 1.35rem;
          font-weight: 800;
          margin-top: 0.25rem;
        }

        .rating-score-block {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .rating-big {
          font-size: 2.25rem;
          font-weight: 800;
          color: var(--color-accent);
          line-height: 1;
        }

        .rating-meta {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }

        .reviews-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        .review-card {
          padding: 1.25rem;
          border-radius: var(--radius-xs);
          background-color: var(--color-surface);
          border: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .review-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .reviewer-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .reviewer-avatar {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-xs);
          background-color: var(--color-surface-elevated);
          border: 1px solid var(--color-border-pitch);
          color: var(--color-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .reviewer-name {
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .review-text {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}
