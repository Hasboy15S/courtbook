import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Role,
  SportType,
  BookingStatus,
  PaymentStatus,
  DayType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Memulai proses seeding data CourtBook (Multi-Cabang & Multi-Olahraga)...");

  // Bersihkan data lama
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.blockedSlot.deleteMany();
  await prisma.priceRule.deleteMany();
  await prisma.court.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Data lama telah dibersihkan.");

  // 1. Seed Users
  const adminPassword = await bcrypt.hash("admin123", 12);
  const userPassword = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Admin CourtBook",
      email: "admin@courtbook.com",
      password: adminPassword,
      phone: "081299990001",
      role: Role.ADMIN,
    },
  });

  const user1 = await prisma.user.create({
    data: {
      name: "Budi Santoso",
      email: "budi@example.com",
      password: userPassword,
      phone: "081288880002",
      role: Role.USER,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: "Siti Rahma",
      email: "siti@example.com",
      password: userPassword,
      phone: "081277770003",
      role: Role.USER,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      name: "Dimas Anggara",
      email: "dimas@example.com",
      password: userPassword,
      phone: "081266660004",
      role: Role.USER,
    },
  });

  const user4 = await prisma.user.create({
    data: {
      name: "Kevin Pratama",
      email: "kevin@example.com",
      password: userPassword,
      phone: "081255550005",
      role: Role.USER,
    },
  });

  const user5 = await prisma.user.create({
    data: {
      name: "Nadia Utami",
      email: "nadia@example.com",
      password: userPassword,
      phone: "081244440006",
      role: Role.USER,
    },
  });

  console.log("👤 Users dibuat: 1 Admin, 5 Regular Users");

  // Helper untuk membuat price rules standar (weekday malam & weekend)
  const makeRules = (weekdayPeak: number, weekendNormal: number, weekendPeak: number) => ({
    create: [
      {
        dayType: DayType.WEEKDAY,
        startHour: 18,
        endHour: 23,
        pricePerHour: weekdayPeak,
      },
      {
        dayType: DayType.WEEKEND,
        startHour: 6,
        endHour: 18,
        pricePerHour: weekendNormal,
      },
      {
        dayType: DayType.WEEKEND,
        startHour: 18,
        endHour: 23,
        pricePerHour: weekendPeak,
      },
    ],
  });

  // 2. SEED VENUES & COURTS

  // 1. Champion Sports Center - Jakarta Selatan
  const venue1 = await prisma.venue.create({
    data: {
      name: "Champion Sports Center",
      description: "Pusat olahraga modern di Jakarta Selatan dengan lapangan futsal rumput sintetis berstandar FIFA, lapangan badminton karpet vinyl, dan lapangan basket kayu maple. Fasilitas lengkap dan lokasi strategis dekat stasiun MRT Fatmawati.",
      address: "Jl. TB Simatupang No. 88, Cilandak Barat",
      city: "Jakarta Selatan",
      phone: "021-7654321",
      photos: [
        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Parkir Mobil & Motor Luas",
        "Kantin & Coffee Shop",
        "Kamar Mandi & Shower Air Hangat",
        "Musholla Ber-AC",
        "Locker Room Digital",
        "WiFi Gratis Kecepatan Tinggi",
        "Penyewaan Raket & Sepatu",
        "Tribun Penonton",
      ],
      openTime: 6,
      closeTime: 23,
      isActive: true,
      courts: {
        create: [
          {
            name: "Lapangan Futsal Vinyl A",
            sportType: SportType.FUTSAL,
            pricePerHour: 150000,
            description: "Vinyl tebal 8mm, pantulan bola sempurna, pencahayaan LED 500 lux.",
            isActive: true,
            priceRules: makeRules(175000, 180000, 200000),
          },
          {
            name: "Lapangan Futsal Rumput B",
            sportType: SportType.FUTSAL,
            pricePerHour: 140000,
            description: "Rumput sintetis monofilament terbaru, empuk dan ramah lutut.",
            isActive: true,
            priceRules: makeRules(165000, 170000, 190000),
          },
          {
            name: "Lapangan Badminton Garuda 1",
            sportType: SportType.BADMINTON,
            pricePerHour: 65000,
            description: "Karpet vinyl standar PBSI hijau, sirkulasi udara baik tanpa hembusan angin langsung.",
            isActive: true,
            priceRules: makeRules(80000, 85000, 95000),
          },
          {
            name: "Lapangan Badminton Garuda 2",
            sportType: SportType.BADMINTON,
            pricePerHour: 65000,
            description: "Karpet vinyl standar PBSI dengan tiang net portable kualitas turnamen.",
            isActive: true,
            priceRules: makeRules(80000, 85000, 95000),
          },
          {
            name: "Lapangan Basket Hardwood Maple 1",
            sportType: SportType.BASKETBALL,
            pricePerHour: 220000,
            description: "Lantai kayu maple impor standar FIBA, ring hidrolik fleksibel, dan scoreboard digital.",
            isActive: true,
            priceRules: makeRules(260000, 270000, 300000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 2. Gelora Arena GBK Senayan - Jakarta Pusat
  const venue2 = await prisma.venue.create({
    data: {
      name: "Gelora Arena GBK Senayan",
      description: "Arena olahraga ikonik di jantung Kompleks Gelora Bung Karno Senayan. Dilengkapi lapangan basket kelas dunia, lapangan tenis hardcourt berstandar ITF, dan lapangan padel panoramic berpendingin udara.",
      address: "Kompleks Olahraga Gelora Bung Karno, Jl. Pintu Satu Senayan",
      city: "Jakarta Pusat",
      phone: "021-5734070",
      photos: [
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Akses Stasiun MRT Istora Mandiri",
        "Tribun VIP & Reguler 500 Kursi",
        "Ruang Ganti Atlet & Shower Panas",
        "Musholla Eksklusif",
        "Official Pro Shop & Stringing",
        "Healthy Cafe & Juice Bar",
        "Medik & Ambulans Siaga",
      ],
      openTime: 6,
      closeTime: 23,
      isActive: true,
      courts: {
        create: [
          {
            name: "Lapangan Basket Pro FIBA Hall",
            sportType: SportType.BASKETBALL,
            pricePerHour: 300000,
            description: "Lantai parket standar kompetisi IBL/FIBA, tata cahaya broadcast TV 1200 lux.",
            isActive: true,
            priceRules: makeRules(350000, 380000, 420000),
          },
          {
            name: "Lapangan Tenis Hardcourt Senayan 1",
            sportType: SportType.TENNIS,
            pricePerHour: 160000,
            description: "Hardcourt Decoturf 9 lapis standar Grand Slam, net kencang dan garis tegas.",
            isActive: true,
            priceRules: makeRules(190000, 200000, 230000),
          },
          {
            name: "Lapangan Tenis Hardcourt Senayan 2",
            sportType: SportType.TENNIS,
            pricePerHour: 160000,
            description: "Hardcourt outdoor dengan pemandangan skyline gedung bertingkat Sudirman.",
            isActive: true,
            priceRules: makeRules(190000, 200000, 230000),
          },
          {
            name: "Padel Panoramic Glass Court A",
            sportType: SportType.PADEL,
            pricePerHour: 280000,
            description: "Dinding kaca tempered panoramic 12mm tanpa tiang sudut standar World Padel Tour.",
            isActive: true,
            priceRules: makeRules(320000, 350000, 390000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 3. West Jakarta Sports Hub - Jakarta Barat
  const venue3 = await prisma.venue.create({
    data: {
      name: "West Jakarta Sports Hub",
      description: "Gelanggang olahraga terpadu di kawasan Puri Kembangan. Menawarkan lapangan badminton vinyl premium, tenis meja berstandar ITTF olimpiade, dan lapangan basket semi-indoor.",
      address: "Jl. Puri Lingkar Luar No. 22, Kembangan",
      city: "Jakarta Barat",
      phone: "021-58301122",
      photos: [
        "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Parkir Basement 2 Lantai",
        "Kantin Masakan Nusantara",
        "Kamar Bilas & Water Heater",
        "Musholla",
        "Penyewaan Alat & Bet Tenis Meja",
        "Free WiFi 100 Mbps",
      ],
      openTime: 7,
      closeTime: 23,
      isActive: true,
      courts: {
        create: [
          {
            name: "Badminton Hall Court 1",
            sportType: SportType.BADMINTON,
            pricePerHour: 70000,
            description: "Karpet Li-Ning 5mm shock-absorption tinggi, nyaman untuk jumping smash.",
            isActive: true,
            priceRules: makeRules(85000, 90000, 100000),
          },
          {
            name: "Badminton Hall Court 2",
            sportType: SportType.BADMINTON,
            pricePerHour: 70000,
            description: "Karpet Li-Ning dengan pencahayaan samping anti-glare.",
            isActive: true,
            priceRules: makeRules(85000, 90000, 100000),
          },
          {
            name: "Tenis Meja Olympic Arena (2 Meja)",
            sportType: SportType.TABLE_TENNIS,
            pricePerHour: 50000,
            description: "Meja Butterfly Centrefold 25mm standar ITTF dengan lantai karpet taraflex merah.",
            isActive: true,
            priceRules: makeRules(60000, 65000, 75000),
          },
          {
            name: "Basket Indoor Puri Arena",
            sportType: SportType.BASKETBALL,
            pricePerHour: 200000,
            description: "Lantai rubberized polyurethane elastis, ring basket tempered glass kuat.",
            isActive: true,
            priceRules: makeRules(240000, 250000, 280000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 4. Marina Coastal Golf & Sports Club - Jakarta Utara
  const venue4 = await prisma.venue.create({
    data: {
      name: "Marina Coastal Golf & Sports Club",
      description: "Pusat rekreasi dan olahraga pesisir eksklusif di Ancol Marina. Memiliki driving range golf 250 yard berteknologi radar TrackMan, simulator golf 4K private, lapangan padel tepi pantai, dan mini soccer rumput alami.",
      address: "Kawasan Marina Ancol Blok C No. 5, Pademangan",
      city: "Jakarta Utara",
      phone: "021-6458899",
      photos: [
        "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "TrackMan Golf Radar & Auto Tee-Up",
        "Golf Club Rental (Callaway & TaylorMade)",
        "Sunset Seafood & Coffee Lounge",
        "Kamar Mandi Mewah & Sauna",
        "Musholla",
        "Valet Parking Gratis",
        "Pro Coach Golf Bersertifikat",
      ],
      openTime: 6,
      closeTime: 23,
      isActive: true,
      courts: {
        create: [
          {
            name: "Golf Driving Range Bay 1-2 (TrackMan)",
            sportType: SportType.GOLF,
            pricePerHour: 180000,
            description: "2 Bay berdampingan dengan auto ball dispenser 100 bola/sesi & layar analisis TrackMan 4.",
            isActive: true,
            priceRules: makeRules(210000, 230000, 260000),
          },
          {
            name: "Golf Simulator VIP Suite 4K",
            sportType: SportType.GOLF,
            pricePerHour: 275000,
            description: "Ruangan privat ber-AC dengan simulator 18-hole Pebble Beach & St Andrews dalam resolusi 4K.",
            isActive: true,
            priceRules: makeRules(320000, 350000, 400000),
          },
          {
            name: "Padel Coastal Court Ancol",
            sportType: SportType.PADEL,
            pricePerHour: 260000,
            description: "Lapangan padel kaca dengan angin sepoi pesisir laut Jakarta dan lampu LED malam.",
            isActive: true,
            priceRules: makeRules(300000, 330000, 370000),
          },
          {
            name: "Mini Soccer Marina Coastal 7v7",
            sportType: SportType.MINI_SOCCER,
            pricePerHour: 450000,
            description: "Lapangan mini soccer 50x30m rumput sintetis monofilament 55mm, bola FIFA Quality Pro.",
            isActive: true,
            priceRules: makeRules(550000, 600000, 700000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 5. Rawamangun Athletic Arena - Jakarta Timur
  const venue5 = await prisma.venue.create({
    data: {
      name: "Rawamangun Athletic Arena",
      description: "Gelanggang olahraga legendaris Jakarta Timur dekat velodrome. Menyediakan lapangan futsal interlock modern, lapangan bola voli taraflex berstandar PBVSI, dan basket outdoor.",
      address: "Jl. Pemuda No. 45, Rawamangun",
      city: "Jakarta Timur",
      phone: "021-4712033",
      photos: [
        "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Parkir Mobil & Bus Luas",
        "Tribun 200 Penonton",
        "Kamar Ganti & Shower Air Hangat",
        "Musholla Bersih",
        "Penyewaan Bola & Rompi",
        "Kantin Minuman Isotonik",
      ],
      openTime: 6,
      closeTime: 23,
      isActive: true,
      courts: {
        create: [
          {
            name: "Futsal Interlock Rawamangun 1",
            sportType: SportType.FUTSAL,
            pricePerHour: 135000,
            description: "Lantai polypropylene modular anti licin, ramah engkel, bola futsal Molten.",
            isActive: true,
            priceRules: makeRules(155000, 165000, 185000),
          },
          {
            name: "Lapangan Bola Voli Taraflex PBVSI",
            sportType: SportType.VOLLEYBALL,
            pricePerHour: 110000,
            description: "Lantai karpet Taraflex 7mm standar Proliga, net mikasa dengan antena wasit.",
            isActive: true,
            priceRules: makeRules(130000, 140000, 160000),
          },
          {
            name: "Basket Outdoor Plexipave",
            sportType: SportType.BASKETBALL,
            pricePerHour: 120000,
            description: "Outdoor full court cat aspal plexipave dengan ring pegas baja dan lampu sorot malam.",
            isActive: true,
            priceRules: makeRules(140000, 150000, 175000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 6. BSD Grand Sports Club & Padel Arena - Tangerang
  const venue6 = await prisma.venue.create({
    data: {
      name: "BSD Grand Sports Club & Padel Arena",
      description: "Kompleks olahraga bergengsi di BSD City. Terkenal dengan 4 lapangan padel berstandar federasi internasional, lapangan tenis Decoturf, dan hall basket berpendingin udara.",
      address: "Jl. BSD Grand Boulevard Kav. 18, BSD City",
      city: "Tangerang",
      phone: "021-50587711",
      photos: [
        "https://images.unsplash.com/photo-1576610616656-d3aa5d1f4534?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Klub Padel Resmi dengan Pelatih Spanyol",
        "Restoran Gourmet & Cafe Gelato",
        "Kolam Renang Semi-Olympic",
        "Locker Room & Shower Mewah",
        "Penyewaan Raket Babolat & Bullpadel",
        "Parkir Mobil Ratusan Slot",
      ],
      openTime: 6,
      closeTime: 23,
      isActive: true,
      courts: {
        create: [
          {
            name: "Padel Center Court BSD (Panoramic)",
            sportType: SportType.PADEL,
            pricePerHour: 300000,
            description: "Panoramic full glass, karpet monofilament berpasir silica 20x10m standar FIP.",
            isActive: true,
            priceRules: makeRules(350000, 380000, 420000),
          },
          {
            name: "Padel Court 2 BSD",
            sportType: SportType.PADEL,
            pricePerHour: 280000,
            description: "Dinding kaca tempered 12mm dengan lampu LED 8 titik tanpa silau.",
            isActive: true,
            priceRules: makeRules(320000, 350000, 390000),
          },
          {
            name: "Tenis Decoturf Grand Slam BSD",
            sportType: SportType.TENNIS,
            pricePerHour: 150000,
            description: "Permukaan Decoturf cushion warna biru/hijau US Open.",
            isActive: true,
            priceRules: makeRules(180000, 190000, 220000),
          },
          {
            name: "Basket FIBA Maple Court BSD",
            sportType: SportType.BASKETBALL,
            pricePerHour: 250000,
            description: "Lantai kayu maple ber-AC penuh dengan sound system dan papan skor elektronik.",
            isActive: true,
            priceRules: makeRules(290000, 310000, 350000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 7. Bintaro Turf & Golf Club - Tangerang Selatan
  const venue7 = await prisma.venue.create({
    data: {
      name: "Bintaro Turf & Golf Club",
      description: "Destinasi favorit komunitas olahraga Bintaro Jaya Sektor 9. Memiliki lapangan mini soccer rumput sintetis premium berukuran 55x35m dan ruang golf simulator privat.",
      address: "Jl. Boulevard Bintaro Jaya Sektor 9, Pondok Aren",
      city: "Tangerang Selatan",
      phone: "021-74865500",
      photos: [
        "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Kamera Perekam Pertandingan Otomatis",
        "Kantin Bintaro & Coffee Corner",
        "Shower Air Hangat & Ruang Ganti Ber-AC",
        "Musholla",
        "Sewa Sepatu Turf & Rompi Tim",
        "Parkir Mobil Luas & Security 24 Jam",
      ],
      openTime: 6,
      closeTime: 24,
      isActive: true,
      courts: {
        create: [
          {
            name: "Mini Soccer Premier Bintaro 7v7",
            sportType: SportType.MINI_SOCCER,
            pricePerHour: 500000,
            description: "Ukuran 55x35m rumput sintetis 55mm monofilament dengan lampu stadion terang.",
            isActive: true,
            priceRules: makeRules(650000, 700000, 800000),
          },
          {
            name: "Golf Simulator Private Booth Bintaro",
            sportType: SportType.GOLF,
            pricePerHour: 220000,
            description: "Simulator golf modern dengan pilihan puluhan lapangan dunia, cocok untuk latihan swing.",
            isActive: true,
            priceRules: makeRules(250000, 270000, 300000),
          },
          {
            name: "Lapangan Futsal Vinyl Bintaro",
            sportType: SportType.FUTSAL,
            pricePerHour: 140000,
            description: "Lantai vinyl indoor 8mm dengan sirkulasi udara blower hembusan dingin.",
            isActive: true,
            priceRules: makeRules(165000, 175000, 195000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 8. Bandung Smash & Court Arena - Bandung
  const venue8 = await prisma.venue.create({
    data: {
      name: "Bandung Smash & Court Arena",
      description: "Kompleks olahraga favorit di kawasan Dago Bandung. Menyediakan lapangan tenis outdoor aspal halus berstandar ITF dan lapangan badminton indoor berpendingin udara. Suasana sejuk dan nyaman untuk berolahraga pagi maupun malam hari.",
      address: "Jl. Ir. H. Juanda No. 142, Dago",
      city: "Bandung",
      phone: "022-2501234",
      photos: [
        "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Parkir Luas & Aman",
        "Tribun Penonton Beratap",
        "Kantin Sehat & Minuman Segar",
        "Shower Air Hangat",
        "Musholla",
        "Pro Shop (Stringing & Peralatan Tenis)",
        "Loker Pemain",
      ],
      openTime: 7,
      closeTime: 22,
      isActive: true,
      courts: {
        create: [
          {
            name: "Lapangan Tenis Outdoor A",
            sportType: SportType.TENNIS,
            pricePerHour: 120000,
            description: "Hardcourt luar ruangan dengan cat acrylic anti-slip, lampu floodlight terang benderang.",
            isActive: true,
            priceRules: makeRules(140000, 150000, 170000),
          },
          {
            name: "Lapangan Tenis Outdoor B",
            sportType: SportType.TENNIS,
            pricePerHour: 120000,
            description: "Hardcourt luar ruangan dengan pemandangan perbukitan Dago yang menyegarkan.",
            isActive: true,
            priceRules: makeRules(140000, 150000, 170000),
          },
          {
            name: "Lapangan Badminton Dago Indoor",
            sportType: SportType.BADMINTON,
            pricePerHour: 60000,
            description: "Indoor badminton dengan atap peredam panas dan pencahayaan glare-free.",
            isActive: true,
            priceRules: makeRules(75000, 80000, 90000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 9. Dago Highland Golf & Sports Park - Bandung
  const venue9 = await prisma.venue.create({
    data: {
      name: "Dago Highland Golf & Sports Park",
      description: "Resor olahraga dataran tinggi di Dago Atas dengan panorama kota Bandung. Memiliki driving range golf 2 tingkat 280 yard, lapangan futsal sintetis sejuk, dan meja tenis meja turnamen.",
      address: "Jl. Dago Pakar Permai IV No. 1, Cimenyan",
      city: "Bandung",
      phone: "022-8777123",
      photos: [
        "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Driving Range 2 Tingkat (40 Bay)",
        "Cafe Pemandangan Kota Bandung",
        "Penyewaan Stick Golf & Caddy",
        "Kamar Mandi Air Hangat",
        "Musholla Eksklusif",
        "Free WiFi & Spot Foto",
      ],
      openTime: 6,
      closeTime: 22,
      isActive: true,
      courts: {
        create: [
          {
            name: "Golf Driving Range Bay Highland (100 Bola)",
            sportType: SportType.GOLF,
            pricePerHour: 150000,
            description: "Bay driving range menghadap lembah hijau Dago dengan target green berjarak 50-250 yard.",
            isActive: true,
            priceRules: makeRules(170000, 185000, 210000),
          },
          {
            name: "Futsal Rumput Sintetis Highland",
            sportType: SportType.FUTSAL,
            pricePerHour: 130000,
            description: "Lapangan futsal outdoor beratap jaring dengan udara sejuk pegunungan.",
            isActive: true,
            priceRules: makeRules(150000, 160000, 180000),
          },
          {
            name: "Tenis Meja Pro Dago",
            sportType: SportType.TABLE_TENNIS,
            pricePerHour: 45000,
            description: "Meja tenis meja standar ITTF di lounge semi-outdoor berangin sejuk.",
            isActive: true,
            priceRules: makeRules(55000, 60000, 70000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 10. Surabaya Grand Sport Center - Surabaya
  const venue10 = await prisma.venue.create({
    data: {
      name: "Surabaya Grand Sport Center",
      description: "Pusat gelanggang olahraga terbesar di Surabaya Barat. Memiliki lapangan tenis indoor hardcourt berstandar turnamen, lapangan futsal interlock anti selip, dan hall basket maple.",
      address: "Jl. Mayjen Sungkono No. 105, Sawahan",
      city: "Surabaya",
      phone: "031-5678901",
      photos: [
        "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Gedung Parkir 3 Lantai",
        "Tribun Penonton 300 Kursi",
        "Resto & Coffee Shop",
        "Shower Panas & Ruang Sauna",
        "Musholla Besar Ber-AC",
        "Locker Room Elektronik",
        "Klinik Medis & Fisioterapi Olahraga",
        "Penyewaan Alat Lengkap",
      ],
      openTime: 6,
      closeTime: 23,
      isActive: true,
      courts: {
        create: [
          {
            name: "Lapangan Futsal Interlock 1",
            sportType: SportType.FUTSAL,
            pricePerHour: 160000,
            description: "Lantai polypropylene interlock berdaya cengkeram tinggi, papan skor digital LED.",
            isActive: true,
            priceRules: makeRules(185000, 195000, 220000),
          },
          {
            name: "Lapangan Tenis Hardcourt Grand 1",
            sportType: SportType.TENNIS,
            pricePerHour: 140000,
            description: "Tenis indoor hardcourt 9 lapis cushion, pencahayaan 1000 lux kompetisi nasional.",
            isActive: true,
            priceRules: makeRules(165000, 175000, 195000),
          },
          {
            name: "Lapangan Basket Hardwood Surabaya",
            sportType: SportType.BASKETBALL,
            pricePerHour: 220000,
            description: "Parket kayu jati solid berstandar kompetisi Perbasi Jawa Timur.",
            isActive: true,
            priceRules: makeRules(260000, 275000, 310000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 11. Pakuwon Sports & Padel Club - Surabaya
  const venue11 = await prisma.venue.create({
    data: {
      name: "Pakuwon Sports & Padel Club",
      description: "Klub olahraga premium di kawasan Pakuwon Mall Surabaya Barat. Dilengkapi court padel kaca panoramic modern, hall badminton 6 lapangan karpet BWF, dan simulator golf VIP.",
      address: "Pakuwon Indah Raya Kav. 3, Sambikerep",
      city: "Surabaya",
      phone: "031-7390099",
      photos: [
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Akses Terhubung Mall Pakuwon",
        "Shower Mewah & Handuk Bersih",
        "Locker Digital Ber-AC",
        "Cafe Sports Bar",
        "Sewa Raket Padel & Badminton",
        "Pelatih Bersertifikat BWF & FIP",
      ],
      openTime: 7,
      closeTime: 23,
      isActive: true,
      courts: {
        create: [
          {
            name: "Padel Panoramic Court Pakuwon",
            sportType: SportType.PADEL,
            pricePerHour: 275000,
            description: "Panoramic glass court tanpa pilar penghalang pandangan dengan karpet WPT.",
            isActive: true,
            priceRules: makeRules(320000, 340000, 380000),
          },
          {
            name: "Badminton Super Series Court 1",
            sportType: SportType.BADMINTON,
            pricePerHour: 75000,
            description: "Karpet vinyl Yonex standar All England, bebas tiupan angin pendingin.",
            isActive: true,
            priceRules: makeRules(90000, 95000, 110000),
          },
          {
            name: "Golf Simulator Elite Suite Surabaya",
            sportType: SportType.GOLF,
            pricePerHour: 250000,
            description: "Simulator golf layar lebar 4K dengan sensor kecepatan ayunan dan putaran bola akurat.",
            isActive: true,
            priceRules: makeRules(290000, 310000, 350000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 12. Canggu Padel & Tennis Sanctuary - Bali
  const venue12 = await prisma.venue.create({
    data: {
      name: "Canggu Padel & Tennis Sanctuary",
      description: "Sanctuary olahraga tropis paling viral di Bali, terletak di antara hamparan sawah Canggu. Populer di kalangan pemain padel dan tenis internasional dengan suasana resort mewah.",
      address: "Jl. Pantai Batu Bolong No. 89, Canggu, Kuta Utara",
      city: "Bali",
      phone: "0361-9876543",
      photos: [
        "https://images.unsplash.com/photo-1576610616656-d3aa5d1f4534?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Infinity Pool & Jacuzzi Pemain",
        "Smoothie Bar & Organic Restaurant",
        "Ice Bath & Sauna Terapi Pemulihan",
        "Pro Shop Raket Padel & Outfit",
        "Shower Tropis Air Hangat",
        "High-Speed Fiber WiFi",
      ],
      openTime: 6,
      closeTime: 23,
      isActive: true,
      courts: {
        create: [
          {
            name: "Padel Court 1 Canggu Sunset",
            sportType: SportType.PADEL,
            pricePerHour: 320000,
            description: "Padel court beratap semi-terbuka dengan pemandangan golden sunset Bali.",
            isActive: true,
            priceRules: makeRules(380000, 400000, 450000),
          },
          {
            name: "Padel Court 2 Canggu Garden",
            sportType: SportType.PADEL,
            pricePerHour: 300000,
            description: "Dikelilingi taman tropis asri, karpet pasir silika biru berkualitas tinggi.",
            isActive: true,
            priceRules: makeRules(350000, 380000, 420000),
          },
          {
            name: "Tenis Hardcourt Canggu Sanctuary",
            sportType: SportType.TENNIS,
            pricePerHour: 180000,
            description: "Hardcourt berstandar ITF dengan lampu LED turnamen malam hari.",
            isActive: true,
            priceRules: makeRules(220000, 240000, 270000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 13. Denpasar Hoops & Futsal Stadium - Bali
  const venue13 = await prisma.venue.create({
    data: {
      name: "Denpasar Hoops & Futsal Stadium",
      description: "Gelanggang olahraga serbaguna terbesar di Denpasar. Menyediakan lapangan basket lantai kayu, futsal vinyl berstandar nasional, dan lapangan bola voli indoor.",
      address: "Jl. Teuku Umar Barat No. 210, Denpasar Barat",
      city: "Bali",
      phone: "0361-482200",
      photos: [
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Parkir Mobil & Ratusan Motor",
        "Tribun Penonton 400 Kursi",
        "Kamar Mandi & Shower",
        "Musholla Bersih",
        "Kantin Minuman Dingin & Snack",
        "Papan Skor LED Elektronik",
      ],
      openTime: 7,
      closeTime: 23,
      isActive: true,
      courts: {
        create: [
          {
            name: "Basket Maple Arena Denpasar",
            sportType: SportType.BASKETBALL,
            pricePerHour: 200000,
            description: "Lantai parket kayu maple impor, ring pegas hidrolik, dan scoreboard digital.",
            isActive: true,
            priceRules: makeRules(240000, 250000, 280000),
          },
          {
            name: "Futsal Vinyl Dewata",
            sportType: SportType.FUTSAL,
            pricePerHour: 140000,
            description: "Vinyl 8mm empuk ramah lutut, pencahayaan terang bebas bayangan.",
            isActive: true,
            priceRules: makeRules(165000, 175000, 195000),
          },
          {
            name: "Bola Voli Indoor Denpasar",
            sportType: SportType.VOLLEYBALL,
            pricePerHour: 110000,
            description: "Lantai taraflex standar PBVSI dengan tiang dan net kompetisi.",
            isActive: true,
            priceRules: makeRules(130000, 140000, 160000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 14. Jogja Heritage Sports Center - Yogyakarta
  const venue14 = await prisma.venue.create({
    data: {
      name: "Jogja Heritage Sports Center",
      description: "Pusat olahraga mahasiswa dan komunitas di Kota Pelajar Yogyakarta. Dekat kampus UGM dan UNY, menyediakan lapangan badminton karpet vinyl, hall basket, dan futsal interlock harga terjangkau.",
      address: "Jl. Kaliurang KM 5 No. 12, Sleman",
      city: "Yogyakarta",
      phone: "0274-567890",
      photos: [
        "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Parkir Motor Sangat Luas",
        "Angkringan & Cafe Kopi Jogja",
        "Kamar Mandi & Shower",
        "Musholla Luas",
        "Sewa Raket & Sepatu Mahasiswa",
        "Free WiFi",
      ],
      openTime: 6,
      closeTime: 24,
      isActive: true,
      courts: {
        create: [
          {
            name: "Badminton Tugu Arena 1",
            sportType: SportType.BADMINTON,
            pricePerHour: 50000,
            description: "Karpet vinyl PBSI standar turnamen antarkampus, penerangan LED glare-free.",
            isActive: true,
            priceRules: makeRules(65000, 70000, 80000),
          },
          {
            name: "Badminton Tugu Arena 2",
            sportType: SportType.BADMINTON,
            pricePerHour: 50000,
            description: "Karpet vinyl PBSI dengan sirkulasi udara alami sejuk Yogyakarta.",
            isActive: true,
            priceRules: makeRules(65000, 70000, 80000),
          },
          {
            name: "Basket Malioboro Hall",
            sportType: SportType.BASKETBALL,
            pricePerHour: 160000,
            description: "Lantai kayu finishing polyurethane dengan ring basket tempered glass kuat.",
            isActive: true,
            priceRules: makeRules(190000, 200000, 230000),
          },
          {
            name: "Futsal Interlock Kaliurang",
            sportType: SportType.FUTSAL,
            pricePerHour: 120000,
            description: "Lantai interlock anti-licin dengan jaring keliling dan bola futsal tournament.",
            isActive: true,
            priceRules: makeRules(140000, 150000, 170000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 15. Semarang Hills Golf & Arena - Semarang
  const venue15 = await prisma.venue.create({
    data: {
      name: "Semarang Hills Golf & Arena",
      description: "Pusat olahraga panorama di kawasan Candi Baru / Gombel Semarang Atas. Memiliki driving range golf dengan pemandangan kota Semarang, tenis hardcourt, dan futsal rumput sintetis.",
      address: "Jl. Setiabudi No. 90, Gombel, Banyumanik",
      city: "Semarang",
      phone: "024-7478811",
      photos: [
        "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Driving Range Golf 200 Yard (30 Bay)",
        "Resto View City Light Semarang",
        "Penyewaan Alat & Stick Golf",
        "Shower Panas",
        "Musholla Nyaman",
        "Area Parkir Luas",
      ],
      openTime: 6,
      closeTime: 22,
      isActive: true,
      courts: {
        create: [
          {
            name: "Golf Driving Range Bay Semarang Hills",
            sportType: SportType.GOLF,
            pricePerHour: 140000,
            description: "Bay latihan swing golf dengan panorama city view perbukitan Semarang.",
            isActive: true,
            priceRules: makeRules(160000, 175000, 195000),
          },
          {
            name: "Tenis Hardcourt Gombel",
            sportType: SportType.TENNIS,
            pricePerHour: 110000,
            description: "Lapangan tenis hardcourt outdoor sejuk berlampu floodlight malam.",
            isActive: true,
            priceRules: makeRules(130000, 140000, 160000),
          },
          {
            name: "Futsal Sintetis Candi Arena",
            sportType: SportType.FUTSAL,
            pricePerHour: 130000,
            description: "Rumput monofilament empuk dengan dinding jaring pengaman kuat.",
            isActive: true,
            priceRules: makeRules(150000, 160000, 180000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  // 16. Medan Sports Hub & Badminton Palace - Medan
  const venue16 = await prisma.venue.create({
    data: {
      name: "Medan Sports Hub & Badminton Palace",
      description: "Pusat olahraga bulutangkis dan mini soccer termegah di Kota Medan. Memiliki 8 lapangan badminton karpet vinyl berstandar PBSI, mini soccer 7v7 rumput sintetis, dan basket outdoor.",
      address: "Jl. Ringroad No. 128, Medan Sunggal",
      city: "Medan",
      phone: "061-8224567",
      photos: [
        "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80",
      ],
      facilities: [
        "Parkir Ratusan Mobil & Motor",
        "Kantin Khas Medan & Kopi Sidikalang",
        "Kamar Mandi & Shower Air Hangat",
        "Musholla Besar Ber-AC",
        "Locker Room Digital",
        "Stringing Raket & Toko Olahraga",
      ],
      openTime: 6,
      closeTime: 23,
      isActive: true,
      courts: {
        create: [
          {
            name: "Badminton Istana Deli Court 1",
            sportType: SportType.BADMINTON,
            pricePerHour: 60000,
            description: "Karpet vinyl PBSI hijau 4.5mm, pencahayaan LED 600 lux glare-free.",
            isActive: true,
            priceRules: makeRules(75000, 80000, 90000),
          },
          {
            name: "Badminton Istana Deli Court 2",
            sportType: SportType.BADMINTON,
            pricePerHour: 60000,
            description: "Karpet vinyl PBSI dengan tiang net kualitas turnamen nasional.",
            isActive: true,
            priceRules: makeRules(75000, 80000, 90000),
          },
          {
            name: "Mini Soccer Deli Serdang 7v7",
            sportType: SportType.MINI_SOCCER,
            pricePerHour: 400000,
            description: "Mini soccer 50x30m rumput sintetis monofilament terbaru, penerangan lampu sorot malam terang.",
            isActive: true,
            priceRules: makeRules(480000, 520000, 600000),
          },
          {
            name: "Basket Hardcourt Sunggal",
            sportType: SportType.BASKETBALL,
            pricePerHour: 180000,
            description: "Lantai akrilik cushion dengan ring hidrolik fleksibel.",
            isActive: true,
            priceRules: makeRules(210000, 230000, 260000),
          },
        ],
      },
    },
    include: { courts: true },
  });

  const allVenues = [
    venue1, venue2, venue3, venue4, venue5, venue6, venue7, venue8,
    venue9, venue10, venue11, venue12, venue13, venue14, venue15, venue16,
  ];

  let totalCourtsCount = 0;
  for (const v of allVenues) {
    totalCourtsCount += v.courts.length;
  }

  console.log(
    `🏟️ Berhasil membuat ${allVenues.length} Venue dengan total ${totalCourtsCount} Lapangan di 9 Kota/Wilayah!`
  );

  // 3. SEED SAMPLE REVIEWS
  console.log("⭐ Menambahkan verified reviews untuk venue-venue...");

  const pastDate1 = new Date();
  pastDate1.setDate(pastDate1.getDate() - 2);
  const pastDate2 = new Date();
  pastDate2.setDate(pastDate2.getDate() - 4);
  const pastDate3 = new Date();
  pastDate3.setDate(pastDate3.getDate() - 7);

  // Review 1: Champion Sports Center
  const b1 = await prisma.booking.create({
    data: {
      userId: user1.id,
      courtId: venue1.courts[0].id,
      date: new Date(Date.UTC(pastDate1.getFullYear(), pastDate1.getMonth(), pastDate1.getDate())),
      startTime: new Date(Date.UTC(1970, 0, 1, 19, 0, 0)),
      endTime: new Date(Date.UTC(1970, 0, 1, 21, 0, 0)),
      status: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalPrice: 350000,
      notes: "Sparring rutin futsal kantor",
      payment: {
        create: {
          method: "QRIS",
          amount: 350000,
          transactionStatus: "settlement",
          paidAt: pastDate1,
        },
      },
      review: {
        create: {
          userId: user1.id,
          venueId: venue1.id,
          rating: 5,
          comment: "Lantai vinyl sangat berkualitas, empuk dan tidak licin sama sekali. Kamar mandi bersih dan air panas lancar!",
        },
      },
    },
  });

  // Review 2: Gelora Arena GBK Senayan
  const b2 = await prisma.booking.create({
    data: {
      userId: user2.id,
      courtId: venue2.courts[0].id,
      date: new Date(Date.UTC(pastDate2.getFullYear(), pastDate2.getMonth(), pastDate2.getDate())),
      startTime: new Date(Date.UTC(1970, 0, 1, 16, 0, 0)),
      endTime: new Date(Date.UTC(1970, 0, 1, 18, 0, 0)),
      status: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalPrice: 600000,
      notes: "Main basket komunitas IBL fans",
      payment: {
        create: {
          method: "Transfer Bank BCA",
          amount: 600000,
          transactionStatus: "settlement",
          paidAt: pastDate2,
        },
      },
      review: {
        create: {
          userId: user2.id,
          venueId: venue2.id,
          rating: 5,
          comment: "Main di Hall Basket GBK rasanya seperti atlet pro! Lantai maple kayu asli dan ringnya sangat mantap.",
        },
      },
    },
  });

  // Review 3: Marina Coastal Golf Club
  const b3 = await prisma.booking.create({
    data: {
      userId: user3.id,
      courtId: venue4.courts[0].id,
      date: new Date(Date.UTC(pastDate3.getFullYear(), pastDate3.getMonth(), pastDate3.getDate())),
      startTime: new Date(Date.UTC(1970, 0, 1, 9, 0, 0)),
      endTime: new Date(Date.UTC(1970, 0, 1, 11, 0, 0)),
      status: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalPrice: 360000,
      notes: "Latihan swing TrackMan",
      payment: {
        create: {
          method: "Mandiri Virtual Account",
          amount: 360000,
          transactionStatus: "settlement",
          paidAt: pastDate3,
        },
      },
      review: {
        create: {
          userId: user3.id,
          venueId: venue4.id,
          rating: 5,
          comment: "Sensor TrackMan 4 sangat akurat untuk menganalisis club speed dan smash factor. Tempat sejuk tepi pantai!",
        },
      },
    },
  });

  // Review 4: BSD Grand Padel Arena
  const b4 = await prisma.booking.create({
    data: {
      userId: user4.id,
      courtId: venue6.courts[0].id,
      date: new Date(Date.UTC(pastDate1.getFullYear(), pastDate1.getMonth(), pastDate1.getDate())),
      startTime: new Date(Date.UTC(1970, 0, 1, 20, 0, 0)),
      endTime: new Date(Date.UTC(1970, 0, 1, 22, 0, 0)),
      status: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalPrice: 600000,
      notes: "Laga semifinal fun match padel",
      payment: {
        create: {
          method: "QRIS",
          amount: 600000,
          transactionStatus: "settlement",
          paidAt: pastDate1,
        },
      },
      review: {
        create: {
          userId: user4.id,
          venueId: venue6.id,
          rating: 5,
          comment: "Court padel terbaik di Tangerang! Kaca panoramic bersih tanpa blindspot, pantulan bola sangat konsisten.",
        },
      },
    },
  });

  // Review 5: Canggu Padel Bali
  const b5 = await prisma.booking.create({
    data: {
      userId: user5.id,
      courtId: venue12.courts[0].id,
      date: new Date(Date.UTC(pastDate2.getFullYear(), pastDate2.getMonth(), pastDate2.getDate())),
      startTime: new Date(Date.UTC(1970, 0, 1, 17, 0, 0)),
      endTime: new Date(Date.UTC(1970, 0, 1, 19, 0, 0)),
      status: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalPrice: 640000,
      notes: "Sunset padel match Bali",
      payment: {
        create: {
          method: "Kartu Kredit",
          amount: 640000,
          transactionStatus: "settlement",
          paidAt: pastDate2,
        },
      },
      review: {
        create: {
          userId: user5.id,
          venueId: venue12.id,
          rating: 5,
          comment: "Vibe tropis Canggu terbaik! Main padel saat matahari terbenam sambil minum fresh smoothie di lounge.",
        },
      },
    },
  });

  // Review 6: Bintaro Turf Mini Soccer
  const b6 = await prisma.booking.create({
    data: {
      userId: user1.id,
      courtId: venue7.courts[0].id,
      date: new Date(Date.UTC(pastDate3.getFullYear(), pastDate3.getMonth(), pastDate3.getDate())),
      startTime: new Date(Date.UTC(1970, 0, 1, 19, 0, 0)),
      endTime: new Date(Date.UTC(1970, 0, 1, 21, 0, 0)),
      status: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalPrice: 1000000,
      notes: "Mini soccer 7v7 tim alumni",
      payment: {
        create: {
          method: "BCA Virtual Account",
          amount: 1000000,
          transactionStatus: "settlement",
          paidAt: pastDate3,
        },
      },
      review: {
        create: {
          userId: user1.id,
          venueId: venue7.id,
          rating: 5,
          comment: "Rumput sintetis monofilament tebal dan empuk banget, lari kencang tidak takut cedera. Lampu sorotnya mantap!",
        },
      },
    },
  });

  // Review 7: Bandung Smash Dago
  const b7 = await prisma.booking.create({
    data: {
      userId: user2.id,
      courtId: venue8.courts[0].id,
      date: new Date(Date.UTC(pastDate2.getFullYear(), pastDate2.getMonth(), pastDate2.getDate())),
      startTime: new Date(Date.UTC(1970, 0, 1, 8, 0, 0)),
      endTime: new Date(Date.UTC(1970, 0, 1, 10, 0, 0)),
      status: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalPrice: 240000,
      notes: "Pagi ceria tenis Dago",
      payment: {
        create: {
          method: "QRIS",
          amount: 240000,
          transactionStatus: "settlement",
          paidAt: pastDate2,
        },
      },
      review: {
        create: {
          userId: user2.id,
          venueId: venue8.id,
          rating: 5,
          comment: "Udara pagi Dago bikin stamina tidak cepat habis saat reli panjang. Lapangan tenis sangat terawat!",
        },
      },
    },
  });

  // Review 8: Jogja Heritage Sports Center
  const b8 = await prisma.booking.create({
    data: {
      userId: user3.id,
      courtId: venue14.courts[0].id,
      date: new Date(Date.UTC(pastDate1.getFullYear(), pastDate1.getMonth(), pastDate1.getDate())),
      startTime: new Date(Date.UTC(1970, 0, 1, 18, 0, 0)),
      endTime: new Date(Date.UTC(1970, 0, 1, 20, 0, 0)),
      status: BookingStatus.COMPLETED,
      paymentStatus: PaymentStatus.PAID,
      totalPrice: 130000,
      notes: "Main badminton bareng teman kampus",
      payment: {
        create: {
          method: "QRIS",
          amount: 130000,
          transactionStatus: "settlement",
          paidAt: pastDate1,
        },
      },
      review: {
        create: {
          userId: user3.id,
          venueId: venue14.id,
          rating: 5,
          comment: "Harga mahasiswa tapi fasilitas bintang lima. Karpet vinyl PBSI empuk dan pencahayaan terang!",
        },
      },
    },
  });

  console.log(`✅ Sample booking & verified reviews dibuat (${b1.id}, ${b2.id}, ${b3.id}, dst).`);

  // 4. Sample Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: user1.id,
        title: "Booking Dikonfirmasi! 🏸",
        message: "Pemesanan Lapangan Futsal Vinyl A di Champion Sports Center telah terverifikasi.",
        type: "BOOKING_CONFIRMED",
        isRead: false,
        link: "/my-bookings",
      },
      {
        userId: user1.id,
        title: "Kupon Diskon Akhir Pekan ⚡",
        message: "Gunakan kode 'COURT20' untuk potongan 20% pemesanan lapangan tenis dan golf.",
        type: "PROMO",
        isRead: true,
        link: "/venues",
      },
      {
        userId: user2.id,
        title: "Pembayaran Berhasil Diverifikasi 💳",
        message: "Pembayaran untuk Basket Pro FIBA Hall di Gelora Arena GBK Senayan telah diterima.",
        type: "PAYMENT_SUCCESS",
        isRead: false,
        link: "/my-bookings",
      },
    ],
  });

  console.log("🔔 Notifikasi sampel berhasil dibuat.");
  console.log("🎉 Seeding 16 venue multi-olahraga selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error("❌ Error saat seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
