import { withAuth } from "next-auth/middleware";
import { SUPER_ADMIN_EMAIL, PERSONNEL_AUTH_EMAIL } from "@/lib/auth";

export default withAuth({
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
  }
});

export const config = {
  // Protect everything except auth endpoints, static files, login page, and API auth routes
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login|logo-sydv.jpg).*)" ],
};
