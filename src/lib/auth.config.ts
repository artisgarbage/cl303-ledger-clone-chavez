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
        // SEC-03: companyId is now non-null in the DB schema
        const companyId = (user as unknown as { companyId?: string }).companyId;
        if (!companyId) {
          throw new Error("User missing companyId - schema constraint violated");
        }
        token.companyId = companyId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        (session.user as unknown as { role: string }).role =
          token.role as string;
        // SEC-03: companyId is now guaranteed to be non-null
        if (!token.companyId || typeof token.companyId !== "string") {
          throw new Error("Session missing companyId - token invalid");
        }
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
