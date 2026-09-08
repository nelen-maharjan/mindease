import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/mood", "/journal", "/chat", "/habits", "/goals", "/analytics", "/recommendations", "/settings", "/admin"];
// Routes accessible only to guests
const AUTH_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));

  if (!isProtected && !isAuthRoute) return NextResponse.next();

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (isProtected && !session) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }

    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch {
    if (isProtected) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
