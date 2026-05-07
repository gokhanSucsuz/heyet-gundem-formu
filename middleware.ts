import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized({ req, token }) {
      // Sadece bu maile izin ver
      return token?.email === "edirnesydv@gmail.com";
    },
  },
  pages: {
    signIn: "/login",
  }
});

export const config = {
  // Sadece korumak istediğimiz sayfaları belirliyoruz. 
  // Api auth endpointleri, statik dosyalar ve login sayfası hariç tüm yollar korunacak.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)"],
};
