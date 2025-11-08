import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import type { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null)

  if (!body || typeof body.username !== "string") {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  const username = body.username.trim().toLowerCase()

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json({ error: "Username must be 3-20 characters using lowercase letters, numbers, or underscores." }, { status: 400 })
  }

  const bio =
    typeof body.bio === "string" && body.bio.trim().length > 0
      ? body.bio.trim()
      : null

  const existingUser = (await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
    } as Prisma.UserWhereInput,
  })) as ({ id: string } | null)

  if (existingUser && existingUser.id !== session.user.id) {
    return NextResponse.json({ error: "Username is already taken" }, { status: 409 })
  }

  const updateData = { username, bio } as unknown as Prisma.UserUpdateInput

  const updatedUser = (await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
  })) as unknown as {
    id: string
    email: string | null
    name: string | null
    username: string | null
    image: string | null
    bio: string | null
    updatedAt: Date
  }

  return NextResponse.json(updatedUser)
}
