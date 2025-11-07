import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")?.trim().toLowerCase() ?? ""

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json({ available: false, reason: "Invalid username format" })
  }

  const session = await getServerSession(authOptions)

  const existingUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  })

  if (!existingUser) {
    return NextResponse.json({ available: true })
  }

  if (session?.user?.id === existingUser.id) {
    return NextResponse.json({ available: true })
  }

  return NextResponse.json({ available: false })
}
