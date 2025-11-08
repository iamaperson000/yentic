import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import type { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database connection is not configured" },
      { status: 503 },
    )
  }

  const user = (await prisma.user.findFirst({
    where: { id: session.user.id } as Prisma.UserWhereInput,
  })) as
    | ({
        id: string
        email: string | null
        name: string | null
        username: string | null
        image: string | null
        bio: string | null
        createdAt: Date
        updatedAt: Date
      } | null)

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}
