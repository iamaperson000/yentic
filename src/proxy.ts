import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Paths that are allowed even if the user hasn't completed setup yet
const PUBLIC_PATHS = [
  "/setup-profile",
  "/api/auth",
  "/api/message",
  "/api/user/check-username",
  "/api/user/update-profile",
  "/api/user/me",
  "/chat",
  "/u/", //  allow viewing user profile pages publicly
];

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return null;
  }

  if (value.startsWith("//") || value.startsWith("/setup-profile")) {
    return null;
  }

  return value;
}

export async function proxy(request: NextRequest) {
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
  const isApiPath = pathname.startsWith("/api/");

  //  Check if current path is public (allowed even without username)
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // If the user is logged in but has no username yet and it's not a public route
  if (!username && !isPublicPath) {
    if (isApiPath) {
      return NextResponse.json(
        { error: "Finish setting up your profile to continue." },
        { status: 403 },
      );
    }

    const url = request.nextUrl.clone();
    const nextPath = getSafeNextPath(`${pathname}${request.nextUrl.search}`);
    url.pathname = "/setup-profile";
    url.search = "";
    if (nextPath) {
      url.searchParams.set("next", nextPath);
    }
    return NextResponse.redirect(url);
  }

  // If user *does* have username but is trying to access setup again
  if (username && isSetupPath) {
    const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));

    if (nextPath) {
      return NextResponse.redirect(new URL(nextPath, request.url));
    }

    const url = request.nextUrl.clone();
    url.pathname = "/";
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
