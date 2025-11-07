import { NextResponse } from "next/server"

import prisma from "@/lib/prisma"

export async function GET(
  _: Request,
  { params }: { params: { username: string } },
) {
  const username = params.username?.toLowerCase()

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      createdAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}
