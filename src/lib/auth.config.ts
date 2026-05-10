import type { NextAuthConfig } from "next-auth";

// Edge-compatible auth config (no DB/Node.js-only imports)
// Used by middleware for JWT verification only
export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as { role?: string }).role ?? "ADMIN";
        token.companyId =
          (user as unknown as { companyId?: string }).companyId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        (session.user as unknown as { role: string }).role =
          token.role as string;
        (session.user as unknown as { companyId: string }).companyId =
          token.companyId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
