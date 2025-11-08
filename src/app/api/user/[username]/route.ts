import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"

import prisma from "@/lib/prisma"

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
  const username = rawUsername?.toLowerCase()

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  const userSelect: Prisma.UserSelect = {
    id: true,
    name: true,
    username: true,
    image: true,
    bio: true,
    createdAt: true,
  }

  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    } as Prisma.UserWhereInput,
    select: userSelect,
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}
