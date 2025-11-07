import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const ALLOWED_PATHS_FOR_SETUP = [
  "/setup-profile",
  "/api/auth",
  "/api/user/check-username",
  "/api/user/update-profile",
  "/api/user/me",
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET })

  if (!token) {
    if (pathname === "/setup-profile") {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  }

  const username = (token.username as string | null) ?? null
  const isSetupPath = pathname === "/setup-profile"
  const isAllowedSetupPath =
    isSetupPath || ALLOWED_PATHS_FOR_SETUP.some((path) => pathname.startsWith(path))

  if (!username && !isAllowedSetupPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/setup-profile"
    url.search = ""
    return NextResponse.redirect(url)
  }

  if (username && isSetupPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
}
