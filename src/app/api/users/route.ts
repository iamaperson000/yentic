import { NextResponse } from "next/server"

import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const take = Number(searchParams.get("take") ?? 50)
  const skip = Number(searchParams.get("skip") ?? 0)

  const users = await prisma.user.findMany({
    skip: Number.isFinite(skip) ? skip : 0,
    take: Number.isFinite(take) && take > 0 ? Math.min(take, 100) : 50,
    orderBy: { createdAt: "desc" },
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
