import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/session";

// Routes yang butuh login (user biasa)
const protectedUserRoutes = ["/booking", "/my-bookings", "/profile"];
// Routes yang butuh role ADMIN
const protectedAdminRoutes = ["/admin"];
// Routes hanya untuk guest (login/register akan redirect jika sudah login)
const authRoutes = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Baca session dari cookie
  const cookie = request.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  const isLoggedIn = !!session?.userId;
  const isAdmin = session?.role === "ADMIN";

  // Jika sudah login dan mengakses halaman auth, redirect ke beranda
  const isAuthRoute = authRoutes.some((r) => path.startsWith(r));
  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  // Proteksi route admin
  const isAdminRoute = protectedAdminRoutes.some((r) => path.startsWith(r));
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.nextUrl));
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.nextUrl));
    }
  }

  // Proteksi route user
  const isUserRoute = protectedUserRoutes.some((r) => path.startsWith(r));
  if (isUserRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  return NextResponse.next();
}

// Jalankan proxy pada semua route kecuali asset statis
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
