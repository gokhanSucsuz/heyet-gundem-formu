import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/mongodb";
import { SettingsModel } from "@/models/EncryptedModels";
import { decryptData } from "@/lib/encryption";
import { ALLOWED_EMAILS, SUPER_ADMIN_EMAIL, PERSONNEL_AUTH_EMAIL } from "@/lib/constants";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Local",
      credentials: {
        type: { label: "Type", type: "text" },
      },
      async authorize(credentials) {
        // Check if Google Login is disabled
        let isGoogleLoginEnabled = false; // Default closed
        try {
          await dbConnect();
          const settings = await SettingsModel.findOne({});
          if (settings) {
            const decrypted = decryptData(settings.payload);
            isGoogleLoginEnabled = decrypted?.isGoogleLoginEnabled ?? false;
          }
        } catch (e) {
          console.error("Error reading settings in auth:", e);
        }

        if (isGoogleLoginEnabled) {
          throw new Error("Google girişi aktifken yerel giriş kullanılamaz.");
        }

        if (credentials?.type === "personnel") {
          return { id: "personnel", email: PERSONNEL_AUTH_EMAIL };
        }
        if (credentials?.type === "admin") {
          return { id: "admin", email: SUPER_ADMIN_EMAIL };
        }
        return null;
      }
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
