import { NextResponse } from "next/server"

import type { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const take = Number(searchParams.get("take") ?? 50)
  const skip = Number(searchParams.get("skip") ?? 0)

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database connection is not configured" },
      { status: 503 },
    )
  }

  const rawUsers = await prisma.user.findMany({
    skip: Number.isFinite(skip) ? skip : 0,
    take: Number.isFinite(take) && take > 0 ? Math.min(take, 100) : 50,
    orderBy: { createdAt: "desc" } as unknown as Prisma.UserOrderByWithRelationInput,
  })

  const users = rawUsers as unknown as Array<{
    id: string
    name: string | null
    username: string | null
    image: string | null
    bio: string | null
    createdAt: Date
  }>

  return NextResponse.json({ users })
}
