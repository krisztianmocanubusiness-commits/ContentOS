import { NextResponse } from "next/server";

import { auth } from "@/auth";

const AUTH_PATHS = ["/login", "/signup"];
const PUBLIC_PATHS = ["/", ...AUTH_PATHS];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isPublic = PUBLIC_PATHS.includes(nextUrl.pathname);
  const isAuthPage = AUTH_PATHS.includes(nextUrl.pathname);

  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
