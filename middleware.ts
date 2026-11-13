import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SUPER_ADMIN_EMAIL, PERSONNEL_AUTH_EMAIL } from "@/lib/constants";
import { verifyGateCookie } from "@/lib/ssoGate";

const authMiddleware = withAuth({
  callbacks: {
    authorized({ req, token }) {
      const path = req.nextUrl.pathname;

      // Admin routes — only super admin
      if (path.startsWith("/admin")) {
        return token?.role === "super-admin";
      }

      // Personnel select route — only personnel auth email
      if (path.startsWith("/select-personnel")) {
        return token?.role === "personnel-auth";
      }

      // All other protected routes — must have a valid token with either role
      const email = token?.email;
      return email === PERSONNEL_AUTH_EMAIL || email === SUPER_ADMIN_EMAIL;
    },
  },
  pages: {
    signIn: "/login",
  },
});

export default async function middleware(req: NextRequest, event: any) {
  const { pathname } = req.nextUrl;
  const ssoSecret = process.env.PANEL_SSO_SECRET;

  if (ssoSecret) {
    const gateCookie = req.cookies.get("vakif_panel_gate")?.value;
    const isGateValid = gateCookie ? await verifyGateCookie(gateCookie, ssoSecret) : false;

    if (!isGateValid) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Doğrudan erişim engellendi. Lütfen Merkezi Panel üzerinden giriş yapın." },
          { status: 403 }
        );
      }
      const proto = req.headers.get("x-forwarded-proto") || "https";
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
      const baseOrigin =
        process.env.NEXTAUTH_URL?.replace(/\/+$/, "") ||
        (host ? `${proto}://${host}` : req.nextUrl.origin);
      return NextResponse.redirect(`${baseOrigin}/yetkisiz-erisim`);
    }
  }

  if (pathname === "/login") {
    return NextResponse.next();
  }

  return (authMiddleware as any)(req, event);
}

export const config = {
  matcher: ["/((?!api/auth|api/sso/callback|yetkisiz-erisim|_next/static|_next/image|favicon.ico|logo-sydv.jpg).*)"],
};
