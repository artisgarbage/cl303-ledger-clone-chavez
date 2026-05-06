import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Public paths that don't require authentication
const publicPaths = ["/api/healthz"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow healthz and other public paths without auth
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Future: Add authentication logic here for other routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
