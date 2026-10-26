// NextAuth.js authentication routes
// POST: /api/auth/signin (credentials)
// GET: /api/auth/signout
// GET: /api/auth/callback/credentials

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

const handlers = NextAuth({
  // Configure one or more authentication providers
  providers: [
    // Credentials provider for email/password
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@company.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const passwordsMatch = await compare(
          credentials.password,
          user.passwordHash
        );

        if (!passwordsMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),

    // Google OAuth provider
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],

  // Session strategy: use database sessions
  session: {
    strategy: "database",
  },

  // Pages: custom login page
  pages: {
    signIn: "/login",
  },

  // Callbacks
  callbacks: {
    session: ({ session, token }) => {
      // @ts-ignore
      session.user.role = token.role;
      return session;
    },
    jwt: ({ user, token }) => {
      // @ts-ignore
      token.role = user?.role;
      return token;
    },
  },

  // Secret for cryptographic signing
  secret: process.env.NEXTAUTH_SECRET,
});

export { handlers as GET, handlers as POST };