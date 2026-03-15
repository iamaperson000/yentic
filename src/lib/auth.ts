import { PrismaAdapter } from "@next-auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"

import prisma from "./prisma"

async function loadTokenUser(token: { id?: string; sub?: string; email?: string | null }) {
  const userId =
    (typeof token.sub === "string" && token.sub) ||
    (typeof token.id === "string" && token.id) ||
    null

  if (userId) {
    return (await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        image: true,
        name: true,
      },
    })) as
      | {
          id: string
          email: string
          username: string | null
          bio: string | null
          image: string | null
          name: string | null
        }
      | null
  }

  if (typeof token.email === "string" && token.email) {
    return (await prisma.user.findUnique({
      where: { email: token.email },
      select: {
        id: true,
        email: true,
        username: true,
        bio: true,
        image: true,
        name: true,
      },
    })) as
      | {
          id: string
          email: string
          username: string | null
          bio: string | null
          image: string | null
          name: string | null
        }
      | null
  }

  return null
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.username = user.username ?? null
        token.bio = user.bio ?? null
        token.picture = user.image ?? token.picture
        token.name = user.name ?? token.name
        token.email = user.email ?? token.email
      }

      if (trigger === "update" && session) {
        const dbUser = await loadTokenUser({
          id: token.id as string | undefined,
          sub: token.sub,
          email: token.email,
        })

        if (dbUser) {
          token.id = dbUser.id
          token.sub = dbUser.id
          token.email = dbUser.email
          token.username = dbUser.username ?? null
          token.bio = dbUser.bio ?? null
          token.picture = dbUser.image ?? token.picture
          token.name = dbUser.name ?? token.name
        }
      }

      if (!token.username && token.email) {
        const dbUser = (await loadTokenUser({
          id: token.id as string | undefined,
          sub: token.sub,
          email: token.email,
        })) as
          | {
              id: string
              email: string
              username: string | null
              bio: string | null
              image: string | null
              name: string | null
            }
          | null

        if (dbUser) {
          token.id = dbUser.id
          token.sub = dbUser.id
          token.email = dbUser.email
          token.username = dbUser.username ?? null
          token.bio = dbUser.bio ?? null
          token.picture = dbUser.image ?? token.picture
          token.name = dbUser.name ?? token.name
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub ?? token.id ?? "") as string
        session.user.username = (token.username as string | null) ?? null
        session.user.bio = (token.bio as string | null) ?? null
        if (token.picture && !session.user.image) {
          session.user.image = token.picture as string
        }
        if (token.name && !session.user.name) {
          session.user.name = token.name as string
        }
      }

      return session
    },
    async signIn({ user }) {
      return Boolean(user?.email)
    },
  },
}
