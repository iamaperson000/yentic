import { NextRequest, NextResponse } from "next/server"

import type { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { normalizeUsername } from "@/lib/username"

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database connection is not configured" },
      { status: 503 },
    )
  }

  const { username: rawUsername } = await params
  const username = normalizeUsername(rawUsername)

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  const user = (await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
    } as Prisma.UserWhereInput,
  })) as
    | ({
        id: string
        name: string | null
        username: string | null
        image: string | null
        bio: string | null
        createdAt: Date
      } | null)
    | null

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}
