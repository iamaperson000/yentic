import { PrismaAdapter } from "@next-auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import type { NextAuthOptions } from "next-auth"

import type { Prisma } from "@prisma/client"
import prisma from "./prisma"

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
        if (Object.prototype.hasOwnProperty.call(session, "username")) {
          token.username = (session as Record<string, unknown>).username as string | null
        }
        if (Object.prototype.hasOwnProperty.call(session, "bio")) {
          token.bio = (session as Record<string, unknown>).bio as string | null
        }
        if (Object.prototype.hasOwnProperty.call(session, "name")) {
          token.name = (session as Record<string, unknown>).name as string | undefined
        }
        if (Object.prototype.hasOwnProperty.call(session, "image")) {
          token.picture = (session as Record<string, unknown>).image as string | undefined
        }
      }

      if (!token.username && token.email) {
        const dbUser = (await prisma.user.findFirst({
          where: { email: token.email } as Prisma.UserWhereInput,
        })) as
          | ({
              id: string
              username: string | null
              bio: string | null
              image: string | null
              name: string | null
            } | null)
          | null

        if (dbUser) {
          token.id = dbUser.id
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
