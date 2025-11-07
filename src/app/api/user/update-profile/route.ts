import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

  const existingUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  })

  if (existingUser && existingUser.id !== session.user.id) {
    return NextResponse.json({ error: "Username is already taken" }, { status: 409 })
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      username,
      bio,
    },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(updatedUser)
}
