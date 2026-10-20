import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { getSession } from "@/lib/session";

const displayFont = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  display: "swap",
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const sansFont = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CourtBook – Booking Lapangan Futsal, Badminton & Tenis Online",
    template: "%s | CourtBook",
  },
  description:
    "Platform booking lapangan olahraga online real-time. Futsal, Badminton, dan Tenis dengan konfirmasi instan, jadwal akurat, dan pembayaran Midtrans otomatis.",
  keywords: [
    "booking lapangan",
    "sewa lapangan futsal",
    "lapangan badminton jakarta",
    "booking tenis",
    "courtbook",
    "olahraga",
  ],
  authors: [{ name: "CourtBook Team" }],
  creator: "CourtBook",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://courtbook.com",
    title: "CourtBook – Platform Booking Lapangan Olahraga Real-Time",
    description:
      "Cari venue, cek ketersediaan jam bermain, dan bayar instan tanpa risiko double booking.",
    siteName: "CourtBook",
  },
  twitter: {
    card: "summary_large_image",
    title: "CourtBook – Booking Lapangan Olahraga Online",
    description: "Cari venue dan booking lapangan futsal, badminton, tenis dalam hitungan detik.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="id"
      className={`${displayFont.variable} ${monoFont.variable} ${sansFont.variable}`}
    >
      <body>
        <Navbar session={session} />
        <main>{children}</main>
      </body>
    </html>
  );
}
