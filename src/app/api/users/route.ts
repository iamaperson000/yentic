import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import type { Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const take = Number(searchParams.get("take") ?? 50)
  const skip = Number(searchParams.get("skip") ?? 0)

  if (!Number.isFinite(take) || !Number.isFinite(skip)) {
    return NextResponse.json(
      { error: "Invalid pagination parameters" },
      { status: 400 },
    )
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database connection is not configured" },
      { status: 503 },
    )
  }

  const normalizedSkip = Math.max(0, Math.trunc(skip))

  const rawUsers = await prisma.user.findMany({
    skip: normalizedSkip,
    take: Number.isFinite(take) && take > 0 ? Math.min(take, 100) : 50,
    orderBy: { createdAt: "desc" } as unknown as Prisma.UserOrderByWithRelationInput,
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      bio: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ users })
}
