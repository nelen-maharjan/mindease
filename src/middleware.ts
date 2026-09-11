import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
"/dashboard",
"/mood",
"/journal",
"/chat",
"/habits",
"/goals",
"/analytics",
"/recommendations",
"/settings",
"/admin",
];

const AUTH_ROUTES = ["/login", "/register"];

export function middleware(request: NextRequest) {
const { pathname } = request.nextUrl;

const isProtected = PROTECTED_PREFIXES.some((prefix) =>
pathname.startsWith(prefix)
);

const isAuthRoute = AUTH_ROUTES.some((prefix) =>
pathname.startsWith(prefix)
);

if (!isProtected && !isAuthRoute) {
return NextResponse.next();
}

const sessionCookie =
request.cookies.get("better-auth.session_token") ??
request.cookies.get("__Secure-better-auth.session_token");

const hasSession = Boolean(sessionCookie);

if (isProtected && !hasSession) {
const url = new URL("/login", request.url);
url.searchParams.set("callbackUrl", pathname);

return NextResponse.redirect(url);


}

if (isAuthRoute && hasSession) {
return NextResponse.redirect(new URL("/dashboard", request.url));
}

return NextResponse.next();
}

export const config = {
matcher: [
"/dashboard/:path*",
"/mood/:path*",
"/journal/:path*",
"/chat/:path*",
"/habits/:path*",
"/goals/:path*",
"/analytics/:path*",
"/recommendations/:path*",
"/settings/:path*",
"/admin/:path*",
"/login",
"/register",
],
};