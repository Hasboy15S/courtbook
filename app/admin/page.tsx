import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { cleanupExpiredBookings, getJakartaTodayString } from "@/lib/booking";

export default async function AdminOverviewPage() {
  await cleanupExpiredBookings();

  const todayStr = getJakartaTodayString();
  const [year, month, day] = todayStr.split("-").map(Number);
  const todayDate = new Date(Date.UTC(year, month - 1, day));

  // 1. Data statistik hari ini & total
  const [
    todayBookings,
    paidPayments,
    totalVenues,
    allActiveCourts,
    recentBookings,
    allRecentBookingsForChart,
  ] = await Promise.all([
    // Booking hari ini
    prisma.booking.findMany({
      where: { date: todayDate },
      include: { court: true },
    }),
    // Total pendapatan dari pembayaran lunas
    prisma.payment.findMany({
      where: {
        OR: [
          { transactionStatus: "settlement" },
          { booking: { paymentStatus: "PAID" } },
        ],
      },
      select: { amount: true, grossAmount: true },
    }),
    // Total venue aktif
    prisma.venue.count({ where: { isActive: true } }),
    // Semua lapangan aktif dengan info venue (untuk hitung kapasitas jam hari ini)
    prisma.court.findMany({
      where: { isActive: true },
      include: { venue: true },
    }),
    // 6 Booking terbaru
    prisma.booking.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        court: { include: { venue: true } },
        user: { select: { name: true, email: true } },
        payment: true,
      },
    }),
    // Booking 7 hari terakhir untuk grafik
    prisma.booking.findMany({
      where: {
        date: {
          gte: new Date(Date.UTC(year, month - 1, day - 6)),
          lte: todayDate,
        },
      },
      select: {
        date: true,
        totalPrice: true,
        status: true,
        paymentStatus: true,
      },
    }),
  ]);

  // Hitung total pendapatan
  const totalRevenue = paidPayments.reduce((sum, p) => {
    return sum + Number(p.grossAmount || p.amount || 0);
  }, 0);

  // Hitung okupansi hari ini
  const activeTodayBookings = todayBookings.filter(
    (b) => b.status === "CONFIRMED" || b.status === "PENDING"
  );

  const occupiedHoursToday = activeTodayBookings.reduce((sum, b) => {
    const startH = b.startTime.getUTCHours();
    const endH = b.endTime.getUTCHours();
    return sum + (endH - startH);
  }, 0);

  const totalCapacityHoursToday = allActiveCourts.reduce((sum, c) => {
    const hours = Math.max(0, c.venue.closeTime - c.venue.openTime);
    return sum + hours;
  }, 0);

  const occupancyRate =
    totalCapacityHoursToday > 0
      ? Math.min(100, Math.round((occupiedHoursToday / totalCapacityHoursToday) * 100))
      : 0;

  // Hitung data grafik 7 hari terakhir
  const chartDays: Array<{
    label: string;
    dateStr: string;
    revenue: number;
    bookingsCount: number;
  }> = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1, day - i));
    const dIso = d.toISOString().split("T")[0];
    const label = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(d);

    const dayBookings = allRecentBookingsForChart.filter(
      (b) => b.date.toISOString().split("T")[0] === dIso
    );

    const dayRevenue = dayBookings
      .filter((b) => b.paymentStatus === "PAID" || b.status === "CONFIRMED")
      .reduce((s, b) => s + Number(b.totalPrice), 0);

    chartDays.push({
      label,
      dateStr: dIso,
      revenue: dayRevenue,
      bookingsCount: dayBookings.length,
    });
  }

  const maxRevenueInChart = Math.max(
    ...chartDays.map((d) => d.revenue),
    100000
  );

  return (
    <div className="container py-8 flex flex-col gap-8">
      {/* Overview Header */}
      <div className="overview-header flex-between flex-wrap gap-4">
        <div>
          <span className="tech-label text-accent mb-1">
            STATISTIK SISTEM & BISNIS
          </span>
          <h1 className="overview-title font-mono">DASHBOARD ADMIN</h1>
          <p className="font-mono text-xs text-secondary mt-1">
            Data real-time pendapatan, okupansi lapangan, dan aktivitas booking CourtBook.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/venues"
            className="btn btn-primary btn-sm font-mono"
          >
            + KELOLA VENUE & LAPANGAN
          </Link>
          <Link
            href="/admin/schedule"
            className="btn btn-secondary btn-sm font-mono"
          >
            KALENDER JADWAL →
          </Link>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pendapatan */}
        <div className="card-technical p-5 flex flex-col justify-between">
          <div>
            <span className="tech-label text-accent mb-1">TOTAL PENDAPATAN (PAID)</span>
            <div className="kpi-value font-mono text-accent">
              Rp {totalRevenue.toLocaleString("id-ID")}
            </div>
          </div>
          <span className="font-mono text-xs text-muted mt-3">
            Dari {paidPayments.length} transaksi terverifikasi
          </span>
        </div>

        {/* Card 2: Booking Hari Ini */}
        <div className="card-technical p-5 flex flex-col justify-between">
          <div>
            <span className="tech-label mb-1">BOOKING HARI INI</span>
            <div className="kpi-value font-mono text-primary">
              {todayBookings.length}
            </div>
          </div>
          <span className="font-mono text-xs text-secondary mt-3">
            {activeTodayBookings.length} booking aktif / dikonfirmasi
          </span>
        </div>

        {/* Card 3: Okupansi Hari Ini */}
        <div className="card-technical p-5 flex flex-col justify-between">
          <div>
            <span className="tech-label text-accent mb-1">OKUPANSI LAPANGAN</span>
            <div className="kpi-value font-mono text-accent">
              {occupancyRate}%
            </div>
          </div>
          <span className="font-mono text-xs text-muted mt-3">
            {occupiedHoursToday} dari {totalCapacityHoursToday} jam kapasitas terpakai
          </span>
        </div>

        {/* Card 4: Infrastruktur Venue */}
        <div className="card-technical p-5 flex flex-col justify-between">
          <div>
            <span className="tech-label mb-1">INFRASTRUKTUR AKTIF</span>
            <div className="kpi-value font-mono text-primary">
              {totalVenues} <span className="text-sm font-normal text-muted">VENUE</span>
            </div>
          </div>
          <span className="font-mono text-xs text-secondary mt-3">
            {allActiveCourts.length} total lapangan olahraga aktif
          </span>
        </div>
      </div>

      {/* 7-Day Performance Bar Chart */}
      <div className="card-technical p-6">
        <div className="flex-between items-center mb-6 flex-wrap gap-2">
          <div>
            <span className="tech-label text-accent mb-1">TREN 7 HARI TERAKHIR</span>
            <h3 className="section-title font-mono">AKTIVITAS PENDAPATAN & PESANAN</h3>
          </div>
          <span className="font-mono text-xs text-muted">
            Grafik berbasis tanggal bermain (WIB)
          </span>
        </div>

        {/* CSS Bar Chart */}
        <div className="chart-container font-mono text-xs">
          <div className="chart-bars">
            {chartDays.map((dayData, idx) => {
              const heightPct = Math.max(
                8,
                Math.round((dayData.revenue / maxRevenueInChart) * 100)
              );
              const isToday = idx === chartDays.length - 1;

              return (
                <div key={dayData.dateStr} className="chart-col">
                  {/* Tooltip on hover */}
                  <div className="bar-hover-info font-mono">
                    <span className="font-bold text-accent">
                      Rp {dayData.revenue.toLocaleString("id-ID")}
                    </span>
                    <span className="text-muted text-[10px]">
                      {dayData.bookingsCount} booking
                    </span>
                  </div>

                  {/* Visual Bar */}
                  <div className="bar-wrapper">
                    <div
                      className={`bar-fill ${isToday ? "today" : ""}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  {/* Day Label */}
                  <span className={`day-label ${isToday ? "text-accent font-bold" : "text-muted"}`}>
                    {dayData.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Bookings Activity Table */}
      <div className="card-technical p-6">
        <div className="flex-between items-center mb-4 flex-wrap gap-2">
          <div>
            <span className="tech-label text-accent mb-1">AKTIVITAS TRANSAKSI</span>
            <h3 className="section-title font-mono">BOOKING TERBARU</h3>
          </div>
          <Link
            href="/admin/bookings"
            className="btn btn-ghost btn-sm font-mono text-xs text-accent"
          >
            LIHAT SEMUA BOOKING →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table font-mono text-xs">
            <thead>
              <tr>
                <th>ORDER ID</th>
                <th>PEMESAN</th>
                <th>VENUE & LAPANGAN</th>
                <th>JADWAL MAIN</th>
                <th>TOTAL HARGA</th>
                <th>STATUS</th>
                <th>PEMBAYARAN</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => {
                const dateFormatted = new Intl.DateTimeFormat("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                }).format(new Date(b.date));

                const startH = b.startTime.getUTCHours();
                const endH = b.endTime.getUTCHours();
                const timeStr = `${String(startH).padStart(2, "0")}:00-${String(endH).padStart(2, "0")}:00`;

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
                    </td>
                    <td>
                      <div>{b.court.venue.name}</div>
                      <div className="text-muted text-[11px]">{b.court.name}</div>
                    </td>
                    <td>
                      <div>{dateFormatted}</div>
                      <div className="text-accent">{timeStr} WIB</div>
                    </td>
                    <td className="font-bold text-primary">
                      Rp {Number(b.totalPrice).toLocaleString("id-ID")}
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
                      <span className={`badge ${
                        b.paymentStatus === "PAID"
                          ? "badge-volt"
                          : b.paymentStatus === "WAITING_VERIFICATION"
                          ? "badge-warning"
                          : "badge-muted"
                      }`}>
                        {b.paymentStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mt-1 { margin-top: 0.25rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-3 { margin-top: 0.75rem; }
        .p-5 { padding: 1.25rem; }
        .p-6 { padding: 1.5rem; }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .flex-wrap { flex-wrap: wrap; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .flex-between { display: flex; justify-content: space-between; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .gap-8 { gap: 2rem; }

        .overview-title {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: 0.05em;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .kpi-value {
          font-size: 1.625rem;
          font-weight: 800;
          line-height: 1.2;
          margin-top: 0.25rem;
        }

        /* 7-Day Chart Styles */
        .chart-container {
          width: 100%;
          height: 180px;
          display: flex;
          align-items: flex-end;
          padding-top: 1.5rem;
        }

        .chart-bars {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          width: 100%;
          height: 100%;
          gap: 1rem;
        }

        .chart-col {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          position: relative;
        }

        .bar-hover-info {
          display: none;
          position: absolute;
          top: -2.5rem;
          background: rgba(8, 12, 9, 0.95);
          border: 1px solid var(--color-border-pitch);
          padding: 0.25rem 0.5rem;
          border-radius: var(--radius-xs);
          flex-direction: column;
          align-items: center;
          white-space: nowrap;
          z-index: 10;
        }

        .chart-col:hover .bar-hover-info {
          display: flex;
        }

        .bar-wrapper {
          width: 100%;
          max-width: 44px;
          height: 130px;
          background-color: var(--color-surface);
          border-radius: var(--radius-xs);
          display: flex;
          align-items: flex-end;
          overflow: hidden;
          border: 1px solid var(--color-border);
        }

        .bar-fill {
          width: 100%;
          background: linear-gradient(180deg, var(--color-accent) 0%, rgba(204, 255, 0, 0.3) 100%);
          transition: height 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .bar-fill.today {
          background: linear-gradient(180deg, var(--color-accent) 0%, rgba(204, 255, 0, 0.6) 100%);
          box-shadow: 0 0 12px rgba(204, 255, 0, 0.4);
        }

        .day-label {
          font-size: 0.6875rem;
          margin-top: 0.5rem;
        }

        /* Table Styles */
        .overflow-x-auto {
          overflow-x: auto;
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
