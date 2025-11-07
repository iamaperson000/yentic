import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: DefaultSession["user"] & {
      id: string
      username: string | null
      bio: string | null
    }
  }

  interface User {
    username?: string | null
    bio?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    username?: string | null
    bio?: string | null
  }
}
