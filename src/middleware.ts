import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Paths that are allowed even if the user hasn't completed setup yet
const PUBLIC_PATHS = [
  "/setup-profile",
  "/api/auth",
  "/api/user/check-username",
  "/api/user/update-profile",
  "/api/user/me",
  "/u/", //  allow viewing user profile pages publicly
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets & Next internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
  });

  // If there's no session
  if (!token) {
    // Prevent logged-out users from going to setup page
    if (pathname === "/setup-profile") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    // Let public pages pass through
    return NextResponse.next();
  }

  const username = (token.username as string | null) ?? null;
  const isSetupPath = pathname === "/setup-profile";

  //  Check if current path is public (allowed even without username)
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // If the user is logged in but has no username yet and it's not a public route
  if (!username && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/setup-profile";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // If user *does* have username but is trying to access setup again
  if (username && isSetupPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Otherwise allow normal request flow
  return NextResponse.next();
}

// ✅ Matcher: run middleware for all routes except static assets, images, favicon, etc.
export const config = {
  matcher: "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
};
