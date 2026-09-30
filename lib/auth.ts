import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const ALLOWED_EMAILS = [
  "edirnesydv@gmail.com",
  "gokhansucsuz@gmail.com",
];

export const SUPER_ADMIN_EMAIL = "gokhansucsuz@gmail.com";
export const PERSONNEL_AUTH_EMAIL = "edirnesydv@gmail.com";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return ALLOWED_EMAILS.includes(user.email || "");
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.email === SUPER_ADMIN_EMAIL ? "super-admin" : "personnel-auth";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || "sydv-secret-key-for-dev",
};
