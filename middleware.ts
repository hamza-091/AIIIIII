import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Skip middleware for login page and API auth routes
  if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname.startsWith("/api/auth/login")) {
    return NextResponse.next()
  }

  const token = request.cookies.get("auth-token")?.value

  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // For protected API routes, the token will be verified on the server (Node.js runtime)
  // For dashboard pages, the presence of the cookie is enough for middleware to pass.
  // Any subsequent data fetching will hit API routes which will verify the token.

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api/auth/login|login|_next/static|_next/image|favicon.ico).*)"],
}
