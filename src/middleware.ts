import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public paths
  const publicPaths = [
    "/",
    "/login",
    "/api/auth",
    "/api/healthz",
    "/api/status",
    // Marketing routes
    "/product",
    "/modes",
    "/pricing",
    "/agents",
    "/security",
    "/about",
    "/blog",
    "/customers",
    "/og",
    "/sitemap.xml",
    "/robots.txt",
    "/status",
  ];
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // If not authenticated, redirect to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes
  const adminPaths = ["/admin", "/api/admin"];
  if (adminPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const role = (req.auth.user as { role?: string })?.role;
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|screenshots/|public/).*)",
  ],
};
